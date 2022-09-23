import NodeBinding from './binding.js';

export default class Renderer {
  #styler;
  #compiler;
  context;
  webApi;
  binding;

  constructor(compiler, context) {
    this.#styler = context.styler;
    this.#compiler = compiler;
    this.context = context;
    this.webApi = compiler.webApi;
    this.binding = this.createBinding();
  }

  createBinding() {
    const schema = this.context.schema;
    const webApi = this.#compiler.webApi;
    return new NodeBinding(schema, webApi);
  }

  mount(element) {
    this.binding.mountOn(element);
  }

  render() {
    this.#styler.createStyles(this.context);
    this.context.parent?.binding.attach(this.binding);
  }

  replace(context) {
    this.#styler.createStyles(context);
    this.binding.replaceWith(context.binding);
    this.context.destroy();
  }

  after(context) {
    this.#styler.createStyles(context);
    this.binding.after(context.binding);
  }

  append(context) {
    this.#styler.createStyles(context);
    this.binding.attach(context.binding);
  }

  remove() {
    this.binding.detach();
  }

  async renderChildren(inputArray) {
    const parent = this.context;
    const segment = parent.children[0];
    for (let i = 0; i < inputArray.length; ++i) {
      const input = inputArray[i];
      const context = segment[i];
      const rootContext = await this.#compiler.createRoot(input, parent);
      const compilation = await this.#compiler.start(rootContext);
      const root = compilation.root;
      if (context) context.renderer.replace(root);
      else parent.renderer.append(root);
      segment[i] = root;
      await this.#compiler.finalize(compilation);
    }
    await this.#destroyRedundantSegments(inputArray.length, 0);
  }

  async renderSegment(input, segIndex) {
    if (Array.isArray(input)) {
      for (let i = 0; i < input.length; ++i) {
        await this.#renderSegment(input[i], segIndex, i);
      }
      this.#destroyRedundantSegments(input.length, segIndex);
      return;
    }
    return this.#renderSegment(input, segIndex);
  }

  #destroyRedundantSegments(newLength, index) {
    const segment = this.context.children[index];
    if (newLength < segment.length) {
      while (newLength !== segment.length) segment.pop().destroy();
    }
  }

  #clearSegment(index) {
    const segment = this.context.children[index];
    while (segment.length > 0) segment.pop().destroy();
  }

  async #renderSegment(input, segIndex, ctxIndex = 0) {
    if (!input) return this.#clearSegment(segIndex);
    const parent = this.context;
    const segment = parent.children[segIndex];
    const rootContext = await this.#compiler.createRoot(input, parent);
    const compilation = await this.#compiler.start(rootContext);
    const root = compilation.root;
    const context = segment[ctxIndex];
    if (context) {
      context.renderer.replace(root);
    } else {
      const sibling = parent.children.getAnchorContext(segIndex);
      if (sibling) sibling.renderer.after(root);
      else parent.renderer.append(root);
    }
    segment[ctxIndex] = root;
    await this.#compiler.finalize(compilation);
  }
}
