import bootstrap from '../node_modules/metacomponents/index.js';
import './preload.js';

bootstrap({
  path: './pages/index.js',
  base: import.meta.url,
});
