import sender from '../../../domain/sender.js'

export default ({ formTitle }) => ({
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
      sender.setData(value);
      formTitle.text = this.state.initialFormTitle + value;
    }
  },
  hooks: {
    init() {
      console.log('Input init');
      this.state.initialFormTitle = formTitle.text;
    }
  }
});
