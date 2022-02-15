import { clearTodosButtonStyles, footerStyles } from './footer.styles.js';

const getItemsText = (count) => (count === 1 ? 'item left' : 'items left');

/** @returns {Schema} */
export default ({ remainingCount, completedCount }) => ({
  tag: 'footer',
  styles: footerStyles(),
  children: [
    {
      tag: 'span',
      styles: {
        float: 'left',
        textAlign: 'left',
      },
      children: [
        {
          tag: 'span',
          text: remainingCount,
        },
        ' ',
        {
          tag: 'span',
          text: getItemsText(remainingCount),
        },
      ],
    },
    completedCount > 0 && {
      tag: 'button',
      meta: import.meta,
      text: 'Clear completed',
      styles: clearTodosButtonStyles(),
      events: {
        click() {
          const scope = '../list/list.component';
          this.emitMessage('clearCompletedTodos', null, { scope });
        },
      },
    },
  ],
});
