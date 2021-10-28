// const bindText = (schema, element, initialText) => {
//   Reflect.defineProperty(schema, 'text', {
//     get() {
//       return element.textContent;
//     },
//     set(value) {
//       element.textContent = value;
//     },
//   });
//   schema.text = initialText;
// };
//
// const bindStyles = (schema, element, initialStyles) => {
//   const stylesMap = new WeakMap();
//   Reflect.defineProperty(schema, 'styles', {
//     get() {
//       return stylesMap.get(element);
//     },
//     set(styles) {
//       for (const [prop, value] of Object.entries(styles)) {
//         Reflect.defineProperty(styles, prop, {
//           get() {
//             return element.style[prop];
//           },
//           set(newValue) {
//             element.style[prop] = newValue;
//           },
//         });
//         styles[prop] = value;
//       }
//       stylesMap.set(element, styles);
//     },
//   });
//   schema.styles = initialStyles;
// };
//
// const bindAttrs = (schema, element, initialAttrs) => {
//   const attrsMap = new WeakMap();
//   Reflect.defineProperty(schema, 'attrs', {
//     get() {
//       return attrsMap.get(element);
//     },
//     set(attrs) {
//       for (const name of element.getAttributeNames()) {
//         if (name !== 'style') element.removeAttribute(name);
//       }
//       for (const [attr, value] of Object.entries(attrs)) {
//         Reflect.defineProperty(attrs, attr, {
//           get() {
//             return element.getAttribute(attr);
//           },
//           set(newValue) {
//             if (newValue === true) element.setAttribute(attr, '');
//             else if (newValue !== false) element.setAttribute(attr, newValue);
//           },
//         });
//         attrs[attr] = value;
//       }
//       attrsMap.set(element, attrs);
//     },
//   });
//   schema.attrs = initialAttrs;
// };
//
// const bindEvents = (schema, element, initialEvents) => {
//   const eventsMap = new WeakMap();
//   Reflect.defineProperty(schema, 'events', {
//     get() {
//       return eventsMap.get(element);
//     },
//     set(events) {
//       for (const [event, handler] of Object.entries(events)) {
//         let boundHandler = null;
//         Reflect.defineProperty(events, event, {
//           get() {
//             return boundHandler;
//           },
//           set(newHandler) {
//             if (boundHandler) element.removeEventListener(event, boundHandler);
//             boundHandler = newHandler.bind(schema);
//             element.addEventListener(event, boundHandler);
//           },
//         });
//         events[event] = handler;
//       }
//       eventsMap.set(element, events);
//     },
//   });
//   schema.events = initialEvents;
// };


// todo events
// use CustomEvents => schema.input(data), schema.output(data)


const setInternals = Symbol();

class ComponentChildren extends Array {
  #parentSchema;
  #compiler;

  [setInternals](parent, compiler) {
    this.#parentSchema = parent;
    this.#compiler = compiler;
    if (parent.children) super.push(...parent.children);
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
    this.#extendSchema();
  }

  get schema() {
    return this.#schema;
  }

  #extendSchema() {
    const componentChildren = new ComponentChildren();
    componentChildren[setInternals](this.#schema, this.#compiler);
    this.#schema.children = componentChildren;
    this.#schema.hooks = this.#schema.hooks || {};
    this.#schema.attrs = this.#schema.attrs || {};
    this.#schema.testMethod = () => this.#testMethod();
  }

  #testMethod() {
    console.log('Hello from runtime');
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
    if (typeof text === 'string') element.textContent = text;
  }

  getText(schema) {
    const element = this.#domElements.get(schema);
    return element ? element.textContent : null;
  }

  setInlineStyles(schema, updateStyle) {
    const style = updateStyle || schema.attrs.style;
    const element = this.#domElements.get(schema);
    if (!style || typeof style !== 'object') return;
    for (const [prop, value] of Object.entries(style)) {
      element.style[prop] = value;
    }
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
      if (attr === 'style') this.setInlineStyles(schema);
      else if (value === true) element.setAttribute(attr, '');
      else if (value === false) element.removeAttribute(attr);
      else element.setAttribute(attr, value);
    }
  }

  setAttributeValue(schema, attr, value) {
    const element = this.#domElements.get(schema);
    if (element) {
      if (value === true) element.setAttribute(attr, '');
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
  }

  setEvents(schema) {
    const events = schema.events;
    const element = this.#domElements.get(schema);
    if (!element || !events || typeof events !== 'object') return;
    const handlers = Object.keys(events);
    const listeners = this.#domListeners.get(element) || new Map();
    if (!this.#domListeners.has(element)) {
      this.#domListeners.set(element, listeners);
    }
    for (const [event, listener] of listeners) {
      if (!handlers.includes(listener)) {
        element.removeEventListener(event, listener);
        listeners.delete(event);
      }
    }
    for (const [event, handler] of Object.entries(events)) {
      if (listeners.has(handler)) {
        element.removeEventListener(event, handler);
        listeners.delete(event);
      } else {
        const bound = handler.bind(schema);
        element.addEventListener(event, bound);
        listeners.set(event, bound);
        schema.events[event] = bound;
      }
    }
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
  }
}

class Reflection {
  #renderer;

  constructor(renderer) {
    this.#renderer = renderer;
  }

  bind(schema) {
    Object.defineProperties(schema, {
      text: this.#createTextDescriptor(schema),
      attrs: this.#createAttributesDescriptor(schema),
    });
  }

  #createTextDescriptor(schema) {
    return {
      get: () => this.#renderer.getText(schema),
      set: (value) => {
        this.#renderer.setText(schema, value);
      },
    };
  }

  #createAttributesDescriptor(schema) {
    const descriptorsReducer = (descriptors, attr) => {
      descriptors[attr] = {
        get: () => this.#renderer.getAttributes(schema, attr),
        set: (value) => {
          this.#renderer.setAttributeValue(schema, attr, value);
        },
      };
      return descriptors;
    };
    return {
      get: () => this.#renderer.getAttributes(schema),
      set: (attrs) => {
        const initDescriptors = {
          style: this.#createInlineStylesDescriptor(schema)
        };
        const names = Object.keys(attrs).filter((attr) => attr !== 'style');
        const descriptors = names.reduce(descriptorsReducer, initDescriptors);
        Object.defineProperties(attrs, descriptors);
        this.#renderer.setAttributes(schema, attrs);
      },
    };
  }

  #createInlineStylesDescriptor(schema) {
    const descriptorsReducer = (descriptors, prop) => {
      descriptors[prop] = {
        get: () => this.#renderer.getInlineStyles(schema, prop),
        set: (value) => {
          this.#renderer.setInlineStyles(schema, { [prop]: value });
        },
      };
      return descriptors;
    };
    return {
      get: () => this.#renderer.getInlineStyles(schema),
      set: (props) => {
        const names = Object.keys(props);
        const descriptors = names.reduce(descriptorsReducer, {});
        Object.defineProperties(props, descriptors);
        this.#renderer.setInlineStyles(schema, props);
      },
    };
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
    this.platform.renderer.render(schema);
    this.platform.reflection.bind(schema);
    return Object.seal(schema);
  }
}

// todo implement, refactor base
class AOT extends Compiler {
}

export default async function bootstrap(main) {
  const platform = new WebPlatform(window);
  const compiler = new JIT(platform);
  await compiler.compileMainSchema(main);
}
