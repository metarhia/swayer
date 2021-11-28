import EventManager from './event-manager.js';
import {
  AttrsReflection,
  EventsReflection,
  InlineStyleReflection,
  PropsReflection,
  Reflector,
  TextReflection,
} from './reflection.js';

export const CONSTRUCT_CHILDREN = Symbol();

export class ComponentChildren extends Array {
  #createParentChildren;

  [CONSTRUCT_CHILDREN](createParentChildren) {
    this.#createParentChildren = createParentChildren;
    return this;
  }

  // @ts-ignore
  async push(...initSchemas) {
    const components = await this.#createParentChildren(initSchemas);
    super.push(...components);
    return components;
  }

  pop() {
    const last = super.pop();
    last.destroy();
    return last;
  }
}

export class Metacomponent {
  #schema;
  #elementBinding;
  #eventManager;

  constructor(schema, children, elementBinding) {
    this.#schema = schema;
    this.#elementBinding = elementBinding;
    this.#setup(schema, children);
    this.#createEventManager();
    this.#createReflection();
  }

  get original() {
    return this.#schema;
  }

  destroy() {
    this.#elementBinding.detach();
  }

  triggerCustomEvent(eventName, data = null) {
    return this.#eventManager.dispatchEvent(eventName, data);
  }

  #setup(schema, children) {
    this.children = children;
    this.tag = schema.tag || null;
    this.styles = schema.styles || {};
    this.attrs = schema.attrs || {};
    this.attrs.style = this.attrs.style || {};
    this.props = schema.props || {};
    this.state = schema.state || {};
    this.hooks = schema.hooks || {};
    this.events = schema.events || {};
  }

  #createEventManager() {
    this.#eventManager = new EventManager(this.#elementBinding);
    this.#eventManager.setEventsContext(this);
    this.#eventManager.setEvents(this.events);
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
