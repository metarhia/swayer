import { hasOwn } from './utils.js';

const REFLECTIVE = Symbol('reflective');

export default class Reflector {
  #reflection;

  constructor(reflection) {
    this.#reflection = reflection;
    if (reflection.options.isObject) this.#setObjectReflection();
    else this.#setPrimitiveReflection();
  }

  static reflectAll(context) {
    /* eslint-disable no-use-before-define */
    const reflections = [
      TextReflection,
      AttrsReflection,
      InlineStyleReflection,
      PropsReflection,
      EventsReflection,
      StylesReflection,
      ComputedStylesReflection,
      ChildrenReflection,
    ];
    /* eslint-enable */
    for (const Type of reflections) this.reflect(Type, context);
  }

  static reflect(ReflectionType, ...args) {
    const reflection = new ReflectionType(...args);
    Reflect.construct(Reflector, [reflection]);
  }

  #setPrimitiveReflection() {
    const { target, property } = this.#reflection;
    const descriptor = {
      enumerable: true,
      get: () => this.#reflection.getTargetProperty(),
      set: (value) => this.#reflection.setTargetProperty?.(value) ?? value,
    };
    Reflect.defineProperty(target, property, descriptor);
  }

  #setObjectReflection() {
    const { target, property } = this.#reflection;
    let reflector = this.#createObjectReflector(target[property]);
    const descriptor = {
      enumerable: true,
      get: () => reflector,
      set: (newObject) => {
        const setObj = this.#reflection.setTargetProperty?.(newObject);
        reflector = this.#createObjectReflector(setObj || newObject);
      },
    };
    Reflect.defineProperty(target, property, descriptor);
  }

  #createObjectReflector(props) {
    if (hasOwn(props, REFLECTIVE)) return props;
    Reflect.defineProperty(props, REFLECTIVE, {
      value: props,
      writable: false,
      configurable: false,
      enumerable: false,
    });
    return new Proxy(props, {
      get: (target, prop) => {
        const value = this.#reflection.getTargetPropertyProp?.(prop, target);
        return value ?? target[prop];
      },
      set: (target, prop, value, receiver) => {
        this.#reflection.setTargetPropertyProp(prop, value);
        if (this.#reflection.options.skipPropAssign) return true;
        return Reflect.set(target, prop, value, receiver);
      },
    });
  }
}

class TextReflection {
  #binding;
  target;
  property = 'text';
  options = {};

  constructor(context) {
    this.#binding = context.binding;
    this.target = context.component;
  }

  getTargetProperty() {
    return this.#binding.getText();
  }

  setTargetProperty(value) {
    this.#binding.setText(value);
  }
}

class InlineStyleReflection {
  #binding;
  target;
  property = 'style';
  options = { isObject: true };

  constructor(context) {
    this.#binding = context.binding;
    this.target = context.component.attrs;
  }

  getTargetPropertyProp(prop) {
    return this.#binding.getInlineStyleProperty(prop);
  }

  setTargetPropertyProp(prop, value) {
    this.#binding.setInlineStyleProperty(prop, value);
  }
}

class AttrsReflection {
  #binding;
  target;
  property = 'attrs';
  options = { isObject: true };

  constructor(context) {
    this.#binding = context.binding;
    this.target = context.component;
  }

  setTargetProperty(props) {
    this.#binding.setAttributes(props);
  }

  getTargetPropertyProp(prop) {
    if (prop === 'style') return this.#binding.getInlineStyle();
    return this.#binding.getAttribute(prop);
  }

  setTargetPropertyProp(prop, value) {
    if (prop === 'style') return this.#binding.setInlineStyle(value);
    this.#binding.setAttribute(prop, value);
  }
}

class PropsReflection {
  #binding;
  target;
  property = 'props';
  options = { isObject: true };

  constructor(context) {
    this.#binding = context.binding;
    this.target = context.component;
  }

  setTargetProperty(props) {
    this.#binding.setProperties(props);
  }

  getTargetPropertyProp(prop) {
    return this.#binding.getProperty(prop);
  }

  setTargetPropertyProp(prop, value) {
    this.#binding.setProperty(prop, value);
  }
}

class EventsReflection {
  #eventManager;
  target;
  property = 'events';
  options = { isObject: true };

  constructor(context) {
    this.#eventManager = context.eventManager;
    this.target = context.component;
  }

  setTargetProperty(props) {
    this.#eventManager.setEvents(props);
  }

  getTargetPropertyProp(prop) {
    return this.#eventManager.getEventListener(prop);
  }

  setTargetPropertyProp(prop, value) {
    this.#eventManager.setEventListener(prop, value);
  }
}

class ComputedStylesReflection {
  #context;
  target;
  property = 'compute';
  options = { isObject: true };

  constructor(context) {
    this.#context = context;
    this.target = context.component.styles;
  }

  setTargetPropertyProp(prop, value) {
    const prevStyles = this.target[this.property][prop];
    this.#context.styler.changeStyles(this.#context, prevStyles, value, true);
  }
}

class StylesReflection {
  #context;
  target;
  property = 'styles';
  options = { isObject: true };

  constructor(context) {
    this.#context = context;
    this.target = context.component;
  }

  setTargetProperty(props) {
    const prevStyles = this.target[this.property];
    this.#context.styler.changeStyles(this.#context, prevStyles, props);
  }

  setTargetPropertyProp(prop, value) {
    const prevStyles = this.target[this.property][prop];
    this.#context.styler.changeStyles(this.#context, prevStyles, value, true);
  }
}

class ChildrenReflection {
  #context;
  target;
  property = 'children';
  options = {
    isObject: true,
    skipPropAssign: true,
  };

  constructor(context) {
    this.#context = context;
    this.target = context;
  }

  setTargetProperty(children) {
    void this.#context.renderer.renderChildren(children);
    return this.#context.children;
  }

  setTargetPropertyProp(prop, value) {
    const index = parseInt(prop, 10);
    if (isNaN(index)) return;
    void this.#context.renderer.renderSegment(value, index);
  }

  getTargetPropertyProp(prop, target) {
    const value = target[prop];
    return (typeof value === 'function') ? value.bind(target) : value;
  }
}
