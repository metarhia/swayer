const bindText = (schema, element, initialText) => {
  Reflect.defineProperty(schema, 'text', {
    get() {
      return element.textContent;
    },
    set(value) {
      element.textContent = value;
    },
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
          },
        });
        styles[prop] = value;
      }
      stylesMap.set(element, styles);
    },
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
          },
        });
        attrs[attr] = value;
      }
      attrsMap.set(element, attrs);
    },
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
          },
        });
        events[event] = handler;
      }
      eventsMap.set(element, events);
    },
  });
  schema.events = initialEvents;
};

class ComponentChildren extends Array {
  static #preloadComponents;

  static async #loadChildSchema(child) {
    if (child.type === 'preload') {
      const { name, props } = child;
      return ComponentChildren.#preloadComponents[name](props);
    } else if (child.type === 'lazy') {
      const { path, props } = child;
      const module = await import(path);
      return module.default(props);
    }
    return child;
  }

  static setPreloadComponents(components) {
    ComponentChildren.#preloadComponents = components;
  }

  #parentSchema;
  #parentElement;
  #compile;

  constructor(parent, children, container, compile) {
    super(...children);
    this.#parentSchema = parent;
    this.#parentElement = container;
    this.#compile = compile;
    void this.#compileChildren(children);
  }

  #optimize(children) {
    children[Symbol.asyncIterator] = async function* () {
      for (const child of children) {
        yield new Promise((resolve) => setTimeout(() => resolve(child), 0));
      }
    };
  }

  async #compileChildren(children) {
    this.#optimize(children);
    for await (const child of children) {
      const schema = await ComponentChildren.#loadChildSchema(child);
      const index = children.indexOf(child);
      this.#parentSchema.children[index] = schema;
      schema.parent = this.#parentSchema;
      this.#compile(schema, this.#parentElement);
    }
  }

  async push(...schemas) {
    super.push(...schemas);
    await this.#compileChildren(schemas);
  }

  pop() {
    const lastChild = this.#parentElement.lastChild;
    this.#parentElement.removeChild(lastChild);
    super.pop();
  }
}

const compile = (schema, container) => {
  const {
    tag,
    text = '',
    styles = {},
    attrs = {},
    events = {},
    hooks = {},
    children = [],
  } = schema;
  const element = document.createElement(tag);
  bindText(schema, element, text);
  bindStyles(schema, element, styles);
  bindAttrs(schema, element, attrs);
  bindEvents(schema, element, events);
  schema.children = new ComponentChildren(schema, children, element, compile);
  if (container) container.appendChild(element);
  if (hooks.init) hooks.init.call(schema);
  return element;
};

export default async function bootstrap(mainComponent, preloadComponents) {
  ComponentChildren.setPreloadComponents(preloadComponents);
  const main = await mainComponent();
  const html = compile(main);
  document.documentElement.replaceWith(html);
}
