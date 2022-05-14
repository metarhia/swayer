import { clearTodosButtonStyles, footerStyles } from './footer.styles.js';

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
export default () => ({
  tag: 'footer',
  meta: import.meta,
  styles: footerStyles(),
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
          text: { remainingCount: (count) => count },
        },
        ' ',
        {
          tag: 'span',
          text: {
            remainingCount: (count) => getItemsText(count),
          },
        },
      ],
    },
    { completedCount: (count) => count > 0 && clearButton },
  ],
});
