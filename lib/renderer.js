import { ElementBinding, TextBinding } from './binding.js';
import { STYLE_REF_ATTR } from './constants.js';
import { equal, is } from './utils.js';

export class Renderer {
  engine;
  context;
  webApi;
  binding;

  constructor(engine, context) {
    this.engine = engine;
    this.context = context;
    this.webApi = engine.webApi;
    this.binding = this.createBinding();
  }

  /** @returns {import('./binding.js').NodeBinding} */
  createBinding() {
    throw new Error('Method not implemented');
  }

  render() {
    const { binding } = this.context;
    this.context.parent.binding.append(binding);
  }

  replace(context) {
    const { binding } = context;
    this.binding.replaceWith(binding);
    this.context.destroy();
  }

  after(context) {
    const { binding } = context;
    this.binding.after(binding);
  }

  append(context) {
    const { binding } = context;
    this.binding.append(binding);
  }

  prepend(context) {
    const { binding } = context;
    this.binding.prepend(binding);
  }

  remove() {
    this.binding.detach();
  }
}

export class TextRenderer extends Renderer {
  createBinding() {
    const webApi = this.webApi;
    const schema = this.context.schema;
    return new TextBinding(webApi, schema);
  }
}

export class ElementRenderer extends Renderer {
  createBinding() {
    const webApi = this.webApi;
    const schema = this.context.schema;
    return new ElementBinding(webApi, schema);
  }

  render() {
    const { schema } = this.context;
    this.context.styler.setStyles(this.context, schema.styles);
    return super.render();
  }

  replace(context) {
    const { schema } = context;
    this.context.styler.setStyles(context, schema.styles);
    return super.replace(context);
  }

  after(context) {
    const { schema } = context;
    this.context.styler.setStyles(context, schema.styles);
    return super.after(context);
  }

  append(context) {
    const { schema } = context;
    this.context.styler.setStyles(context, schema.styles);
    return super.append(context);
  }

  prepend(context) {
    const { schema } = context;
    this.context.styler.setStyles(context, schema.styles);
    return super.prepend(context);
  }

  async renderChildren(schemas) {
    const parent = this.context;
    const segment = parent.children[0];
    for (let i = 0; i < schemas.length; ++i) {
      const schema = schemas[i];
      const context = segment[i];
      if (this.#compareSchemas(context, schema)) continue;
      const startContext = await this.engine.createContext(schema, parent);
      if (context) {
        segment.splice(segment.indexOf(context), 1, startContext);
        context.renderer.replace(startContext);
      } else {
        segment.push(startContext);
        parent.renderer.append(startContext);
      }
      const generator = this.engine.start(startContext);
      await this.engine.finalize(generator);
    }
    this.#alignSegment(schemas, segment);
  }

  async renderSegment(schema, segIndex, force) {
    const isSingle = !is.arr(schema);
    if (isSingle) return this.#renderSegment(schema, segIndex, 0, force);
    for (let i = 0; i < schema.length; ++i) {
      await this.#renderSegment(schema[i], segIndex, i, force);
    }
    const segment = this.context.children[segIndex];
    this.#alignSegment(schema, segment);
  }

  #alignSegment(schemas, segment) {
    const leftover = segment.slice(schemas.length);
    for (const context of leftover) context.destroy();
    segment.length = schemas.length;
  }

  clearSegment(index) {
    const segment = this.context.children[index];
    while (segment.length > 0) segment.pop().destroy();
  }

  async #renderSegment(schema, segIndex, ctxIndex = 0, force = false) {
    if (!schema) return this.clearSegment(segIndex);
    const parent = this.context;
    const segment = parent.children[segIndex];
    const context = segment[ctxIndex];
    if (!force && this.#compareSchemas(context, schema)) return;
    const startContext = await this.engine.createContext(schema, parent);
    if (context) {
      context.renderer.replace(startContext);
    } else {
      const sibling = parent.children.getPrevSiblingContext(segIndex);
      if (sibling) sibling.renderer.after(startContext);
      else parent.renderer.prepend(startContext);
    }
    segment[ctxIndex] = startContext;
    const generator = this.engine.start(startContext);
    await this.engine.finalize(generator);
  }

  #compareSchemas(context, inputSchema) {
    return context && equal(context.originalSchema, inputSchema);
  }
}

export class HeadRenderer extends ElementRenderer {
  render() {
    const style = this.context.parent.parent.renderer.style;
    const head = this.binding.getNativeNode();
    head.append(style);
    super.render();
    this.#resetStyleHandler(style.sheet);
  }

  replace(context) {
    const head = this.binding.getNativeNode();
    const headChildren = Array.from(head.children);
    const style = headChildren.find((node) => node.dataset[STYLE_REF_ATTR]);
    const newHead = context.binding.getNativeNode();
    newHead.append(style);
    super.replace(context);
    this.#resetStyleHandler(style?.sheet);
  }

  #resetStyleHandler(sheet) {
    if (!sheet) return;
    const ruleHandler = (rule) => sheet.insertRule(rule, sheet.cssRules.length);
    this.context.styler.setRuleHandler(ruleHandler);
  }
}
