import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { CartRepository, LessonRepository } from 'src/DB';
import { CartModel } from 'src/DB/model/cart.model';
import { LessonModel } from 'src/DB/model/lesson.model';

@Module({
  imports: [CartModel, LessonModel],
  controllers: [CartController],
  providers: [CartService, CartRepository, LessonRepository],
  exports: [CartService, CartRepository],
})
export class CartModule { }
