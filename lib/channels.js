import EventEmitter from './emitter.js';
import Reporter from './reporter.js';

export default class ChannelManager {
  static #emitter = new EventEmitter();
  static #scopeDelimiter = 'ɵɵ';
  #component;

  constructor(component) {
    this.#component = component;
    this.#bindAllChannels();
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

  clearAllChannels() {
    const channels = this.#component.channels;
    if (!channels || typeof channels !== 'object') return;
    for (const [name, subscriber] of Object.entries(channels)) {
      this.#clearChannel(name, subscriber);
    }
  }

  #clearChannel(name, subscriber) {
    const scope = this.#createScope(name);
    ChannelManager.#emitter.remove(scope, subscriber);
    const noChannels = ChannelManager.#emitter.listenerCount(scope) === 0;
    if (noChannels) ChannelManager.#emitter.clear(scope);
  }

  #bindAllChannels() {
    const channels = this.#component.channels;
    if (!channels || typeof channels !== 'object') return;
    for (const [channel, subscriber] of Object.entries(channels)) {
      this.#bindChannel(channel, subscriber);
    }
  }

  #bindChannel(name, subscriber) {
    const scope = this.#createScope(name);
    const method = name.toLowerCase().endsWith('once') ? 'once' : 'on';
    const handler = (data) => subscriber.call(this.#component, data);
    this.#component.channels[name] = handler;
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
    const { tag, meta } = this.#component;
    if (meta?.url) return meta.url;
    throw Reporter.error('UnscopedChannel', tag);
  }
}
