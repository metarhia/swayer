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
      todoCtrl.startEditing(todo);
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
      todoCtrl.stopEditing(todo);
    },
    keyup(event) {
      const title = this.props.value;
      if (event.key === 'Enter' && title) {
        this.emitEvent('titleUpdateEvent', title);
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
  methods: {
    removeTodo() {
      todoCtrl.removeTodo(todo);
      this.emitEvent('todoChangeEvent');
      this.destroy();
    },
  },
  events: {
    todoRemoveEvent() {
      this.methods.removeTodo();
    },
  },
  channels: {
    clearCompletedTodos() {
      if (todo.completed) this.methods.removeTodo();
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
        titleUpdateEvent({ detail: title }) {
          todoCtrl.updateTodo(todo, title);
          this.children[1].text = title;
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
