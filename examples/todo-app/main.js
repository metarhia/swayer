const locales = {
  uk: 'uk',
  en: 'en',
};

const createPageComponent = (locale = locales.uk) => ({
  path: '@app/site/page.component',
  input: { locale },
});

export default {
  namespaces: {
    '@app': 'app',
    '@todos': 'app/features/todos',
  },
  preload: [
    '@app/site/head.component',
    '@app/site/footer.component',
    '@todos/header/header.component',
    '@todos/container.component',
    '@todos/list/list.component',
    '@todos/list/todo/todo.component',
    '@todos/footer/footer.component',
  ],
  children: [
    {
      routes: [
        {
          pattern: ['', 'todos'],
          component: createPageComponent(),
        },
        {
          pattern: [':locale', ':locale/todos'],
          canMatch: (params) => params.locale in locales,
          component: (params) => createPageComponent(locales[params.locale]),
        },
        {
          pattern: '**',
          component: createPageComponent(),
        },
      ],
    },
  ],
};
