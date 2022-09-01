import EventEmitter from './emitter.js';

export default class ChannelManager {
  static #emitter = new EventEmitter();
  static #scopeDelimiter = '_';
  #component;
  #loader;

  constructor(component, loader) {
    this.#component = component;
    this.#loader = loader;
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
    const delimiter = ChannelManager.#scopeDelimiter;
    let path;
    if (scopePath) path = this.#loader.resolveNamespace(scopePath, true);
    else path = this.#component.moduleUrl;
    return String(name + delimiter + path);
  }
}
