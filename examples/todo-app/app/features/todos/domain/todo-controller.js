import todoStore from './todo-store.js';

class TodoController {
  #todoStore;

  constructor(todoStore) {
    this.#todoStore = todoStore;
  }

  get todos() {
    return this.#todoStore.todos;
  }

  get remainingTodos() {
    return this.#todoStore.filterTodos(false);
  }

  get completedTodos() {
    return this.#todoStore.filterTodos(true);
  }

  addTodo(todoTitle) {
    const title = todoTitle.trim();
    if (title) return this.#todoStore.add(title);
  }

  removeTodo(todo) {
    this.#todoStore.remove(todo);
  }

  updateTodo(todo, editedTitle) {
    const title = editedTitle.trim();
    if (title) return this.#todoStore.update(todo, title);
  }

  toggleCompletion(todo) {
    this.#todoStore.toggleCompletion(todo);
  }

  startEditing(todo) {
    todo.editing = true;
  }

  stopEditing(todo) {
    todo.editing = false;
  }
}

export default new TodoController(todoStore);
