import todoCtrl from '../../domain/todo-controller.js';
import todoController from '../../domain/todo-controller.js';
import {
  editTodoStyle,
  removeTodoButtonStyle,
  todoToggleStyle,
  todoItemStyle,
  todoTitleStyle,
} from './todo-item.style.js';

// todo refactor to styles reflection when available

/** @returns Metacomponent */
const createTodoToggle = (todo) => ({
  tag: 'i',
  styles: todoToggleStyle(todo.completed),
  events: {
    click() {
      todoController.toggleCompletion(todo);
      this.emitCustomEvent('toggleTodoEvent', todo);
    },
  },
});

/** @returns Metacomponent */
const createTodoLabel = (todo) => ({
  tag: 'label',
  text: todo.title,
  styles: todoTitleStyle(todo.completed),
  events: {
    dblclick() {
      this.emitCustomEvent('startEditingTodoEvent');
    },
  },
});

/** @returns Metacomponent */
const createEditInput = (todo) => ({
  tag: 'input',
  styles: editTodoStyle(),
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
        this.emitCustomEvent('updateTitleEvent', todo);
        this.blur();
      } else if (event.key === 'Escape') {
        this.blur();
      }
    },
  },
});

/** @returns Metacomponent */
export default ({ todo }) => ({
  tag: 'li',
  styles: todoItemStyle(),
  events: {
    removeTodoEvent() {
      todoController.remove(todo);
      this.emitCustomEvent('todoChangeEvent');
      this.destroy();
    },
    async startEditingTodoEvent() {
      const editInput = createEditInput(todo);
      const [input] = await this.children.push(editInput);
      input.focus();
    },
    updateTitleEvent({ detail: todo }) {
      const label = createTodoLabel(todo);
      this.children[0].children.splice(1, 1, label);
    },
  },
  children: [
    {
      tag: 'div',
      events: {
        toggleTodoEvent({ detail: todo }) {
          const icon = createTodoToggle(todo);
          const label = createTodoLabel(todo);
          this.children.splice(0, 2, icon, label);
          this.emitCustomEvent('todoChangeEvent');
        },
      },
      children: [
        createTodoToggle(todo),
        createTodoLabel(todo),
        {
          tag: 'button',
          styles: removeTodoButtonStyle(),
          events: {
            click() {
              this.emitCustomEvent('removeTodoEvent');
            },
          },
        },
      ],
    },
  ],
});
