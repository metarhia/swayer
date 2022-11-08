import NodeBinding from './binding.js';
import { equal } from './utils.js';

export default class Renderer {
  #styler;
  compiler;
  context;
  webApi;
  binding;

  constructor(compiler, context) {
    this.#styler = context.styler;
    this.compiler = compiler;
    this.context = context;
    this.webApi = compiler.webApi;
    this.binding = this.createBinding();
  }

  createBinding() {
    const schema = this.context.schema;
    const webApi = this.compiler.webApi;
    return new NodeBinding(schema, webApi);
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
      const root = await this.compiler.createRoot(schema, parent);
      const compilation = await this.compiler.start(root);
      if (context) {
        segment.splice(segment.indexOf(context), 1, root);
        context.renderer.replace(root);
      } else {
        segment.push(root);
        parent.renderer.append(root);
      }
      await this.compiler.finalize(compilation);
    }
    this.#alignSegment(schemas, segment);
  }

  async renderSegment(schema, segIndex) {
    const isSingle = !Array.isArray(schema);
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

  #clearSegment(index) {
    const segment = this.context.children[index];
    while (segment.length > 0) segment.pop().destroy();
  }

  async #renderSegment(input, segIndex, ctxIndex = 0) {
    if (!input) return this.#clearSegment(segIndex);
    const parent = this.context;
    const segment = parent.children[segIndex];
    const context = segment[ctxIndex];
    if (this.#compareSchemas(context, input)) return;
    const root = await this.compiler.createRoot(input, parent);
    const compilation = await this.compiler.start(root);
    if (context) {
      context.renderer.replace(root);
    } else {
      const sibling = parent.children.getAnchorContext(segIndex);
      if (sibling) sibling.renderer.after(root);
      else parent.renderer.append(root);
    }
    segment[ctxIndex] = root;
    await this.compiler.finalize(compilation);
  }

  #compareSchemas(context, inputSchema) {
    return context && equal(context.originalSchema, inputSchema);
  }
}
