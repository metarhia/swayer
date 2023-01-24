import { TodosModel } from './todos.model.js';

/** @type {Styles} */
const containerStyles = {
  position: 'relative',
  background: 'white',
  boxShadow: `0 2px 4px 0 rgba(0, 0, 0, 0.2),
              0 25px 50px 0 rgba(0, 0, 0, 0.1)`,
};

/** @returns {Schema<TodosModel>} */
export default () => {
  const todosModel = new TodosModel();
  return {
    tag: 'main',
    styles: containerStyles,
    model: todosModel,
    children: [
      {
        path: '@todos/input/input.component',
        input: todosModel,
      },
      ({ show }) => show && [
        {
          path: `@todos/list/list.component`,
          input: todosModel,
        },
        {
          path: `@todos/counts/counts.component`,
          input: todosModel,
        },
      ],
    ],
  };
};
