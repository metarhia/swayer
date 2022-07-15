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

class Renderer {
  #context;
  #styler;
  #compiler;
  #tasks = [];
  #taskQueue = this.#createTaskQueue();

  constructor(context, compiler) {
    this.#context = context;
    this.#styler = compiler.styler;
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

  async renderChildren() {

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
    const compilation = await this.#compiler.compileRoot(input, parent);
    const { root } = compilation;
    const context = segment[ctxIndex];
    if (context) {
      context.renderer.replace(root);
    } else {
      const sibling = parent.children.getAnchorContext(segIndex);
      if (sibling) sibling.renderer.after(root);
      else parent.renderer.append(root);
    }
    segment[ctxIndex] = root;
    await this.#compiler.compileTree(compilation);
    // for await (const context of generator) context.renderer.render();
    if (context) context.destroy();
  }

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

  init(compiler) {
    this.renderer = new Renderer(this, compiler);
    this.binding = compiler.createBinding(this.schema);
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
        reactiveInput = parent.reactivityManager.registerChildren();
        // reactiveInput = parent.reactivityManager.registerChild(0, input);
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

      context.init(this.#compiler);

      if (context.schema.children) {
        context.children = await new ContextChildren([]).init(this, context);
        const segments = context.children;
        for (let i = segments.length - 1; i >= 0; --i) {
          const segment = segments[i];
          for (let j = segment.length - 1; j >= 0; --j) {
            const context = segment[j];
            if (context) stack.push(context);
          }
        }
      }
      // if (context.original) yield context;
      // console.log(context.schema.tag, context);
      // console.log(context.children);

      // console.log(context.schema.tag, context);
      yield context;
    }
  }
}

export class SchemaCompiler {
  static #moduleCache = {};
  #webApi;
  #contextFactory;
  styler;

  constructor(webApi) {
    this.#webApi = webApi;
    this.#contextFactory = new ContextFactory(this);
    this.styler = new Styler(webApi);
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

  async compileRoot(input, parent) {
    const generator = this.#contextFactory.generate(input, parent);
    const { value: root } = await generator.next();
    return { root, generator };
  }

  async compileTree({ root, generator }) {
    const runMacroTask = this.createMacroTasks();
    const components = [root.component];
    for await (const context of generator) {
      context.renderer.render();
      const component = context.component;
      if (component.hooks.init) components.push(component);
      await runMacroTask();
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
