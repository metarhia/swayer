import todoCtrl from '../domain/todo-controller.js';
import todoStore from '../domain/todo-store.js';
import {
  mainSectionStyles,
  todoListStyles,
  toggleAllTodosStyles,
} from './list.styles.js';

/** @returns {SchemaRef} */
const createListItem = (todo) => ({
  path: './todo/todo.component',
  base: import.meta.url,
  args: { todo },
});

/** @returns {Schema} */
export default ({ todos }) => ({
  tag: 'div',
  styles: mainSectionStyles(),
  children: [
    {
      tag: 'input',
      styles: toggleAllTodosStyles(),
      attrs: {
        type: 'checkbox',
      },
    },
    {
      tag: 'ul',
      meta: import.meta,
      styles: todoListStyles(),
      channels: {
        addTodoChannel(todo) {
          const li = createListItem(todo);
          this.children.push(li);
        },
        clearCompletedTodos() {
          for (let i = 0; i < todoStore.todos.length; ++i) {
            const todo = todoStore.todos[i];
            if (todo.completed) {
              this.children.splice(i--, 1);
              todoCtrl.remove(todo);
            }
          }
          this.emitEvent('todoChangeEvent');
        },
      },
      children: todos.map(createListItem),
    },
  ],
});
