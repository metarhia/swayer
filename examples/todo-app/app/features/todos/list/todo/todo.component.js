import {
  editTodoStyles,
  removeTodoButtonStyles,
  todoStyles,
  todoTitleStyles,
  todoToggleStyles,
} from './todo.styles.js';

// todo refactor to styles reflection when available

/** @returns {Schema} */
const createTodoToggle = (completed) => ({
  tag: 'i',
  styles: todoToggleStyles(completed),
  events: {
    click() {
      this.state.completed = !completed;
      this.emitEvent('todoChangeEvent');
    },
  },
});

/** @returns {Schema} */
const createTodoLabel = (completed) => ({
  tag: 'label',
  text: { title: (value) => value },
  styles: todoTitleStyles(completed),
  events: {
    dblclick() {
      this.state.editing = true;
    },
  },
});

/** @returns {Schema} */
const createEditInput = (todo) => ({
  tag: 'input',
  styles: editTodoStyles(),
  props: {
    value: todo.title,
  },
  events: {
    blur() {
      this.state.editing = false;
      this.destroy();
    },
    keyup(event) {
      const title = this.props.value;
      if (event.key === 'Enter' && title) {
        this.state.title = title;
        this.blur();
      } else if (event.key === 'Escape') {
        this.blur();
      }
    },
  },
  hooks: {
    init() {
      this.focus();
    },
  },
});

/** @returns {Schema} */
export default ({ todo }) => ({
  tag: 'li',
  meta: import.meta,
  styles: todoStyles(),
  state: todo,
  children: [
    {
      tag: 'div',
      styles: { position: 'relative' },
      children: [
        { completed: (completed) => createTodoToggle(completed) },
        { completed: (completed) => createTodoLabel(completed) },
        {
          tag: 'button',
          styles: removeTodoButtonStyles(),
          events: {
            click() {
              this.emitEvent('todoRemoveEvent', todo);
            },
          },
        },
        { editing: (editing, todo) => editing && createEditInput(todo) },
      ],
    },
  ],
});
