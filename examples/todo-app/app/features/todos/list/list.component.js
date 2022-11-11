import {
  mainSectionStyles,
  todoListStyles,
  toggleAllTodosStyles,
} from './list.styles.js';

/** @returns {Schema} */
export default (todosModel) => ({
  tag: 'div',
  styles: mainSectionStyles,
  model: todosModel,
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
      children: ({ todos }) => todos.map((todo) => ({
        path: '@todos/list/todo/todo.component',
        input: { todosModel, todo },
      })),
    },
  ],
});
