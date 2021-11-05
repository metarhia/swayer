export default class DomRenderer {
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
      return element.getAttributeNames().reduce(attributesReducer, {});
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

  append(parent, ...schemas) {
    const elements = schemas.map((schema) => this.#domElements.get(schema));
    const container = this.#domElements.get(parent);
    if (container && elements.length > 0) container.append(...elements);
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
