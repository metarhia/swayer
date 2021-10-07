export default {
  tag: 'button',
  text: 'Send',
  styles: await import('./buttonStyles.js').then((m) => m.default),
  attrs: {
    name: 'sendBtn'
  },
  state: {
    count: 0
  },
  events: {
    async click() {
      this.state.count++;
      await domain.data.sender.send();
      console.log(`Button clicked ${this.state.count} times`);
    }
  },
  hooks: {
    init: () => console.log('Button init')
  }
};
