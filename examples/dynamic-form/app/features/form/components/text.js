/** @returns {Schema} */
export default ([name, value]) => ({
  tag: 'input',
  styles: {
    padding: '5px 10px',
    borderRadius: '5px',
    border: 'none',
  },
  attrs: {
    type: 'text',
    name,
    placeholder: value.placeholder,
  },
  events: {
    input(event) {
      this.emitEvent(name, event.target.value);
    },
  },
});
