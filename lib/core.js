import { ElementBinding, TextBinding } from './binding.js';
import ChannelManager from './channels.js';
import { Component, ReactivityManager } from './component.js';
import EventManager from './events.js';
import {
  AttrsReflection,
  ChildrenReflection,
  EventsReflection,
  InlineStyleReflection,
  PropsReflection,
  Reflector,
  TextReflection,
} from './reflection.js';
import Reporter from './reporter.js';
import Styler from './styler.js';
import { isObject } from './utils.js';

// class ComponentContext {
//   schema;
//   parent;
//   binding;
//   component;
//   reactivity;
//   renderer;
//
//   constructor(schema, parent, existingNode) {
//     this.schema = schema;
//     this.parent = parent;
//     this.init();
//   }
//
//   init(existingNode) {
//     this.binding = this.#createBinding(existingNode);
//     this.component = new Component(this);
//     this.reactivity = new ComponentReactivity(this);
//     this.reactivity.registerReactivity();
//     return this;
//   }
// }

class BaseContext {
  parent;
  schema;
  component;
  binding;
  renderer;

  constructor(schema, parent) {
    this.parent = parent;
    this.schema = schema;
    this.component = new Component(this);
  }

  setBinding(binding) {
    this.binding = binding;
  }

  setRenderer(renderer) {
    this.renderer = renderer;
  }

  init(compiler) {
    const binding = compiler.createBinding(this.schema);
    this.setBinding(binding);
    return this;
  }

  destroy() {
    this.renderer.remove();
  }

  // render() {
  //   this.renderer.render();
  // }
  //
  // mount(element) {
  //   this.renderer.mount(element);
  // }
}

class Context extends BaseContext {
  // Future user options
  static config = {};

  config;
  children = [];
  eventManager;
  channelManager;
  reactivityManager;

  constructor(schema, parent) {
    super(schema, parent);
    this.config = schema.config || Context.config;
    this.reactivityManager = new ReactivityManager(this);
  }

  init(compiler) {
    super.init(compiler);
    this.#createEventManager();
    this.#createChannelManager();
    this.#createReflection();
    this.reactivityManager.registerReactivity();
    return this;
  }

  destroy() {
    super.destroy();
    this.cleanUp();
    // if (this.parent?.children) {
    //   const children = this.parent.children;
    //   const index = children.indexOf(this);
    //   if (index > -1) Array.prototype.splice.call(children, index, 1);
    // }
    this.#callDestroyHook();
  }

  cleanUp() {
    this.reactivityManager.removeReactivity();
    this.channelManager.clearAllChannels(this.component.channels);
    for (const segment of this.children) {
      for (const context of segment) {
        if (context.cleanUp) context.cleanUp();
        this.#callDestroyHook(context);
      }
    }
  }

  #callDestroyHook(context = this) {
    const destroy = context.component.hooks.destroy;
    if (destroy) destroy.call(context.component);
  }

  #createEventManager() {
    this.eventManager = new EventManager(this.binding);
    this.eventManager.setEventsContext(this.component);
    this.eventManager.setEvents(this.component.events);
  }

  #createChannelManager() {
    this.channelManager = new ChannelManager();
    this.channelManager.setChannelsContext(this.component);
    this.channelManager.bindAllChannels(this.component.channels);
  }

  #createReflection() {
    const { component, binding } = this;
    Reflector.reflect([
      new TextReflection(component, binding),
      new InlineStyleReflection(component.attrs, binding),
      new AttrsReflection(component, binding),
      new PropsReflection(component, binding),
      new EventsReflection(component, binding, this.eventManager),
      new ChildrenReflection(this),
    ]);
  }
}

class TextContext extends BaseContext {

}

// class SchemaArray {
//   schemas;
//
//   constructor(array, parent) {
//     this.schemas = array.map((input) => new Context(input, parent));
//   }
//
//   createBinding(create) {
//     for (const schema of this.schemas) schema.createBinding(create);
//   }
//
//   init(compiler) {
//     for (const schema of this.schemas) schema.init(compiler);
//     return this;
//   }
//
//   setRenderer(renderer) {
//     for (const schema of this.schemas) schema.setRenderer(renderer);
//   }
//
//   render() {
//     for (const schema of this.schemas) schema.render();
//   }
//
//   mount(element) {
//     const [first, ...rest] = this.schemas;
//     first.mount(element);
//     for (const { binding } of rest) first.binding.after(binding);
//   }
// }

// class ContextArray extends Array {
//   indexes = [];
// }

class ContextSegment extends Array {

}

class ContextChildren extends Array {
  #contextFactory;

  async init(contextFactory, context) {
    const children = context.schema.children || [];
    this.#contextFactory = contextFactory;
    if (typeof children === 'function') {
      // const items = await contextFactory.create(children, context);
      // items.forEach((item, i) => (this[i] = ContextSegment.of(item)));
      // return this;
      // return contextFactory.create(children, context);
      this[0] = await contextFactory.create(children, context);
      return this;
    }
    for (let i = 0; i < children.length; ++i) {
      const input = children[i];
      const result = await contextFactory.create(input, context);
      let segment;
      if (Array.isArray(result)) segment = result;
      else if (result) segment = ContextSegment.of(result);
      else segment = new ContextSegment();
      this[i] = segment;
    }
    return this;
  }

  getAnchorContext(index) {
    const segment = this[index];
    if (!segment) return null;
    const context = segment[segment.length - 1];
    if (context) return context;
    return this.getAnchorContext(--index);
  }
}

class ContextFactory {
  #compiler;

  constructor(compiler) {
    this.#compiler = compiler;
  }

  static #validateInput(input) {
    // if (typeof input === 'string') return Reflect.construct(String, [input]);
    const error = (option) => (
      Reporter.error('BadSchemaInput', { option, input })
    );
    const has = Object.prototype.hasOwnProperty.bind(input);
    const isObj = isObject(input) && !Array.isArray(input);
    const isPoor = isObj && !has('path') && !has('tag');
    if (isPoor) throw error('poor');
    const isConflict = has('text') && has('children');
    if (isConflict) throw error('conflict');
    return input;
  }

  // async create(input, parent, recurrent = new ContextArray()) {
  async create(input, parent, recurrent = new ContextSegment()) {
    if (!input) return false;
    // if (!input) return new FalseContext(input, parent);
    if (typeof input === 'string') return new TextContext(input, parent);
    if (input.path) input = await this.#compiler.loadSchema(input);
    if (typeof input === 'function') {
      let reactiveInput;
      if (input === parent.schema.children) {
        // reactiveInput = parent.reactivityManager.registerChildren();
        reactiveInput = parent.reactivityManager.registerChild(0, input);
      } else {
        const index = parent.schema.children.indexOf(input);
        reactiveInput = parent.reactivityManager.registerChild(index, input);
        // if (reactiveInput) recurrent.indexes[index] = reactiveInput;
      }
      return this.create(reactiveInput, parent, recurrent);
    }
    if (Array.isArray(input)) {
      const recur = (nested) => this.create(nested, parent, recurrent);
      const recurred = await Promise.all(input.map(recur));
      const contexts = recurred.filter(
        (schema) => schema && !Array.isArray(schema),
        // (schema) => !Array.isArray(schema),
      );

      recurrent.push(...contexts);
      // const found = Object.entries(recurrent.indexes).find(([_, value]) => value === input);
      // if (found) recurrent.indexes[found[0]] = contexts;

      // if (contexts.length > 0) {
      //   recurrent.indexes.push(contexts);
      //   // console.log(recurrent.indexes);
      // }

      // const index = recurrent.indexOf(contexts[0]);
      // if (index > -1) recurrent.indexes.push(index);
      // if (index > -1) recurrent.indexes[index] = contexts;
      // console.log({
      //   tags: contexts.map((s) => s.schema.tag).join(', '),
      //   len: contexts.length,
      //   index: index > -1 ? index : 0,
      //   indexes: recurrent.indexes.join(', '),
      // });
      return recurrent;
    }
    const schema = ContextFactory.#validateInput(input);
    return new Context(schema, parent);
  }

  async *generate(input, parent) {
    if (!input) return;
    const rootSchema = await this.create(input, parent);
    const stack = Array.isArray(rootSchema) ? rootSchema : [rootSchema];
    while (stack.length > 0) {
      const context = stack.pop();
      context.init(this.#compiler);
      // context.parent?.children.push(context);
      // if (!context) continue;
      // const childrenSource = context.schema.children || [];
      // const children = childrenSource || [];
      // if (typeof childrenSource === 'function') {
      //   children = childrenSource(context.state);
      //   children = await this.create(children, context);
      // }
      // const children = await this.create(childrenSource, context);
      // context.children = await this.create(childrenSource, context);

      if (context.schema.children) {
        const children = new ContextChildren([]);
        context.children = await children.init(this, context);
        const flatChildren = context.children.flat();
        // console.log(flatChildren.map((c) => c.schema.tag));
        for (let i = flatChildren.length - 1; i >= 0; --i) {
          const child = flatChildren[i];
          // if (Array.isArray(child)) console.log(context.tag, child);
          // if (!child || Array.isArray(child)) continue;
          if (child) stack.push(child);
          // context.children[i] = child;
          // const input = children[i];
          // const childSchema = await this.create(input, context);
          // const schemaChildren = context.children;
          // if (Array.isArray(childSchema)) {
          //   const reversed = childSchema.slice().reverse();
          //   for (const context of reversed) stack.push(context);
          //   const index = schemaChildren.indexOf(input);
          //   schemaChildren.splice(index, 1, ...childSchema);
          // } else {
          //   stack.push(childSchema);
          //   schemaChildren[i] = childSchema;
          // }
        }
      }
      // if (context.original) yield context;
      // console.log(context.schema.tag, context);
      // console.log(context.children);
      yield context;
    }
  }
}

class Renderer {
  #context;
  #styler;
  #compiler;
  #tasks = [];
  #taskQueue = this.#createTaskQueue();

  constructor(context, styler, compiler) {
    this.#context = context;
    this.#styler = styler;
    this.#compiler = compiler;
  }

  render() {
    this.#styler.createStyles(this.#context);
    this.#context.parent.binding.attach(this.#context.binding);
  }

  mount(element) {
    this.#context.binding.mountOn(element);
  }

  // replace(index, context) {
  //   this.#styler.createStyles(context);
  //   this.#context.binding.replace(index, context.binding);
  // }

  replace(context) {
    this.#styler.createStyles(context);
    this.#context.binding.replaceWith(context.binding);
  }

  after(context) {
    this.#styler.createStyles(context);
    this.#context.binding.after(context.binding);
  }

  append(context) {
    this.#styler.createStyles(context);
    this.#context.binding.attach(context.binding);
  }

  // insert(index, context) {
  //   this.#styler.createStyles(context);
  //   this.#context.binding.insert(index, context.binding);
  // }

  remove() {
    this.#context.binding.detach();
  }

  async renderSegment(input, segIndex) {
    if (Array.isArray(input)) {
      const render = (input, i) => this.#renderSegment(input, segIndex, i);
      await Promise.all(input.map(render));
      this.#destroyRedundantSegments(input.length, segIndex);
      return;
    }
    return this.#renderSegment(input, segIndex);
  }

  #destroyRedundantSegments(newLength, index) {
    const segment = this.#context.children[index];
    if (newLength < segment.length) {
      while (newLength !== segment.length) segment.pop().destroy();
    }
  }

  #clearSegment(index) {
    const segment = this.#context.children[index];
    while (segment.length > 0) segment.pop().destroy();
  }

  async #renderSegment(input, segIndex, ctxIndex = 0) {
    if (!input) return this.#clearSegment(segIndex);
    const parent = this.#context;
    const segment = parent.children[segIndex];
    const generator = this.#compiler.generateComponents(input, parent);
    const { value: newContext } = await generator.next();
    const context = segment[ctxIndex];
    if (context) {
      context.renderer.replace(newContext);
    } else {
      const sibling = parent.children.getAnchorContext(segIndex);
      if (sibling) sibling.renderer.after(newContext);
      else parent.renderer.append(newContext);
    }
    segment[ctxIndex] = newContext;
    for await (const context of generator) context.renderer.render();
    if (context) context.destroy();
  }

  // #removeChildren(index) {
  //   const children = this.#context.children.indexes[index];
  //   if (!children) return;
  //   for (const child of children) child.binding.detach();
  // }
  //
  // async #renderChild(input, index, i) {
  //   // if (!input) {
  //   //   if (child) child.binding.detach();
  //   //   return;
  //   // }
  //   const children = this.#context.children.indexes[index];
  //   const ctx = this.#context;
  //   const generator = await this.#compiler.generateComponents(input, ctx);
  //   const { value: replacement } = await generator.next();
  //   if (children) {
  //     this.#styler.createStyles(replacement);
  //     children[i].binding.element.replaceWith(replacement.binding.element);
  //   } else {
  //     this.insert(index, replacement);
  //   }
  //   for await (const schema of generator) schema.renderer.render();
  // }

  // async #renderChild(input, index) {
  //   const children = this.#context.children.indexes[index];
  //   if (!input) {
  //     // todo resolve
  //     // this.#context.destroy();
  //     // const elems = this.#context.binding.element.children;
  //     // const children = Array.from(elems).slice(index);
  //
  //     if (!children) return;
  //     for (const child of children) child.binding.detach();
  //     return;
  //   }
  //   const ctx = this.#context;
  //   const generator = await this.#compiler.generateComponents(input, ctx);
  //   const { value: replacement } = await generator.next();
  //   for await (const schema of generator) schema.renderer.render();
  //   const existing = ctx.children[index];
  //   if (existing) this.replace(index, replacement);
  //   else this.insert(index, replacement);
  // }

  // async renderComponentTree(rootContext) {
  //   console.log('Render:', rootContext.schema.tag);
  //   const contextGenerator = this.#contextFactory.generate(rootContext);
  //   const rootComponent = rootContext.component;
  //   const components = rootComponent.hooks.init ? [rootComponent] : [];
  //   await contextGenerator.next();
  //   for await (const context of contextGenerator) {
  //     console.log('Render 2:', context.schema.tag);
  //
  //     if (typeof context.schema === 'function') {
  //       const parentChildren = context.parent.schema.children;
  //       const index = parentChildren.indexOf(context.schema);
  //       const state = context.parent.component.state;
  //       const schema = context.schema(state);
  //       const contexts = await this.contextFactory.create(schema, context.parent);
  //
  //       const { component, parent } = this.createComponent(context);
  //       const children = parent.component.children;
  //       parent.binding.attach(context.binding);
  //       Array.prototype.push.call(children, component);
  //
  //       if (Array.isArray(contexts)) {
  //         const insertions = contexts.map((context) => context.schema);
  //         parentChildren.splice(index, 1, ...insertions);
  //       } else {
  //         parentChildren[index] = contexts.schema;
  //       }
  //       context.parent.reactivity.registerChildReactivity(index, context.schema);
  //     } else {
  //       const { component, parent } = this.createComponent(context);
  //       const children = parent.component.children;
  //       parent.binding.attach(context.binding);
  //       Array.prototype.push.call(children, component);
  //       // parent.reactivity.createChildReactivity(context.parent.schema.children.length - 1);
  //       // parent.reactivity.createChildReactivity();
  //       if (component.hooks.init) components.push(component);
  //     }
  //   }
  //   await this.initComponents(components);
  // }

  // add(...args) {
  //   const task = () => this.#add(...args);
  //   return this.#runTask(task);
  // }

  // insert(...args) {
  //   const task = () => this.#insert(...args);
  //   return this.#runTask(task);
  // }

  // async #add(schemas = []) {
  //   const components = [];
  //   for (const schema of schemas) {
  //     if (!schema) continue;
  //     const component = await this.compile(schema);
  //     components.push(component);
  //   }
  //   return components;
  // }

  // async #insert(startIndex, replaceCount, schemas = []) {
  //   const components = [];
  //   const compiler = this.#compiler;
  //   const contextFactory = this.#compiler.contextFactory;
  //   for (let i = 0, j = startIndex; i < schemas.length; ++i, ++j) {
  //     const schema = schemas[i];
  //     const context = await contextFactory.create(schema, this.#parentContext);
  //     const { component, parent, binding } = compiler.createComponent(context);
  //     const pBinding = parent.binding;
  //     const existing = parent.component.children[j];
  //     const doReplace = !!existing && replaceCount-- > 0;
  //     const hasNew = !!schema;
  //     if (doReplace) hasNew ? pBinding.replace(j, binding) : existing.destroy();
  //     if (hasNew) pBinding.insert(j, binding);
  //     if (!hasNew) continue;
  //     await compiler.renderComponentTree(context);
  //     components.push(component);
  //   }
  //   return components;
  // }

  // async #insert(startIndex, replaceCount, schemas = []) {
  //   const components = [];
  //   const compiler = this.#compiler;
  //   const contextFactory = this.#compiler.contextFactory;
  //   const parent = this.#parentContext;
  //   const pBinding = parent.binding;
  //   const parentChildren = parent.component.children;
  //
  //   const createContext = (schema) => contextFactory.create(schema, parent);
  //   const createAll = schemas.map(createContext);
  //   const created = await Promise.all(createAll);
  //   const contexts = created.flat();
  //
  //   for (let i = 0, j = startIndex; i < contexts.length; ++i, ++j) {
  //     const context = contexts[i];
  //     const { component, binding } = compiler.createComponent(context);
  //     const existing = parentChildren[j];
  //     const doReplace = !!existing && replaceCount-- > 0;
  //     const hasNew = !!context.schema.tag;
  //     if (doReplace) hasNew ? pBinding.replace(j, binding) : existing.destroy();
  //     if (hasNew) pBinding.insert(j, binding);
  //     if (!hasNew) return components;
  //     await compiler.renderComponentTree(context);
  //     components.push(component);
  //   }
  //   return components;
  // }

  async #runTask(task) {
    this.#tasks.push(task);
    const result = await this.#taskQueue.next();
    return result.value;
  }

  // Prevents async race conditions
  async *#createTaskQueue() {
    for (const task of this.#tasks) yield await task();
  }
}

export class SchemaCompiler {
  static #moduleCache = {};
  #webApi;
  #styler;
  #contextFactory;

  constructor(webApi) {
    this.#webApi = webApi;
    this.#styler = new Styler(webApi);
    this.#contextFactory = new ContextFactory(this);
  }

  get webApi() {
    return this.#webApi;
  }

  createMacroTasks(macroTaskSize = 100) {
    let divider = 0;
    return () => {
      if (++divider % macroTaskSize === 0) {
        return new Promise((resolve) => setTimeout(resolve));
      }
    };
  }

  async initComponents(components) {
    if (components.length === 0) return;
    const runMacroTask = this.createMacroTasks();
    for (const component of components) {
      await runMacroTask();
      await component.hooks.init.call(component);
    }
  }

  // async createComponents(input) {
  //   const schema = await this.createSchema(input);
  //   const create = (schema) => this.createComponent(schema);
  //   if (Array.isArray(schema)) return schema.map(create);
  //   return [create(schema)];
  // }

  // async init(input) {
  //   const schema = await this.createSchema(input);
  //   schema.createBinding(() => this.createBinding(schema));
  //   this.setSchemaRenderer(schema);
  //   return schema.init(this);
  // }

  // async createComponents(input, parent) {
  //   const create = (schema) => this.createComponent(schema, parent);
  //   if (Array.isArray(input)) return Promise.all(input.map(create));
  //   return [await create(input)];
  // }
  //
  // async createComponent(input, parent) {
  //   const schema = await this.createSchema(input, parent);
  //   schema.createBinding(() => this.createBinding(schema));
  //   this.setSchemaRenderer(schema);
  //   return schema.init(this);
  // }

  async *generateComponents(input, parent) {
    const generator = this.#contextFactory.generate(input, parent);
    const runMacroTask = this.createMacroTasks();
    const components = [];
    for await (const context of generator) {
      await runMacroTask();
      const renderer = new Renderer(context, this.#styler, this);
      context.setRenderer(renderer);
      const component = context.component;
      if (component.hooks.init) components.push(component);
      yield context;
    }
    await this.initComponents(components);
  }

  // createSchema(input, parent) {
  //   return this.#contextFactory.create(input, parent);
  // }

  createBinding(schema) {
    if (typeof schema === 'string') {
      return new TextBinding(schema, this.#webApi);
    }
    return new ElementBinding(schema, this.#webApi);
  }

  async loadSchema(schemaLoader) {
    const { path, base, args } = schemaLoader;
    const cache = SchemaCompiler.#moduleCache;
    let url = path.endsWith('.js') ? path : `${path}.js`;
    if (base) url = new URL(url, base);
    const cached = cache[url];
    let module;
    if (cached) module = cached;
    else module = cache[url] = await import(url);
    return module.default(args);
  }
}
