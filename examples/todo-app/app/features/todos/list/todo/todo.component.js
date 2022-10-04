import {
  editTodoStyles,
  removeTodoButtonStyles,
  todoStyles,
  todoTitleStyles,
  todoToggleStyles,
} from './todo.styles.js';

const emitTodoChange = (component) => {
  const scope = [
    '@todos/container.component',
    '@todos/footer/footer.component',
  ];
  component.emitMessage('todoChangeChannel', null, { scope });
};

/** @returns {Schema} */
const todoToggle = {
  tag: 'i',
  styles: todoToggleStyles,
  events: {
    click() {
      this.state.completed = !this.state.completed;
      emitTodoChange(this);
    },
  },
};

/** @returns {Schema} */
const todoLabel = {
  tag: 'label',
  text: ({ title }) => title,
  styles: todoTitleStyles,
  events: {
    dblclick() {
      this.state.editing = true;
    },
  },
};

/** @returns {Schema} */
const createEditInput = (title) => ({
  tag: 'input',
  styles: editTodoStyles,
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
  styles: todoStyles,
  state: todo,
  children: [
    {
      tag: 'div',
      styles: { position: 'relative' },
      children: [
        todoToggle,
        todoLabel,
        {
          tag: 'button',
          styles: removeTodoButtonStyles,
          state: {
            buttonAnimation: 'none',
            test: true,
          },
          events: {
            click() {
              this.emitEvent('todoRemoveEvent', todo);
            },
            mouseenter() {
              this.state.buttonAnimation = 'show';
            },
            mouseleave() {
              this.state.buttonAnimation = 'hide';
            },
          },
          children: [
            {
              tag: 'i',
              styles: {
                width: '25px',
                height: '25px',
                background: 'url(/assets/icons/remove.svg) center no-repeat',
              },
            },
          ],
        },
        ({ title, editing }) => editing && createEditInput(title),
      ],
    },
  ],
});
