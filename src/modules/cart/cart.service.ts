import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CartRepository, LessonRepository, UserDocument } from 'src/DB';
import { CartDocument } from 'src/DB/model/cart.model';
import { EntityId } from 'src/common';

@Injectable()
export class CartService {
  constructor(
    private readonly cartRepository: CartRepository,
    private readonly lessonRepository: LessonRepository,
  ) { }

  /** Return the student's cart with populated lesson details */
  async getCart(studentId: EntityId): Promise<CartDocument> {
    // Ensure the cart exists first
    await this.cartRepository.getOrCreate(studentId);
    const cart = await this.cartRepository.findByStudentPopulated(studentId);
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }
    return cart;
  }

  /** Add a lesson to the student's cart */
  async addLesson(studentId: EntityId, lessonId: string): Promise<CartDocument> {
    // 1. Validate that the lesson exists and is not hidden
    const lesson = await this.lessonRepository.findOne({
      filter: { _id: lessonId, isHidden: false },
    });
    if (!lesson) {
      throw new NotFoundException('Lesson not found or is hidden');
    }

    // 2. Ensure cart exists
    await this.cartRepository.getOrCreate(studentId);

    // 3. Add lesson (duplicate-safe via $addToSet)
    const cart = await this.cartRepository.addLesson(studentId, lessonId);
    if (!cart) {
      throw new BadRequestException('Failed to add lesson to cart');
    }
    return cart;
  }

  /** Remove a lesson from the student's cart */
  async removeLesson(studentId: EntityId, lessonId: string): Promise<CartDocument> {
    const cart = await this.cartRepository.removeLesson(studentId, lessonId);
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }
    return cart;
  }

  /** Clear all lessons from the cart */
  async clearCart(studentId: EntityId): Promise<void> {
    const cart = await this.cartRepository.clearCart(studentId);
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }
  }
}
