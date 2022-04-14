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
        async addTodoChannel(todo) {
          const li = createListItem(todo);
          this.children.push(li);
        },
      },
      children: todos.map(createListItem),
    },
  ],
});
