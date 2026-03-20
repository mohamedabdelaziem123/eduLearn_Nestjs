import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto, RemoveFromCartDto } from './dto/create-cart.dto';
import { Auth, IResponse, RoleEnum, successResponse, User } from 'src/common';
import { type UserDocument } from 'src/DB';
import { CartResponse } from './entities/cart.entity';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) { }

  @Auth([RoleEnum.student])
  @Get('/')
  async getCart(@User() user: UserDocument): Promise<IResponse<CartResponse>> {
    const cart = await this.cartService.getCart(user._id);
    return successResponse({ data: cart });
  }

  @Auth([RoleEnum.student])
  @Patch('/add')
  async addToCart(
    @Body() dto: AddToCartDto,
    @User() user: UserDocument,
  ): Promise<IResponse<CartResponse>> {
    const cart = await this.cartService.addLesson(user._id, dto.lessonId);
    return successResponse({ data: cart, message: 'Lesson added to cart' });
  }

  @Auth([RoleEnum.student])
  @Patch('/remove')
  async removeFromCart(
    @Body() dto: RemoveFromCartDto,
    @User() user: UserDocument,
  ): Promise<IResponse<CartResponse>> {
    const cart = await this.cartService.removeLesson(user._id, dto.lessonId);
    return successResponse({ data: cart, message: 'Lesson removed from cart' });
  }

  @Auth([RoleEnum.student])
  @Delete('/clear')
  async clearCart(@User() user: UserDocument): Promise<IResponse> {
    await this.cartService.clearCart(user._id);
    return successResponse({ message: 'Cart cleared successfully' });
  }
}
