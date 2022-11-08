import {
  mainSectionStyles,
  todoListStyles,
  toggleAllTodosStyles,
} from './list.styles.js';

const createListItem = (todoModel) => ({
  path: '@todos/list/todo/todo.component',
  input: todoModel,
});

/** @returns {Schema} */
export default (todosState) => ({
  tag: 'div',
  styles: mainSectionStyles,
  state: todosState,
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
      children: ({ todos }) => todos.map(createListItem),
    },
  ],
});
