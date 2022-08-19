import { SchemaCompiler } from './core.js';

// TODO Implement object-hash (metahash)
// Platform dependent schema props
const EXCLUDE_HASH_KEYS = ['base', 'meta', 'channels', 'state'];
const HASH_LENGTH = 8;
const HASH_OPTIONS = {
  respectType: false,
  excludeKeys: (key) => EXCLUDE_HASH_KEYS.includes(key),
};

const createSsrHash = (schema) => {
  const hashString = window['objectHash'](schema, HASH_OPTIONS);
  return hashString.slice(-HASH_LENGTH);
};

class DomWalker {
  #webApi;
  #walker;
  #iterator;

  constructor(webApi, rootElement) {
    this.#webApi = webApi;
    const { document, NodeFilter } = webApi;
    const { SHOW_ELEMENT, SHOW_TEXT } = NodeFilter;
    const root = rootElement || document.documentElement;
    const whatToShow = SHOW_ELEMENT + SHOW_TEXT;
    const filter = this.#createFilter();
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

  #createFilter() {
    const { Node, NodeFilter } = this.#webApi;
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

export default class HydrationCompiler extends SchemaCompiler {
  async run(rootInput, element) {
    const walker = new DomWalker(this.webApi, element);
    walker.nextValue();
    const compilation = await this.start(rootInput, null, element);
    await this.#hydrateComponents(compilation, walker);
    return compilation.root;
  }

  async start(input, parent, element) {
    const generator = this.contextFactory.generateExisting(input, parent);
    await generator.next();
    const { value: root } = await generator.next(element);
    return { root, generator };
  }

  async #hydrateComponents(compilation, nodeWalker) {
    const { root, generator } = compilation;
    const runMacroTask = this.createMacroTasks();
    const components = [];
    if (root.component.hooks.init) components.push(root.component);
    let isConsistent = true;
    let node = nodeWalker.nextValue();
    while (true) {
      let compilation;
      const { value: schema } = await generator.next();
      if (node.textContent === schema) isConsistent = true;
      else if (!schema) isConsistent = false;
      else isConsistent = node.dataset.ssr === createSsrHash(schema);
      if (isConsistent) {
        compilation = await generator.next(node);
        node = nodeWalker.nextValue();
        if (schema.text) node = nodeWalker.nextValue();
      } else {
        compilation = await generator.next();
      }
      const { value: context, done } = compilation;
      if (done) break;
      const { component, renderer } = context;
      if (!isConsistent) renderer.render();
      if (component.hooks.init) components.push(component);
      await runMacroTask();
    }
    await this.initComponents(components);
  }

  // DEPRECATED
  // #skipInconsistency(nodeGenerator, node, schema) {
  //   const { TEXT_NODE, ELEMENT_NODE } = this.webApi.Node;
  //   const isElement = () => {
  //     console.log({ node });
  //     return node.nodeType === ELEMENT_NODE;
  //   };
  //   const isConsistent = () => this.#recognizeElement(node, schema);
  //   while (isElement() && !isConsistent()) node = nodeGenerator.nextValue();
  //
  //   const isText = node.nodeType === TEXT_NODE;
  //   const isTextComponent = (
  //     (schema instanceof String) && node.textContent === schema.toString()
  //   );
  //   const isPlainText = isText && !isTextComponent;
  //   if (isPlainText) node = nodeGenerator.nextValue();
  //   return node;
  // }
  //
  // #recognizeElement(node, schema) {
  //   const { tag, text, attrs = {}, state, children = [] } = schema;
  //   const hasSameTag = node.nodeName.toLowerCase() === tag;
  //   if (!hasSameTag) return false;
  //   const hasNodeChild = node.childNodes.length > 0;
  //   const hasSchemaChild = text || children.length > 0;
  //   const hasSimilarChild = hasNodeChild === hasSchemaChild
  //     || !hasNodeChild === !hasSchemaChild;
  //   if (!hasSimilarChild) return false;
  //   return Object.entries(attrs).every(
  //     ([attr, val]) => {
  //       const attrVal = node.getAttribute(attr);
  //       const hasTrueAttr = val === true && node.hasAttribute(attr);
  //       const noFalseAttr = val === false && !node.hasAttribute(attr);
  //       const isReaction = typeof val === 'function';
  //       let hasAttrVal;
  //       if (isReaction) hasAttrVal = val(state) === attrVal;
  //       else hasAttrVal = val === attrVal;
  //       return hasTrueAttr || noFalseAttr || hasAttrVal;
  //     },
  //   );
  // }
}
