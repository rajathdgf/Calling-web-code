export class PoolManager<T> {
  private free: T[] = [];
  constructor(private create: () => T, private reset: (item: T) => void, count = 0) {
    for (let i = 0; i < count; i += 1) this.free.push(this.create());
  }
  acquire(): T { return this.free.pop() ?? this.create(); }
  release(item: T): void { this.reset(item); this.free.push(item); }
}
