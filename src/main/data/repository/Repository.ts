export interface Repository<
  TEntityKey extends object,
  TEntity extends TEntityKey,
> {
  get(key: TEntityKey): Promise<TEntity | undefined>;
  add(value: TEntity): Promise<void>;
  update(value: TEntity): Promise<void>;
  delete(key: TEntityKey): Promise<void>;
}
