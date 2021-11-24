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

  // @ts-ignore
  async push(...initSchemas) {
    const compilation = await this.#compiler.compileChildren(
      this.#parentSchema, initSchemas
    );
    return super.push(...compilation);
  }

  pop() {
    const last = super.pop();
    this.#compiler.platform.renderer.remove(last);
    return last;
  }
}

export default class Metacomponent {
  static id = 0;
  #schema;
  #compiler;
  #renderer;
  #id;

  constructor(schema, compiler) {
    this.#schema = schema;
    this.#compiler = compiler;
    this.#renderer = compiler.platform.renderer;
    this.#id = ++Metacomponent.id;
    this.#construct();
  }

  get id() {
    return this.#id;
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
