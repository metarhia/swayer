import { hasOwn, isEnumerable, isObject } from './utils.js';

const REACTIVE = Symbol('reactive');
const TARGET = Symbol('target');

class Dependency {
  #reactions = new Map();
  #ref;

  static deps = new WeakMap();
  static #target = null;

  constructor(ref) {
    this.#ref = ref;
  }

  static invoke(target) {
    this.#target = target;
    const result = target.init();
    this.#target = null;
    return result;
  }

  static get(ref, key) {
    let dep;
    const map = this.deps.get(ref);
    if (map) {
      dep = map.get(key);
      if (!dep) map.set(key, dep = new Dependency(ref));
    } else {
      const map = new Map();
      map.set(key, dep = new Dependency(ref));
      this.deps.set(ref, map);
    }
    return dep;
  }

  static delete(ref) {
    this.deps.delete(ref);
  }

  get reactions() {
    return this.#reactions;
  }

  depend() {
    const target = Dependency.#target;
    if (target === null) return;
    if (hasOwn(target, 'update')) this.#set(target);
    else this.#remove(target);
  }

  notify() {
    const updates = this.#reactions.values();
    for (const update of updates) update();
  }

  cloneReactions(dep) {
    this.#reactions = new Map(dep.reactions);
  }

  #set(target) {
    const { reaction, update } = target;
    if (this.#reactions.has(reaction)) return;
    this.#reactions.set(reaction, update);
  }

  #remove(target) {
    const { reaction } = target;
    this.#reactions.delete(reaction);
    if (this.#reactions.size === 0) {
      Dependency.delete(this.#ref);
    }
  }
}

class DependencyHandler {
  static get(target, key) {
    Dependency.get(target, key).depend();
  }

  static set(target, key, replaced, value) {
    if (Array.isArray(value)) {
      const replacing = replaced[TARGET];
      const dep = Dependency.get(replacing, 'length');
      dep.notify();
      Dependency.get(target, key).cloneReactions(dep);
      Dependency.get(value[TARGET], 'length').cloneReactions(dep);
      Dependency.delete(replacing);
      return;
    }
    Dependency.get(target, key).notify();
  }

  static deleteProperty(target, key) {
    const value = target[key];
    const isDict = isObject(value) && !Array.isArray(value);
    if (isDict) Dependency.delete(value[TARGET]);
  }
}

class ProxyHandler {
  #activator;

  constructor(dataActivator) {
    this.#activator = dataActivator;
  }

  get(target, key, receiver) {
    const isEnum = isEnumerable(target, key) || key === 'length';
    const notIndex = () => !this.#isIndexKey(target, key);
    if (isEnum && notIndex()) DependencyHandler.get(target, key);
    return Reflect.get(target, key, receiver);
  }

  set(target, key, value, receiver) {
    if (isObject(value)) value = this.#activator.activate(value);
    const replaced = target[key];
    if (isObject(replaced)) delete receiver[key];
    const isSet = Reflect.set(target, key, value, receiver);
    const notIndex = !this.#isIndexKey(target, key);
    if (notIndex) DependencyHandler.set(target, key, replaced, value);
    return isSet;
  }

  deleteProperty(target, key) {
    if (!Reflect.has(target, key)) return true;
    this.#activator.deactivate(target, key);
    DependencyHandler.deleteProperty(target, key);
    return Reflect.deleteProperty(target, key);
  }

  // Optimize memory by skipping array index deps
  #isIndexKey(target, key) {
    return Array.isArray(target) && !isNaN(parseInt(key, 10));
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

  static activate(state) {
    return DataActivator.activate(state);
  }

  register(updateTarget, prop, reaction) {
    if (typeof reaction !== 'function') return;
    const state = this.#component.state;
    const init = () => reaction(state);
    const update = () => (updateTarget[prop] = reaction(state));
    const target = { reaction, init, update };
    return Dependency.invoke(target);
  }

  unregister(reaction) {
    if (typeof reaction !== 'function') return;
    const state = this.#component.state;
    const init = () => reaction(state);
    const target = { reaction, init };
    Dependency.invoke(target);
  }
}

// Debug deps
// setInterval(() => {
//   console.log(Dependency.deps);
// }, 3890);
