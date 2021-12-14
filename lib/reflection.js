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
        reflector = this.#createObjectReflector(newObject);
        this.#reflection.setTargetProperty(newObject);
      },
    };
    Reflect.defineProperty(target, property, descriptor);
  }

  #createObjectReflector(props) {
    return new Proxy(props, {
      get: (_, prop) => this.#reflection.getTargetPropertyProp(prop),
      set: (targetObject, prop, value) => {
        targetObject[prop] = value;
        this.#reflection.setTargetPropertyProp(prop, value);
        return true;
      },
    });
  }
}

class Reflection {
  target;
  elementBinding;

  constructor(target, elementBinding) {
    this.target = target;
    this.elementBinding = elementBinding;
  }
}

export class TextReflection extends Reflection {
  property = 'text';
  isObject = false;

  getTargetProperty() {
    return this.elementBinding.getText();
  }

  setTargetProperty(value) {
    this.elementBinding.setText(value);
  }
}

export class InlineStyleReflection extends Reflection {
  property = 'style';
  isObject = true;

  setTargetProperty() {}

  getTargetPropertyProp(prop) {
    return this.elementBinding.getInlineStyleProperty(prop);
  }

  setTargetPropertyProp(prop, value) {
    this.elementBinding.setInlineStyleProperty(prop, value);
  }
}

export class AttrsReflection extends Reflection {
  property = 'attrs';
  isObject = true;

  setTargetProperty(props) {
    this.elementBinding.setAttributes(props);
    if (props.style) {
      const reflection = new InlineStyleReflection(props, this.elementBinding);
      Reflect.construct(Reflector, [reflection]);
    }
  }

  getTargetPropertyProp(prop) {
    if (prop === 'style') return this.elementBinding.getInlineStyle();
    return this.elementBinding.getAttribute(prop);
  }

  setTargetPropertyProp(prop, value) {
    if (prop === 'style') return this.elementBinding.setInlineStyle(value);
    this.elementBinding.setAttribute(prop, value);
  }
}

export class PropsReflection extends Reflection {
  property = 'props';
  isObject = true;

  setTargetProperty(props) {
    this.elementBinding.setProperties(props);
  }

  getTargetPropertyProp(prop) {
    return this.elementBinding.getProperty(prop);
  }

  setTargetPropertyProp(prop, value) {
    this.elementBinding.setProperty(prop, value);
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
