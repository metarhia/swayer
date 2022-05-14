import Reporter from './reporter.js';
import { isObject } from './utils.js';

const REACTIVITY_MAP = new WeakMap();
const IS_PROXY = Symbol();

const validateReaction = (reactionSrc) => {
  if (!isObject(reactionSrc)) return false;
  const entries = Object.entries(reactionSrc);
  return entries.length === 1
    && typeof entries[0][1] === 'function'
    && entries[0];
};

const runReactions = (data, reactor) => {
  const set = REACTIVITY_MAP.get(reactor).get(data.key);
  if (set) for (const reaction of set) reaction(data);
};

const createReactor = (target, react = runReactions) => {
  const reactor = new Proxy(target, {
    set: (target, key, value, receiver) => {
      const isSet = Reflect.set(target, key, value, receiver);
      react({ target, key, value }, reactor);
      return isSet;
    },
    deleteProperty: (target, key) => {
      const isDeleted = Reflect.deleteProperty(target, key);
      react({ key, isDelete: true });
      return isDeleted;
    },
  });
  target[IS_PROXY] = true;
  return reactor;
};

export default class Reactivity {
  #component;

  constructor(component) {
    this.#component = component;
  }

  static types = {
    value: 'value',
    factory: 'factory',
    index: 'index',
    array: 'array',
  };

  static IS_PROXY = IS_PROXY;

  register(reactionSrc, componentTarget, prop, setterType) {
    const source = validateReaction(reactionSrc);
    if (!source) return;
    const [path, calculation] = source;
    const prepared = this.#prepareTargetState(path);
    if (!prepared) return Reporter.warn('InvalidReactivityKey', source);
    const { target, key, value } = prepared;
    let map = REACTIVITY_MAP.get(target);
    if (!map) REACTIVITY_MAP.set(target, map = new Map());
    let set = map.get(key);
    if (!set) map.set(key, set = new Set());
    const setters = this.#createSetters(componentTarget, prop, calculation);
    const reaction = setters[setterType];
    set.add(reaction);
    reaction({ target, key, value, isInitial: true });
  }

  #prepareTargetState(path) {
    const keys = path.split('.');
    const heading = keys.slice(0, -2);
    const tail = keys.slice(-2);
    let context = this.#component.state;
    for (const key of heading) {
      context = context[key];
      if (!isObject(context)) return;
    }
    const valueKey = tail.pop();
    let targetKey = tail.pop();
    if (!targetKey) {
      targetKey = 'state';
      context = this.#component;
    }
    let target = context[targetKey];
    if (!isObject(target)) return;
    if (!target[IS_PROXY]) target = context[targetKey] = createReactor(target);
    return { target, key: valueKey, value: target[valueKey] };
  }

  #createSetters(componentTarget, prop, calculation) {
    const component = this.#component;
    const state = this.#component.state;

    // todo resolve issues with arrays
    const updateIndex = ({ key, value, isDelete }) => {
      const index = parseInt(key, 10);
      if (isNaN(index)) return;
      if (isDelete) return void componentTarget[prop].splice(index, 1);
      const result = calculation.call(component, value, state);
      const isFactory = typeof result === 'function';
      componentTarget[prop][index] = isFactory ? result(value) : result;
    };
    // temp
    const array = ({ value, isDelete }) => {
      const index = parseInt(prop, 10);
      if (isNaN(index)) return;
      if (isDelete) return void componentTarget.splice(index, 1);
      const result = calculation.call(component, value, state);
      const isFactory = typeof result === 'function';
      const item = isFactory ? result(value) : result;
      componentTarget.splice(index, 1, item);
    };
    return {
      value: ({ value }) => {
        componentTarget[prop] = calculation.call(component, value, state);
      },
      factory: ({ target, key, value, isInitial }) => {
        if (!value[IS_PROXY]) {
          const reactor = target[key] = createReactor(value, updateIndex);
          REACTIVITY_MAP.set(reactor, new Map());
        }
        if (!isInitial) {
          const factory = calculation.call(component, value, state);
          componentTarget[prop] = value.map(factory);
        }
      },
      index: updateIndex,
      array,
    };
  }
}
