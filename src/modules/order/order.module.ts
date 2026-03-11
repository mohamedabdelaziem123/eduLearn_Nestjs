import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { CartRepository, LessonRepository, OrderRepository, UserRepository, userModel } from 'src/DB';
import { paymentService } from 'src/common';
import { OrderModel } from 'src/DB/model/order.model';
import { CartModel } from 'src/DB/model/cart.model';
import { LessonModel } from 'src/DB/model/lesson.model';

@Module({
  imports: [OrderModel, CartModel, LessonModel, userModel],
  controllers: [OrderController],
  providers: [
    OrderService,
    OrderRepository,
    CartRepository,
    UserRepository,
    LessonRepository,
    paymentService,
  ],
})
export class OrderModule { }
