import { hasOwn } from './utils.js';

const REFLECTIVE = Symbol('reflective');

export class Reflector {
  #reflection;

  constructor(reflection) {
    this.#reflection = reflection;
    if (reflection.isObject) this.#setObjectReflection();
    else this.#setPrimitiveReflection();
  }

  static reflect(reflections) {
    for (const reflection of reflections) {
      Reflect.construct(Reflector, [reflection]);
    }
  }

  #setPrimitiveReflection() {
    const { target, property } = this.#reflection;
    const descriptor = {
      enumerable: true,
      get: () => this.#reflection.getTargetProperty(),
      set: (value) => this.#reflection.setTargetProperty(value),
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
        const setObj = this.#reflection.setTargetProperty(newObject);
        reflector = this.#createObjectReflector(setObj || newObject);
      },
    };
    Reflect.defineProperty(target, property, descriptor);
  }

  #createObjectReflector(props) {
    if (hasOwn(props, REFLECTIVE)) return props;
    Object.defineProperty(props, REFLECTIVE, {
      value: props,
      writable: false,
      configurable: false,
      enumerable: false,
    });
    return new Proxy(props, {
      get: (tgt, prop) => this.#reflection.getTargetPropertyProp(prop, tgt),
      set: (target, prop, value, receiver) => {
        if (Array.isArray(target)) {
          this.#reflection.setTargetPropertyProp(prop, value);
          return true;
        }
        this.#reflection.setTargetPropertyProp(prop, value);
        return Reflect.set(target, prop, value, receiver);
      },
    });
  }
}

class Reflection {
  target;
  binding;

  constructor(target, binding) {
    this.target = target;
    this.binding = binding;
  }
}

export class TextReflection extends Reflection {
  property = 'text';
  isObject = false;

  getTargetProperty() {
    return this.binding.getText();
  }

  setTargetProperty(value) {
    this.binding.setText(value);
  }
}

export class InlineStyleReflection extends Reflection {
  property = 'style';
  isObject = true;

  setTargetProperty() {}

  getTargetPropertyProp(prop) {
    return this.binding.getInlineStyleProperty(prop);
  }

  setTargetPropertyProp(prop, value) {
    this.binding.setInlineStyleProperty(prop, value);
  }
}

export class AttrsReflection extends Reflection {
  property = 'attrs';
  isObject = true;

  setTargetProperty(props) {
    this.binding.setAttributes(props);
    if (props.style) {
      const reflection = new InlineStyleReflection(props, this.binding);
      Reflect.construct(Reflector, [reflection]);
    }
  }

  getTargetPropertyProp(prop) {
    if (prop === 'style') return this.binding.getInlineStyle();
    return this.binding.getAttribute(prop);
  }

  setTargetPropertyProp(prop, value) {
    if (prop === 'style') return this.binding.setInlineStyle(value);
    this.binding.setAttribute(prop, value);
  }
}

export class PropsReflection extends Reflection {
  property = 'props';
  isObject = true;

  setTargetProperty(props) {
    this.binding.setProperties(props);
  }

  getTargetPropertyProp(prop) {
    return this.binding.getProperty(prop);
  }

  setTargetPropertyProp(prop, value) {
    this.binding.setProperty(prop, value);
  }
}

export class EventsReflection extends Reflection {
  property = 'events';
  isObject = true;
  #eventManager;

  constructor(target, elementBinding, eventManager) {
    super(target, elementBinding);
    this.#eventManager = eventManager;
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

export class StylesReflection {
  #context;
  property = 'styles';
  isObject = true;

  constructor(context) {
    this.#context = context;
    this.target = context.component;
  }

  setTargetProperty(styles) {
    const prevStyles = this.target[this.property];
    this.#context.styler.changeStyles(this.#context, prevStyles, styles);
  }

  setTargetPropertyProp(prop, value) {
    const prevValue = this.target[this.property][prop];
    let prevStyles;
    let curStyles;
    if (prop === 'compute') {
      prevStyles = prevValue;
      curStyles = value;
    } else {
      prevStyles = { [prop]: prevValue };
      curStyles = { [prop]: value };
    }
    this.#context.styler.changeStyles(this.#context, prevStyles, curStyles);
  }

  getTargetPropertyProp(prop, target) {
    return target[prop];
  }
}

export class ChildrenReflection {
  #context;
  property = 'children';
  isObject = true;
  target;

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
