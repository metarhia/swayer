import MainComponent from '/app/main.js';
import PreloadComponents from '/app/preload.js';

const bindText = (schema, element, initialText) => {
  Reflect.defineProperty(schema, 'text', {
    get() {
      return element.textContent;
    },
    set(value) {
      element.textContent = value;
    }
  });
  schema.text = initialText;
};

const bindStyles = (schema, element, initialStyles) => {
  const stylesMap = new WeakMap();
  Reflect.defineProperty(schema, 'styles', {
    get() {
      return stylesMap.get(element);
    },
    set(styles) {
      for (const [prop, value] of Object.entries(styles)) {
        Reflect.defineProperty(styles, prop, {
          get() {
            return element.style[prop];
          },
          set(newValue) {
            element.style[prop] = newValue;
          }
        });
        styles[prop] = value;
      }
      stylesMap.set(element, styles);
    }
  });
  schema.styles = initialStyles;
};

const bindAttrs = (schema, element, initialAttrs) => {
  const attrsMap = new WeakMap();
  Reflect.defineProperty(schema, 'attrs', {
    get() {
      return attrsMap.get(element);
    },
    set(attrs) {
      for (const name of element.getAttributeNames()) {
        if (name !== 'style') element.removeAttribute(name);
      }
      for (const [attr, value] of Object.entries(attrs)) {
        Reflect.defineProperty(attrs, attr, {
          get() {
            return element.getAttribute(attr);
          },
          set(newValue) {
            if (newValue === true) element.setAttribute(attr, '');
            else if (newValue !== false) element.setAttribute(attr, newValue);
          }
        });
        attrs[attr] = value;
      }
      attrsMap.set(element, attrs);
    }
  });
  schema.attrs = initialAttrs;
};

const bindEvents = (schema, element, initialEvents) => {
  const eventsMap = new WeakMap();
  Reflect.defineProperty(schema, 'events', {
    get() {
      return eventsMap.get(element);
    },
    set(events) {
      for (const [event, handler] of Object.entries(events)) {
        let boundHandler = null;
        Reflect.defineProperty(events, event, {
          get() {
            return boundHandler;
          },
          set(newHandler) {
            if (boundHandler) element.removeEventListener(event, boundHandler);
            boundHandler = newHandler.bind(schema);
            element.addEventListener(event, boundHandler);
          }
        });
        events[event] = handler;
      }
      eventsMap.set(element, events);
    }
  });
  schema.events = initialEvents;
};

class ComponentChildren extends Array {

  static async #loadChildSchema(child) {
    if (child.type === 'preload') {
      const { name, props } = child;
      return PreloadComponents[name](props);
    } else if (child.type === 'lazy') {
      const { path, props } = child;
      const module = await import(path);
      return module.default(props);
    }
    return child;
  }

  #parentSchema;
  #parentElement;

  constructor(parent, children, container) {
    super(...children);
    this.#parentSchema = parent;
    this.#parentElement = container;
    void this.#compileChildren(children);
  }

  #compileChild(schema) {
    schema.parent = this.#parentSchema;
    compile(schema, this.#parentElement);
  }

  async #compileChildren(children) {
    for (const child of children) {
      const schema = await ComponentChildren.#loadChildSchema(child);
      const index = children.indexOf(child);
      this.#parentSchema.children[index] = schema;
      this.#compileChild(schema);
    }
  }

  push(...schemas) {
    void this.#compileChildren(schemas);
    super.push(...schemas);
  }

  pop() {
    const lastChild = this.#parentElement.lastChild;
    this.#parentElement.removeChild(lastChild);
    super.pop();
  }
}

const compile = (schema, container) => {
  const {
    tag, text = '', styles = {}, attrs = {},
    events = {}, hooks = {}, children = []
  } = schema;
  const element = document.createElement(tag);
  bindText(schema, element, text);
  bindStyles(schema, element, styles);
  bindAttrs(schema, element, attrs);
  bindEvents(schema, element, events);
  schema.children = new ComponentChildren(schema, children, element);
  if (container) container.appendChild(element);
  if (hooks.init) hooks.init.call(schema);
  return element;
};

const html = await compile(await MainComponent());
document.documentElement.replaceWith(html);
