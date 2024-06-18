import {Repository} from '../Repository';
import {JsonObject, JsonObjectKey} from '../models/JsonObject';
import {JsonCacheDescriptor} from '../../../../primitives/JsonCacheDescriptor';

export interface JsonObjectsRepository
  extends Repository<JsonObjectKey, JsonObject> {
  validateAndGet<T>(descriptor: JsonCacheDescriptor<T>): Promise<T | undefined>;
  save<T>(o: T, descriptor: JsonCacheDescriptor<T>): Promise<void>;
}
