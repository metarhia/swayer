const locales = {
  uk: 'uk',
  en: 'en',
};

const createPageComponent = (locale = locales.uk) => ({
  path: '@site/page.component',
  input: { locale },
});

export default {
  namespaces: {
    '@site': 'app/site',
    '@todos': 'app/features/todos',
  },
  preload: [
    '@site/head.component',
    '@site/header.component',
    '@site/footer.component',
    '@todos/container.component',
    '@todos/input/input.component',
    '@todos/list/list.component',
    '@todos/list/todo/todo.component',
    '@todos/counts/counts.component',
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
