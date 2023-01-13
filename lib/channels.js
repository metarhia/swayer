import EventEmitter from './emitter.js';
import { is } from './utils.js';

const COMPONENT = Symbol('component');

class MessageEmitter extends EventEmitter {
  emit(name, message, select) {
    const eventSet = this.events.get(name);
    if (!eventSet) return;
    if (select) {
      const components = [...eventSet].map((fn) => fn[COMPONENT]);
      let index = 0;
      for (const fn of eventSet) {
        const component = fn[COMPONENT];
        const isSelected = select(component, index++, components);
        if (isSelected) fn(message);
      }
      return;
    }
    for (const fn of eventSet) fn(message);
  }
}

export default class ChannelManager {
  static #emitter = new MessageEmitter();
  static #scopeDelimiter = '_';
  #component;
  #loader;

  constructor(context, loader) {
    this.#component = context.component;
    this.#loader = loader;
    this.#bindAllChannels();
  }

  emitMessage(name, message = null, options = {}) {
    const emitter = ChannelManager.#emitter;
    const { scope, select } = options;
    const scopes = this.#createScopes(name, scope);
    const channels = emitter.events.keys();
    for (const scope of scopes) {
      for (const channel of channels) {
        if (!channel.startsWith(scope)) continue;
        emitter.emit(channel, message, select);
      }
    }
  }

  clearAllChannels() {
    const channels = this.#component.channels;
    if (!is.obj(channels)) return;
    for (const [channel, subscriber] of Object.entries(channels)) {
      this.#clearChannel(channel, subscriber);
    }
  }

  #clearChannel(channel, subscriber) {
    const scope = this.#createScope(channel);
    ChannelManager.#emitter.remove(scope, subscriber);
    const noChannels = ChannelManager.#emitter.listenerCount(scope) === 0;
    if (noChannels) ChannelManager.#emitter.clear(scope);
  }

  #bindAllChannels() {
    const channels = this.#component.channels;
    if (!is.obj(channels)) return;
    for (const [channel, subscriber] of Object.entries(channels)) {
      this.#bindChannel(channel, subscriber);
    }
  }

  #bindChannel(channel, subscriber) {
    const scope = this.#createScope(channel);
    const method = channel.toLowerCase().endsWith('once') ? 'once' : 'on';
    const handler = subscriber.bind(this.#component);
    const listener = ChannelManager.#emitter[method](scope, handler);
    listener[COMPONENT] = this.#component;
    this.#component.channels[channel] = listener;
  }

  #createScopes(channel, scopePath) {
    const createScope = this.#createScope.bind(this, channel);
    if (is.arr(scopePath)) return scopePath.map(createScope);
    return [createScope(scopePath)];
  }

  #createScope(channel, scopePath) {
    const delimiter = ChannelManager.#scopeDelimiter;
    let path;
    if (scopePath) path = this.#loader.resolveNamespace(scopePath, true);
    else path = this.#component.moduleUrl;
    return String(channel + delimiter + path);
  }
}

