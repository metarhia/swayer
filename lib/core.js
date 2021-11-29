import ElementBinding from './element.js';
import { BadInputSchemaError } from './errors.js';
import {
  ComponentChildren,
  CONSTRUCT_CHILDREN,
  Metacomponent,
} from './metacomponent.js';
import Metastyle from './metastyle.js';

class ComponentFactory {
  static moduleCache = {};
  // Higher value means longer macro tasks, this value is optimal
  macroTaskSize = 100;
  metastyle;
  webApi;

  constructor(webApi) {
    this.webApi = webApi;
    this.metastyle = new Metastyle(this.webApi);
  }

  static async loadSchema(input) {
    const { tag, path, base, args } = input;
    if (tag) {
      return input;
    } else if (path) {
      let url = path.endsWith('.js') ? path : `${path}.js`;
      if (base) url = new URL(url, base);
      const cached = ComponentFactory.moduleCache[url];
      let module;
      if (cached) module = cached;
      else module = ComponentFactory.moduleCache[url] = await import(url);
      return module.default(args);
    }
    throw new BadInputSchemaError(input);
  }

  async createComponent(schema, children, elementBinding) {
    const component = new Metacomponent(schema, children, elementBinding);
    Object.seal(component);
    if (component.hooks.init) await component.hooks.init.call(component);
    return component;
  }

  createMacroTask(divider) {
    if (divider % this.macroTaskSize === 0) {
      return new Promise((resolve) => setTimeout(resolve));
    }
  }
}

class CreationFactory extends ComponentFactory {
  async create(initSchema, parentBinding) {
    const schema = await ComponentFactory.loadSchema(initSchema);
    const binding = ElementBinding.forNew(schema, this.webApi);
    await this.createMacroTask(binding.id);
    this.metastyle.create(schema, binding);
    parentBinding.attach(binding);
    const children = await this.createChildren(binding, schema.children);
    return this.createComponent(schema, children, binding);
  }

  async createRoot(initSchema) {
    const schema = await ComponentFactory.loadSchema(initSchema);
    const binding = ElementBinding.forNew(schema, this.webApi);
    this.metastyle.create(schema, binding);
    binding.setRoot();
    if (this.metastyle.polyfill) await this.metastyle.polyfill.load();
    const children = await this.createChildren(binding, schema.children);
    return this.createComponent(schema, children, binding);
  }

  async createChildren(parentBinding, initSchemas = []) {
    const children = [];
    for (const initSchema of initSchemas) {
      const component = await this.create(initSchema, parentBinding);
      children.push(component);
    }
    return this.createComponentChildren(children, parentBinding);
  }

  async createComponentChildren(children, parentBinding) {
    const createChildren = this.createChildren;
    const createParentChildren = createChildren.bind(this, parentBinding);
    const componentChildren = new ComponentChildren(...children);
    return componentChildren[CONSTRUCT_CHILDREN](createParentChildren);
  }
}

class RecreationFactory extends CreationFactory {
  async recreate(initSchema, element) {
    const schema = await ComponentFactory.loadSchema(initSchema);
    const binding = ElementBinding.forExisting(schema, element, this.webApi);
    await this.createMacroTask(binding.id);
    const children = await this.recreateChildren(
      binding,
      schema.children,
      element.children
    );
    return this.createComponent(schema, children, binding);
  }

  async recreateRoot(initSchema, element) {
    const schema = await ComponentFactory.loadSchema(initSchema);
    const binding = ElementBinding.forExisting(schema, element, this.webApi);
    binding.setRoot();
    const children = await this.recreateChildren(
      binding,
      schema.children,
      element.children
    );
    return this.createComponent(schema, children, binding);
  }

  async recreateChildren(parentBinding, initSchemas = [], elements = []) {
    const children = [];
    const length = initSchemas.length;
    for (let i = 0; i < length; ++i) {
      const initSchema = initSchemas[i];
      const element = elements[i];
      const component = await this.recreate(initSchema, element);
      children.push(component);
    }
    return this.createComponentChildren(children, parentBinding);
  }
}

export default function bootstrap(main) {
  const factory = new CreationFactory(window);
  return factory.createRoot(main);
}
