import Reporter from './reporter.js';
import { isObject } from './utils.js';

class Reactivity {
  #reactions = new Set();

  createReaction(calculateValue, updateComponent) {
    const reaction = () => {
      const value = calculateValue();
      updateComponent(value);
      return value;
    };
    this.#reactions.add(reaction);
    return reaction;
  }

  runReactions() {
    for (const react of this.#reactions) react();
  }
}

const REACTIVITY_MAP = Symbol();

export default class ReactivityManager {

  registerReaction(component, target, updateComponent) {
    const [key, calculation] = Object.entries(target)[0];
    const state = component.state;
    const reactivity = state[REACTIVITY_MAP].get(key);
    if (!reactivity) return Reporter.warn('NoReactivityKey', { key, state });
    const calculateValue = calculation.bind(component, state);
    return reactivity.createReaction(calculateValue, updateComponent);
  }

  makeReactive(state) {
    if (Object.hasOwnProperty.call(state, REACTIVITY_MAP)) return state;
    const rootReactivityMap = state[REACTIVITY_MAP] = new Map();
    for (const [key, value] of Object.entries(state)) {
      const hash = key;
      const reactivity = new Reactivity();
      rootReactivityMap.set(hash, reactivity);
      if (isObject(value)) this.#recurState(value, hash, rootReactivityMap);
    }
    return this.#createStateReactor(state);
  }

  #recurState(state, parentHash, rootReactivityMap) {
    const localReactivityMap = state[REACTIVITY_MAP] = new Map();
    for (const [key, value] of Object.entries(state)) {
      const hash = `${parentHash}.${key}`;
      const reactivity = new Reactivity();
      localReactivityMap.set(key, reactivity);
      rootReactivityMap.set(hash, reactivity);
      if (isObject(value)) {
        this.#recurState(value, hash, rootReactivityMap);
        state[key] = this.#createStateReactor(value);
      }
    }
  }

  #createStateReactor(state) {
    const interceptor = {
      set(target, key, value, receiver) {
        const isSet = Reflect.set(target, key, value, receiver);
        const reactivity = target[REACTIVITY_MAP].get(key);
        if (reactivity) reactivity.runReactions();
        return isSet;
      },
    };
    return new Proxy(state, interceptor);
  }
}
