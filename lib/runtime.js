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


class SchemaLoader {
  async load(config) {
    const { tag, path, base, args } = config;
    if (!path && !tag) {
      const error = new Error(JSON.stringify(config));
      error.name = 'Invalid component loader config';
      throw error;
    }
    if (tag) return config;
    let url = path.endsWith('.js') ? path : `${path}.js`;
    if (base) url = new URL(url, base);
    const module = await import(url);
    return module.default(args);
  }
}

class ComponentChildren extends Array {
  #parent;
  #compiler;

  constructor(parent, compiler) {
    if (parent.schema.children) super(...parent.schema.children);
    else super();
    this.#parent = parent;
    this.#compiler = compiler;
  }

  async push(...inputSchemas) {
    const pushes = [];
    const renderer = this.#compiler.platform.renderer;
    for (const inputSchema of inputSchemas) {
      const component = await this.#compiler.compileSchema(inputSchema);
      component.parent = this.#parent;
      renderer.appendComponent(component, this.#parent);
      pushes.push(component.schema);
      super.push(component.schema);
    }
    return pushes;
  }

  pop() {
    // const last = super.pop();
    // this.#compiler.platform.renderer.removeComponent(last);
    // return last;
  }
}

class Metacomponent {
  #compiler;
  #renderer;
  #parent;
  #schema;

  constructor(schema, compiler) {
    this.#schema = schema;
    this.#compiler = compiler;
    this.#renderer = compiler.platform.renderer;
    this.#extendSchema();
    this.#renderer.render(this);
  }

  get schema() {
    return this.#schema;
  }

  get parent() {
    return this.#parent;
  }

  set parent(component) {
    this.#parent = component;
    this.#schema.parent = component.schema;
  }

  #extendSchema() {
    this.#schema.children = new ComponentChildren(this, this.#compiler);
    for (const child of this.#schema.children) child.parent = this.#schema;
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

  setText(component, updateText) {
    const schema = component.schema;
    const text = updateText ?? schema.text;
    const element = this.#domElements.get(component);
    if (typeof text === 'string') element.textContent = text;
  }

  getText(component) {
    const element = this.#domElements.get(component);
    return element ? element.textContent : null;
  }

  setInlineStyles(component) {
    const schema = component.schema;
    const style = schema.attrs.style;
    const element = this.#domElements.get(component);
    if (!style || typeof style !== 'object') return;
    for (const [prop, value] of Object.entries(style)) {
      element.style[prop] = value;
    }
  }

  setAttributes(component) {
    const schema = component.schema;
    const attrs = schema.attrs;
    const element = this.#domElements.get(component);
    if (!element || !attrs || typeof attrs !== 'object') return;
    const attrKeys = Object.keys(attrs);
    const attrNames = element.getAttributeNames();
    for (const name of attrNames) {
      if (!attrKeys.includes(name)) element.removeAttribute(name);
    }
    for (const [attr, value] of Object.entries(attrs)) {
      if (attr === 'style') this.setInlineStyles(component);
      else if (value === true) element.setAttribute(attr, '');
      else if (value === false) element.removeAttribute(attr);
      else element.setAttribute(attr, value);
    }
  }

  setEvents(component) {
    const schema = component.schema;
    const events = schema.events;
    const element = this.#domElements.get(component);
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

  setRootComponent(component) {
    const root = this.#dom.documentElement;
    const element = this.#domElements.get(component);
    if (root && element) root.replaceWith(element);
    else if (element) this.#dom.documentElement = element;
  }

  appendComponent(component, parent) {
    const element = this.#domElements.get(component);
    const container = this.#domElements.get(parent);
    if (container && element) container.appendChild(element);
  }

  removeComponent(component) {
    const element = this.#domElements.get(component);
    if (element) element.remove();
  }

  // insertNext(sibling, element) {
  //   element.parentElement.insertBefore(sibling, element.nextElementSibling);
  // }

  render(component) {
    const element = this.#dom.createElement(component.schema.tag);
    this.#domElements.set(component, element);
    this.setText(component);
    this.setAttributes(component);
    this.setEvents(component);
  }
}

class Reflection {
  #renderer;

  constructor(renderer) {
    this.#renderer = renderer;
  }

  bind(component) {
    const { schema } = component;
    Object.defineProperties(schema, {
      'text': {
        get: () => this.#renderer.getText(component),
        set: (value) => {
          this.#renderer.setText(component, value);
        },
      },
    });
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
  schemaLoader;

  constructor(platform) {
    this.platform = platform;
    this.schemaLoader = new SchemaLoader();
  }
}

class JIT extends Compiler {
  async compileMainSchema(inputSchema) {
    const component = await this.#createComponent(inputSchema);
    const renderer = this.platform.renderer;
    const tag = component.schema.tag;
    if (tag === 'html') renderer.setRootComponent(component);
    else throw new Error(`Root component must have { tag: 'html' }`);
    return this.#compileComponent(component);
  }

  async compileSchema(inputSchema) {
    const component = await this.#createComponent(inputSchema);
    return this.#compileComponent(component);
  }

  async #compileComponent(component) {
    const { schema } = component;
    for (const child of schema.children) {
      const childComponent = await this.compileSchema(child);
      const index = schema.children.indexOf(child);
      schema.children[index] = childComponent.schema;
      childComponent.parent = component;
      this.platform.renderer.appendComponent(childComponent, component);
    }
    if (schema.hooks.init) schema.hooks.init.call(schema);
    return component;
  }

  async #createComponent(inputSchema) {
    const schema = await this.schemaLoader.load(inputSchema);
    const component = new Metacomponent(schema, this);
    this.platform.reflection.bind(component);
    return component;
  }
}

// todo implement
class AOT extends Compiler {
}

export default async function bootstrap(main) {
  const platform = new WebPlatform(window);
  const compiler = new JIT(platform);
  await compiler.compileMainSchema(main);
}
