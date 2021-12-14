import todoStore from './todo-store.js';

class TodoController {
  #todoStore;

  constructor(todoStore) {
    this.#todoStore = todoStore;
  }

  stopEditing(todo, editedTitle) {
    todo.title = editedTitle;
    todo.editing = false;
  }

  cancelEditingTodo(todo) {
    todo.editing = false;
  }

  updateEditingTodo(todo, editedTitle) {
    editedTitle = editedTitle.trim();
    todo.editing = false;
    todo.title = editedTitle;
    todoStore.updateStore();
  }

  editTodo(todo) {
    todo.editing = true;
  }

  removeCompleted() {
    const completed = todoStore.getCompleted();
    this.#todoStore.removeCompleted();
    return completed;
  }

  toggleCompletion(todo) {
    this.#todoStore.toggleCompletion(todo);
  }

  remove(todo) {
    this.#todoStore.remove(todo);
  }

  addTodo(todoText) {
    if (todoText.trim().length > 0) return this.#todoStore.add(todoText);
  }
}

export default new TodoController(todoStore);
