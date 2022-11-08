import { todosStyles } from './container.styles.js';
import { TodosState } from './domain/todos.state.js';

/** @returns {Schema} */
export default () => {
  const todosState = new TodosState();
  return {
    tag: 'main',
    styles: todosStyles,
    state: todosState,
    children: [
      {
        path: '@todos/header/header.component',
        input: todosState,
      },
      // {
      //   // @ts-ignore
      //   routes: {
      //     'test/hello': { path: '@todos/header/header.component' },
      //     'wow/okay/:id': {
      //        path: '@todos/good/good.component',
      //        input: { test: true },
      //      },
      //   },
      // },
      ({ show }) => show && [
        {
          path: `@todos/list/list.component`,
          input: todosState,
        },
        {
          path: `@todos/footer/footer.component`,
          input: todosState,
        },
      ],
    ],
  };
};

// this.route.changes (async generator)
// this.route.params
// this.router.navigate()
