import Metacomponent from './metacomponent.js';
import Reflection from './reflection.js';
import DomRenderer from './renderer.js';

class WebPlatform {
  api;
  renderer;
  reflection;

  constructor(api) {
    this.api = api;
    this.renderer = new DomRenderer(this.api.document);
    this.reflection = new Reflection(this.renderer);
  }
}

class Compiler {
  platform;

  constructor(platform) {
    this.platform = platform;
  }

  static async loadSchema(schema) {
    const { tag, path, base, args } = schema;
    if (!path && !tag) {
      const error = new Error(JSON.stringify(schema));
      error.name = 'Invalid metacomponent schema';
      throw error;
    }
    if (tag) return schema;
    let url = path.endsWith('.js') ? path : `${path}.js`;
    if (base) url = new URL(url, base);
    const module = await import(url);
    return module.default(args);
  }
}

class JIT extends Compiler {
  async compileMainSchema(initSchema) {
    const schema = await this.#createMetacomponent(initSchema);
    const renderer = this.platform.renderer;
    const tag = schema.tag;
    if (tag === 'html') renderer.setRoot(schema);
    else throw new Error(`Root component schema must include { tag: 'html' }`);
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
    const schema = await this.#createMetacomponent(initSchema);
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
    const { schema } = new Metacomponent(loadedSchema, this);
    this.platform.reflection.reflect(schema);
    this.platform.renderer.render(schema);
    return Object.seal(schema);
  }
}

export default function bootstrap(main) {
  const platform = new WebPlatform(window);
  const compiler = new JIT(platform);
  return compiler.compileMainSchema(main);
}
