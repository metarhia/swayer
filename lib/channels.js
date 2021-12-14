import { UnscopedChannelError } from './errors.js';

class EventEmitter {
  #events = new Map();
  #maxListenersCount = 20;

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
        EventEmitter.#tooManyListenersWarning(name, event.size);
      }
    } else {
      this.#events.set(name, new Set([fn]));
    }
  }

  once(name, fn) {
    const wrapper = (...args) => {
      this.remove(name, wrapper);
      return fn(...args);
    };
    this.on(name, wrapper);
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

  static #tooManyListenersWarning(eventName, count) {
    console.warn(
      `MaxListenersExceededWarning:
  Possible EventEmitter memory leak detected.
  ${count} listeners added.
  You should decrease a number of listeners for '${eventName}' event`
    );
  }
}

export default class ChannelManager {
  static #emitter = new EventEmitter();
  static #scopeDelimiter = 'ɵɵ';
  #context;

  setChannelsContext(component) {
    this.#context = component;
  }

  emitMessage(name, message = null, options = {}) {
    const scopes = this.#createScopes(name, options.scope);
    for (const scope of scopes) {
      for (const channel of ChannelManager.#emitter.events.keys()) {
        if (channel.startsWith(scope)) {
          ChannelManager.#emitter.emit(channel, message);
        }
      }
    }
  }

  clearAllChannels(channels) {
    if (!channels || typeof channels !== 'object') return;
    for (const [name, subscriber] of Object.entries(channels)) {
      this.clearChannel(name, subscriber);
    }
  }

  clearChannel(name, subscriber) {
    const scope = this.#createScope(name);
    ChannelManager.#emitter.remove(scope, subscriber);
    const noChannels = ChannelManager.#emitter.listenerCount(scope) === 0;
    if (noChannels) ChannelManager.#emitter.clear(scope);
  }

  bindAllChannels(channels) {
    if (!channels || typeof channels !== 'object') return;
    for (const [channel, subscriber] of Object.entries(channels)) {
      this.bindChannel(channel, subscriber);
    }
  }

  bindChannel(name, subscriber) {
    const scope = this.#createScope(name);
    const method = name.toLowerCase().endsWith('once') ? 'once' : 'on';
    const handler = (data) => subscriber.call(this.#context, data);
    this.#context.channels[name] = handler;
    ChannelManager.#emitter[method](scope, handler);
  }

  #createScopes(name, scopePath) {
    const createScope = this.#createScope.bind(this, name);
    if (Array.isArray(scopePath)) return scopePath.map(createScope);
    return [createScope(scopePath)];
  }

  #createScope(name, scopePath) {
    const base = this.#getDefaultUrl();
    const delimiter = ChannelManager.#scopeDelimiter;
    return String(name + delimiter + new URL(scopePath || base, base));
  }

  #getDefaultUrl() {
    const { tag, meta } = this.#context;
    if (meta?.url) return meta.url;
    throw new UnscopedChannelError(tag);
  }
}
