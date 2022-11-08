import {
  editTodoStyles,
  removeTodoButtonStyles,
  todoStyles,
  todoTitleStyles,
  todoToggleStyles,
} from './todo.styles.js';

/** @type {Schema} */
const todoToggle = {
  tag: 'i',
  styles: todoToggleStyles,
  events: {
    click() {
      this.state.toggleComplete();
    },
  },
};

/** @type {Schema} */
const todoLabel = {
  tag: 'label',
  text: ({ title }) => title,
  styles: todoTitleStyles,
  events: {
    dblclick() {
      this.state.startEditing();
    },
  },
};

/** @type {Schema} */
const editInput = {
  tag: 'input',
  styles: editTodoStyles,
  props: {
    value: ({ title }) => title,
  },
  events: {
    blur() {
      this.state.endEditing();
    },
    keyup(event) {
      if (event.key === 'Enter') {
        const title = this.props.value;
        this.state.updateTitle(title);
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
const removeTodoBtn = (todoState) => ({
  tag: 'button',
  styles: removeTodoButtonStyles,
  state: {
    model: {
      buttonAnimation: 'none',
    },
    showIcon() {
      this.model.buttonAnimation = 'show';
    },
    hideIcon() {
      this.model.buttonAnimation = 'hide';
    },
  },
  events: {
    click() {
      todoState.remove();
    },
    mouseenter() {
      this.state.showIcon();
    },
    mouseleave() {
      this.state.hideIcon();
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
});

/** @returns {Schema} */
export default (todoModel) => ({
  tag: 'li',
  styles: todoStyles,
  state: todoModel.getState(),
  children: [
    {
      tag: 'div',
      styles: { position: 'relative' },
      children: [
        todoToggle,
        todoLabel,
        removeTodoBtn(todoModel.getState()),
        ({ editing }) => editing && editInput,
      ],
    },
  ],
});
