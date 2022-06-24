import Reactivity from './reactivity.js';

// const CONSTRUCT_CHILDREN = Symbol();
// // const CLEAR_DESCENDANTS = Symbol();
//
// class ComponentChildren extends Array {
//   #manager;
//
//   [CONSTRUCT_CHILDREN](componentManager) {
//     this.#manager = componentManager;
//     return this;
//   }
//
//   // @ts-ignore
//   async push(...initSchemas) {
//     const additions = await this.#manager.add(initSchemas);
//     super.push(...additions);
//     return additions;
//   }
//
//   pop() {
//     const last = super.pop();
//     last.destroy();
//     return last;
//   }
//
//   // @ts-ignore
//   async splice(start, deleteCount, ...schemas) {
//     const components = await this.#manager.insert(start, deleteCount, schemas);
//     const deletions = super.splice(start, deleteCount, ...components);
//     for (const component of deletions) component.destroy();
//     return [deletions, components];
//   }
//
//   // todo add   shift()
//   // todo add   async unshift(...initSchemas)
//
//   // todo add   async prepend('@namespaces/name#index', args)
//   // todo add   async append('@namespaces/name#index', args)
//   // todo add   async update('@namespaces/name#index', args, { select: (component) => {} }?)
//   // todo add   remove('@namespaces/name#index', { select: (component) => {} }?)
// }

export class ReactivityManager {
  #context;
  #reactivity;

  constructor(context) {
    this.#context = context;
    this.#reactivity = new Reactivity(context.component);
    this.#activateState();
  }

  #activateState() {
    const component = this.#context.component;
    const parent = this.#context.parent?.component;
    const reactivity = this.#reactivity;
    if (component.state) component.state = reactivity.create(component.state);
    else if (parent?.state) component.state = parent.state;
    else component.state = reactivity.create({});
  }

  registerReactivity() {
    const { schema, component } = this.#context;
    // const component = this.#component;
    const reactivity = this.#reactivity;
    const { style, ...attrs } = schema.attrs || {};
    // if (schema.state) component.state = reactivity.create(schema.state);
    // else if (this.#parent?.state) component.state = this.#parent.state;
    // else component.state = reactivity.create({});
    reactivity.register(component, 'text', schema.text);
    this.#addObjectReactivity(component, 'attrs', attrs);
    this.#addObjectReactivity(component.attrs, 'style', style);
    this.#addObjectReactivity(component, 'props', schema.props);
    this.#addObjectReactivity(component, 'styles', schema.styles);
    // this.#reactivity.register(component, 'children', original.children);
  }

  registerChildren() {
    const { schema } = this.#context;
    return this.#reactivity.register(this.#context, 'children', schema.children);
  }

  registerChild(index, reaction) {
    return this.#reactivity.register(this.#context.children, index, reaction);
  }

  // createChildReactivity(index) {
  //   const source = this.#context.children;
  //   if (!Array.isArray(source)) return;
  //   const target = this.#component.children;
  //   this.#reactivity.register(target, index, source[index]);
  // }

  // registerChildReactivity(index, reaction) {
  //   // const target = this.#component.children;
  //   const target = this.#context.children;
  //   this.#reactivity.register(target, index, reaction);
  // }

  #addArrayReactivity(target, prop, source) {
    if (Array.isArray(source)) {
      return source.forEach((child) => this.#reactivity.unregister(child));
    }
    this.#reactivity.unregister(source);
  }

  removeReactivity() {
    const schema = this.#context.schema;
    const { style, ...attrs } = schema.attrs || {};
    this.#reactivity.unregister(schema.text);
    this.#removeObjectReactivity(attrs);
    this.#removeObjectReactivity(style);
    this.#removeObjectReactivity(schema.props);
    this.#removeObjectReactivity(schema.styles);
    this.#removeArrayReactivity(schema.children);
  }

  #addObjectReactivity(target, prop, source) {
    if (!source) return;
    this.#reactivity.register(target, prop, source);
    const propTarget = target[prop];
    for (const [key, value] of Object.entries(source)) {
      this.#reactivity.register(propTarget, key, value);
    }
  }

  #removeObjectReactivity(source) {
    if (!source) return;
    this.#reactivity.unregister(source);
    for (const value of Object.values(source)) {
      this.#reactivity.unregister(value);
    }
  }

  #removeArrayReactivity(source) {
    if (Array.isArray(source)) {
      return source.forEach((child) => this.#reactivity.unregister(child));
    }
    this.#reactivity.unregister(source);
  }
}

export class Component {
  #context;

  constructor(context) {
    this.#context = context;
    this.#setup();
    this.#createMethods();
  }

  get children() {
    throw new Error('Not allowed');
  }

  emitMessage(channelName, data, options) {
    this.#context.channelManager.emitMessage(channelName, data, options);
  }

  emitEvent(eventName, data = null) {
    return this.#context.eventManager.emitEvent(eventName, data);
  }

  click() {
    this.#context.binding.click();
  }

  focus() {
    this.#context.binding.focus();
  }

  blur() {
    this.#context.binding.blur();
  }

  #setup() {
    const schema = this.#context.schema;
    this.tag = schema.tag;
    this.state = schema.state;
    this.config = schema.config || {};
    // todo remove meta
    this.meta = schema.meta;
    // todo add namespaced urls support
    // this.name = schema.name;
    this.text = schema.text;
    // this.config = schema.config || {};
    this.styles = { ...(schema.styles || {}) };
    this.attrs = { ...(schema.attrs || {}) };
    this.attrs.style = { ...(schema.attrs?.style || {}) };
    this.props = { ...(schema.props || {}) };
    this.methods = schema.methods || {};
    this.hooks = schema.hooks || {};
    this.events = schema.events || {};
    this.channels = schema.channels || {};
  }

  #createMethods() {
    const methods = this.methods;
    for (const method of Object.keys(methods)) {
      methods[method] = methods[method].bind(this);
    }
  }
}
