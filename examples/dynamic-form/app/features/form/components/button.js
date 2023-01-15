const styles = {
  padding: '5px 10px',
  marginLeft: '10px',
  borderRadius: '5px',
  backgroundColor: 'green',
  border: 'none',
  color: 'white',
  cursor: 'pointer',
  transition: 'all 0.2s ease-in-out',
  hover: {
    backgroundColor: 'darkgreen',
  },
};

/** @returns {Schema} */
export default () => ({
  tag: 'button',
  text: 'Send',
  styles,
  attrs: {
    type: 'button',
  },
  model: {
    state: {
      count: 0,
    },
    inc() {
      this.state.count++;
    },
  },
  events: {
    async click() {
      this.model.inc();
      this.emitEvent('send');
      console.log(`Button clicked ${this.model.state.count} times`);
    },
  },
});
