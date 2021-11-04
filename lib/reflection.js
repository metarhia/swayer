export default class Reflection {
  #renderer;

  constructor(renderer) {
    this.#renderer = renderer;
  }

  static reflectProperty(target, prop, get, set) {
    Reflect.defineProperty(target, prop, {
      enumerable: true,
      get,
      set,
    });
  }

  static createObjectReflector(target, reflectProperty) {
    return new Proxy(target, {
      set: (targetObject, prop, value) => {
        targetObject[prop] = value;
        reflectProperty(prop, value);
        return true;
      },
    });
  }

  reflect(schema) {
    this.#reflectText(schema);
    this.#reflectEvents(schema);
    this.#reflectAttrs(schema);
    this.#reflectInlineStyle(schema);
  }

  #reflectText(schema) {
    let text = schema.text;
    Reflection.reflectProperty(
      schema,
      'text',
      () => text,
      (value) => {
        text = value;
        this.#renderer.setText(schema, value);
      }
    );
  }

  #reflectEvents(schema) {
    const createReflector = (events) =>
      Reflection.createObjectReflector(events, (event, value) =>
        this.#renderer.setEventValue(schema, event, value)
      );
    let reflector = createReflector(schema.events);
    Reflection.reflectProperty(
      schema,
      'events',
      () => reflector,
      (newEvents) => {
        reflector = createReflector(newEvents);
        this.#renderer.setEvents(schema, newEvents);
      }
    );
  }

  #reflectAttrs(schema) {
    const createReflector = (attrs) =>
      Reflection.createObjectReflector(attrs, (attr, value) =>
        this.#renderer.setAttributeValue(schema, attr, value)
      );
    let reflector = createReflector(schema.attrs);
    Reflection.reflectProperty(
      schema,
      'attrs',
      () => reflector,
      (newAttrs) => {
        reflector = createReflector(newAttrs);
        this.#renderer.setAttributes(schema, newAttrs);
        if (newAttrs.style) this.#reflectInlineStyle(schema);
      }
    );
  }

  #reflectInlineStyle(schema) {
    const createReflector = (style) =>
      Reflection.createObjectReflector(style, (prop, value) =>
        this.#renderer.setInlineStyleValue(schema, prop, value)
      );
    let reflector = createReflector(schema.attrs.style);
    Reflection.reflectProperty(
      schema.attrs,
      'style',
      () => reflector,
      (newStyle) => {
        reflector = createReflector(newStyle);
      }
    );
  }
}
