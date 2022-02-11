import todoCtrl from '../domain/todo-controller.js';
import { titleStyle, todoInputStyle } from './header.style.js';

/** @returns {Schema[]} */
export default () => [
  {
    tag: 'h1',
    text: 'todos',
    styles: titleStyle(),
  },
  {
    tag: 'input',
    styles: todoInputStyle(),
    attrs: {
      autofocus: true,
      placeholder: 'What needs to be done?',
    },
    props: {
      value: '',
    },
    events: {
      keyup(event) {
        if (event.key === 'Enter' && this.props.value) {
          const todo = todoCtrl.addTodo(this.props.value);
          this.emitCustomEvent('addTodoEvent', todo);
          this.props.value = '';
        }
      },
    },
  },
];
