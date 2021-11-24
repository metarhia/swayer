import Metacomponent from './metacomponent.js';
import Metastyle from './metastyle.js';
import Reflection from './reflection.js';
import DomRenderer from './renderer.js';

class WebPlatform {
  /** @type Window */
  api;
  renderer;
  metastyle;
  reflection;

  constructor(api) {
    this.api = api;
    this.renderer = new DomRenderer(this.api.document);
    this.metastyle = new Metastyle(this.api);
    this.reflection = new Reflection(this.renderer);
  }
}

class Compiler {
  static moduleCache = {};
  platform;

  constructor(platform) {
    this.platform = platform;
  }

  static async loadSchema(input) {
    const { tag, path, base, args } = input;
    if (tag) {
      return input;
    } else if (path) {
      let url = path.endsWith('.js') ? path : `${path}.js`;
      if (base) url = new URL(url, base);
      const cached = Compiler.moduleCache[url];
      let module;
      if (cached) module = cached;
      else module = Compiler.moduleCache[url] = await import(url);
      return module.default(args);
    }
    const error = new Error(JSON.stringify(input));
    error.name = 'Invalid metacomponent input';
    throw error;
  }
}

class JIT extends Compiler {
  // Higher value means longer macro tasks, this value is optimal
  #macroTaskSize = 100;

  async compileMainSchema(initSchema) {
    const { schema } = await this.#createMetacomponent(initSchema);
    this.platform.renderer.setRoot(schema);
    const { polyfill } = this.platform.metastyle;
    if (polyfill) await polyfill.load();
    schema.children = await this.compileChildren(schema, schema.children);
    if (schema.hooks.init) schema.hooks.init.call(schema);
    return schema;
  }

  async compileChildren(parent, initSchemas) {
    const length = initSchemas.length;
    const compilation = [];
    for (let i = 0; i < length; ++i) {
      const compiled = await this.#compile(parent, initSchemas[i]);
      compilation.push(compiled);
    }
    return compilation;
  }

  async #compile(parent, initSchema) {
    const { schema, id } = await this.#createMetacomponent(initSchema);
    if (id % this.#macroTaskSize === 0) await this.#createMacroTask();
    this.platform.renderer.append(parent, schema);
    const children = schema.children;
    const length = children.length;
    for (let i = 0; i < length; ++i) {
      children[i] = await this.#compile(schema, children[i]);
    }
    if (schema.hooks.init) schema.hooks.init.call(schema);
    return schema;
  }

  async #createMetacomponent(initSchema) {
    const loadedSchema = await Compiler.loadSchema(initSchema);
    const { schema, id } = new Metacomponent(loadedSchema, this);
    this.platform.metastyle.apply(schema, id);
    this.platform.reflection.reflect(schema);
    this.platform.renderer.render(schema);
    Object.seal(schema);
    return { schema, id };
  }

  #createMacroTask() {
    return new Promise((resolve) => setTimeout(resolve));
  }
}

export default function bootstrap(main) {
  const platform = new WebPlatform(window);
  const compiler = new JIT(platform);
  return compiler.compileMainSchema(main);
}
