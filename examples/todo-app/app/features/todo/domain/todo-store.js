class Todo {
  completed = false;
  editing = false;
  title;

  constructor(title) {
    this.title = title.trim();
  }
}

class TodoStore {
  static localStoreName = 'metacomponents-todos';
  todos = [];

  constructor() {
    const todosStr = localStorage.getItem(TodoStore.localStoreName) || '[]';
    const persistedTodos = JSON.parse(todosStr);
    this.todos = persistedTodos.map((todo) => {
      const newTodo = new Todo(todo.title);
      newTodo.completed = todo.completed;
      return newTodo;
    });
  }

  updateStore() {
    localStorage.setItem(TodoStore.localStoreName, JSON.stringify(this.todos));
  }

  #getWithCompleted(completed) {
    return this.todos.filter((todo) => todo.completed === completed);
  }

  allCompleted() {
    return this.todos.length === this.getCompleted().length;
  }

  setAllTo(completed) {
    this.todos.forEach((todo) => (todo.completed = completed));
    this.updateStore();
  }

  removeCompleted() {
    this.todos = this.#getWithCompleted(false);
    this.updateStore();
  }

  getRemaining() {
    return this.#getWithCompleted(false);
  }

  getCompleted() {
    return this.#getWithCompleted(true);
  }

  toggleCompletion(todo) {
    todo.completed = !todo.completed;
    this.updateStore();
  }

  remove(todo) {
    this.todos.splice(this.todos.indexOf(todo), 1);
    this.updateStore();
  }

  add(title) {
    const todo = new Todo(title);
    this.todos.push(todo);
    this.updateStore();
    return todo;
  }
}

export default new TodoStore();
