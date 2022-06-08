import { isEnumerable, isObject } from './utils.js';

const IS_REACTIVE = Symbol('reactive');

class Handler {
  #proxy;

  constructor(deepProxy) {
    this.#proxy = deepProxy;
  }

  get(target, key, receiver) {
    const isNotFlagged = key !== IS_REACTIVE;
    const isEnum = isEnumerable(target, key);
    if (isNotFlagged && isEnum && this.#proxy.handler.get) {
      this.#proxy.handler.get(target, key);
    }
    return Reflect.get(target, key, receiver);
  }

  set(target, key, value, receiver) {
    if (isObject(value)) {
      value = this.#proxy.activate(value);
    }
    const replaced = this.#proxy.registry.get(target[key]) || target[key];
    const isSet = Reflect.set(target, key, value, receiver);
    if (this.#proxy.handler.set) {
      this.#proxy.handler.set(target, key, replaced, value);
    }
    return isSet;
  }

  deleteProperty(target, key) {
    if (!Reflect.has(target, key)) return true;
    const deleted = this.#proxy.registry.get(target[key]) || target[key];
    this.#proxy.deactivate(target, key);
    if (this.#proxy.handler.deleteProperty) {
      this.#proxy.handler.deleteProperty(target, key, deleted);
    }
    return Reflect.deleteProperty(target, key);
  }
}

class DeepProxy {
  registry = new WeakMap();
  handler;

  constructor(state, handler) {
    this.handler = handler;
    return this.activate(state);
  }

  activate(data) {
    for (const key of Object.keys(data)) {
      const value = data[key];
      if (isObject(value)) data[key] = this.activate(value);
    }
    if (data[IS_REACTIVE]) return data;
    data[IS_REACTIVE] = true;
    const proxy = new Proxy(data, new Handler(this));
    this.registry.set(proxy, data);
    return proxy;
  }

  deactivate(data, key) {
    const value = data[key];
    if (this.registry.has(value)) {
      this.registry.delete(value);
    }
    for (const k of Object.keys(value)) {
      if (isObject(value[k])) this.deactivate(value, k);
    }
  }
}

class Dependency {
  #reactions = new Map();
  #ref;

  static deps = new WeakMap();
  static #target = null;

  constructor(ref) {
    this.#ref = ref;
  }

  static toggle(target) {
    this.#target = target;
    target.trigger();
    this.#target = null;
  }

  static get(ref, key) {
    let dep;
    const map = this.deps.get(ref);
    if (!map) {
      const map = new Map();
      map.set(key, dep = new Dependency(ref));
      this.deps.set(ref, map);
      return dep;
    }
    if (map instanceof Map) {
      dep = map.get(key);
      if (!dep) map.set(key, dep = new Dependency(ref));
    }
    return dep;
  }

  static delete(ref) {
    this.deps.delete(ref);
  }

  static modes = {
    set: 'set',
    remove: 'remove',
  };

  depend() {
    const target = Dependency.#target;
    if (target === null) return;
    const { mode } = target;
    const { set, remove } = Dependency.modes;
    if (mode === set) this.#set(target);
    else if (mode === remove) this.#remove(target);
  }

  notify() {
    const triggers = this.#reactions.values();
    for (const trigger of triggers) trigger();
  }

  #set(target) {
    const { reaction, trigger } = target;
    if (this.#reactions.has(reaction)) return;
    this.#reactions.set(reaction, trigger);
  }

  #remove(target) {
    const { reaction } = target;
    this.#reactions.delete(reaction);
    if (this.#reactions.size === 0) {
      Dependency.deps.delete(this.#ref);
    }
  }
}

class ReactivityHandler {
  #reactivity;

  constructor(reactivity) {
    this.#reactivity = reactivity;
  }

  get(ref, key) {
    Dependency.get(ref, key).depend();
  }

  set(ref, key, replaced, _value) {
    if (Array.isArray(replaced)) Dependency.delete(replaced);
    if (!Array.isArray(ref)) return Dependency.get(ref, key).notify();
    if (key === 'length') this.#reactivity.updateTargets();
  }

  deleteProperty(ref, key, deleted) {
    if (!Array.isArray(deleted)) return Dependency.delete(ref);
    ref[key].length = 0;
    Dependency.delete(deleted);
  }
}

export default class Reactivity {
  #targets = new Map();
  #component;

  constructor(component) {
    this.#component = component;
  }

  register(componentTarget, prop, reaction) {
    if (typeof reaction !== 'function') return;
    const trigger = () => (componentTarget[prop] = this.call(reaction));
    const target = { reaction, trigger, mode: Dependency.modes.set };
    Dependency.toggle(target);
    this.#targets.set(reaction, target);
  }

  unregister(reaction) {
    if (typeof reaction !== 'function') return;
    const trigger = () => this.call(reaction);
    const target = { reaction, trigger, mode: Dependency.modes.remove };
    Dependency.toggle(target);
    this.#targets.delete(reaction);
  }

  updateTargets() {
    for (const target of this.#targets.values()) {
      Dependency.toggle(target);
    }
  }

  call(reaction) {
    return reaction.call(this.#component, this.#component.state);
  }

  create(state) {
    const handler = new ReactivityHandler(this);
    return new DeepProxy(state, handler);
  }
}

// Debug deps
// setInterval(() => {
//   console.log(Dependency.deps);
// }, 3890);
