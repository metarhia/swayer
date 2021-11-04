const construct = Symbol();

class ComponentChildren extends Array {
  #parentSchema;
  #compiler;

  [construct](parent, compiler) {
    this.#parentSchema = parent;
    this.#compiler = compiler;
    if (parent.children) super.push(...parent.children);
    return this;
  }

  push(...schemas) {
    super.push(...schemas);
    return this.#compiler.compileSchemaChildren(this.#parentSchema, schemas);
  }

  pop() {
    const last = super.pop();
    this.#compiler.platform.renderer.remove(last);
    return last;
  }
}

export default class Metacomponent {
  #compiler;
  #renderer;
  #schema;

  constructor(schema, compiler) {
    this.#schema = schema;
    this.#compiler = compiler;
    this.#renderer = compiler.platform.renderer;
    this.#construct();
  }

  get schema() {
    return this.#schema;
  }

  #construct() {
    const schema = this.#schema;
    const children = new ComponentChildren();
    schema.children = children[construct](schema, this.#compiler);
    schema.attrs = schema.attrs || {};
    schema.attrs.style = schema.attrs.style || {};
    schema.state = schema.state || {};
    schema.hooks = schema.hooks || {};
    schema.events = schema.events || {};
    schema.triggerCustomEvent = this.#triggerCustomEventInternal.bind(this);
  }

  #triggerCustomEventInternal(eventName, data = null) {
    const event = new CustomEvent(eventName, { bubbles: true, detail: data });
    return this.#renderer.dispatchEvent(this.#schema, event);
  }
}
