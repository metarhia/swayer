const locales = {
  uk: 'uk',
  en: 'en',
};
const resolveLocale = (locale) => locales[locale] || locales.uk;

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
          pattern: ':locale',
          component: ({ params }) => ({
            path: '@app/site/page.component',
            input: { locale: resolveLocale(params.locale) },
          }),
        },
      ],
    },
  ],
};
