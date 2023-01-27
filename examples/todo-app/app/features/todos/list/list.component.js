import { todoListStyles } from './list.styles.js';

/** @returns {Schema<TodosModel>} */
export default (todosModel) => ({
  tag: 'ul',
  model: todosModel,
  styles: todoListStyles,
  events: {
    toggleComplete() {
      todosModel.calculateCounts();
    },
    removeTodo({ detail: index }) {
      todosModel.removeTodo(index);
    },
    todoChange() {
      todosModel.save();
    },
  },
  children: ({ todos }) => todos.map((todo, index) => ({
    path: '@todos/list/todo/todo.component',
    input: { todo, index },
  })),
});
