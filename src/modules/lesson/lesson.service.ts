import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { LessonRepository } from 'src/DB/repository/lesson.repository';
import { CourseRepository } from 'src/DB/repository/course.repository';
import { CdnService, S3Service } from 'src/common';
import { CreateLessonDto, GetUploadUrlDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { LessonDocument, UserDocument } from 'src/DB';
import { CreateLessonResponse, LessonResponse } from './dto/lesson.response.dto';

@Injectable()
export class LessonService {
  constructor(
    private readonly lessonRepository: LessonRepository,
    private readonly courseRepository: CourseRepository,
    private readonly s3Service: S3Service,
    private readonly cdnService: CdnService,
  ) { }

  // ─── Called by TeacherController ─────────────────────────────────────────

  /** Generate a pre-signed S3 PUT URL so the client can upload the video directly */
  async getUploadUrl(
    courseId: string,
    teacherId: string,
    dto: GetUploadUrlDto,
  ): Promise<{ URL: string; Key: string }> {
    await this.verifyOwnership(courseId, teacherId);

    const key = `courses/${courseId}/lessons`;
    return this.s3Service.generatePreSignedPutLink({
      ContentType: dto.ContentType,
      originalname: dto.originalname,
      path: key,
    });
  }

  /** Create a lesson after the video has been uploaded via the pre-signed URL */
  async createLesson(
    courseId: string,
    teacherId: string,
    data: CreateLessonDto,
  ): Promise<CreateLessonResponse> {
    await this.verifyOwnership(courseId, teacherId);

    const region = process.env.AWS_REGION;
    const bucket = process.env.AWS_BUCKET;
    const finalVideoUrl = `https://${bucket}.s3.${region}.amazonaws.com/${data.videoKey}`;

    try {
      const newLesson = await this.lessonRepository.createLesson({
        title: data.title,
        description: data.description,
        price: data.price,
        isFree: data.isFree,
        order: data.order,
        courseId: courseId,
        videoUrl: finalVideoUrl,
        videoFileId: data.videoKey,
      });

      // Link lesson to the course document
      await this.courseRepository.addLessonToCourse(
        courseId,
        newLesson._id.toString(),
      );

      return {
        lessonId: newLesson._id,
        title: newLesson.title,
        courseId: newLesson.courseId,
        order: newLesson.order,
      };
    } catch (error) {
      // Rollback: delete the orphaned S3 video
      await this.s3Service.deleteFile({ Key: data.videoKey }).catch(() => { });
      throw error;
    }
  }

  // ─── Open to students / teachers / admins ────────────────────────────────

  /** Get all lessons belonging to a course */
  async getLessonsByCourse(
    courseId: string,
    userRole: string,
  ): Promise<LessonDocument[]> {
    const onlyVisible = userRole === 'student';
    return this.lessonRepository.findLessonsByCourse(courseId, onlyVisible);
  }

  /** Get a single lesson by its ID */
  async getLessonById(lessonId: string): Promise<LessonDocument> {
    const lesson = await this.lessonRepository.findOne({
      filter: { _id: lessonId },
    });

    if (!lesson) throw new NotFoundException('Lesson not found');
    return lesson;
  }

  /** Get a pre-signed URL to stream/view the lesson video */
  async getStreamUrl(
    lessonId: string,
    user: UserDocument,
  ): Promise<{ url: string; lesson: LessonDocument }> {
    const lesson = await this.lessonRepository.findOne({
      filter: { _id: lessonId },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');

    if (!lesson.videoFileId) {
      throw new NotFoundException('This lesson has no video');
    }

    // Access check: free lessons, purchased lessons, or course owner/admin
    const hasAccess = await this.checkVideoAccess(lesson, user);
    if (!hasAccess) {
      throw new ForbiddenException(
        'You must purchase this lesson to access the video',
      );
    }

    // Use CloudFront CDN signed URL instead of direct S3 pre-signed link
    const url = this.cdnService.getSignedUrl(lesson.videoFileId);

    return { url, lesson };
  }

  // ─── Teacher / Admin mutations ────────────────────────────────────────────

  /** Update lesson metadata and optionally replace the video */
  async updateLesson(
    lessonId: string,
    teacherId: string,
    data: UpdateLessonDto,
  ): Promise<LessonDocument> {
    // 1. Check existence
    const lesson = await this.lessonRepository.findOne({
      filter: { _id: lessonId },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');

    // 2. Verify Ownership
    await this.verifyOwnership(lesson.courseId.toString(), teacherId);

    // 3. Prepare the Update Payload
    // We separate the "data" from the "payload" to keep things clean
    const updatePayload: Record<string, any> = { ...data };

    // Remove the temporary DTO field so it doesn't get saved to DB
    delete updatePayload.videoKey;

    // Handle Video Replacement Logic
    if (data.videoKey) {
      const region = process.env.AWS_REGION;
      const bucket = process.env.AWS_BUCKET;

      // Ideally, move this URL builder to a helper function
      updatePayload.videoUrl = `https://${bucket}.s3.${region}.amazonaws.com/${data.videoKey}`;
      updatePayload.videoFileId = data.videoKey;
    }

    // 4. DATABASE OPERATION (With Safety Net)
    try {
      const updatedLesson = await this.lessonRepository.findOneAndUpdate({
        filter: { _id: lessonId },
        update: updatePayload,
        options: { new: true },
      });

      // --- SUCCESS PATH ---

      // If we successfully replaced the video, we can now safely delete the OLD one
      if (data.videoKey && lesson.videoFileId) {
        // Use .catch() so a background deletion error doesn't crash the user response
        this.s3Service
          .deleteFile({ Key: lesson.videoFileId })
          .catch((err) => console.error('Failed to clean up old video:', err));
      }

      return updatedLesson!;
    } catch (error) {
      // --- FAILURE PATH (Rollback) ---

      console.error('Database update failed, rolling back S3 upload...');

      // If the DB update failed, the NEW video is now garbage. Delete it immediately.
      if (data.videoKey) {
        await this.s3Service.deleteFile({ Key: data.videoKey }).catch(() => { }); // Swallow error here, we tried our best
      }

      throw error; // Re-throw the original error to the controller
    }
  }

  /** Delete a lesson and its S3 video */
  async deleteLesson(lessonId: string, teacherId: string): Promise<void> {
    const lesson = await this.lessonRepository.findOne({
      filter: { _id: lessonId },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');

    await this.verifyOwnership(String(lesson.courseId), teacherId);

    // Remove lesson reference from course
    await this.courseRepository.removeLessonFromCourse(
      String(lesson.courseId),
      lesson._id.toString(),
    );

    // Delete lesson document
    await this.lessonRepository.deleteOne({ filter: { _id: lessonId } });

    // Delete video from S3
    if (lesson.videoFileId) {
      await this.s3Service
        .deleteFile({ Key: lesson.videoFileId })
        .catch(() => { });
    }
  }

  /** Toggle lesson visibility (hide/unhide) */
  async toggleVisibility(
    lessonId: string,
    teacherId: string,
  ): Promise<LessonDocument> {
    const lesson = await this.lessonRepository.findOne({
      filter: { _id: lessonId },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');

    await this.verifyOwnership(lesson.courseId.toString(), teacherId);

    return (await this.lessonRepository.toggleHidden(lessonId))!;
  }

  // ─── Private helper ───────────────────────────────────────────────────────

  private async verifyOwnership(courseId: string, teacherId: string) {
    const course = await this.courseRepository.findByTeacher(
      courseId,
      teacherId,
    );
    if (!course)
      throw new ForbiddenException('Course not found or access denied');
    return course;
  }

  private async checkVideoAccess(
    lesson: LessonDocument,
    user: UserDocument,
  ): Promise<boolean> {
    // Free lessons are always accessible
    if (lesson.isFree) return true;

    // Admins always have access
    if (user.role === 'admin') return true;

    // Teachers who own the course have access
    if (user.role === 'teacher') {
      const course = await this.courseRepository.findOne({
        filter: { _id: lesson.courseId, teacherId: user._id },
      });
      if (course) return true;
    }

    // Students who bought the lesson have access
    if ((user as any).boughtLessons?.includes(String(lesson._id))) {
      return true;
    }

    return false;
  }
}
