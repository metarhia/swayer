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
    init() {
      this.focus();
    },
  },
};

/** @returns {Schema} */
const removeTodoBtn = () => {
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
        this.emitEvent('removeTodo');
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
export default ({ todosModel, todo }) => ({
  tag: 'li',
  styles: todoStyles,
  model: new TodoModel(todosModel, todo),
  events: {
    removeTodo() {
      this.model.remove();
    },
  },
  children: [
    {
      tag: 'div',
      styles: { position: 'relative' },
      children: [
        todoToggle,
        todoLabel,
        removeTodoBtn(),
        ({ editing }) => editing && editInput,
      ],
    },
  ],
});
