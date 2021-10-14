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
  Reflect.defineProperty(schema, 'styles', {
    get() {
      return element.style;
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
            element.setAttribute(attr, newValue);
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

async function loadAndExecuteEsmModule(path, props = {}) {
  return (await import(path)).default(props);
}

const compile = async (schema, container) => {
  const {tag, text, styles, attrs, events, hooks, children} = schema;
  const element = document.createElement(tag);
  if (text) bindText(schema, element, text);
  if (styles) bindStyles(schema, element, styles);
  if (attrs) bindAttrs(schema, element, attrs);
  if (events) bindEvents(schema, element, events);
  if (children) {
    for (const child of children) {
      if (child.type === 'dynamic') {
        const subSchema = await loadAndExecuteEsmModule(child.path, child.props);
        subSchema.parent = schema;
        await compile(subSchema, element);
      } else {
        child.parent = schema;
        await compile(child, element);
      }
    }
  }
  if (container) container.appendChild(element);
  if (hooks?.init) hooks.init.call(schema);
  return element;
};

const entrySchema = await loadAndExecuteEsmModule('../app/components/pages/index.js', { title: 'MetaTitle' });
const html = await compile(entrySchema);
document.documentElement.replaceWith(html);
