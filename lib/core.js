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
  async compileMainSchema(bareSchema) {
    const schema = await this.createMetacomponent(bareSchema);
    const renderer = this.platform.renderer;
    const tag = schema.tag;
    if (tag === 'html') renderer.setRoot(schema);
    else throw new Error(`Root component schema must include { tag: 'html' }`);
    return this.compileSchemaChildren(schema);
  }

  async compileSchema(bareSchema) {
    const schema = await this.createMetacomponent(bareSchema);
    return this.compileSchemaChildren(schema);
  }

  async compileSchemaChildren(schema, appendChildren) {
    const children = appendChildren || schema.children;
    for (const child of children) {
      const compiledSchema = await this.compileSchema(child);
      const index = schema.children.indexOf(child);
      schema.children[index] = compiledSchema;
      this.platform.renderer.append(compiledSchema, schema);
    }
    if (!appendChildren && schema.hooks.init) schema.hooks.init.call(schema);
    return schema;
  }

  async createMetacomponent(bareSchema) {
    const loadedSchema = await Compiler.loadSchema(bareSchema);
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
