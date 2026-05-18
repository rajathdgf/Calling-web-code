type Listener<T> = (state: T) => void;

export class Store<T extends object> {
  private listeners = new Set<Listener<T>>();
  constructor(private state: T) {}
  get(): T { return this.state; }
  set(patch: Partial<T>): void {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener(this.state));
  }
  subscribe(listener: Listener<T>): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }
}
