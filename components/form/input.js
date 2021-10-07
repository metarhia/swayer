export default {
  tag: 'input',
  styles: {
    padding: '5px 10px',
    borderRadius: '5px',
    border: 'none'
  },
  attrs: {
    type: 'text',
    placeholder: 'Name'
  },
  state: {},
  events: {
    input(event) {
      const value = event.target.value;
      domain.data.sender.setData(value);
      const inputTitle = this.state.initialInputTitle + value;
      components.form.container.children[0].text = inputTitle;
    }
  },
  hooks: {
    init() {
      console.log('Input init');
      this.state.initialInputTitle = components.form.container.children[0].text;
    }
  }
};
