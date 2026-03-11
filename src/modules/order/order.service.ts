import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EntityId, IOrderItem, orderStatusEnum, paymentService } from 'src/common';
import { CartRepository, LessonRepository, OrderRepository, UserDocument, UserRepository } from 'src/DB';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly cartRepository: CartRepository,
    private readonly orderRepository: OrderRepository,
    private readonly userRepository: UserRepository,
    private readonly lessonRepository: LessonRepository,
    private readonly paymentService: paymentService,
  ) { }

  /**
   * Create an order from the student's cart contents.
   * Fetches lesson data directly (not via cart populate) to guarantee correct snapshot.
   */
  async createOrder(user: UserDocument): Promise<any> {
    // 1. Get the raw cart (just ObjectId array, no populate needed)
    const cart = await this.cartRepository.getOrCreate(user._id);

    if (!cart.lessonIds || cart.lessonIds.length === 0) {
      throw new BadRequestException('Cart is empty — add lessons before ordering');
    }

    // 2. Fetch lessons directly with course population
    const lessonIds = cart.lessonIds.map((id) => String(id));
    const lessons = await this.lessonRepository.findByIds(lessonIds);

    if (lessons.length === 0) {
      throw new BadRequestException('No valid lessons found in cart');
    }

    // 3. Build order snapshot from fetched lesson data
    const orderItems: IOrderItem[] = [];
    let totalAmount = 0;

    for (const lesson of lessons) {
      const courseTitle =
        typeof lesson.courseId === 'object' && (lesson.courseId as any)?.title
          ? (lesson.courseId as any).title
          : 'Unknown Course';

      orderItems.push({
        lessonId: String(lesson._id),
        courseTitle,
        lessonTitle: lesson.title,
        lessonOrder: lesson.order,
        price: lesson.price,
      });
      totalAmount += lesson.price;
    }

    if (totalAmount <= 0) {
      throw new BadRequestException('Total amount must be greater than zero');
    }

    // 4. Create the order with PENDING status
    const order = await this.orderRepository.createOrder({
      studentId: user._id as EntityId,
      lessons: orderItems,
      totalAmount,
      status: orderStatusEnum.PENDING,
      paymentGateway: 'paymob',
    });

    // 5. Clear the cart after order creation
    await this.cartRepository.clearCart(user._id);

    this.logger.log(`Order ${String(order._id)} created for user ${String(user._id)}`);
    return order;
  }

  /**
   * Check out: generate a Paymob payment link for a pending order.
   */
  async checkOut(orderId: EntityId, user: UserDocument): Promise<string> {
    const order = await this.orderRepository.findByIdAndStudent(orderId, user._id);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== orderStatusEnum.PENDING) {
      throw new BadRequestException('Only pending orders can be checked out');
    }

    // Build a unique reference for this checkout attempt
    const referenceId = `${String(order._id)}_${Date.now()}`;

    // Generate the Paymob payment link
    const paymentUrl = await this.paymentService.createQuickLink({
      reference_id: referenceId,
      amount_cents: order.totalAmount * 100,
      email: user.email,
      full_name: `${user.firstName} ${user.lastName}`,
      phone_number: user.phone || '01000000000',
      items: order.lessons.map((lesson) => ({
        name: lesson.lessonTitle,
        amount_cents: lesson.price * 100,
        quantity: 1,
      })),
    });

    // Persist the reference so the webhook can find this order later
    await this.orderRepository.updateStatus(
      order._id as EntityId,
      orderStatusEnum.PENDING,
      referenceId,
    );

    this.logger.log(`Checkout initiated for order ${String(order._id)}`);
    return paymentUrl;
  }

  /**
   * Cancel a PENDING order.
   */
  async cancel(orderId: EntityId, user: UserDocument): Promise<any> {
    const order = await this.orderRepository.findByIdAndStudent(orderId, user._id);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== orderStatusEnum.PENDING) {
      throw new BadRequestException('Only pending orders can be cancelled');
    }

    const updated = await this.orderRepository.updateStatus(
      order._id as EntityId,
      orderStatusEnum.CANCELLED,
    );

    this.logger.log(`Order ${String(order._id)} cancelled`);
    return updated;
  }

  /**
   * Paymob webhook handler.
   * Validates HMAC, then on success marks order PAID and grants lesson access.
   */
  async webhook(body: any, hmacQuery: string): Promise<void> {
    const transaction = body.obj;
    const hmac = hmacQuery || body.hmac;

    // 1. Validate HMAC
    if (!this.paymentService.validateHmac(transaction, hmac)) {
      throw new ForbiddenException('Invalid HMAC Signature');
    }

    // 2. Extract order ID from the merchant reference
    const rawOrderId: string = transaction.order?.merchant_order_id || '';
    const orderId = rawOrderId.split('_')[0];

    if (!orderId) {
      this.logger.warn('Webhook: No order ID found in transaction');
      return;
    }

    // 3. Handle successful payment
    if (transaction.success === true && transaction.pending === false) {
      this.logger.log(`Webhook: Payment success for reference ${rawOrderId}`);

      const order = await this.orderRepository.findByGatewayOrderId(rawOrderId);
      if (!order) {
        this.logger.warn(`Webhook: Order not found for gatewayOrderId ${rawOrderId}`);
        return;
      }

      // Already processed — idempotency guard
      if (order.status === orderStatusEnum.PAID) {
        this.logger.log('Webhook: Order already paid, skipping');
        return;
      }

      // Mark as PAID
      await this.orderRepository.updateStatus(
        order._id as EntityId,
        orderStatusEnum.PAID,
      );

      // Grant lesson access to the student
      const lessonIds = order.lessons.map((l) => l.lessonId);
      await this.userRepository.addBoughtLessons(order.studentId as EntityId, lessonIds);

      this.logger.log(`Order ${String(order._id)} PAID — ${lessonIds.length} lessons granted`);
    } else {
      this.logger.warn(`Webhook: Transaction not successful or still pending`);
    }
  }
}
