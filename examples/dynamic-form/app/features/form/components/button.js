export default () => ({
  tag: 'button',
  text: 'Send',
  styles: {
    padding: '5px 10px',
    borderRadius: '5px',
    backgroundColor: 'green',
    border: 'none',
    color: 'white',
    cursor: 'pointer',
  },
  attrs: {
    type: 'submit',
  },
  state: {
    count: 0,
  },
  events: {
    async click() {
      this.state.count++;
      console.log(`Button clicked ${this.state.count} times`);
    },
  },
  hooks: {
    init() {
      console.log('Button init');
    },
  },
});
