export default class Binding {
  static id = 0;
  #schema;
  #element;
  #webApi;
  #id;

  constructor(schema, element, webApi) {
    this.#schema = schema;
    this.#element = element;
    this.#webApi = webApi;
    this.#id = ++Binding.id;
  }

  get id() {
    return this.#id;
  }

  static forText(text, webApi) {
    const textNode = webApi.document.createTextNode(text);
    return new Binding(text, textNode, webApi);
  }

  static forExisting(schema, existingElement, webApi) {
    return new Binding(schema, existingElement, webApi);
  }

  static forNew(schema, webApi) {
    const element = webApi.document.createElement(schema.tag);
    const binding = new Binding(schema, element, webApi);
    const { text, props, attrs } = schema;
    binding.setText(text);
    binding.setProperties(props);
    binding.setAttributes(attrs);
    return binding;
  }

  get element() {
    return this.#element;
  }

  setData(data) {
    Object.assign(this.#element.dataset, data);
  }

  getData() {
    return this.#element.dataset;
  }

  setText(text) {
    if (text === undefined || text === null) return;
    this.#element.textContent = text;
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

  mountOn(element) {
    const { id, src, dataset } = element;
    const data = {
      ...(src ? { src } : {}),
      ...dataset,
    };
    this.setData(data);
    this.setAttribute('id', id);
    element.replaceWith(this.#element);
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
