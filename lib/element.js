import { BadRootSchemaError } from './errors.js';

export default class ElementBinding {
  static id = 0;
  #schema;
  #element;
  #webApi;
  #id;

  constructor(schema, element, webApi) {
    this.#schema = schema;
    this.#element = element;
    this.#webApi = webApi;
    this.#id = ++ElementBinding.id;
  }

  get id() {
    return this.#id;
  }

  static forExisting(schema, existingElement, webApi) {
    return new ElementBinding(schema, existingElement, webApi);
  }

  static forNew(schema, webApi) {
    const newElement = webApi.document.createElement(schema.tag);
    const binding = new ElementBinding(schema, newElement, webApi);
    const { text, props, attrs } = schema;
    binding.setText(text);
    binding.setProperties(props);
    binding.setAttributes(attrs);
    return binding;
  }

  get element() {
    return this.#element;
  }

  setText(text) {
    const value = text ?? '';
    this.#element.textContent = value.toString();
  }

  getText() {
    return this.#element.textContent;
  }

  setProperties(props) {
    if (!props || typeof props !== 'object') return;
    for (const [prop, value] of Object.entries(props)) {
      this.#element[prop] = value;
    }
  }

  getProperties() {
    const props = this.#schema.props;
    if (!props || typeof props !== 'object') return;
    const keys = Object.keys(props);
    if (keys.length === 0) return;
    const propsReducer = (props, prop) => {
      props[prop] = this.#element[prop];
      return props;
    };
    return keys.reduce(propsReducer, {});
  }

  setProperty(prop, value) {
    this.#element[prop] = value;
  }

  getProperty(prop) {
    return this.#element[prop];
  }

  setInlineStyle(props) {
    if (!props || typeof props !== 'object') return;
    for (const [prop, value] of Object.entries(props)) {
      this.#element.style[prop] = value;
    }
  }

  getInlineStyle() {
    return this.#element.style;
  }

  setInlineStyleProperty(prop, value) {
    this.#element.style[prop] = value;
  }

  getInlineStyleProperty(prop) {
    return this.#element.style[prop];
  }

  setAttributes(attrs) {
    if (!attrs || typeof attrs !== 'object') return;
    const attrKeys = Object.keys(attrs);
    const attrNames = this.#element.getAttributeNames();
    for (const name of attrNames) {
      if (name === 'class') {
        const noMetaClasses = (className) => !className.startsWith('meta-');
        const classes = Array.from(this.#element.classList);
        const classNames = classes.filter(noMetaClasses);
        this.toggleClasses(classNames, false);
      } else if (!attrKeys.includes(name)) {
        this.#element.removeAttribute(name);
      }
    }
    for (const [attr, value] of Object.entries(attrs)) {
      if (attr === 'style') this.setInlineStyle(value);
      else if (attr === 'class') this.toggleClasses(value, true);
      else if (value === true) this.#element.setAttribute(attr, '');
      else if (value === false) this.#element.removeAttribute(attr);
      else if (value !== undefined) this.#element.setAttribute(attr, value);
    }
  }

  setAttribute(attr, value) {
    if (attr === 'style') this.setInlineStyle(value);
    else if (attr === 'class') this.toggleClasses(value, true);
    else if (value === true) this.#element.setAttribute(attr, '');
    else if (value === false) this.#element.removeAttribute(attr);
    else this.#element.setAttribute(attr, value);
  }

  getAttributes() {
    const names = this.#element.getAttributeNames();
    if (names.length === 0) return;
    const attributesReducer = (attrs, name) => {
      attrs[name] = this.#element.getAttribute(name);
      return attrs;
    };
    return names.reduce(attributesReducer, {});
  }

  getAttribute(attr) {
    return this.#element.getAttribute(attr);
  }

  addEventListener(eventName, listener) {
    this.#element.addEventListener(eventName, listener);
  }

  removeEventListener(eventName, listener) {
    this.#element.removeEventListener(eventName, listener);
  }

  emitCustomEvent(name, data) {
    const init = { bubbles: true, detail: data };
    const CustomEventCtor = this.#webApi['CustomEvent'];
    const event = new CustomEventCtor(name, init);
    return this.#element.dispatchEvent(event);
  }

  isCustomEvent(event) {
    const CustomEventCtor = this.#webApi['CustomEvent'];
    return event instanceof CustomEventCtor;
  }

  click() {
    this.#element.click();
  }

  focus() {
    this.#element.focus();
  }

  blur() {
    this.#element.blur();
  }

  setRoot() {
    const tag = this.#schema.tag;
    if (tag !== 'html') throw new BadRootSchemaError(tag);
    const root = this.#webApi.document.documentElement;
    if (root) return root.replaceWith(this.#element);
    this.#webApi.document.append(this.#element);
  }

  attach(...elementBindings) {
    if (elementBindings.length === 0) return;
    const elements = elementBindings.map((binding) => binding.element);
    this.#element.append(...elements);
  }

  detach() {
    this.#element.remove();
  }

  insert(position, elementBinding) {
    const element = elementBinding.element;
    const elementRef = this.#element.children[position];
    if (elementRef) this.#element.insertBefore(element, elementRef);
    else this.#element.append(element);
  }

  replace(position, elementBinding) {
    const element = elementBinding.element;
    const replaceElement = this.#element.children[position];
    if (replaceElement) replaceElement.replaceWith(element);
    else this.#element.append(element);
  }

  toggleClass(className, force) {
    this.#element.classList.toggle(className, force);
  }

  toggleClasses(classNames, force) {
    if (!classNames || classNames.length === 0) return;
    if (typeof classNames === 'string') classNames = classNames.split(' ');
    classNames.forEach((className) => this.toggleClass(className, force));
  }
}
