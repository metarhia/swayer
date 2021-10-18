import bootstrap from '../node_modules/metacomponents/lib/runtime.js';
import mainComponent from './pages/index.js';
import preloadComponents from './preload.js';

bootstrap(mainComponent, preloadComponents);
