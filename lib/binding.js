import { CLASS_PREFIX, SYSTEM_PREFIX } from './constants.js';
import { hasOwn, isObject } from './utils.js';

export default class NodeBinding {
  #schema;
  #webApi;
  #node;
  hydrated = false;

  constructor(schema, webApi, existingElement) {
    this.#schema = schema;
    this.#webApi = webApi;
    const doc = webApi.document;
    if (existingElement) {
      this.#node = existingElement;
      this.hydrated = true;
    } else if (typeof schema === 'string') {
      this.#node = doc.createTextNode(schema);
    } else {
      this.#node = doc.createElement(schema.tag);
      const { text, props, attrs } = schema;
      this.setText(text);
      this.setProperties(props);
      this.setAttributes(attrs);
    }
  }

  get html() {
    return this.#node.outerHTML;
  }

  get data() {
    return this.#node.dataset;
  }

  getNativeNode() {
    return this.#node;
  }

  setData(data) {
    let dataset = this.#node.dataset;
    if (!dataset) dataset = {};
    Object.assign(dataset, data);
  }

  setText(text) {
    if (!hasOwn(this.#schema, 'text')) return;
    if (text === undefined || text === null) text = '';
    else if (typeof text !== 'string') text = text.toString();
    this.#node.textContent = text;
  }

  getText() {
    return this.#node.textContent;
  }

  setProperties(props) {
    if (!isObject(props)) return;
    for (const [prop, value] of Object.entries(props)) {
      this.#node[prop] = value;
    }
  }

  getProperties() {
    const props = this.#schema.props;
    if (!isObject(props)) return;
    const keys = Object.keys(props);
    if (keys.length === 0) return;
    const propsReducer = (props, prop) => {
      props[prop] = this.#node[prop];
      return props;
    };
    return keys.reduce(propsReducer, {});
  }

  setProperty(prop, value = '') {
    this.#node[prop] = value;
  }

  getProperty(prop) {
    return this.#node[prop];
  }

  setInlineStyle(props) {
    if (!isObject(props)) return;
    for (const [prop, value] of Object.entries(props)) {
      this.#node.style[prop] = value;
    }
  }

  getInlineStyle() {
    return this.#node.style;
  }

  setInlineStyleProperty(prop, value) {
    this.#node.style[prop] = value;
  }

  getInlineStyleProperty(prop) {
    return this.#node.style[prop];
  }

  setAttributes(attrs) {
    if (!isObject(attrs)) return;
    const attrNames = this.#node.getAttributeNames();
    for (const name of attrNames) {
      const hasAttr = Object.prototype.hasOwnProperty.call(attrs, name);
      if (name === 'class') {
        const noSysClasses = (className) => !className.startsWith(CLASS_PREFIX);
        const classes = Array.from(this.#node.classList);
        const classNames = classes.filter(noSysClasses);
        this.toggleClasses(classNames, false);
      } else if (!hasAttr && !name.startsWith(`data-${SYSTEM_PREFIX}`)) {
        this.#node.removeAttribute(name);
      }
    }
    const attrPairs = Object.entries(attrs);
    for (const pair of attrPairs) this.setAttribute(...pair);
  }

  setAttribute(attr, value) {
    if (typeof value === 'function') return;
    if (attr === 'style') this.setInlineStyle(value);
    else if (attr === 'class') this.toggleClasses(value, true);
    else if (value === true) this.#node.setAttribute(attr, '');
    else if (value === false) this.#node.removeAttribute(attr);
    else if (value !== undefined) this.#node.setAttribute(attr, value);
  }

  getAttributes() {
    const names = this.#node.getAttributeNames();
    if (names.length === 0) return;
    const attributesReducer = (attrs, name) => {
      attrs[name] = this.#node.getAttribute(name);
      return attrs;
    };
    return names.reduce(attributesReducer, {});
  }

  getAttribute(attr) {
    return this.#node.getAttribute(attr);
  }

  addEventListener(eventName, listener) {
    this.#node.addEventListener(eventName, listener);
  }

  removeEventListener(eventName, listener) {
    this.#node.removeEventListener(eventName, listener);
  }

  emitEvent(name, data) {
    const init = { bubbles: true, detail: data };
    const CustomEventCtor = this.#webApi['CustomEvent'];
    const event = new CustomEventCtor(name, init);
    return this.#node.dispatchEvent(event);
  }

  isCustomEvent(event) {
    const CustomEventCtor = this.#webApi['CustomEvent'];
    return event instanceof CustomEventCtor;
  }

  click() {
    this.#node.click();
  }

  focus() {
    this.#node.focus();
  }

  blur() {
    this.#node.blur();
  }

  attach(...nodeBindings) {
    if (nodeBindings.length === 0) return;
    const elements = nodeBindings.map((binding) => binding.getNativeNode());
    this.#node.append(...elements);
  }

  after(...nodeBindings) {
    if (nodeBindings.length === 0) return;
    const elements = nodeBindings.map((binding) => binding.getNativeNode());
    this.#node.after(...elements);
  }

  detach() {
    this.#node.remove();
  }

  remove(child) {
    this.#node.removeChild(child);
  }

  insert(position, nodeBinding) {
    const element = nodeBinding.getNativeNode();
    const elementRef = this.#node.children[position];
    if (elementRef) this.#node.insertBefore(element, elementRef);
    else this.#node.append(element);
  }

  replaceWith(binding) {
    this.#node.replaceWith(binding.getNativeNode());
  }

  replace(position, nodeBinding) {
    const element = nodeBinding.getNativeNode();
    const replaceElement = this.#node.children[position];
    if (replaceElement) replaceElement.replaceWith(element);
    else this.#node.append(element);
  }

  toggleClass(className, force) {
    this.#node.classList.toggle(className, force);
  }

  toggleClasses(classNames, force) {
    if (!classNames || classNames.length === 0) return;
    if (typeof classNames === 'string') classNames = classNames.split(' ');
    classNames.forEach((className) => this.toggleClass(className, force));
  }
}
