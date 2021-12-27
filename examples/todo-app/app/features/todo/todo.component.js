import todoStore from './domain/todo-store.js';
import { todoSectionStyle } from './todo.style.js';

/** @returns {SchemaConfig} */
const createMain = (todos = null) => ({
  path: './main/main.component',
  base: import.meta.url,
  args: { todos: todos || todoStore.todos },
});

/** @returns {SchemaConfig} */
const createFooter = () => ({
  path: './footer/footer.component',
  base: import.meta.url,
  args: {
    remainingCount: todoStore.getRemaining().length,
    completedCount: todoStore.getCompleted().length,
  },
});

/** @returns {Schema} */
export default () => ({
  tag: 'section',
  meta: import.meta,
  styles: todoSectionStyle(),
  state: {
    isMainAdded: false,
  },
  methods: {
    addMain() {
      this.children.push(createMain(), createFooter());
      this.state.isMainAdded = true;
    },
    removeMain() {
      this.children.splice(1, 2);
      this.state.isMainAdded = false;
    },
    updateRemaining() {
      const footer = createFooter();
      this.children.splice(2, 1, footer);
    },
    addTodo(todo) {
      const scope = './main/main.component';
      this.emitMessage('addTodoChannel', todo, { scope });
    },
  },
  events: {
    addTodoEvent({ detail: todo }) {
      if (this.state.isMainAdded) this.methods.updateRemaining();
      else this.methods.addMain();
      this.methods.addTodo(todo);
    },
    todoChangeEvent() {
      if (todoStore.todos.length > 0) this.methods.updateRemaining();
      else this.methods.removeMain();
    },
  },
  hooks: {
    init() {
      if (todoStore.todos.length > 0) this.methods.addMain();
    },
  },
  children: [{ path: './header/header.component', base: import.meta.url }],
});
