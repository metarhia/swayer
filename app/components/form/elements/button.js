export default (styles, sender) => ({
  tag: 'button',
  text: 'Send',
  styles,
  attrs: {
    name: 'sendBtn'
  },
  state: {
    count: 0
  },
  events: {
    async click() {
      this.state.count++;
      await sender.send();
      console.log(`Button clicked ${this.state.count} times`);
    }
  },
  hooks: {
    init() {
      console.log('Button init');
    }
  }
});
