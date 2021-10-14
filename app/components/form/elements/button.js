import styles from './button-styles.js'
import sender from '../../../domain/sender.js'

export default () => ({
  tag: 'button',
  text: 'Send',
  styles: styles(),
  attrs: {
    name: 'sendBtn'
  },
  state: {
    count: 0
  },
  events: {
    async click() {
      this.state.count++;
      await sender.send();
      console.log(`Button clicked ${this.state.count} times`);
    }
  },
  hooks: {
    init() {
      console.log('Button init', this);
    }
  }
});
