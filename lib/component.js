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

    const text = reactivity.register(component, 'text', schema.text);
    if (text) component.text = text;

    const props = schema.props;
    this.#addReferenceReactivity(component, 'props', props);
    this.#addPropsReactivity(component, 'props', props);

    const attrs = schema.attrs;
    this.#addReferenceReactivity(component, 'attrs', attrs);
    this.#addPropsReactivity(component, 'attrs', attrs);
    if (attrs?.style) {
      this.#addPropsReactivity(component.attrs, 'style', attrs.style);
    }

    // Make reactive only styles ref and styles.compute for performance reasons
    const styles = schema.styles;
    this.#addReferenceReactivity(component, 'styles', styles);
    if (styles?.compute) {
      this.#addReferenceReactivity(component.styles, 'compute', styles.compute);
      this.#addPropsReactivity(component.styles, 'compute', styles.compute);
    }
  }

  registerChildren(source) {
    const { schema: { children } } = this.#context;
    if (source === children) {
      return this.#reactivity.register(this.#context, 'children', children);
    }
    const index = children.indexOf(source);
    return this.#reactivity.register(this.#context.children, index, source);
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
    const { schema, component, module } = this.#context;
    if (schema.model) {
      component.model.state = Reactivity.activate(schema.model.state);
    } else if (module.schema.model) {
      component.model = module.schema.model;
    }
  }

  #addReferenceReactivity(target, prop, source) {
    if (!source) return;
    const value = this.#reactivity.register(target, prop, source);
    if (value) target[prop] = value;
  }

  #addPropsReactivity(target, prop, source) {
    if (!source) return;
    const propTarget = target[prop];
    for (const [key, value] of Object.entries(source)) {
      const propValue = this.#reactivity.register(propTarget, key, value);
      if (propValue) propTarget[key] = propValue;
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
    return this.#context.module.url;
  }

  get router() {
    const router = this.#context.router;
    return {
      go: (path) => router.go(path),
    };
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
    const init = Component.#initReactiveObject;
    const schema = this.#context.schema;
    this.tag = schema.tag;
    this.model = schema.model;
    this.text = schema.text;
    this.styles = init(schema.styles);
    this.styles.compute = init(schema.styles?.compute, []);
    this.attrs = init(schema.attrs);
    this.attrs.style = init(schema.attrs?.style);
    this.props = init(schema.props);
    this.events = init(schema.events);
    this.methods = schema.methods || {};
    this.hooks = schema.hooks || {};
    this.channels = schema.channels || {};
  }

  #createMethods() {
    const methods = this.methods;
    for (const method of Object.keys(methods)) {
      methods[method] = methods[method].bind(this);
    }
  }

  static #initReactiveObject(schemaValue, container = {}) {
    return isObject(schemaValue)
      ? { ...container, ...schemaValue }
      : container;
  }
}
