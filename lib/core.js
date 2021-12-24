import ElementBinding from './element.js';
import { BadInputSchemaError } from './errors.js';
import { ComponentChildren, Component } from './component.js';
import Styler from './styler.js';

const CONSTRUCT_CHILDREN = Symbol.for('CONSTRUCT_CHILDREN');

class ComponentFactory {
  static moduleCache = {};
  // Higher value means longer macro tasks, 100 is optimal
  macroTaskSize = 100;
  styler;
  webApi;

  constructor(webApi) {
    this.webApi = webApi;
    this.styler = new Styler(this.webApi);
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

  async createComponent(schema, parent, elementBinding) {
    const component = new Component(schema, parent, elementBinding);
    component.children = await this.addChildren(
      component,
      elementBinding,
      schema.children
    );
    if (component.hooks.init) await component.hooks.init.call(component);
    return Object.seal(component);
  }

  createMacroTask(divider) {
    if (divider % this.macroTaskSize === 0) {
      return new Promise((resolve) => setTimeout(resolve));
    }
  }

  addChildren(_parent, _parentBinding, _initSchemas) {
    throw new Error('Not implemented');
  }
}

class CreationFactory extends ComponentFactory {
  async createRoot(initSchema) {
    const schema = await ComponentFactory.loadSchema(initSchema);
    const binding = ElementBinding.forNew(schema, this.webApi);
    this.styler.createStyles(schema, binding);
    binding.setRoot();
    if (this.styler.polyfill) await this.styler.polyfill.load();
    return this.createComponent(schema, null, binding);
  }

  async addChildren(parent, parentBinding, initSchemas = []) {
    const children = [];
    const operation = (binding) => parentBinding.attach(binding);
    for (const initSchema of initSchemas) {
      if (!initSchema) continue;
      const component = await this.#create(parent, initSchema, operation);
      children.push(component);
    }
    return this.#createChildren(parent, parentBinding, children);
  }

  async #insertChildren(
    parent,
    parentBinding,
    startIndex,
    replaceCount,
    initSchemas = []
  ) {
    const children = [];
    if (initSchemas.length > 0) {
      const createOperation = (index) => (binding) => {
        if (replaceCount-- > 0) parentBinding.replace(index, binding);
        else parentBinding.insert(index, binding);
      };
      let currentIndex = startIndex;
      const schemasLength = initSchemas.length;
      for (let i = 0; i < schemasLength; ++i) {
        const initSchema = initSchemas[i];
        if (!initSchema) continue;
        const operation = createOperation((currentIndex += i));
        const component = await this.#create(parent, initSchema, operation);
        children.push(component);
      }
    }
    return this.#createChildren(parent, parentBinding, children);
  }

  async #create(parent, initSchema, domOperation) {
    const schema = await ComponentFactory.loadSchema(initSchema);
    const binding = ElementBinding.forNew(schema, this.webApi);
    await this.createMacroTask(binding.id);
    this.styler.createStyles(schema, binding);
    domOperation(binding);
    return this.createComponent(schema, parent, binding);
  }

  async #createChildren(parent, parentBinding, children) {
    const componentChildren = new ComponentChildren(...children);
    const args = {
      addChildren: this.addChildren.bind(this, parent, parentBinding),
      insertChildren: this.#insertChildren.bind(this, parent, parentBinding),
    };
    return componentChildren[CONSTRUCT_CHILDREN](args);
  }
}

export default function bootstrap(main) {
  const factory = new CreationFactory(window);
  return factory.createRoot(main);
}
