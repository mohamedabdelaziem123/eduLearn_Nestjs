import {
  Controller,
  Get,
  Param,
  Patch,
  Delete,
  Body,
  Post,
  UseGuards,
} from '@nestjs/common';
import { LessonService } from './lesson.service';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import {
  Auth,
  IResponse,
  RoleEnum,
  successResponse,
  tokenEnum,
  User,
} from 'src/common';
import { CourseIdParamDto } from 'src/common/dtos/courseParam.dto';
import { type UserDocument } from 'src/DB';
import { CreateLessonDto, GetUploadUrlDto } from './dto/create-lesson.dto';
import { LessonAccessGuard } from 'src/common';

@Controller()
export class LessonController {
  constructor(private readonly lessonService: LessonService) { }

  // ─── Student / public routes ────────────────────────────────────────────

  /** GET /courses/:courseId/lessons — list all lessons in a course (sorted by order) */
  @Auth([RoleEnum.student, RoleEnum.teacher, RoleEnum.admin])
  @Get('courses/:courseId/lessons')
  async getLessonsByCourse(
    @Param() { courseId }: CourseIdParamDto,
    @User() user: UserDocument,
  ): Promise<IResponse<any>> {
    const data = await this.lessonService.getLessonsByCourse(
      courseId,
      user.role,
    );
    return successResponse({ data, message: 'Lessons retrieved successfully' });
  }

  /** GET /lessons/:lessonId — get a single lesson */
  @Auth([RoleEnum.student, RoleEnum.teacher, RoleEnum.admin])
  @UseGuards(LessonAccessGuard)
  @Get('lessons/:lessonId')
  async getLessonById(
    @Param('lessonId') lessonId: string,
  ): Promise<IResponse<any>> {
    const data = await this.lessonService.getLessonById(lessonId);
    return successResponse({ data, message: 'Lesson retrieved successfully' });
  }

  /** GET /lessons/:lessonId/stream — get a pre-signed URL to watch the video */
  @Auth([RoleEnum.student, RoleEnum.teacher, RoleEnum.admin])
  @UseGuards(LessonAccessGuard)
  @Get('lessons/:lessonId/stream')
  async getStreamUrl(
    @Param('lessonId') lessonId: string,
    @User() user: any,
  ): Promise<IResponse<{ url: string }>> {
    const { url } = await this.lessonService.getStreamUrl(lessonId, user);
    return successResponse({ data: { url }, message: 'Stream URL generated' });
  }

  // ─── Teacher routes ─────────────────────────────────────────────────────

  /** POST /teacher/courses/:courseId/lessons/upload-url — get S3 pre-signed upload URL */
  @Auth([RoleEnum.teacher, RoleEnum.admin], tokenEnum.access)
  @Post('teacher/courses/:courseId/lessons/upload-url')
  async getUploadUrl(
    @Param() { courseId }: CourseIdParamDto,
    @Body() dto: GetUploadUrlDto,
    @User() { _id }: UserDocument,
  ): Promise<IResponse<{ URL: string; Key: string }>> {
    const result = await this.lessonService.getUploadUrl(
      courseId,
      _id.toString(),
      dto,
    );
    return successResponse({ data: result });
  }

  /** POST /teacher/courses/:courseId/lessons — create a lesson (after video upload) */
  @Auth([RoleEnum.teacher, RoleEnum.admin], tokenEnum.access)
  @Post('teacher/courses/:courseId/lessons')
  async createLesson(
    @Param() { courseId }: CourseIdParamDto,
    @Body() body: CreateLessonDto,
    @User() { _id }: UserDocument,
  ): Promise<IResponse<any>> {
    const data = await this.lessonService.createLesson(
      courseId,
      _id.toString(),
      body,
    );
    return successResponse({ data, message: 'Lesson created successfully' });
  }

  /** PATCH /teacher/lessons/:lessonId — update lesson metadata or video */
  @Auth([RoleEnum.teacher, RoleEnum.admin], tokenEnum.access)
  @Patch('teacher/lessons/:lessonId')
  async updateLesson(
    @Param('lessonId') lessonId: string,
    @Body() body: UpdateLessonDto,
    @User() { _id }: UserDocument,
  ): Promise<IResponse<any>> {
    const data = await this.lessonService.updateLesson(
      lessonId,
      _id.toString(),
      body,
    );
    return successResponse({ data, message: 'Lesson updated successfully' });
  }

  /** DELETE /teacher/lessons/:lessonId — delete lesson + S3 video */
  @Auth([RoleEnum.teacher, RoleEnum.admin], tokenEnum.access)
  @Delete('teacher/lessons/:lessonId')
  async deleteLesson(
    @Param('lessonId') lessonId: string,
    @User() { _id }: UserDocument,
  ): Promise<IResponse<any>> {
    await this.lessonService.deleteLesson(lessonId, _id.toString());
    return successResponse({ message: 'Lesson deleted successfully' });
  }

  /** PATCH /teacher/lessons/:lessonId/visibility — hide or unhide a lesson */
  @Auth([RoleEnum.teacher, RoleEnum.admin], tokenEnum.access)
  @Patch('teacher/lessons/:lessonId/visibility')
  async toggleVisibility(
    @Param('lessonId') lessonId: string,
    @User() { _id }: UserDocument,
  ): Promise<IResponse<any>> {
    const data = await this.lessonService.toggleVisibility(
      lessonId,
      _id.toString(),
    );
    return successResponse({
      data,
      message: data?.isHidden ? 'Lesson hidden' : 'Lesson visible',
    });
  }
}
