import ChannelManager from './channels.js';
import ElementBinding from './element.js';
import EventManager from './events.js';
import {
  AttrsReflection,
  EventsReflection,
  InlineStyleReflection,
  PropsReflection,
  Reflector,
  TextReflection,
} from './reflection.js';

const CONSTRUCT_CHILDREN = Symbol('Internal children constructor');
const DESTROY_CHANNELS = Symbol('');

export class ComponentChildren extends Array {
  #compilerApi;

  [CONSTRUCT_CHILDREN](compilerApi) {
    this.#compilerApi = compilerApi;
    return this;
  }

  // @ts-ignore
  async push(...initSchemas) {
    const additions = await this.#compilerApi.addChildren(initSchemas);
    super.push(...additions);
    return additions;
  }

  pop() {
    const last = super.pop();
    last.destroy();
    return last;
  }

  // @ts-ignore
  async splice(start, deleteCount, ...schemas) {
    const insert = this.#compilerApi.insertChildren;
    const components = await insert(start, deleteCount, schemas);
    const deletions = super.splice(start, deleteCount, ...components);
    for (const component of deletions) component.destroy();
    return [deletions, components];
  }
}

class Component {
  #schema;
  #parent;
  #binding;
  #eventManager;
  #channelManager;

  children;

  constructor({ schema, parent, binding }, compilerApi) {
    this.children = new ComponentChildren()[CONSTRUCT_CHILDREN](compilerApi);
    this.#schema = schema;
    this.#parent = parent;
    this.#binding = binding;
    this.#setup();
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
    this.#binding.click();
  }

  focus() {
    this.#binding.focus();
  }

  blur() {
    this.#binding.blur();
  }

  destroy() {
    this.#binding.detach();
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

  #setup() {
    const schema = this.#schema;
    this.tag = schema.tag;
    this.meta = schema.meta;
    this.text = schema.text;
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
    this.#eventManager = new EventManager(this.#binding);
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
      new TextReflection(this, this.#binding),
      new InlineStyleReflection(this.attrs, this.#binding),
      new AttrsReflection(this, this.#binding),
      new PropsReflection(this, this.#binding),
      new EventsReflection(this, this.#binding, this.#eventManager),
    ]);
  }
}

export class ComponentContext {
  #webApi;

  schema;
  parent;
  binding;
  component;

  constructor(schema, parent, webApi) {
    this.#webApi = webApi;
    this.schema = schema;
    this.parent = parent;
  }

  createComponent(compilerApi) {
    this.binding = this.#createBinding();
    this.component = this.#createComponent(compilerApi);
    return this;
  }

  rehydrateComponent(node, compilerApi) {
    this.binding = this.#bindNode(node);
    this.component = this.#createComponent(compilerApi);
    return this;
  }

  #createComponent(compilerApi) {
    const contextData = {
      schema: this.schema,
      parent: this.parent?.component || null,
      binding: this.binding,
    };
    return new Component(contextData, compilerApi);
  }

  #createBinding() {
    const schema = this.schema;
    const { forNew, forText } = ElementBinding;
    if (schema instanceof String) return forText(schema, this.#webApi);
    return forNew(schema, this.#webApi);
  }

  #bindNode(node) {
    const schema = this.schema;
    return ElementBinding.forExisting(schema, node, this.#webApi);
  }
}
