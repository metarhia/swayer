import Binding from './binding.js';
import ChannelManager from './channels.js';
import EventManager from './events.js';
import Reactivity from './reactivity.js';
import {
  AttrsReflection,
  ChildrenReflection,
  EventsReflection,
  InlineStyleReflection,
  PropsReflection,
  Reflector,
  TextReflection,
} from './reflection.js';

const CONSTRUCT_CHILDREN = Symbol();
const DESTROY_CHANNELS = Symbol();

class ComponentChildren extends Array {
  #manager;

  [CONSTRUCT_CHILDREN](componentManager) {
    this.#manager = componentManager;
    return this;
  }

  // @ts-ignore
  async push(...initSchemas) {
    const additions = await this.#manager.add(initSchemas);
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
    const components = await this.#manager.insert(start, deleteCount, schemas);
    const deletions = super.splice(start, deleteCount, ...components);
    for (const component of deletions) component.destroy();
    return [deletions, components];
  }

  // todo add   shift()
  // todo add   async unshift(...initSchemas)

  // todo add   async prepend('@namespaces/name#index', args)
  // todo add   async append('@namespaces/name#index', args)
  // todo add   async update('@namespaces/name#index', args, { select: (component) => {} }?)
  // todo add   remove('@namespaces/name#index', { select: (component) => {} }?)
}

class Component {
  #schema;
  #parent;
  #binding;
  #eventManager;
  #channelManager;
  #hasAdoptedParentState;

  children;

  constructor({ schema, parent, binding }, componentManager) {
    const children = new ComponentChildren();
    this.children = children[CONSTRUCT_CHILDREN](componentManager);
    this.#schema = schema;
    this.#parent = parent;
    this.#binding = binding;
    this.#hasAdoptedParentState = !schema.state && !!parent?.state;
    this.#setup();
    this.#createMethods();
    this.#createChannelManager();
    this.#createEventManager();
    this.#createReflection();
    this.#createReactivity();
  }

  get original() {
    return this.#schema;
  }

  emitMessage(channelName, data, options) {
    this.#channelManager.emitMessage(channelName, data, options);
  }

  emitEvent(eventName, data = null) {
    return this.#eventManager.emitEvent(eventName, data);
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
    // todo remove meta
    this.meta = schema.meta;
    // todo add namespaced urls support
    // this.name = schema.name;
    this.text = schema.text;
    this.config = schema.config || {};
    this.styles = schema.styles || {};
    this.attrs = schema.attrs || {};
    this.attrs.style = this.attrs.style || {};
    this.props = schema.props || {};
    this.state = schema.state || this.#parent?.state || {};
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
      new ChildrenReflection(this),
    ]);
  }

  #createReactivity() {
    const { value, factory, array } = Reactivity.types;
    const reactivity = new Reactivity(this);
    const schema = this.#schema;
    // todo add 'attrs', attrs?.style, 'props', 'styles'
    reactivity.register(schema.text, this, 'text', value);
    if (Array.isArray(schema.children)) {
      schema.children.forEach((child, i) => {
        reactivity.register(child, this.children, i, array);
      });
    } else {
      reactivity.register(schema.children, this, 'children', factory);
    }
    if (this.#hasAdoptedParentState && this.#parent.state !== this.state) {
      this.#parent.state = this.state;
    }
  }
}

export default class ComponentContext {
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

  createComponent(componentManager, existingNode) {
    this.binding = this.#createBinding(existingNode);
    this.component = this.#createComponent(componentManager);
    return this;
  }

  #createComponent(componentManager) {
    const contextData = {
      schema: this.schema,
      parent: this.parent?.component || null,
      binding: this.binding,
    };
    return new Component(contextData, componentManager);
  }

  #createBinding(existingNode) {
    const { forNew, forText, forExisting } = Binding;
    const schema = this.schema;
    if (existingNode) return forExisting(schema, existingNode, this.#webApi);
    if (schema instanceof String) return forText(schema, this.#webApi);
    return forNew(schema, this.#webApi);
  }
}
