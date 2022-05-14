import ComponentContext from './component.js';
import Reporter from './reporter.js';
import Styler from './styler.js';

class ContextFactory {
  #compiler;
  #webApi;

  constructor(compiler) {
    this.#compiler = compiler;
    this.#webApi = compiler.webApi;
  }

  static #validateSchema(schema) {
    const error = (option) => (
      Reporter.error('BadInputSchema', { option, schema })
    );
    const has = Object.prototype.hasOwnProperty.bind(schema);
    const isObj = typeof schema === 'object' && !Array.isArray(schema);
    const hasReactivity = isObj
      && typeof Object.values(schema)?.[0] === 'function';
    const isPoor = isObj && !hasReactivity && !has('path') && !has('tag');
    if (isPoor) throw error('poor');
    const isConflict = has('text') && has('children');
    if (isConflict) throw error('conflict');
    return schema;
  }

  async #normalizeSchema(schema) {
    const isArray = Array.isArray(schema);
    if (isArray) schema = await Promise.all(schema.map(this.#normalizeSchema));
    else if (schema.path) schema = await this.#compiler.loadSchema(schema);
    const valid = ContextFactory.#validateSchema(schema);
    if (typeof valid === 'string') return Reflect.construct(String, [valid]);
    return valid;
  }

  async create(newSchema, parentContext = null) {
    const schema = await this.#normalizeSchema(newSchema);
    return new ComponentContext(schema, parentContext, this.#webApi);
  }

  async *generate(rootContext) {
    const stack = [rootContext];
    const createChildPush = (context) => (schema) => {
      const childContext = new ComponentContext(schema, context, this.#webApi);
      stack.push(childContext);
    };
    const taskSize = rootContext.schema.config?.macroTaskSize;
    const runMacroTask = this.#compiler.createMacroTasks(taskSize);
    while (stack.length > 0) {
      await runMacroTask();
      const context = stack.pop();
      const children = context.schema.children || [];
      for (let i = children.length - 1; i >= 0; --i) {
        const child = children[i];
        if (!child) continue;
        const schema = await this.#normalizeSchema(children[i]);
        const push = createChildPush(context);
        if (Array.isArray(schema)) {
          schema.forEach(push);
          children.splice(children.indexOf(child), 1, ...schema);
        } else {
          push(schema);
          children[i] = schema;
        }
      }
      yield context;
    }
  }
}

class ComponentManager {
  #compiler;
  #parentContext;
  #tasks = [];
  #taskQueue = this.#generateTasks();

  constructor(compiler, parentContext) {
    this.#compiler = compiler;
    this.#parentContext = parentContext;
  }

  add(...args) {
    const task = () => this.#add(...args);
    return this.#runTask(task);
  }

  insert(...args) {
    const task = () => this.#insert(...args);
    return this.#runTask(task);
  }

  async #add(schemas = []) {
    const components = [];
    const ctx = this.#parentContext;
    for (const schema of schemas) {
      if (!schema) continue;
      const component = await this.#compiler.compile(schema, ctx);
      components.push(component);
    }
    return components;
  }

  async #insert(startIndex, replaceCount, schemas = []) {
    const components = [];
    const compiler = this.#compiler;
    const contextFactory = this.#compiler.contextFactory;
    for (let i = 0, j = startIndex; i < schemas.length; ++i, ++j) {
      const schema = schemas[i];
      if (!schema) continue;
      const context = await contextFactory.create(schema, this.#parentContext);
      const { component, parent, binding } = compiler.createComponent(context);
      const existing = parent.component.children[j];
      if (existing && replaceCount-- > 0) parent.binding.replace(j, binding);
      else parent.binding.insert(j, binding);
      await compiler.renderComponents(context);
      components.push(component);
    }
    return components;
  }

  async #runTask(task) {
    this.#tasks.push(task);
    const { value } = await this.#taskQueue.next();
    return value;
  }

  // Prevents race conditions
  async *#generateTasks() {
    for (const task of this.#tasks) yield await task();
  }
}

export class ComponentCompiler {
  static #moduleCache = {};
  #defaultMacroTaskSize = 100;
  #webApi;
  #styler;
  #contextFactory;

  constructor(webApi) {
    this.#webApi = webApi;
    this.#styler = new Styler(this.webApi);
    this.#contextFactory = new ContextFactory(this);
  }

  get webApi() {
    return this.#webApi;
  }

  get contextFactory() {
    return this.#contextFactory;
  }

  async compile(schema, parentContext) {
    const context = await this.#contextFactory.create(schema, parentContext);
    const { component, parent, binding } = this.createComponent(context);
    parent.binding.attach(binding);
    await this.renderComponents(context);
    return component;
  }

  async renderComponents(rootContext) {
    const contextGenerator = this.#contextFactory.generate(rootContext);
    const rootComponent = rootContext.component;
    const components = rootComponent.hooks.init ? [rootComponent] : [];
    await contextGenerator.next();
    for await (const context of contextGenerator) {
      const { component, parent } = this.createComponent(context);
      parent.binding.attach(context.binding);
      Array.prototype.push.call(parent.component.children, component);
      if (component.hooks.init) components.push(component);
    }
    await this.initComponents(components);
  }

  async initComponents(components) {
    if (components.length === 0) return;
    const taskSize = components[0].config.macroTaskSize;
    const runMacroTask = this.createMacroTasks(taskSize);
    for (const component of components) {
      await runMacroTask();
      await component.hooks.init.call(component);
    }
  }

  createComponent(context, existingNode) {
    const manager = new ComponentManager(this, context);
    const { schema, binding } = context.createComponent(manager, existingNode);
    this.#styler.createStyles(schema, binding);
    return context;
  }

  createMacroTasks(macroTaskSize = this.#defaultMacroTaskSize) {
    let divider = 0;
    return () => {
      if (++divider % macroTaskSize === 0) {
        return new Promise((resolve) => setTimeout(resolve));
      }
    };
  }

  async loadSchema(schemaLoader) {
    const { path, base, args } = schemaLoader;
    const cache = ComponentCompiler.#moduleCache;
    let url = path.endsWith('.js') ? path : `${path}.js`;
    if (base) url = new URL(url, base);
    const cached = cache[url];
    let module;
    if (cached) module = cached;
    else module = cache[url] = await import(url);
    return module.default(args);
  }
}
