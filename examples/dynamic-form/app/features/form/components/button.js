import buttonStyles from './button-styles.js';

/** @returns Metacomponent */
export default () => ({
  tag: 'button',
  text: 'Send',
  styles: buttonStyles(),
  attrs: {
    type: 'button',
  },
  state: {
    count: 0,
  },
  events: {
    async click() {
      this.state.count++;
      this.emitCustomEvent('send');
      console.log(`Button clicked ${this.state.count} times`);
    },
  },
});
