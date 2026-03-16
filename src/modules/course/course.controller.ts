import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
  Param,
  Patch,
  Get,
  Delete,
  Query,
  ParseFilePipe,
} from '@nestjs/common';
import { CourseService } from './course.service';
import { CreateBlankCourseDto } from './dto/create-course.dto';
import {
  Auth,
  cloudUpload,
  GetAllDto,
  GetAllResponse,
  IResponse,
  RoleEnum,
  successResponse,
  tokenEnum,
  User,
  validFilesFormat,
} from 'src/common';
import { CourseResponse, CreateCourseResponse } from './entities/course.entity';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CourseIdParamDto } from 'src/common/dtos/courseParam.dto';
import { type UserDocument } from 'src/DB';

@Controller('course')
export class CourseController {
  constructor(private readonly courseService: CourseService) { }

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATE (Admin only)
  // ═══════════════════════════════════════════════════════════════════════════

  @Auth([RoleEnum.admin], tokenEnum.access)
  @Post('create-course')
  @UseInterceptors(
    FileInterceptor(
      'image',
      cloudUpload({ fileValidation: validFilesFormat.image }),
    ),
  )
  async createCourse(
    @Body() body: CreateBlankCourseDto,
    @UploadedFile(new ParseFilePipe({ fileIsRequired: true }))
    file: Express.Multer.File,
  ): Promise<IResponse<CreateCourseResponse>> {
    const courseData = await this.courseService.createBlankCourse(body, file);

    return successResponse<CreateCourseResponse>({
      data: courseData,
      message: 'Blank course created successfully',
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GET ALL COURSES (role-aware visibility)
  // ═══════════════════════════════════════════════════════════════════════════

  @Auth([RoleEnum.admin, RoleEnum.teacher, RoleEnum.student], tokenEnum.access)
  @Get('')
  async getAllCourses(
    @Query() query: GetAllDto,
    @User() user: UserDocument,
  ): Promise<IResponse<GetAllResponse<CourseResponse>>> {
    const data = await this.courseService.getAllCourses(
      query,
      user.role as RoleEnum,
      String(user._id),
    );
    return successResponse<GetAllResponse<CourseResponse>>({
      data,
      message: 'Courses retrieved successfully',
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GET COURSE BY ID
  // ═══════════════════════════════════════════════════════════════════════════

  @Auth([RoleEnum.admin, RoleEnum.teacher, RoleEnum.student], tokenEnum.access)
  @Get('/:courseId')
  async getCourseById(
    @Param() { courseId }: CourseIdParamDto,
  ): Promise<IResponse<CourseResponse>> {
    const data = await this.courseService.getCourseById(courseId);
    return successResponse({ data, message: 'Course retrieved successfully' });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UPDATE COURSE (Admin only)
  // ═══════════════════════════════════════════════════════════════════════════

  @Auth([RoleEnum.admin], tokenEnum.access)
  @Patch('update-course/:id')
  @UseInterceptors(
    FileInterceptor(
      'image',
      cloudUpload({ fileValidation: validFilesFormat.image }),
    ),
  )
  async updateCourse(
    @Param('id') id: string,
    @Body() body: UpdateCourseDto,
    @UploadedFile(new ParseFilePipe({ fileIsRequired: false }))
    file?: Express.Multer.File,
  ): Promise<IResponse<CourseResponse>> {
    const data = await this.courseService.updateCourse(id, body, file);
    return successResponse({ data, message: 'Course updated successfully' });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATUS TRANSITIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /** DRAFT → IN_PROGRESS  (Admin only) */
  @Auth([RoleEnum.admin], tokenEnum.access)
  @Patch(':id/start-progress')
  async startProgress(
    @Param('id') id: string,
  ): Promise<IResponse<any>> {
    const data = await this.courseService.startProgress(id);
    return successResponse({
      data,
      message: 'Course moved to IN_PROGRESS. Teacher can now add lessons.',
    });
  }

  /** IN_PROGRESS | ARCHIVED → PUBLISHED  (Admin or owning Teacher) */
  @Auth([RoleEnum.admin, RoleEnum.teacher], tokenEnum.access)
  @Patch(':id/publish')
  async publishCourse(
    @Param('id') id: string,
    @User() user: UserDocument,
  ): Promise<IResponse<any>> {
    const data = await this.courseService.publishCourse(
      id,
      String(user._id),
      user.role as RoleEnum,
    );
    return successResponse({
      data,
      message: 'Course published successfully. Students can now see it.',
    });
  }

  /** PUBLISHED → IN_PROGRESS  (Admin or owning Teacher) */
  @Auth([RoleEnum.admin, RoleEnum.teacher], tokenEnum.access)
  @Patch(':id/unpublish')
  async unpublishCourse(
    @Param('id') id: string,
    @User() user: UserDocument,
  ): Promise<IResponse<any>> {
    const data = await this.courseService.unpublishCourse(
      id,
      String(user._id),
      user.role as RoleEnum,
    );
    return successResponse({
      data,
      message: 'Course unpublished. Hidden from students.',
    });
  }

  /**
 * Any non-ARCHIVED → ARCHIVED  (Admin only)  // Fixed comment
 * Retires the course from the platform.
 */
  @Auth([RoleEnum.admin], tokenEnum.access)
  @Patch(':id/archive')
  async archiveCourse(
    @Param('id') id: string,
    @User() user: UserDocument,
  ): Promise<IResponse<any>> {
    const data = await this.courseService.archiveCourse(
      id,
      String(user._id),
      user.role as RoleEnum,
    );
    return successResponse({ data, message: 'Course archived successfully.' });
  }

  /** DELETE /course/:id — permanently delete a course (admin only) */
  @Auth([RoleEnum.admin], tokenEnum.access)
  @Delete(':id')
  async deleteCourse(
    @Param('id') id: string,
  ): Promise<IResponse<any>> {
    await this.courseService.deleteCourse(id);
    return successResponse({ message: 'Course and all its lessons deleted successfully.' });
  }
}
