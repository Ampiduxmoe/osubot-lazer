import {Repository} from '../Repository';
import {
  SerializedObject,
  SerializedObjectKey,
} from '../models/SerializedObject';
import {SerializationDescriptor} from '../../../primitives/SerializationDescriptor';

export interface SerializedObjectsRepository
  extends Repository<SerializedObjectKey, SerializedObject> {
  validateAndGet<T>(
    descriptor: SerializationDescriptor<T>
  ): Promise<T | undefined>;
  save<T>(o: T, descriptor: SerializationDescriptor<T>): Promise<void>;
}
