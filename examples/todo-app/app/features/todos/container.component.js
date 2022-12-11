import { todosStyles } from './container.styles.js';
import { TodosModel } from './todos.model.js';

/** @returns {Schema<TodosModel>} */
export default () => {
  const todosModel = new TodosModel();
  return {
    tag: 'main',
    styles: todosStyles,
    model: todosModel,
    children: [
      {
        path: '@todos/header/header.component',
        input: todosModel,
      },
      ({ show }) => show && [
        {
          path: `@todos/list/list.component`,
          input: todosModel,
        },
        {
          path: `@todos/footer/footer.component`,
          input: todosModel,
        },
      ],
    ],
  };
};
