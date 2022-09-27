import {
  mainSectionStyles,
  todoListStyles,
  toggleAllTodosStyles,
} from './list.styles.js';

/** @returns {SchemaRef} */
const createListItem = (todo) => ({
  path: '@todos/list/todo/todo.component',
  args: { todo },
});

/** @returns {Schema} */
export default ({ todos }) => ({
  tag: 'div',
  styles: mainSectionStyles,
  children: [
    {
      tag: 'input',
      styles: toggleAllTodosStyles,
      attrs: {
        type: 'checkbox',
      },
    },
    {
      tag: 'ul',
      styles: todoListStyles,
      children: todos.map(createListItem),
    },
  ],
});
