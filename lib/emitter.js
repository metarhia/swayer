import Reporter from './reporter.js';

export default class EventEmitter {
  #events = new Map();
  #maxListenersCount = 500;

  get events() {
    return this.#events;
  }

  getMaxListeners() {
    return this.#maxListenersCount;
  }

  listenerCount(name) {
    const event = this.#events.get(name);
    if (event) return event.size;
    return 0;
  }

  on(name, fn) {
    const event = this.#events.get(name);
    if (event) {
      event.add(fn);
      if (event.size > this.#maxListenersCount) {
        const warnCtx = { eventName: name, count: event.size };
        Reporter.warn('MaxListenersExceeded', warnCtx);
      }
    } else {
      this.#events.set(name, new Set([fn]));
    }
  }

  once(name, fn) {
    const dispose = (...args) => {
      this.remove(name, dispose);
      return fn(...args);
    };
    this.on(name, dispose);
  }

  emit(name, ...args) {
    const event = this.#events.get(name);
    if (!event) return;
    for (const fn of event.values()) {
      fn(...args);
    }
  }

  remove(name, fn) {
    const event = this.#events.get(name);
    if (!event) return;
    if (event.has(fn)) event.delete(fn);
  }

  clear(name) {
    if (name) this.#events.delete(name);
  }

  purge() {
    this.#events.clear();
  }
}
