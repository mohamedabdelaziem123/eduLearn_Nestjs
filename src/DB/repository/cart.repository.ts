import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DatabaseRepository } from './database.repository';
import { CartDocument } from '../model/cart.model';
import { EntityId, ICart } from 'src/common';
import { toObjectId } from '../mongoose';

@Injectable()
export class CartRepository extends DatabaseRepository<ICart, CartDocument> {
    constructor(
        @InjectModel('Cart') protected readonly model: Model<CartDocument>,
    ) {
        super(model);
    }

    /** Find or create an empty cart for a student */
    async getOrCreate(studentId: EntityId): Promise<CartDocument> {
        let cart = await this.model.findOne({ studentId: toObjectId(studentId) });
        if (!cart) {
            cart = await this.model.create({
                studentId: toObjectId(studentId),
                lessonIds: [],
            });
        }
        return cart;
    }

    /** Find cart by student and populate lesson details + course title */
    async findByStudentPopulated(studentId: EntityId): Promise<CartDocument | null> {
        return this.model
            .findOne({ studentId: toObjectId(studentId) })
            .populate({
                path: 'lessonIds',
                select: 'title order price courseId',
                populate: { path: 'courseId', select: 'title' },
            });
    }

    /** Add a lesson to the cart (prevents duplicates via $addToSet) */
    async addLesson(studentId: EntityId, lessonId: EntityId): Promise<CartDocument | null> {
        return this.model.findOneAndUpdate(
            { studentId: toObjectId(studentId) },
            { $addToSet: { lessonIds: toObjectId(lessonId) } },
            { new: true },
        );
    }

    /** Remove a lesson from the cart */
    async removeLesson(studentId: EntityId, lessonId: EntityId): Promise<CartDocument | null> {
        return this.model.findOneAndUpdate(
            { studentId: toObjectId(studentId) },
            { $pull: { lessonIds: toObjectId(lessonId) } },
            { new: true },
        );
    }

    /** Empty the cart completely */
    async clearCart(studentId: EntityId): Promise<CartDocument | null> {
        return this.model.findOneAndUpdate(
            { studentId: toObjectId(studentId) },
            { $set: { lessonIds: [] } },
            { new: true },
        );
    }
}
