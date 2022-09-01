import Reactivity from './reactivity.js';

export class ReactivityManager {
  #context;
  #reactivity;

  constructor(context) {
    this.#context = context;
    this.#reactivity = new Reactivity(context.component);
    this.#activateState();
  }

  registerReactivity() {
    const { schema, component } = this.#context;
    const reactivity = this.#reactivity;
    const { style, ...attrs } = schema.attrs || {};
    component.text = reactivity.register(component, 'text', schema.text);
    this.#addObjectReactivity(component, 'attrs', attrs);
    this.#addObjectReactivity(component.attrs, 'style', style);
    this.#addObjectReactivity(component, 'props', schema.props);
    this.#addObjectReactivity(component, 'styles', schema.styles);
  }

  registerChildren() {
    const { schema } = this.#context;
    return this.#reactivity.register(this.#context, 'children', schema.children);
  }

  registerChild(index, reaction) {
    return this.#reactivity.register(this.#context.children, index, reaction);
  }

  removeReactivity() {
    const schema = this.#context.schema;
    const { style, ...attrs } = schema.attrs || {};
    this.#reactivity.unregister(schema.text);
    this.#removeObjectReactivity(attrs);
    this.#removeObjectReactivity(style);
    this.#removeObjectReactivity(schema.props);
    this.#removeObjectReactivity(schema.styles);
    this.#removeArrayReactivity(schema.children);
  }

  #activateState() {
    const component = this.#context.component;
    const parent = this.#context.parent?.component;
    if (component.state) component.state = Reactivity.activate(component.state);
    else if (parent?.state) component.state = Reactivity.activate(parent.state);
    else component.state = Reactivity.activate({});
  }

  #addObjectReactivity(target, prop, source) {
    if (!source) return;
    const obj = this.#reactivity.register(target, prop, source);
    if (obj) target[prop] = obj;
    const propTarget = target[prop];
    for (const [key, value] of Object.entries(source)) {
      target[prop][key] = this.#reactivity.register(propTarget, key, value);
    }
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

export class Component {
  #context;

  constructor(context) {
    this.#context = context;
    this.#setup();
    this.#createMethods();
  }

  get moduleUrl() {
    return this.#context.moduleUrl;
  }

  emitMessage(channelName, data, options) {
    this.#context.channelManager.emitMessage(channelName, data, options);
  }

  emitEvent(eventName, data = null) {
    return this.#context.eventManager.emitEvent(eventName, data);
  }

  click() {
    this.#context.binding.click();
  }

  focus() {
    this.#context.binding.focus();
  }

  blur() {
    this.#context.binding.blur();
  }

  #setup() {
    const schema = this.#context.schema;
    this.tag = schema.tag;
    this.state = schema.state;
    this.text = schema.text;
    this.styles = { ...(schema.styles || {}) };
    this.attrs = { ...(schema.attrs || {}) };
    this.attrs.style = { ...(schema.attrs?.style || {}) };
    this.props = { ...(schema.props || {}) };
    this.methods = schema.methods || {};
    this.hooks = schema.hooks || {};
    this.events = schema.events || {};
    this.channels = schema.channels || {};
  }

  #createMethods() {
    const methods = this.methods;
    for (const method of Object.keys(methods)) {
      methods[method] = methods[method].bind(this);
    }
  }
}
