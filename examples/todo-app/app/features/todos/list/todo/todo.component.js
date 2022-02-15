import todoCtrl from '../../domain/todo-controller.js';
import {
  editTodoStyles,
  removeTodoButtonStyles,
  todoToggleStyles,
  todoStyles,
  todoTitleStyles,
} from './todo.styles.js';

// todo refactor to styles reflection when available

/** @returns {Schema} */
const createTodoToggle = (todo) => ({
  tag: 'i',
  styles: todoToggleStyles(todo.completed),
  events: {
    click() {
      todoCtrl.toggleCompletion(todo);
      this.emitEvent('toggleTodoEvent', todo);
    },
  },
});

/** @returns {Schema} */
const createTodoLabel = (todo) => ({
  tag: 'label',
  text: todo.title,
  styles: todoTitleStyles(todo.completed),
  events: {
    dblclick() {
      this.emitEvent('startEditingTodoEvent');
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
      this.destroy();
    },
    keyup(event) {
      const value = this.props.value;
      if (event.key === 'Enter' && value) {
        todoCtrl.updateEditingTodo(todo, value);
        this.emitEvent('titleUpdateEvent', todo);
        this.blur();
      } else if (event.key === 'Escape') {
        this.blur();
      }
    },
  },
});

/** @returns {Schema} */
export default ({ todo }) => ({
  tag: 'li',
  meta: import.meta,
  styles: todoStyles(),
  events: {
    todoRemoveEvent() {
      todoCtrl.remove(todo);
      this.emitEvent('todoChangeEvent');
      this.destroy();
    },
  },
  // todo resolve: this leads to memory leak warn when over 20 lis
  channels: {
    testChannel() {
    },
  },
  children: [
    {
      tag: 'div',
      styles: { position: 'relative' },
      events: {
        toggleTodoEvent({ detail: todo }) {
          const icon = createTodoToggle(todo);
          const label = createTodoLabel(todo);
          this.children.splice(0, 2, icon, label);
          this.emitEvent('todoChangeEvent');
        },
        async startEditingTodoEvent() {
          const editInput = createEditInput(todo);
          const [input] = await this.children.push(editInput);
          input.focus();
        },
        titleUpdateEvent({ detail: todo }) {
          const label = createTodoLabel(todo);
          this.children.splice(1, 1, label);
        },
      },
      children: [
        createTodoToggle(todo),
        createTodoLabel(todo),
        {
          tag: 'button',
          styles: removeTodoButtonStyles(),
          events: {
            click() {
              this.emitEvent('todoRemoveEvent');
            },
          },
        },
      ],
    },
  ],
});
