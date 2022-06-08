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
const CLEAR_DESCENDANTS = Symbol();

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
  #reactivity;

  children;

  constructor({ schema, parent, binding }, componentManager) {
    const children = new ComponentChildren();
    this.children = children[CONSTRUCT_CHILDREN](componentManager);
    this.#schema = schema;
    this.#parent = parent;
    this.#binding = binding;
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
    this[CLEAR_DESCENDANTS]();
    if (this.#parent?.children) {
      const children = this.#parent.children;
      const index = children.indexOf(this);
      if (index > -1) Array.prototype.splice.call(children, index, 1);
    }
  }

  [CLEAR_DESCENDANTS]() {
    this.#removeReactivity();
    this.#channelManager.clearAllChannels(this.channels);
    const children = this.children;
    if (children) for (const child of children) child[CLEAR_DESCENDANTS]();
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
    this.styles = { ...(schema.styles || {}) };
    this.attrs = { ...(schema.attrs || {}) };
    this.attrs.style = { ...(schema.attrs?.style || {}) };
    this.props = { ...(schema.props || {}) };
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
    const reactivity = this.#reactivity = new Reactivity(this);
    const schema = this.#schema;
    const { style, ...attrs } = schema.attrs || {};
    this.#makeReactiveState(reactivity, schema);
    reactivity.register(this, 'text', schema.text);
    this.#addObjectReactivity(this, 'attrs', attrs);
    this.#addObjectReactivity(this.attrs, 'style', style);
    this.#addObjectReactivity(this, 'props', schema.props);
    this.#addObjectReactivity(this, 'styles', schema.styles);
    this.#addArrayReactivity(this, 'children', schema.children);
  }

  #makeReactiveState(reactivity, schema) {
    if (schema.state) this.state = reactivity.create(schema.state);
    else if (this.#parent?.state) this.state = this.#parent.state;
    else this.state = reactivity.create({});
  }

  #addObjectReactivity(target, prop, source) {
    if (!source) return;
    this.#reactivity.register(target, prop, source);
    const propTarget = target[prop];
    for (const [key, value] of Object.entries(source)) {
      this.#reactivity.register(propTarget, key, value);
    }
  }

  #addArrayReactivity(target, prop, source) {
    if (Array.isArray(source)) {
      const array = target[prop];
      return source.forEach(
        (child, i) => this.#reactivity.register(array, i, child),
      );
    }
    this.#reactivity.register(target, prop, source);
  }

  #removeReactivity() {
    const schema = this.#schema;
    const { style, ...attrs } = schema.attrs || {};
    this.#reactivity.unregister(schema.text);
    this.#removeObjectReactivity(attrs);
    this.#removeObjectReactivity(style);
    this.#removeObjectReactivity(schema.props);
    this.#removeObjectReactivity(schema.styles);
    this.#removeArrayReactivity(schema.children);
  }

  #removeObjectReactivity(source) {
    if (!source) return;
    this.#reactivity.unregister(source);
    for (const value of Object.values(source)) {
      this.#reactivity.unregister(value);
    }
  }

  #removeArrayReactivity(source) {
    if (Array.isArray(source)) {
      return source.forEach((child) => this.#reactivity.unregister(child));
    }
    this.#reactivity.unregister(source);
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
      parent: this.parent?.component,
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
