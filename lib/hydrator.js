import Binding from './binding.js';
import SSRHash from './hash.js';
import Renderer from './renderer.js';

export default class Hydrator extends Renderer {
  createBinding() {
    const schema = this.context.schema;
    const webApi = this.webApi;
    const element = SSRHash.getExistingElement(schema);
    return new Binding(schema, webApi, element);
  }

  mount(element) {
    if (this.binding.hydrated) return;
    super.mount(element);
  }

  render() {
    if (this.binding.hydrated) return;
    if (typeof this.context.schema === 'string') {
      const { children, binding: parentBinding } = this.context.parent;
      const contexts = children.flat();
      const index = contexts.indexOf(this.context);
      const realNodes = parentBinding.element.childNodes;
      const node = realNodes[index];
      if (node) {
        const prevIndex = index - 1;
        const prevNode = realNodes[prevIndex];
        const textType = this.webApi.Node.TEXT_NODE;
        const isText = prevNode?.nodeType === textType;
        if (isText) {
          const prevContext = contexts[prevIndex];
          prevNode.splitText(prevContext.schema.length);
        }
        return;
      }
    }
    super.render();
  }
}
