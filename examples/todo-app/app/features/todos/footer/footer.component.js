import { clearTodosButtonStyles, footerStyles } from './footer.styles.js';

const calculateCounts = (todos) => {
  const completed = todos.filter((todo) => todo.completed).length;
  const remaining = todos.length - completed;
  return { completed, remaining };
};

const getItemsText = (count) => (count === 1 ? 'item left' : 'items left');

const clearButton = {
  tag: 'button',
  meta: import.meta,
  text: 'Clear completed',
  styles: clearTodosButtonStyles(),
  events: {
    click() {
      this.emitEvent('clearCompletedEvent');
    },
  },
};

/** @returns {Schema} */
export default ({ todos }) => ({
  tag: 'footer',
  meta: import.meta,
  styles: footerStyles(),
  state: { counts: calculateCounts(todos) },
  channels: {
    todoChangeChannel() {
      this.state.counts = calculateCounts(todos);
    },
  },
  children: [
    {
      tag: 'span',
      meta: import.meta,
      styles: {
        float: 'left',
        textAlign: 'left',
      },
      children: [
        {
          tag: 'span',
          text: ({ counts }) => counts.remaining,
        },
        ' ',
        {
          tag: 'span',
          text: ({ counts }) => getItemsText(counts.remaining),
        },
      ],
    },
    ({ counts }) => counts.completed > 0 && clearButton,
  ],
  hooks: {
    init() {
      console.log('footer init');
    },
    destroy() {
      console.log('footer destroy');
    },
  },
});
