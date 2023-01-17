import { todoInputStyles } from './input.styles.js';

/** @returns {Schema} */
export default (todosModel) => ({
  tag: 'input',
  styles: todoInputStyles,
  model: {
    state: {
      test: 'Initial',
    },
  },
  attrs: {
    test: ({ test }) => test || false,
    autofocus: true,
    placeholder: 'What needs to be done?',
  },
  props: {
    value: '',
  },
  events: {
    input() {
      this.model.state.test = this.props.value;
    },
    keyup(event) {
      if (event.key === 'Enter' && this.props.value) {
        const title = this.props.value;
        todosModel.addTodo(title);
        this.model.state.test = this.props.value = '';
      }
    },
  },
});
