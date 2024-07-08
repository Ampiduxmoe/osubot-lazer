export interface SerializationDescriptor<T> {
  key: string;
  serialize(o: T): string;
  deserialize(s: string): T | undefined;
}
