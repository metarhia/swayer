import { ComponentCompiler } from './core.js';

class DomWalker {
  #walker;
  #iterator;

  constructor(webApi, rootElement) {
    const { document, NodeFilter } = webApi;
    const { SHOW_ELEMENT, SHOW_TEXT } = NodeFilter;
    const root = rootElement || document.documentElement;
    const whatToShow = SHOW_ELEMENT + SHOW_TEXT;
    const filter = this.#createFilter(webApi);
    this.#walker = document.createTreeWalker(root, whatToShow, filter);
    this.#iterator = this[Symbol.iterator]();
  }

  get current() {
    return this.#walker.currentNode;
  }

  nextValue() {
    return this.#iterator.next().value;
  }

  *[Symbol.iterator]() {
    do yield this.#walker.currentNode;
    while (this.#walker.nextNode());
  }

  #createFilter({ Node, NodeFilter }) {
    const { TEXT_NODE } = Node;
    const { FILTER_ACCEPT, FILTER_REJECT } = NodeFilter;
    return {
      acceptNode(node) {
        const isText = node.nodeType === TEXT_NODE;
        const isEmptyNode = isText && node.textContent.trim() === '';
        return isEmptyNode ? FILTER_REJECT : FILTER_ACCEPT;
      },
    };
  }
}

export default class HydrationCompiler extends ComponentCompiler {
  async run(rootSchema, mountElement) {
    const walker = new DomWalker(this.webApi, mountElement);
    const rootContext = await this.contextFactory.create(rootSchema);
    const components = await this.hydrateComponents(rootContext, walker);
    await this.initComponents(components);
    return rootContext;
  }

  async hydrateComponents(parentContext, nodeGenerator) {
    const push = Array.prototype.push;
    const skipInconsistency = this.#skipInconsistency.bind(this, nodeGenerator);
    const contextGenerator = this.contextFactory.generate(parentContext);
    const components = [];
    for await (const context of contextGenerator) {
      let node = nodeGenerator.nextValue();
      node = skipInconsistency(node, context.schema);
      const { component, parent } = this.createComponent(context, node);
      if (parent) push.call(parent.component.children, component);
      if (component.hooks.init) components.push(component);
    }
    return components;
  }

  #skipInconsistency(nodeGenerator, node, schema) {
    const { TEXT_NODE, ELEMENT_NODE } = this.webApi.Node;
    const isElement = () => node.nodeType === ELEMENT_NODE;
    const isConsistent = () => this.#recognizeElement(node, schema);
    while (isElement() && !isConsistent()) node = nodeGenerator.nextValue();

    const isText = node.nodeType === TEXT_NODE;
    const isTextComponent = (
      (schema instanceof String) && node.textContent === schema.toString()
    );
    const isPlainText = isText && !isTextComponent;
    if (isPlainText) node = nodeGenerator.nextValue();
    return node;
  }

  #recognizeElement(node, schema) {
    const { tag, text, attrs = {}, children = [] } = schema;
    const hasSameTag = node.nodeName.toLowerCase() === tag;

    const hasNodeChild = node.childNodes.length > 0;
    const hasSchemaChild = text || children.length > 0;
    const hasSimilarChild = hasNodeChild === hasSchemaChild
      || !hasNodeChild === !hasSchemaChild;

    const hasSameAttrs = Object.entries(attrs).every(
      ([attr, val]) => {
        const hasTrueAttr = val === true && node.hasAttribute(attr);
        const noFalseAttr = val === false && !node.hasAttribute(attr);
        const hasAttrVal = val === node.getAttribute(attr);
        return hasTrueAttr || noFalseAttr || hasAttrVal;
      },
    );
    return hasSameTag && hasSimilarChild && hasSameAttrs;
  }
}
