import { todoListStyles } from './list.styles.js';

/** @returns {Schema<TodosModel>} */
export default (todosModel) => ({
  tag: 'ul',
  model: todosModel,
  styles: todoListStyles,
  children: ({ todos }) => todos.map((todo) => ({
    path: '@todos/list/todo/todo.component',
    input: { todosModel, todo },
  })),
});
