import NodeBinding from './binding.js';
import { equal, is } from './utils.js';

export default class Renderer {
  #styler;
  engine;
  context;
  webApi;
  binding;

  constructor(engine, context) {
    this.#styler = context.styler;
    this.engine = engine;
    this.context = context;
    this.webApi = engine.webApi;
    this.binding = this.createBinding();
  }

  createBinding() {
    const webApi = this.webApi;
    const schema = this.context.schema;
    return new NodeBinding(webApi, schema);
  }

  render() {
    const { binding, schema } = this.context;
    this.#styler.setStyles(this.context, schema.styles);
    this.context.parent?.binding.attach(binding);
  }

  replace(context) {
    const { binding, schema } = context;
    this.#styler.setStyles(context, schema.styles);
    this.binding.replaceWith(binding);
    this.context.destroy();
  }

  after(context) {
    const { binding, schema } = context;
    this.#styler.setStyles(context, schema.styles);
    this.binding.after(binding);
  }

  append(context) {
    const { binding, schema } = context;
    this.#styler.setStyles(context, schema.styles);
    this.binding.attach(binding);
  }

  remove() {
    this.binding.detach();
  }

  async renderChildren(schemas) {
    const parent = this.context;
    const segment = parent.children[0];
    for (let i = 0; i < schemas.length; ++i) {
      const schema = schemas[i];
      const context = segment[i];
      if (this.#compareSchemas(context, schema)) continue;
      const childContext = await this.engine.createChildContext(schema, parent);
      if (context) {
        segment.splice(segment.indexOf(context), 1, childContext);
        context.renderer.replace(childContext);
      } else {
        segment.push(childContext);
        parent.renderer.append(childContext);
      }
      const generator = this.engine.start(childContext);
      await this.engine.finalize(generator);
    }
    this.#alignSegment(schemas, segment);
  }

  async rerenderSegment(segIndex) {
    this.clearSegment(segIndex);
    const parent = this.context;
    const schema = parent.schema.children[segIndex];
    const childContext = await this.engine.createChildContext(schema, parent);
    const generator = this.engine.start(childContext);
    await this.engine.finalize(generator);
  }

  async renderSegment(schema, segIndex) {
    const isSingle = !is.arr(schema);
    if (isSingle) return this.#renderSegment(schema, segIndex);
    for (let i = 0; i < schema.length; ++i) {
      await this.#renderSegment(schema[i], segIndex, i);
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

  async #renderSegment(input, segIndex, ctxIndex = 0) {
    if (!input) return this.clearSegment(segIndex);
    const parent = this.context;
    const segment = parent.children[segIndex];
    const context = segment[ctxIndex];
    if (this.#compareSchemas(context, input)) return;
    const childContext = await this.engine.createChildContext(input, parent);
    if (context) {
      context.renderer.replace(childContext);
    } else {
      const sibling = parent.children.getAnchorContext(segIndex);
      if (sibling) sibling.renderer.after(childContext);
      else parent.renderer.append(childContext);
    }
    segment[ctxIndex] = childContext;
    const generator = this.engine.start(childContext);
    await this.engine.finalize(generator);
  }

  #compareSchemas(context, inputSchema) {
    return context && equal(context.originalSchema, inputSchema);
  }
}
