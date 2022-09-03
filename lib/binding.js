import SSRHash from './hash.js';
import { isObject } from './utils.js';

export default class Binding {
  static id = 0;
  #id;
  #schema;
  #webApi;
  #element;
  hydrated = false;

  constructor(schema, webApi) {
    this.#id = ++Binding.id;
    this.#schema = schema;
    this.#webApi = webApi;
    const doc = webApi.document;
    if (typeof schema === 'string') {
      this.#element = doc.createTextNode(schema);
    } else {
      const element = SSRHash.getExistingElement(schema);
      if (element) {
        this.#element = element;
        this.hydrated = true;
      } else {
        this.#element = doc.createElement(schema.tag);
        const { text, props, attrs } = schema;
        this.setText(text);
        this.setProperties(props);
        this.setAttributes(attrs);
      }
    }
  }

  get id() {
    return this.#id;
  }

  get element() {
    return this.#element;
  }

  get html() {
    return this.#element.outerHTML;
  }

  setData(data) {
    let dataset = this.#element.dataset;
    if (!dataset) dataset = {};
    Object.assign(dataset, data);
  }

  getData() {
    return this.#element.dataset;
  }

  setText(text) {
    const isEmpty = text === undefined || text === null;
    if (isEmpty || typeof text === 'function') return;
    this.#element.textContent = text;
  }

  getText() {
    return this.#element.textContent;
  }

  setProperties(props) {
    if (!isObject(props)) return;
    for (const [prop, value] of Object.entries(props)) {
      this.#element[prop] = value;
    }
  }

  getProperties() {
    const props = this.#schema.props;
    if (!isObject(props)) return;
    const keys = Object.keys(props);
    if (keys.length === 0) return;
    const propsReducer = (props, prop) => {
      props[prop] = this.#element[prop];
      return props;
    };
    return keys.reduce(propsReducer, {});
  }

  setProperty(prop, value = '') {
    this.#element[prop] = value;
  }

  getProperty(prop) {
    return this.#element[prop];
  }

  setInlineStyle(props) {
    if (!isObject(props)) return;
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
    if (!isObject(attrs)) return;
    const attrNames = this.#element.getAttributeNames();
    for (const name of attrNames) {
      const hasAttr = Object.prototype.hasOwnProperty.call(attrs, name);
      if (name === 'class') {
        const noSwayerClasses = (className) => !className.startsWith('sw-');
        const classes = Array.from(this.#element.classList);
        const classNames = classes.filter(noSwayerClasses);
        this.toggleClasses(classNames, false);
      } else if (!hasAttr && name !== 'data-swayer') {
        this.#element.removeAttribute(name);
      }
    }
    const attrPairs = Object.entries(attrs);
    for (const pair of attrPairs) this.setAttribute(...pair);
  }

  setAttribute(attr, value) {
    if (typeof value === 'function') return;
    if (attr === 'style') this.setInlineStyle(value);
    else if (attr === 'class') this.toggleClasses(value, true);
    else if (value === true) this.#element.setAttribute(attr, '');
    else if (value === false) this.#element.removeAttribute(attr);
    else if (value !== undefined) this.#element.setAttribute(attr, value);
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

  emitEvent(name, data) {
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

  mountOn(element) {
    const { id, src, dataset } = element;
    const data = {
      ...(src ? { src } : {}),
      ...dataset,
    };
    this.setData(data);
    if (id) this.setAttribute('id', id);
    element.replaceWith(this.#element);
  }

  attach(...bindings) {
    if (bindings.length === 0) return;
    const elements = bindings.map((binding) => binding.element);
    this.#element.append(...elements);
  }

  after(...bindings) {
    if (bindings.length === 0) return;
    const elements = bindings.map((binding) => binding.element);
    this.#element.after(...elements);
  }

  detach() {
    this.#element.remove();
  }

  remove(child) {
    this.#element.removeChild(child);
  }

  insert(position, elementBinding) {
    const element = elementBinding.element;
    const elementRef = this.#element.children[position];
    if (elementRef) this.#element.insertBefore(element, elementRef);
    else this.#element.append(element);
  }

  replaceWith(binding) {
    this.#element.replaceWith(binding.element);
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
