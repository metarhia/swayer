interface TodoState {
  title: string;
  editing?: boolean;
  completed?: boolean;
}

declare class TodoModel {
  state: TodoState;
}

interface TodosState {
  show: boolean;
  todos: TodoState[];
  counts: {
    completed: number;
    remaining: number;
  },
}

declare class TodosModel {
  state: TodosState;
}
