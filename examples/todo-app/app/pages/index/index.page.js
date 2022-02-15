// Preload
import '../../features/todos/footer/footer.component.js';
import '../../features/todos/header/header.component.js';
import '../../features/todos/list/list.component.js';
import '../../features/todos/list/todo/todo.component.js';
import '../../features/todos/container.component.js';
import './head.component.js';
import './footer.component.js';

const bodyStyles = {
  font: `14px 'Helvetica Neue', Helvetica, Arial, sans-serif`,
  lineHeight: '1.4em',
  background: '#f5f5f5',
  color: '#111111',
  minWidth: '230px',
  maxWidth: '550px',
  margin: '0 auto',
  fontWeight: '300',
};

console.time('Bootstrap');

/** @returns {Schema} */
export default () => ({
  tag: 'html',
  styles: {
    fontFamily: 'Helvetica',
  },
  attrs: {
    lang: 'en',
  },
  hooks: {
    init() {
      console.timeEnd('Bootstrap');
    },
  },
  children: [
    { path: './head.component', base: import.meta.url },
    {
      tag: 'body',
      styles: bodyStyles,
      children: [
        { path: '../../features/todos/container.component', base: import.meta.url },
        { path: './footer.component', base: import.meta.url },
      ],
    },
  ],
});
