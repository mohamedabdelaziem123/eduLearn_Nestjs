import { Controller, Get, Query, Param } from '@nestjs/common';
import { TeacherService } from './teacher.service';
import {
  Auth,
  GetAllDto,
  IResponse,
  RoleEnum,
  successResponse,
  tokenEnum,
  User,
} from 'src/common';
import { type UserDocument } from 'src/DB';
import { CourseIdParamDto } from 'src/common/dtos/courseParam.dto';

@Controller('teacher')
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) { }

  // ─── PUBLIC ──────────────────────────────────────────────────────────────

  /** GET /teacher — list all teachers (public, no auth required) */
  @Get()
  async getAllTeachers(): Promise<IResponse<any>> {
    const data = await this.teacherService.getAllTeachers();
    return successResponse({ data, message: 'Teachers retrieved successfully' });
  }

  // ─── AUTHENTICATED (teacher / admin only) ────────────────────────────────

  /** GET /teacher/courses — my assigned courses */
  @Auth([RoleEnum.teacher, RoleEnum.admin], tokenEnum.access)
  @Get('courses')
  async getMyCourses(
    @User() user: UserDocument,
    @Query() query: GetAllDto,
  ): Promise<IResponse<any>> {
    const data = await this.teacherService.getMyAssignedCourses(user, query);
    return successResponse({
      data,
      message: 'Assigned courses retrieved successfully',
    });
  }

  /** GET /teacher/courses/:courseId — a specific assigned course */
  @Auth([RoleEnum.teacher, RoleEnum.admin], tokenEnum.access)
  @Get('courses/:courseId')
  async getMyCourseById(
    @User() user: UserDocument,
    @Param() params: CourseIdParamDto,
  ): Promise<IResponse<any>> {
    const data = await this.teacherService.getAssignedCourseById(
      user._id.toString(),
      params.courseId,
    );
    return successResponse({
      data,
      message: 'Assigned course retrieved successfully',
    });
  }
}
