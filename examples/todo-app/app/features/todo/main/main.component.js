import todoController from '../domain/todo-controller.js';
import todoStore from '../domain/todo-store.js';
import {
  mainSectionStyle,
  todoListStyle,
  toggleAllTodoStyle,
} from './main.style.js';

/** @returns {SchemaRef} */
const createListItem = (todo) => ({
  path: './todo-item/todo-item.component',
  base: import.meta.url,
  args: { todo },
});

/** @returns {Schema} */
export default ({ todos }) => ({
  tag: 'section',
  styles: mainSectionStyle(),
  children: [
    {
      tag: 'input',
      styles: toggleAllTodoStyle(),
      attrs: {
        type: 'checkbox',
      },
    },
    {
      tag: 'ul',
      meta: import.meta,
      styles: todoListStyle(),
      channels: {
        addTodoChannel(todo) {
          const li = createListItem(todo);
          this.children.push(li);
        },
        clearCompletedChannel() {
          for (let i = 0; i < todoStore.todos.length; ++i) {
            const todo = todoStore.todos[i];
            if (todo.completed) {
              this.children.splice(i--, 1);
              todoController.remove(todo);
            }
          }
          this.emitCustomEvent('todoChangeEvent');
        },
      },
      children: todos.map(createListItem),
    },
  ],
});
