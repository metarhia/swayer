class TodoStore {
  #name = 'swayer-todos';
  #todos = [];

  constructor() {
    this.#init();
  }

  get todos() {
    return this.#todos;
  }

  add(title) {
    const todo = { title, completed: false, editing: false };
    this.#todos.push(todo);
    this.#save();
    return todo;
  }

  remove(todo) {
    this.#todos.splice(this.#todos.indexOf(todo), 1);
    this.#save();
    return todo;
  }

  update(todo, title) {
    todo.title = title;
    this.#save();
    return todo;
  }

  filterTodos(completed) {
    return this.#todos.filter((todo) => todo.completed === completed);
  }

  toggleCompletion(todo) {
    todo.completed = !todo.completed;
    this.#save();
  }

  toggleCompletionAll() {
    this.#todos.forEach((todo) => (todo.completed = !todo.completed));
    this.#save();
  }

  #init() {
    if (globalThis.localStorage) this.#retrieve();
  }

  #retrieve() {
    const todos = localStorage.getItem(this.#name);
    if (todos) this.#todos = JSON.parse(todos);
  }

  #save() {
    const todos = JSON.stringify(this.#todos);
    localStorage.setItem(this.#name, todos);
  }
}

export default new TodoStore();
