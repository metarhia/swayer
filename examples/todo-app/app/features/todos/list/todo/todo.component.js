import {
  editTodoStyles,
  removeTodoButtonStyles,
  todoStyles,
  todoTitleStyles,
  todoToggleStyles,
} from './todo.styles.js';

// todo refactor to styles reflection when available

const emitTodoChange = (component) => {
  const scope = [
    '../../container.component',
    '../../footer/footer.component',
  ];
  component.emitMessage('todoChangeChannel', null, { scope });
};

/** @returns {Schema} */
const createTodoToggle = (completed) => ({
  tag: 'i',
  meta: import.meta,
  styles: todoToggleStyles(completed),
  events: {
    click() {
      this.state.completed = !completed;
      emitTodoChange(this);
    },
  },
  hooks: {
    destroy() {
      console.log('destroy i');
    },
  },
});

/** @returns {Schema} */
const createTodoLabel = (completed) => ({
  tag: 'label',
  text: ({ title }) => title,
  styles: todoTitleStyles(completed),
  events: {
    dblclick() {
      this.state.editing = true;
    },
  },
});

/** @returns {Schema} */
const createEditInput = (title) => ({
  tag: 'input',
  meta: import.meta,
  styles: editTodoStyles(),
  props: {
    value: title,
  },
  events: {
    blur() {
      this.state.editing = false;
    },
    keyup(event) {
      const title = this.props.value;
      if (!title) return;
      if (event.key === 'Enter') {
        this.blur();
        this.state.title = title;
        emitTodoChange(this);
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
  styles: todoStyles(),
  state: todo,
  children: [
    {
      tag: 'div',
      styles: { position: 'relative' },
      children: [
        ({ completed }) => [
          createTodoToggle(completed),
          createTodoLabel(completed),
        ],
        {
          tag: 'button',
          styles: removeTodoButtonStyles(),
          events: {
            click() {
              this.emitEvent('todoRemoveEvent', todo);
            },
          },
        },
        ({ title, editing }) => editing && createEditInput(title),
      ],
    },
  ],
});
