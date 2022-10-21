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

/** @returns {Schema} */
export default (args = {}) => {
  console.time('Init');
  return {
    tag: 'html',
    styles: {
      fontFamily: 'Helvetica',
    },
    attrs: {
      lang: 'en',
    },
    hooks: {
      init() {
        console.timeEnd('Init');
      },
    },
    children: [
      { path: '@app/pages/index/head.component', args },
      {
        tag: 'body',
        styles: bodyStyles,
        children: [
          { path: '@todos/container.component' },
          { path: '@app/pages/index/footer.component' },
        ],
      },
    ],
  };
};
