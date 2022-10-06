import Reactivity from './reactivity.js';
import { isBrowser, isObject, isServer } from './utils.js';

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
    component.text = reactivity.register(component, 'text', schema.text);
    this.#addObjectReactivity(component, 'attrs', schema.attrs);
    this.#addObjectReactivity(component.attrs, 'style', schema.attrs?.style);
    this.#addObjectReactivity(component, 'props', schema.props);
    this.#addReferenceReactivity(component, 'styles', schema.styles);
    this.#addObjectReactivity(component.styles, 'compute', schema.styles?.compute);
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
    this.#reactivity.unregister(schema.text);
    this.#removeObjectReactivity(schema.attrs);
    this.#removeObjectReactivity(schema.attrs?.style);
    this.#removeObjectReactivity(schema.props);
    this.#reactivity.unregister(schema.styles);
    this.#removeObjectReactivity(schema.styles?.compute);
    this.#removeObjectReactivity(schema.children);
  }

  #activateState() {
    const component = this.#context.component;
    const parent = this.#context.parent?.component;
    if (component.state) component.state = Reactivity.activate(component.state);
    else if (parent?.state) component.state = Reactivity.activate(parent.state);
    else component.state = Reactivity.activate({});
  }

  #addReferenceReactivity(target, prop, source) {
    const obj = this.#reactivity.register(target, prop, source);
    if (obj) target[prop] = obj;
  }

  #addObjectReactivity(target, prop, source) {
    if (!source) return;
    this.#addReferenceReactivity(target, prop, source);
    const propTarget = target[prop];
    for (const [key, value] of Object.entries(source)) {
      const propObj = this.#reactivity.register(propTarget, key, value);
      if (propObj) propTarget[key] = propObj;
    }
  }

  #removeObjectReactivity(source) {
    if (!source) return;
    this.#reactivity.unregister(source);
    for (const value of Object.values(source)) {
      this.#reactivity.unregister(value);
    }
  }
}

const transferSchemaValue = (schemaValue, container = {}) =>
  isObject(schemaValue)
    ? Object.assign(container, schemaValue)
    : container;

export class Component {
  #context;

  constructor(context) {
    this.#context = context;
    this.#setup();
    this.#createMethods();
  }

  get isBrowser() {
    return isBrowser;
  }

  get isServer() {
    return isServer;
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
    this.styles = transferSchemaValue(schema.styles);
    this.styles.compute = transferSchemaValue(schema.styles?.compute, []);
    this.attrs = transferSchemaValue(schema.attrs);
    this.attrs.style = transferSchemaValue(schema.attrs?.style);
    this.props = transferSchemaValue(schema.props);
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
