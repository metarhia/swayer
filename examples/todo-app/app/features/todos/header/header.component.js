import { titleStyles, todoInputStyles } from './header.styles.js';

/** @returns {Schema[]} */
export default (todosState) => [
  {
    tag: 'h1',
    text: 'todos',
    styles: titleStyles,
  },
  {
    tag: 'input',
    styles: todoInputStyles,
    state: {
      model: {
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
        this.state.model.test = this.props.value;
      },
      keyup(event) {
        if (event.key === 'Enter' && this.props.value) {
          const title = this.props.value;
          todosState.addTodo({ title });
          this.props.value = '';
        }
      },
    },
  },
];
