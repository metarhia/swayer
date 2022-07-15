import { hasOwn, isEnumerable, isObject } from './utils.js';

const REACTIVE = Symbol('reactive');
const TARGET = Symbol('target');

class Dependency {
  #reactions = new Map();
  #ref;
  #key;

  static deps = new WeakMap();
  static #target = null;

  constructor(ref, key) {
    this.#ref = ref;
    this.#key = key;
  }

  static toggle(target) {
    this.#target = target;
    const result = target.trigger();
    this.#target = null;
    return result;
  }

  static get(ref, key) {
    let dep;
    const map = this.deps.get(ref);
    if (map) {
      dep = map.get(key);
      if (!dep) map.set(key, dep = new Dependency(ref, key));
    } else {
      const map = new Map();
      map.set(key, dep = new Dependency(ref, key));
      this.deps.set(ref, map);
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
    // console.log('set reaction', this.#key, reaction);
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

class ObjectDep extends Dependency {
  static deps = new WeakMap();

  static get(ref) {
    let dep = this.deps.get(ref);
    if (!dep) this.deps.set(ref, dep = new ObjectDep(ref));
    return dep;
  }
}

class DependencyHandler {
  static get(target, key) {
    // const value = target[key];
    // if (isObject(value)) ObjectDep.get(value[TARGET]).depend();
    // else Dependency.get(target, key).depend();
    // Dependency.get(target, key).depend();

    Dependency.get(target, key).depend();
    if (Array.isArray(target[key])) {
      Dependency.get(target[key][TARGET], 'length').depend();
    }
  }

  static set(target, key, replaced, value) {
    // // if (isObject(value)) ObjectDep.get(target);
    // // else Dependency.get(target, key).notify();
    // Dependency.get(target, key).notify();
    // console.log(Dependency.deps);
    // // console.log(ObjectDep.deps);
    // console.log('\n');

    if (Array.isArray(replaced)) {
      // const dep = Dependency.get(replaced, 'length');
      // Dependency.deps.set(target[key], new Map([['length', dep]]));
      // Dependency.delete(replaced);
      // Dependency.get(replaced[TARGET], 'length').notify();
    }
    if (Array.isArray(value)) {
      const dep = Dependency.get(target, key);
      dep.notify();
      // const d = Dependency.deps.get(value[TARGET]);
      // if (d) d.set('length', dep);
      // const d = Dependency.get(replaced, 'length');
      Dependency.get(value[TARGET], 'length').depend();
      // Dependency.deps.set(target[key][TARGET], d);
      console.log({ key, target, dep: Dependency.get(target, key) });
      // Dependency.delete(replaced);
      return;
    }
    if (!Array.isArray(target)) return Dependency.get(target, key).notify();
    // if (key === 'length') this.#reactivity.updateTargets();
    if (key === 'length') return Dependency.get(target, key).notify();
  }

  static deleteProperty(target, key) {
    const value = target[key];
    if (isObject(value)) {
      // ObjectDep.delete(value[TARGET]);
      Dependency.delete(value[TARGET]);
    }
  }
}

class ProxyHandler {
  #Activator;

  constructor(DataActivator) {
    this.#Activator = DataActivator;
  }

  get(target, key, receiver) {
    const isEnum = isEnumerable(target, key) || key === 'length';
    if (isEnum) DependencyHandler.get(target, key);
    return Reflect.get(target, key, receiver);
  }

  set(target, key, value, receiver) {
    if (isObject(value)) value = this.#Activator.activate(value);
    const replaced = target[key];
    if (isObject(replaced)) delete receiver[key];
    const isSet = Reflect.set(target, key, value, receiver);
    DependencyHandler.set(target, key, replaced, value);
    return isSet;
  }

  deleteProperty(target, key) {
    if (!Reflect.has(target, key)) return true;
    this.#Activator.deactivate(target, key);
    DependencyHandler.deleteProperty(target, key);
    return Reflect.deleteProperty(target, key);
  }
}

class DataActivator {
  static #registry = new WeakMap();

  static #createRefDescriptor(value) {
    return {
      value,
      writable: false,
      configurable: false,
      enumerable: false,
    };
  }

  static #defineDataRefs(target, proxy) {
    const proxyDescriptor = this.#createRefDescriptor(proxy);
    const targetDescriptor = this.#createRefDescriptor(target);
    Reflect.defineProperty(target, REACTIVE, proxyDescriptor);
    Reflect.defineProperty(target, TARGET, targetDescriptor);
  }

  static activate(data) {
    if (hasOwn(data, REACTIVE)) return data[REACTIVE];
    for (const key of Object.keys(data)) {
      const value = data[key];
      if (isObject(value)) data[key] = this.activate(value);
    }
    const proxyHandler = new ProxyHandler(this);
    const proxy = new Proxy(data, proxyHandler);
    this.#registry.set(proxy, data);
    DataActivator.#defineDataRefs(data, proxy);
    return proxy;
  }

  static deactivate(data, key) {
    const value = data[key];
    if (this.#registry.has(value)) this.#registry.delete(value);
    for (const k of Object.keys(value)) {
      if (isObject(value[k])) this.deactivate(value, k);
    }
  }
}

export default class Reactivity {
  #component;

  constructor(component) {
    this.#component = component;
  }

  register(componentTarget, prop, reaction) {
    if (typeof reaction !== 'function') return;
    // console.log('register', { tag: this.#component.tag, prop, reaction });
    const state = this.#component.state;
    const trigger = () => (componentTarget[prop] = reaction(state));
    const target = { reaction, trigger, mode: Dependency.modes.set };
    return Dependency.toggle(target);
  }

  unregister(reaction) {
    if (typeof reaction !== 'function') return;
    // console.log('UNregister', { tag: this.#component.tag, reaction });
    const state = this.#component.state;
    const trigger = () => reaction(state);
    const target = { reaction, trigger, mode: Dependency.modes.remove };
    Dependency.toggle(target);
  }

  create(state) {
    return DataActivator.activate(state);
  }
}

// Debug deps
// setInterval(() => {
//   console.log(Dependency.deps);
// }, 3890);
