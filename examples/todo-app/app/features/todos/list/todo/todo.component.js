import { TodoModel } from './todo.model.js';
import {
  editTodoStyles,
  removeTodoButtonStyles,
  todoStyles,
  todoTitleStyles,
  todoToggleStyles,
} from './todo.styles.js';

/** @type {Schema<TodoModel>} */
const todoToggle = {
  tag: 'i',
  styles: todoToggleStyles,
  events: {
    click() {
      this.model.toggleComplete();
      this.emitEvent('toggleComplete');
      this.emitEvent('todoChange');
    },
  },
};

/** @type {Schema<TodoModel>} */
const todoLabel = {
  tag: 'label',
  text: ({ title }) => title,
  styles: todoTitleStyles,
  events: {
    dblclick() {
      this.model.startEditing();
      this.emitEvent('todoChange');
    },
  },
};

/** @type {Schema<TodoModel>} */
const editInput = {
  tag: 'input',
  styles: editTodoStyles,
  props: {
    value: ({ title }) => title,
  },
  events: {
    blur() {
      this.model.endEditing();
    },
    keyup(event) {
      if (event.key === 'Enter') {
        const title = this.props.value;
        this.model.updateTitle(title);
        this.blur();
      } else if (event.key === 'Escape') {
        this.blur();
      }
    },
  },
  hooks: {
    ready() {
      this.focus();
    },
    destroy() {
      this.emitEvent('todoChange');
    },
  },
};

/** @returns {Schema} */
const removeTodoBtn = (index) => {
  const model = {
    state: {
      buttonAnimation: 'none',
    },
    showIcon() {
      this.state.buttonAnimation = 'show';
    },
    hideIcon() {
      this.state.buttonAnimation = 'hide';
    },
  };
  return {
    tag: 'button',
    styles: removeTodoButtonStyles,
    model,
    events: {
      click() {
        this.emitEvent('removeTodo', index);
      },
      mouseenter() {
        this.model.showIcon();
      },
      mouseleave() {
        this.model.hideIcon();
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
  };
};

/** @returns {Schema<TodoModel>} */
export default ({ todo, index }) => ({
  tag: 'li',
  styles: todoStyles,
  model: new TodoModel(todo),
  children: [
    {
      tag: 'div',
      styles: { position: 'relative' },
      children: [
        todoToggle,
        todoLabel,
        removeTodoBtn(index),
        ({ editing }) => editing && editInput,
      ],
    },
  ],
});
