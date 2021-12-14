import { clearTodosButtonStyle, footerStyle } from './footer.style.js';

const getItemsText = (count) => (count === 1 ? 'item left' : 'items left');

/** @returns Metacomponent */
export default ({ remainingCount, completedCount }) => ({
  tag: 'footer',
  styles: footerStyle(),
  children: [
    {
      tag: 'span',
      styles: {
        float: 'left',
        textAlign: 'left',
      },
      children: [
        {
          tag: 'strong',
          meta: import.meta,
          text: remainingCount,
          styles: {
            fontWeight: '300',
          },
        },
        { tag: 'span', text: ' ' },
        {
          tag: 'span',
          meta: import.meta,
          text: getItemsText(remainingCount),
        },
      ],
    },
    completedCount > 0 && {
      tag: 'button',
      meta: import.meta,
      text: 'Clear completed',
      styles: clearTodosButtonStyle(),
      events: {
        click() {
          const scope = '../main/main.component';
          this.emitMessage('clearCompletedChannel', null, { scope });
        },
      },
    },
  ],
});
