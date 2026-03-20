import { Controller, Post, Body, Patch, Param, Get, Query, Delete } from '@nestjs/common';
import { AdminService } from './admin.service';
import {
  CreateTeacherDto,
  GetUsersQueryDto,
  GetOrdersQueryDto,
} from './dto/create-admin.dto';
import { Auth, GetAllResponse, IResponse, RoleEnum, successResponse, tokenEnum } from 'src/common';
import { createTeacherResponse, DashboardStatsResponse } from './entities/admin.entity';
import { UserResponse } from '../user/entities/user.entity';
import { OrderResponse } from '../order/entities/order.entity';

@Controller('admin')
@Auth([RoleEnum.admin], tokenEnum.access)
export class AdminController {
  constructor(private readonly adminService: AdminService) { }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEACHER MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  @Post('create-teacher')
  async createTeacher(
    @Body() body: CreateTeacherDto,
  ): Promise<IResponse<createTeacherResponse>> {
    const teacherData = await this.adminService.createTeacherAccount(body);
    return successResponse<createTeacherResponse>({ data: teacherData });
  }

  @Delete('teacher/:teacherId')
  async deleteTeacher(
    @Param('teacherId') teacherId: string,
  ): Promise<IResponse> {
    await this.adminService.deleteTeacher(teacherId);
    return successResponse({ message: 'Teacher deleted successfully' });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BLOCK / UNBLOCK
  // ═══════════════════════════════════════════════════════════════════════════

  @Patch('block/:userId')
  async blockStudent(
    @Param('userId') userId: string,
  ): Promise<IResponse> {
    await this.adminService.blockStudent(userId);
    return successResponse({ message: 'Student blocked successfully' });
  }

  @Patch('unblock/:userId')
  async unblockStudent(
    @Param('userId') userId: string,
  ): Promise<IResponse> {
    await this.adminService.unblockStudent(userId);
    return successResponse({ message: 'Student unblocked successfully' });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // USER MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  /** GET /admin/students — paginated, filterable list of students only */
  @Get('students')
  async getAllStudents(
    @Query() query: GetUsersQueryDto,
  ): Promise<IResponse<GetAllResponse<UserResponse>>> {
    const data = await this.adminService.getAllUsers({ ...query, role: RoleEnum.student });
    return successResponse({ data, message: 'Students retrieved successfully' });
  }

  /** GET /admin/users — paginated, filterable list */
  @Get('users')
  async getAllUsers(
    @Query() query: GetUsersQueryDto,
  ): Promise<IResponse<GetAllResponse<UserResponse>>> {
    const data = await this.adminService.getAllUsers(query);
    return successResponse({ data, message: 'Users retrieved successfully' });
  }

  /** GET /admin/users/:userId — detailed user profile */
  @Auth([RoleEnum.admin , RoleEnum.teacher], tokenEnum.access)
  @Get('users/:userId')
  async getUserDetails(
    @Param('userId') userId: string,
  ): Promise<IResponse<UserResponse>> {
    const data = await this.adminService.getUserDetails(userId);
    return successResponse({ data, message: 'User details retrieved' });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ORDERS
  // ═══════════════════════════════════════════════════════════════════════════

  /** GET /admin/orders — paginated, filterable order list */
  @Get('orders')
  async getAllOrders(
    @Query() query: GetOrdersQueryDto,
  ): Promise<IResponse<GetAllResponse<OrderResponse>>> {
    const data = await this.adminService.getAllOrders(query);
    return successResponse({ data, message: 'Orders retrieved successfully' });
  }

  /** GET /admin/orders/:orderId — single order detail */
  @Get('orders/:orderId')
  async getOrderById(
    @Param('orderId') orderId: string,
  ): Promise<IResponse<OrderResponse>> {
    const data = await this.adminService.getOrderById(orderId);
    return successResponse({ data, message: 'Order details retrieved' });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DASHBOARD
  // ═══════════════════════════════════════════════════════════════════════════

  /** GET /admin/dashboard-stats — aggregated platform metrics */
  @Get('dashboard-stats')
  async getDashboardStats(): Promise<IResponse<DashboardStatsResponse>> {
    const data = await this.adminService.getDashboardStats();
    return successResponse({ data, message: 'Dashboard stats retrieved' });
  }
}
