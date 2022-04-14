import { clearTodosButtonStyles, footerStyles } from './footer.styles.js';

const getItemsText = (count) => (count === 1 ? 'item left' : 'items left');

const toggleClearButton = (showClearButton) => (showClearButton && {
  tag: 'button',
  meta: import.meta,
  text: 'Clear completed',
  styles: clearTodosButtonStyles(),
  events: {
    click() {
      const scope = '../list/todo/todo.component';
      this.emitMessage('clearCompletedTodos', null, { scope });
    },
  },
});

/** @returns {Schema} */
export default ({ remainingCount, showClearButton }) => ({
  tag: 'footer',
  styles: footerStyles(),
  channels: {
    toggleClearButton(showClearButton) {
      this.children[1] = toggleClearButton(showClearButton);
    },
  },
  children: [
    {
      tag: 'span',
      styles: {
        float: 'left',
        textAlign: 'left',
      },
      // todo impl??
      locals: {
        localVar: 1,
        localMethod() {},
      },
      channels: {
        updateRemaining(count) {
          this.children[0].text = count;
          this.children[2].text = getItemsText(count);
        },
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
    toggleClearButton(showClearButton),
  ],
});
