/** @returns Metacomponent */
export default ([name, value]) => ({
  tag: 'input',
  attrs: {
    type: 'text',
    name,
    placeholder: value.placeholder,
    style: {
      padding: '5px 10px',
      borderRadius: '5px',
      border: 'none',
    },
  },
  events: {
    input(event) {
      this.triggerCustomEvent(name, event.target.value);
    },
  },
});
