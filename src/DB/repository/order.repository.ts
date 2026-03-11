import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DatabaseRepository } from './database.repository';
import { OrderDocument } from '../model/order.model';
import { EntityId, IOrder, orderStatusEnum, toObjectId } from 'src/common';

@Injectable()
export class OrderRepository extends DatabaseRepository<IOrder, OrderDocument> {
    constructor(
        @InjectModel('Order') protected readonly model: Model<OrderDocument>,
    ) {
        super(model);
    }

    /** Create a new order */
    async createOrder(data: Partial<IOrder>): Promise<OrderDocument> {
        const doc: Record<string, any> = {
            studentId: toObjectId(data.studentId!),
            lessons: data.lessons?.map((l) => ({
                lessonId: toObjectId(l.lessonId),
                courseTitle: l.courseTitle,
                lessonTitle: l.lessonTitle,
                lessonOrder: l.lessonOrder,
                price: l.price,
            })),
            totalAmount: data.totalAmount,
            status: data.status ?? orderStatusEnum.PENDING,
            paymentGateway: data.paymentGateway,
        };

        const [order] = await this.create({ data: [doc] });
        if (!order) {
            throw new BadRequestException('Error creating Order document');
        }
        return order;
    } 

    /** Find an order scoped to a specific student */
    async findByIdAndStudent(
        orderId: EntityId,
        studentId: EntityId,
    ): Promise<OrderDocument | null> {
        return this.model.findOne({
            _id: toObjectId(orderId),
            studentId: toObjectId(studentId),
        });
    }

    /** Atomic status update with optional gatewayOrderId */
    async updateStatus(
        orderId: EntityId,
        status: orderStatusEnum,
        gatewayOrderId?: string,
    ): Promise<OrderDocument | null> {
        const update: Record<string, any> = { status };
        if (gatewayOrderId) update.gatewayOrderId = gatewayOrderId;

        return this.model.findByIdAndUpdate(toObjectId(orderId), update, {
            new: true,
        });
    }

    /** Find a PENDING order by its gatewayOrderId */
    async findByGatewayOrderId(
        gatewayOrderId: string,
    ): Promise<OrderDocument | null> {
        return this.model.findOne({ gatewayOrderId });
    }
}
