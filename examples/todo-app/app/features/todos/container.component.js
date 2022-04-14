import { todoSectionStyles } from './container.styles.js';
import todoCtrl from './domain/todo-controller.js';

/** @returns {SchemaRef} */
const createTodoList = (todos = todoCtrl.todos) => ({
  path: './list/list.component',
  base: import.meta.url,
  args: { todos },
});

/** @returns {SchemaRef} */
const createFooter = () => ({
  path: './footer/footer.component',
  base: import.meta.url,
  args: {
    remainingCount: todoCtrl.remainingTodos.length,
    completedCount: todoCtrl.completedTodos.length,
  },
});

/** @returns {Schema} */
export default () => ({
  tag: 'main',
  meta: import.meta,
  styles: todoSectionStyles(),
  state: {
    isMainAdded: false,
  },
  methods: {
    addMain() {
      this.children.push(createTodoList(), createFooter());
      this.state.isMainAdded = true;
    },
    removeMain() {
      this.children.splice(2, 2);
      this.state.isMainAdded = false;
    },
    updateRemaining() {
      // const footer = createFooter();
      // this.children.splice(3, 1, footer);
      const remainingCount = todoCtrl.remainingTodos.length;
      this.emitMessage('updateRemaining', remainingCount);
      const showClearButton = todoCtrl.completedTodos.length > 0;
      this.emitMessage('toggleClearButton', showClearButton);
    },
    addTodo(todo) {
      const scope = './list/list.component';
      this.emitMessage('addTodoChannel', todo, { scope });
    },
  },
  events: {
    todoAddEvent({ detail: title }) {
      const todo = todoCtrl.addTodo(title);
      if (this.state.isMainAdded) this.methods.updateRemaining();
      else this.methods.addMain();
      this.methods.addTodo(todo);
    },
    todoChangeEvent() {
      if (todoCtrl.todos.length > 0) this.methods.updateRemaining();
      else this.methods.removeMain();
    },
  },
  hooks: {
    init() {
      if (todoCtrl.todos.length > 0) this.methods.addMain();
    },
  },
  children: [{ path: './header/header.component', base: import.meta.url }],
});
