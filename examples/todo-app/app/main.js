import bootstrap from '../node_modules/swayer/index.js';
import './preload.js';

console.time('Bootstrap');
await bootstrap({
  path: './pages/index.component',
  base: import.meta.url,
});
console.timeEnd('Bootstrap');
