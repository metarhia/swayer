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
  state: { todos },
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
      styles: todoListStyles(),
      children({ todos }) {
        return todos.map(createListItem);
      },
      // children: todos.map(createListItem),
    },
  ],
});
