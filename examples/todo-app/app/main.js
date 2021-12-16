import bootstrap from '../../../index.js';
import './preload.js';

bootstrap({
  path: './pages/index.component',
  base: import.meta.url,
});
