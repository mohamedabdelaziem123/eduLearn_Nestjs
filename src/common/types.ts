import { Types } from 'mongoose';

// common/types.ts — your own ID type alias
export type EntityId = Types.ObjectId | string; // always work with strings in services

//export type EntityId = string