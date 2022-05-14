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
    return new Proxy(props, {
      get: (tgt, prop) => this.#reflection.getTargetPropertyProp(prop, tgt),
      set: (target, prop, value, receiver) => {
        const set = (result) => Reflect.set(target, prop, result, receiver);
        const setResult = this.#reflection.setTargetPropertyProp(prop, value);
        if (setResult instanceof Promise) {
          setResult.then((result) => {
            if (result) set(result);
          });
          return true;
        }
        return set(value);
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

// todo review
export class ChildrenReflection {
  property = 'children';
  isObject = true;
  target;

  constructor(component) {
    this.target = component;
  }

  setTargetProperty(children) {
    const componentChildren = this.target.children;
    const additions = Array.isArray(children) ? children : [children];
    const deleteLen = componentChildren.length;
    componentChildren.splice(0, deleteLen, ...additions);
    return componentChildren;
  }

  getTargetPropertyProp(prop, target) {
    const value = target[prop];
    return (typeof value === 'function') ? value.bind(target) : value;
  }

  setTargetPropertyProp(prop, value) {
    const index = +prop;
    if (!isNaN(index) && value?.constructor?.name !== 'Component') {
      const insertions = Array.isArray(value) ? value : [value];
      return this.target.children
        .splice(index, 1, ...insertions)
        .then((result) => result[1][0]);
    }
  }
}
