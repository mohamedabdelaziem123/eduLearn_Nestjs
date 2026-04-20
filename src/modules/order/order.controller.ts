import {
  Controller,
  Post,
  Body,
  Patch,
  Param,
  Query,
  Get,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { OrderService } from './order.service';
import { CreateOrderParamsDto } from './dto/create-order.dto';
import { Auth, IResponse, RoleEnum, successResponse, User } from 'src/common';
import { type UserDocument } from 'src/DB';
import { CheckoutSessionResponse, CreateOrderResponse, OrderResponse } from './dto/order.response.dto';

@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) { }

  /** Create an order from the student's cart */
  @Auth([RoleEnum.student])
  @Post('/')
  async create(@User() user: UserDocument): Promise<IResponse<CreateOrderResponse>> {
    const order = await this.orderService.createOrder(user);
    return successResponse({ data: order, message: 'Order created from cart' });
  }

  /** Paymob webhook — no auth (called by Paymob servers) */
  @Post('/webhook')
  async webhook(
    @Body() body: any,
    @Query('hmac') hmacQuery: string,
  ): Promise<void> {
    await this.orderService.webhook(body, hmacQuery);
  }

  /** Payment gateway redirects here after payment — sends user back to the frontend */
  @Get('/payment-success')
  paymentSuccess(@Res() res: Response): void {
    res.redirect('http://localhost:4200/discovery');
  }

  /** Check out a pending order — returns a Paymob payment URL */
  @Auth([RoleEnum.student])
  @Post('/:orderId/checkout')
  async checkOut(
    @Param() { orderId }: CreateOrderParamsDto,
    @User() user: UserDocument,
  ): Promise<IResponse<CheckoutSessionResponse>> {
    const paymentUrl = await this.orderService.checkOut(orderId, user);
    return successResponse({
      data: { sessionURL: paymentUrl },
      message: 'Payment link generated',
    });
  }

  /** Cancel a pending order */
  @Auth([RoleEnum.student])
  @Patch('/:orderId/cancel')
  async cancel(
    @Param() { orderId }: CreateOrderParamsDto,
    @User() user: UserDocument,
  ): Promise<IResponse<OrderResponse>> {
    const order = await this.orderService.cancel(orderId, user);
    return successResponse({ data: order, message: 'Order cancelled' });
  }
}
