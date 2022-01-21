import { ComponentContext } from './component.js';
import { BadInputSchemaError } from './errors.js';
import Styler from './styler.js';

class ContextFactory {
  static #moduleCache = {};
  #defaultMicroTaskSize = 100;
  #webApi;

  constructor(webApi) {
    this.#webApi = webApi;
  }

  static async #loadModule(schemaLoader) {
    const { path, base, args } = schemaLoader;
    let url = path.endsWith('.js') ? path : `${path}.js`;
    if (base) url = new URL(url, base);
    const cached = ContextFactory.#moduleCache[url];
    let module;
    if (cached) module = cached;
    else module = ContextFactory.#moduleCache[url] = await import(url);
    return module.default(args);
  }

  static #validateSchema(schema) {
    const has = Object.prototype.hasOwnProperty.bind(schema);
    const isObj = typeof schema === 'object' && !Array.isArray(schema);
    const isPoor = isObj && !has('path') && !has('tag');
    if (isPoor) throw new BadInputSchemaError(schema, 'poor');
    const isConflict = has('text') && has('children');
    if (isConflict) throw new BadInputSchemaError(schema, 'conflict');
    return schema;
  }

  #createMacroTask(macroTaskSize = this.#defaultMicroTaskSize, divider) {
    if (divider % macroTaskSize === 0) {
      return new Promise((resolve) => setTimeout(resolve));
    }
  }

  async #normalizeSchema(schema) {
    const isArray = Array.isArray(schema);
    if (isArray) schema = await Promise.all(schema.map(this.#normalizeSchema));
    else if (schema.path) schema = await ContextFactory.#loadModule(schema);
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
    const createMacroTask = this.#createMacroTask.bind(this, taskSize);
    let taskCounter = 0;
    while (stack.length > 0) {
      await createMacroTask(++taskCounter);
      const context = stack.pop();
      yield context;
      const children = context.schema.children || [];
      for (let i = children.length - 1; i >= 0; --i) {
        if (!children[i]) continue;
        const schema = await this.#normalizeSchema(children[i]);
        const push = createChildPush(context);
        if (Array.isArray(schema)) {
          schema.forEach(push);
          children.splice((i -= schema.length), 1, ...schema);
        } else {
          push(schema);
          children[i] = schema;
        }
      }
    }
  }
}

export default class WebCompiler {
  #contextFactory;
  #styler;

  webApi;

  constructor(webApi) {
    this.webApi = webApi;
    this.#styler = new Styler(webApi);
    this.#contextFactory = new ContextFactory(webApi);
  }

  async createApp(rootSchema, mountElement) {
    const rootContext = await this.#mount(rootSchema, mountElement);
    await this.#renderComponents(rootContext);
  }

  async #mount(rootSchema, mountElement) {
    const rootContext = await this.#contextFactory.create(rootSchema);
    const { binding } = this.#initComponent(rootContext);
    binding.mountOn(mountElement);
    return rootContext;
  }

  async #renderComponents(parentContext) {
    const contextGenerator = this.#contextFactory.generate(parentContext);
    const readyComponents = [parentContext.component];
    await contextGenerator.next();
    for await (const context of contextGenerator) {
      const { component, parent, binding } = this.#initComponent(context);
      parent.binding.attach(binding);
      Array.prototype.push.call(parent.component.children, component);
      readyComponents.push(component);
    }
    for (const ready of readyComponents) ready.hooks.init?.call(ready);
  }

  async #addChildren(parentContext, schemas = []) {
    const components = [];
    for (const schema of schemas) {
      if (!schema) continue;
      const context = await this.#contextFactory.create(schema, parentContext);
      const { component, parent, binding } = this.#initComponent(context);
      parent.binding.attach(binding);
      await this.#renderComponents(context);
      components.push(component);
    }
    return components;
  }

  async #insertChildren(parentContext, startIndex, replaceCount, schemas = []) {
    const components = [];
    for (let i = 0, j = startIndex; i < schemas.length; ++i, ++j) {
      const schema = schemas[i];
      if (!schema) continue;
      const context = await this.#contextFactory.create(schema, parentContext);
      const { component, parent, binding } = this.#initComponent(context);
      const existing = parent.component.children[j];
      if (existing && replaceCount--) parent.binding.replace(j, binding);
      else parent.binding.insert(j, binding);
      await this.#renderComponents(context);
      components.push(component);
    }
    return components;
  }

  #initComponent(context) {
    const compilerApi = this.#exposeApi(context);
    const { schema, binding } = context.createComponent(compilerApi);
    this.#styler.createStyles(schema, binding);
    return context;
  }

  #exposeApi(context) {
    return {
      addChildren: this.#addChildren.bind(this, context),
      insertChildren: this.#insertChildren.bind(this, context),
    };
  }
}
