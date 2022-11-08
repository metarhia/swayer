import { equal, hasOwn, isEnumerable, isObject } from './utils.js';

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
    return Dependency.deps.get(ref)?.get(key);
  }

  static obtain(ref, key) {
    let dep;
    const map = Dependency.deps.get(ref);
    if (map) {
      dep = map.get(key);
      if (!dep) map.set(key, dep = new Dependency(ref));
    } else {
      const map = new Map();
      map.set(key, dep = new Dependency(ref));
      Dependency.deps.set(ref, map);
    }
    return dep;
  }

  static deref(ref, force = false) {
    const dep = Dependency.deps.get(ref);
    if (!dep) return false;
    if (force) return Dependency.deps.delete(ref);
    const refDeps = Array.from(dep.values());
    const isGarbageRef = refDeps.every((dep) => dep.reactions.size === 0);
    return isGarbageRef ? Dependency.deps.delete(ref) : false;
  }

  static delete(ref, key) {
    const dep = Dependency.deps.get(ref);
    return dep ? dep.delete(key) : false;
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

  cloneReactionsFrom(dep) {
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
    Dependency.deref(this.#ref);
  }
}

class DependencyHandler {
  static get(target, key) {
    Dependency.obtain(target, key).depend();
  }

  static set(target, key, replaced, value) {
    const isArrayLen = Array.isArray(target) && key === 'length';
    if (!isArrayLen && DependencyHandler.#compare(value, replaced)) return;
    if (isObject(replaced)) {
      const replacedTarget = replaced[TARGET];
      if (Array.isArray(value)) {
        const newArray = value[TARGET];
        const dep = Dependency.get(replacedTarget, 'length');
        dep.notify();
        Dependency.get(target, key).cloneReactionsFrom(dep);
        Dependency.get(newArray, 'length').cloneReactionsFrom(dep);
        Dependency.deref(replacedTarget, true);
        return;
      }
      Dependency.deref(replacedTarget, true);
    }
    Dependency.get(target, key)?.notify();
  }

  static deleteProperty(target, key, value) {
    Dependency.get(target, key)?.notify();
    Dependency.delete(target, key);
    Dependency.deref(target);
    if (isObject(value)) Dependency.deref(value[TARGET], true);
  }

  static #compare(newValue, oldValue) {
    const first = isObject(newValue) ? newValue[TARGET] : newValue;
    const second = isObject(oldValue) ? oldValue[TARGET] : oldValue;
    return equal(first, second);
  }
}

class ProxyHandler {
  #activator;

  constructor(dataActivator) {
    this.#activator = dataActivator;
  }

  get(target, key, receiver) {
    const isChecked = this.#checkKey(target, key);
    if (isChecked) DependencyHandler.get(target, key);
    return Reflect.get(target, key, receiver);
  }

  set(target, key, value, receiver) {
    if (isObject(value)) value = this.#activator.activate(value);
    const replaced = target[key];
    const isSet = Reflect.set(target, key, value, receiver);
    const isChecked = this.#checkKey(target, key);
    if (isChecked) DependencyHandler.set(target, key, replaced, value);
    return isSet;
  }

  deleteProperty(target, key) {
    if (!Reflect.has(target, key)) return true;
    this.#activator.deactivate(target, key);
    const value = target[key];
    const isChecked = this.#checkKey(target, key);
    const isDeleted = Reflect.deleteProperty(target, key);
    if (isChecked) DependencyHandler.deleteProperty(target, key, value);
    return isDeleted;
  }

  #checkKey(target, key) {
    // Allow array length deps
    const isEnum = isEnumerable(target, key) || key === 'length';
    if (!isEnum) return false;
    // Optimize array reactivity by skipping array index deps
    const isIndex = Array.isArray(target) && !isNaN(parseInt(key, 10));
    return !isIndex;
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
  #reactions = new WeakMap();

  constructor(component) {
    this.#component = component;
  }

  static activate(state) {
    return DataActivator.activate(state);
  }

  register(updateTarget, prop, source) {
    if (typeof source !== 'function') return;
    const state = this.#component.state;
    // Important: create a new bound reaction
    // to be able to use the same schema source reaction
    const reaction = () => source(state.model);
    const init = () => reaction();
    const update = () => (updateTarget[prop] = reaction());
    const target = { reaction, init, update };
    this.#reactions.set(source, reaction);
    return Dependency.invoke(target);
  }

  unregister(source) {
    if (typeof source !== 'function') return;
    const reaction = this.#reactions.get(source);
    const init = () => reaction();
    const target = { reaction, init };
    this.#reactions.delete(source);
    Dependency.invoke(target);
  }
}

// Debug deps
// setInterval(() => {
//   console.log(Dependency.deps);
// }, 3890);
