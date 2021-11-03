// todo implement intercomponent messaging
// todo implement style preprocessor
// todo implement AOT, refactor base compiler

const construct = Symbol();

class ComponentChildren extends Array {
  #parentSchema;
  #compiler;

  [construct](parent, compiler) {
    this.#parentSchema = parent;
    this.#compiler = compiler;
    if (parent.children) super.push(...parent.children);
    return this;
  }

  async push(...schemas) {
    super.push(...schemas);
    await this.#compiler.compileSchemaChildren(
      this.#parentSchema,
      schemas,
    );
    return schemas;
  }

  pop() {
    const last = super.pop();
    this.#compiler.platform.renderer.remove(last);
    return last;
  }
}

class Metacomponent {
  #compiler;
  #renderer;
  #schema;

  constructor(schema, compiler) {
    this.#schema = schema;
    this.#compiler = compiler;
    this.#renderer = compiler.platform.renderer;
    this.#construct();
  }

  get schema() {
    return this.#schema;
  }

  #construct() {
    const schema = this.#schema;
    const children = new ComponentChildren();
    schema.children = children[construct](schema, this.#compiler);
    schema.attrs = schema.attrs || {};
    schema.attrs.style = schema.attrs.style || {};
    schema.state = schema.state || {};
    schema.hooks = schema.hooks || {};
    schema.events = schema.events || {};
    schema.triggerCustomEvent = this.#triggerCustomEvent.bind(this);
  }

  #triggerCustomEvent(eventName, data = null) {
    const event = new CustomEvent(eventName, { bubbles: true, detail: data });
    return this.#renderer.dispatchEvent(this.#schema, event);
  }
}

class DomRenderer {
  #dom;
  #domListeners = new WeakMap();
  #domElements = new WeakMap();

  constructor(dom) {
    this.#dom = dom;
  }

  setText(schema, updateText) {
    const text = updateText ?? schema.text;
    const element = this.#domElements.get(schema);
    if (element) element.textContent = text;
  }

  getText(schema) {
    const element = this.#domElements.get(schema);
    return element ? element.textContent : '';
  }

  setInlineStyle(schema, updateProps) {
    const style = updateProps || schema.attrs.style;
    const element = this.#domElements.get(schema);
    if (!style || typeof style !== 'object') return;
    for (const [prop, value] of Object.entries(style)) {
      element.style[prop] = value;
    }
  }

  setInlineStyleValue(schema, prop, value) {
    const element = this.#domElements.get(schema);
    if (element) element.style[prop] = value;
  }

  getInlineStyles(schema, prop) {
    const element = this.#domElements.get(schema);
    if (element) return prop ? element.style[prop] : element.style;
    return null;
  }

  setAttributes(schema, updateAttrs) {
    const attrs = updateAttrs || schema.attrs;
    const element = this.#domElements.get(schema);
    if (!element || !attrs || typeof attrs !== 'object') return;
    const attrKeys = Object.keys(attrs);
    const attrNames = element.getAttributeNames();
    for (const name of attrNames) {
      if (!attrKeys.includes(name)) element.removeAttribute(name);
    }
    for (const [attr, value] of Object.entries(attrs)) {
      if (attr === 'style') this.setInlineStyle(schema, value);
      else if (value === true) element.setAttribute(attr, '');
      else if (value === false) element.removeAttribute(attr);
      else element.setAttribute(attr, value);
    }
  }

  setAttributeValue(schema, attr, value) {
    const element = this.#domElements.get(schema);
    if (element) {
      if (attr === 'style') this.setInlineStyle(schema, value);
      else if (value === true) element.setAttribute(attr, '');
      else if (value === false) element.removeAttribute(attr);
      else element.setAttribute(attr, value);
    }
  }

  getAttributes(schema, attr) {
    const element = this.#domElements.get(schema);
    if (element) {
      if (attr) return element.getAttribute(attr);
      const attributesReducer = (attrs, name) => {
        attrs[name] = element.getAttribute(name);
        return attrs;
      };
      return element
        .getAttributeNames()
        .reduce(attributesReducer, {});
    }
    return {};
  }

  setEvents(schema, updateEvents) {
    const events = updateEvents || schema.events;
    const element = this.#domElements.get(schema);
    if (!element || !events || typeof events !== 'object') return;
    const handlers = Object.keys(events);
    const listeners = this.#domListeners.get(schema) || new Map();
    if (!this.#domListeners.has(schema)) {
      this.#domListeners.set(schema, listeners);
    }
    for (const [eventName, listener] of listeners) {
      if (!handlers.includes(listener)) {
        element.removeEventListener(eventName, listener);
        listeners.delete(eventName);
      }
    }
    for (const [eventName, listener] of Object.entries(events)) {
      if (listeners.has(listener)) {
        element.removeEventListener(eventName, listener);
        listeners.delete(eventName);
      }
      const handler = (event) => {
        const result = event instanceof CustomEvent ? event.detail : event;
        listener.call(schema, result);
      };
      element.addEventListener(eventName, handler);
      listeners.set(eventName, handler);
      schema.events[eventName] = handler;
    }
  }

  setEventValue(schema, event, value) {
    const element = this.#domElements.get(schema);
    const listeners = this.#domListeners.get(schema);
    if (element && listeners) {
      let listener = listeners.get(event);
      if (listener) element.removeEventListener(event, listener);
      listener = value;
      const handler = (event) => {
        const result = event instanceof CustomEvent ? event.detail : event;
        listener.call(schema, result);
      };
      element.addEventListener(event, handler);
      listeners.set(event, handler);
    }
  }

  getEvents(schema) {
    const listeners = this.#domListeners.get(schema);
    if (listeners) return Object.fromEntries(listeners);
    return {};
  }

  dispatchEvent(schema, event) {
    const element = this.#domElements.get(schema);
    if (element) return element.dispatchEvent(event);
    return false;
  }

  setRoot(schema) {
    const root = this.#dom.documentElement;
    const element = this.#domElements.get(schema);
    if (root && element) root.replaceWith(element);
    else if (element) this.#dom.documentElement = element;
  }

  append(schema, parent) {
    const element = this.#domElements.get(schema);
    const container = this.#domElements.get(parent);
    if (container && element) container.appendChild(element);
  }

  remove(schema) {
    const element = this.#domElements.get(schema);
    if (element) {
      element.remove();
      this.#domElements.delete(schema);
    }
  }

  render(schema) {
    const element = this.#dom.createElement(schema.tag);
    this.#domElements.set(schema, element);
    this.setText(schema);
    this.setAttributes(schema);
    this.setEvents(schema);
    return element;
  }
}

class Reflection {
  #renderer;

  constructor(renderer) {
    this.#renderer = renderer;
  }

  static reflectProperty(target, prop, get, set) {
    Reflect.defineProperty(target, prop, {
      enumerable: true,
      get,
      set,
    });
  }

  static createObjectReflector(target, reflectProperty) {
    return new Proxy(target, {
      set: (targetObject, prop, value) => {
        targetObject[prop] = value;
        reflectProperty(prop, value);
        return true;
      },
    });
  }

  reflect(schema) {
    this.#reflectText(schema);
    this.#reflectEvents(schema);
    this.#reflectAttrs(schema);
    this.#reflectInlineStyle(schema);
  }

  #reflectText(schema) {
    let text = schema.text;
    Reflection.reflectProperty(schema, 'text',
      () => text,
      (value) => {
        text = value;
        this.#renderer.setText(schema, value);
      },
    );
  }

  #reflectEvents(schema) {
    const createReflector = (events) => Reflection.createObjectReflector(
      events,
      (event, value) => this.#renderer.setEventValue(schema, event, value),
    );
    let reflector = createReflector(schema.events);
    Reflection.reflectProperty(schema, 'events',
      () => reflector,
      (newEvents) => {
        reflector = createReflector(newEvents);
        this.#renderer.setEvents(schema, newEvents);
      },
    );
  }

  #reflectAttrs(schema) {
    const createReflector = (attrs) => Reflection.createObjectReflector(
      attrs,
      (attr, value) => this.#renderer.setAttributeValue(schema, attr, value),
    );
    let reflector = createReflector(schema.attrs);
    Reflection.reflectProperty(schema, 'attrs',
      () => reflector,
      (newAttrs) => {
        reflector = createReflector(newAttrs);
        this.#renderer.setAttributes(schema, newAttrs);
        if (newAttrs.style) this.#reflectInlineStyle(schema);
      },
    );
  }

  #reflectInlineStyle(schema) {
    const createReflector = (style) => Reflection.createObjectReflector(
      style,
      (prop, value) => this.#renderer.setInlineStyleValue(schema, prop, value),
    );
    let reflector = createReflector(schema.attrs.style);
    Reflection.reflectProperty(schema.attrs, 'style',
      () => reflector,
      (newStyle) => {
        reflector = createReflector(newStyle);
      },
    );
  }
}

class WebPlatform {
  api;
  renderer;
  reflection;

  constructor(api) {
    this.api = api;
    this.renderer = new DomRenderer(this.api.document);
    this.reflection = new Reflection(this.renderer);
  }
}

class Compiler {
  platform;

  constructor(platform) {
    this.platform = platform;
  }

  static async loadSchema(schema) {
    const { tag, path, base, args } = schema;
    if (!path && !tag) {
      const error = new Error(JSON.stringify(schema));
      error.name = 'Invalid metacomponent schema';
      throw error;
    }
    if (tag) return schema;
    let url = path.endsWith('.js') ? path : `${path}.js`;
    if (base) url = new URL(url, base);
    const module = await import(url);
    return module.default(args);
  }
}

class JIT extends Compiler {
  async compileMainSchema(bareSchema) {
    const schema = await this.createMetacomponent(bareSchema);
    const renderer = this.platform.renderer;
    const tag = schema.tag;
    if (tag === 'html') renderer.setRoot(schema);
    else throw new Error(`Root component schema must include { tag: 'html' }`);
    return this.compileSchemaChildren(schema);
  }

  async compileSchema(bareSchema) {
    const schema = await this.createMetacomponent(bareSchema);
    return this.compileSchemaChildren(schema);
  }

  async compileSchemaChildren(schema, appendChildren) {
    const children = appendChildren || schema.children;
    for (const child of children) {
      const compiledSchema = await this.compileSchema(child);
      const index = schema.children.indexOf(child);
      schema.children[index] = compiledSchema;
      this.platform.renderer.append(compiledSchema, schema);
    }
    if (!appendChildren && schema.hooks.init) schema.hooks.init.call(schema);
    return schema;
  }

  async createMetacomponent(bareSchema) {
    const loadedSchema = await Compiler.loadSchema(bareSchema);
    const { schema } = new Metacomponent(loadedSchema, this);
    this.platform.reflection.reflect(schema);
    this.platform.renderer.render(schema);
    return Object.seal(schema);
  }
}

export default async function bootstrap(main) {
  const platform = new WebPlatform(window);
  const compiler = new JIT(platform);
  await compiler.compileMainSchema(main);
}
