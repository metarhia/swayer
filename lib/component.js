import ChannelManager from './channels.js';
import EventManager from './events.js';
import {
  AttrsReflection,
  EventsReflection,
  InlineStyleReflection,
  PropsReflection,
  Reflector,
  TextReflection,
} from './reflection.js';

const CONSTRUCT_CHILDREN = Symbol.for('CONSTRUCT_CHILDREN');
const DESTROY_CHANNELS = Symbol();

export class ComponentChildren extends Array {
  #addChildren;
  #insertChildren;

  [CONSTRUCT_CHILDREN]({ addChildren, insertChildren }) {
    this.#addChildren = addChildren;
    this.#insertChildren = insertChildren;
    return this;
  }

  // @ts-ignore
  async push(...initSchemas) {
    const components = await this.#addChildren(initSchemas);
    super.push(...components);
    return components;
  }

  pop() {
    const last = super.pop();
    last.destroy();
    return last;
  }

  // @ts-ignore
  async splice(start, deleteCount, ...replacements) {
    const hasReplacements = replacements.length > 0;
    const components = hasReplacements
      ? await this.#insertChildren(start, deleteCount, replacements)
      : [];
    const deletions = super.splice(start, deleteCount, ...components);
    deletions.forEach((deletion) => deletion.destroy());
    return deletions;
  }
}

export class Component {
  #schema;
  #parent;
  #elementBinding;
  #eventManager;
  #channelManager;
  children;

  constructor(schema, parent, elementBinding) {
    this.#schema = schema;
    this.#parent = parent;
    this.#elementBinding = elementBinding;
    this.#setup(schema);
    this.#createMethods();
    this.#createChannelManager();
    this.#createEventManager();
    this.#createReflection();
  }

  get original() {
    return this.#schema;
  }

  emitMessage(channelName, data, options) {
    this.#channelManager.emitMessage(channelName, data, options);
  }

  emitCustomEvent(eventName, data = null) {
    return this.#eventManager.emitCustomEvent(eventName, data);
  }

  click() {
    this.#elementBinding.click();
  }

  focus() {
    this.#elementBinding.focus();
  }

  blur() {
    this.#elementBinding.blur();
  }

  destroy() {
    this.#elementBinding.detach();
    this[DESTROY_CHANNELS]();
    if (this.#parent?.children) {
      const children = this.#parent.children;
      const index = children.indexOf(this);
      if (index > -1) Array.prototype.splice.call(children, index, 1);
    }
  }

  [DESTROY_CHANNELS]() {
    this.#channelManager.clearAllChannels(this.channels);
    const children = this.children;
    if (children) for (const child of children) child[DESTROY_CHANNELS]();
  }

  #setup(schema) {
    this.tag = schema.tag;
    this.meta = schema.meta;
    this.styles = schema.styles || {};
    this.attrs = schema.attrs || {};
    this.attrs.style = this.attrs.style || {};
    this.props = schema.props || {};
    this.state = schema.state || {};
    this.methods = schema.methods || {};
    this.hooks = schema.hooks || {};
    this.events = schema.events || {};
    this.channels = schema.channels || {};
  }

  #createEventManager() {
    this.#eventManager = new EventManager(this.#elementBinding);
    this.#eventManager.setEventsContext(this);
    this.#eventManager.setEvents(this.events);
  }

  #createChannelManager() {
    this.#channelManager = new ChannelManager();
    this.#channelManager.setChannelsContext(this);
    this.#channelManager.bindAllChannels(this.channels);
  }

  #createMethods() {
    const methods = this.methods;
    for (const method of Object.keys(methods)) {
      methods[method] = methods[method].bind(this);
    }
  }

  #createReflection() {
    Reflector.reflect([
      new TextReflection(this, this.#elementBinding),
      new InlineStyleReflection(this.attrs, this.#elementBinding),
      new AttrsReflection(this, this.#elementBinding),
      new PropsReflection(this, this.#elementBinding),
      new EventsReflection(this, this.#elementBinding, this.#eventManager),
    ]);
  }
}
