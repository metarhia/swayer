import bootstrap from '../../../index.js';
import './preload.js';

bootstrap({
  path: './pages/index.js',
  base: import.meta.url,
});
