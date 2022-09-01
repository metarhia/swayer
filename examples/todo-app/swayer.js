export default {
  namespaces: {
    '@app': './app',
    '@todos': './app/features/todos',
  },
  libs: {
    '@swayer': './node_modules/swayer/index.js',
  },
  routes: {
    '/': '@app/pages/index/index.page',
  },
};
