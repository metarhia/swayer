// Preload
import './app/site/page.component.js';
import './app/site/head.component.js';
import './app/features/todos/footer/footer.component.js';
import './app/features/todos/header/header.component.js';
import './app/features/todos/list/list.component.js';
import './app/features/todos/list/todo/todo.component.js';
import './app/features/todos/container.component.js';

export default {
  namespaces: {
    '@app': 'app',
    '@todos': 'app/features/todos',
  },
  routes: [
    {
      pattern: ':lang',
      component: ({ params }) => ({
        path: '@app/site/page.component',
        input: params,
      }),
    },
  ],
};
