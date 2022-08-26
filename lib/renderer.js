export default class Renderer {
  #context;
  #binding;
  #styler;
  #compiler;

  constructor(context, compiler) {
    this.#context = context;
    this.#binding = context.binding;
    this.#styler = compiler.styler;
    this.#compiler = compiler;
  }

  render() {
    if (this.#binding.hydrated) return;
    this.#styler.createStyles(this.#context);
    this.#context.parent?.binding.attach(this.#binding);
  }

  mount(element) {
    if (this.#binding.hydrated) return;
    this.#binding.mountOn(element);
  }

  replace(context) {
    this.#styler.createStyles(context);
    this.#binding.replaceWith(context.binding);
    this.#context.destroy();
  }

  after(context) {
    this.#styler.createStyles(context);
    this.#binding.after(context.binding);
  }

  append(context) {
    this.#styler.createStyles(context);
    this.#binding.attach(context.binding);
  }

  remove() {
    this.#binding.detach();
  }

  async renderChildren(inputArray) {
    const parent = this.#context;
    const segment = parent.children[0];
    for (let i = 0; i < inputArray.length; ++i) {
      const input = inputArray[i];
      const context = segment[i];
      const compilation = await this.#compiler.start(input, parent);
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
    const segment = this.#context.children[index];
    if (newLength < segment.length) {
      while (newLength !== segment.length) segment.pop().destroy();
    }
  }

  #clearSegment(index) {
    const segment = this.#context.children[index];
    while (segment.length > 0) segment.pop().destroy();
  }

  async #renderSegment(input, segIndex, ctxIndex = 0) {
    if (!input) return this.#clearSegment(segIndex);
    const parent = this.#context;
    const segment = parent.children[segIndex];
    const compilation = await this.#compiler.start(input, parent);
    const { root } = compilation;
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
