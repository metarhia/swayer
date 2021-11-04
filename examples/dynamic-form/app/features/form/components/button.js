/** @returns {Metacomponent} */
export default () => ({
  tag: 'button',
  text: 'Send',
  attrs: {
    type: 'button',
    style: {
      padding: '5px 10px',
      borderRadius: '5px',
      backgroundColor: 'green',
      border: 'none',
      color: 'white',
      cursor: 'pointer',
    },
  },
  hooks: {
    init() {
      console.log('Button init');
    },
  },
  state: {
    count: 0,
  },
  events: {
    async click() {
      this.state.count++;
      this.triggerCustomEvent('send');
      console.log(`Button clicked ${this.state.count} times`);
    },
    test() {
      console.log('test');
    },
  },
});
