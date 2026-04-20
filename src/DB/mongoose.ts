import { Types } from 'mongoose';
import { EntityId } from '../common/types';

/**
 * Safely converts an EntityId (which may be a string or already an ObjectId)
 * into a Types.ObjectId.
 */
export function toObjectId(id: EntityId): Types.ObjectId {
    if (id instanceof Types.ObjectId) {
        return id;
    }
    return Types.ObjectId.createFromHexString(id);
}
