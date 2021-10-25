export default ([name, value]) => ({
  tag: 'input',
  styles: {
    padding: '5px 10px',
    borderRadius: '5px',
    border: 'none',
  },
  attrs: {
    type: 'text',
    placeholder: value.placeholder,
    name,
  },
  events: {
    input(event) {
      this.parent.parent.children[0].text = event.target.value;
    }
  },
});
