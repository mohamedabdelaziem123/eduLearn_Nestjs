import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { UserRepository } from 'src/DB/repository/user.repository';
import { OrderRepository } from 'src/DB/repository/order.repository';
import { CourseRepository } from 'src/DB/repository/course.repository';
import {
  CreateTeacherDto,
  GetUsersQueryDto,
  GetOrdersQueryDto,
} from './dto/create-admin.dto';
import { providerEnum, RoleEnum, orderStatusEnum } from 'src/common';
import { createTeacherResponse } from './entities/admin.entity';

@Injectable()
export class AdminService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly orderRepository: OrderRepository,
    private readonly courseRepository: CourseRepository,
  ) { }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEACHER MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  async createTeacherAccount(
    data: CreateTeacherDto,
  ): Promise<createTeacherResponse> {
    const existingUser = await this.userRepository.findOne({
      filter: { email: data.email },
    });

    if (existingUser) {
      throw new ConflictException('An account with this email already exists.');
    }

    const newTeacher = await this.userRepository.createUser({
      data: [
        {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          password: data.password,
          career: data.career,
          role: RoleEnum.teacher,
          provider: providerEnum.system,
        },
      ],
    });

    return {
      teacherId: newTeacher._id,
      email: newTeacher.email,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BLOCK / UNBLOCK
  // ═══════════════════════════════════════════════════════════════════════════

  /** Block a student — they are instantly logged out via the AuthenticationGuard check */
  async blockStudent(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({
      filter: { _id: userId },
    });

    if (!user) throw new NotFoundException('User not found');

    if (user.role !== RoleEnum.student) {
      throw new BadRequestException('Only students can be blocked');
    }

    if (user.isBlocked) {
      throw new ConflictException('This student is already blocked');
    }

    await this.userRepository.findOneAndUpdate({
      filter: { _id: userId },
      update: { isBlocked: true },
    });
  }

  /** Unblock a student */
  async unblockStudent(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({
      filter: { _id: userId },
    });

    if (!user) throw new NotFoundException('User not found');

    if (!user.isBlocked) {
      throw new ConflictException('This student is not blocked');
    }

    await this.userRepository.findOneAndUpdate({
      filter: { _id: userId },
      update: { isBlocked: false },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // USER MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  /** Get a paginated, filterable list of all users */
  async getAllUsers(query: GetUsersQueryDto) {
    const filter: Record<string, any> = {};

    if (query.role) filter.role = query.role;
    if (typeof query.isBlocked === 'boolean') filter.isBlocked = query.isBlocked;

    // Search by name or email (case-insensitive partial match)
    if (query.search) {
      const regex = { $regex: query.search, $options: 'i' };
      filter.$or = [
        { firstName: regex },
        { lastName: regex },
        { email: regex },
      ];
    }

    return this.userRepository.paginate({
      filter,
      projection: '-password -__v',
      page: query.page || 1,
      size: query.size || 11,
      options: { sort: { createdAt: -1 } },
    });
  }

  /** Get a single user's detailed profile */
  async getUserDetails(userId: string) {
    const user = await this.userRepository.findOne({
      filter: { _id: userId },
      projection: '-password -__v',
      options: {
        populate: [{ path: 'boughtLessons', select: 'title price courseId' }],
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ORDERS
  // ═══════════════════════════════════════════════════════════════════════════

  /** Get a paginated list of all orders */
  async getAllOrders(query: GetOrdersQueryDto) {
    const filter: Record<string, any> = {};

    if (query.status) filter.status = query.status;

    return this.orderRepository.paginate({
      filter,
      page: query.page || 1,
      size: query.size || 10,
      options: {
        sort: { createdAt: -1 },
        populate: [{ path: 'studentId', select: 'firstName lastName email' }],
      },
    });
  }

  /** Get a single order's full details */
  async getOrderById(orderId: string) {
    const order = await this.orderRepository.findOne({
      filter: { _id: orderId },
      options: {
        populate: [{ path: 'studentId', select: 'firstName lastName email' }],
      },
    });

    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DASHBOARD STATISTICS
  // ═══════════════════════════════════════════════════════════════════════════

  /** Aggregated platform metrics for the admin dashboard */
  async getDashboardStats() {
    // 1. Total revenue from paid orders
    const revenueResult = await this.orderRepository.aggregate([
      { $match: { status: orderStatusEnum.PAID } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);
    const totalRevenue = revenueResult[0]?.total ?? 0;

    // 2. Total paid orders count
    const totalPaidOrders = await this.orderRepository.countDocuments({
      status: orderStatusEnum.PAID,
    });

    // 3. User counts by role
    const userCounts = await this.userRepository.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]);
    const users: Record<string, number> = {};
    userCounts.forEach((item: any) => {
      users[item._id] = item.count;
    });

    // 4. Total courses
    const totalCourses = await this.courseRepository.countDocuments({});

    // 5. Total lessons sold (sum of distinct lessons across paid orders)
    const lessonsSoldResult = await this.orderRepository.aggregate([
      { $match: { status: orderStatusEnum.PAID } },
      { $unwind: '$lessons' },
      { $group: { _id: null, count: { $sum: 1 } } },
    ]);
    const totalLessonsSold = lessonsSoldResult[0]?.count ?? 0;

    // 6. Blocked students count
    const blockedStudents = await this.userRepository.countDocuments({
      role: RoleEnum.student,
      isBlocked: true,
    });

    return {
      totalRevenue,
      totalPaidOrders,
      users: {
        students: users[RoleEnum.student] ?? 0,
        teachers: users[RoleEnum.teacher] ?? 0,
        admins: users[RoleEnum.admin] ?? 0,
      },
      totalCourses,
      totalLessonsSold,
      blockedStudents,
    };
  }
}
