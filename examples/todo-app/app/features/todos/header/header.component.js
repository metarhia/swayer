import { titleStyles, todoInputStyles } from './header.styles.js';

/** @returns {Schema[]} */
export default () => [
  {
    tag: 'h1',
    text: 'todos',
    styles: titleStyles,
  },
  {
    tag: 'input',
    styles: todoInputStyles,
    state: {
      test: 'Initial',
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
        this.state.test = this.props.value;
      },
      keyup(event) {
        if (event.key === 'Enter' && this.props.value) {
          this.emitEvent('todoAddEvent', this.props.value);
          this.props.value = '';
        }
      },
    },
  },
];
