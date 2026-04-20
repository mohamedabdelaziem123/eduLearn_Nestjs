import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateQuestionDto } from './dto/create-question.dto';
import { CourseRepository, QuestionRepository } from 'src/DB';
import { CreateQuestionResponse } from './dto/question.response.dto';

@Injectable()
export class QuestionService {
  constructor(
    private readonly courseRepo: CourseRepository,
    private readonly questionRepo: QuestionRepository,
  ) { }

  /** Create a new question (optionally linked to a lesson) */
  async createQuestion(teacherId: string, dto: CreateQuestionDto): Promise<CreateQuestionResponse> {
    if (dto.courseId) {
      await this.verifyOwnership(dto.courseId, teacherId);
    }

    const question = await this.questionRepo.createQuestion({
      title: dto.title,
      type: dto.type,
      difficulty: dto.difficulty,
      options: dto.options,
      lessonId: dto.lessonId,
      courseId: dto.courseId,
    });

    return {
      questionId: question._id,
      title: question.title,
      type: question.type,
      difficulty: question.difficulty,
    };
  }

  /** Get all questions belonging to a specific lesson */
  async getQuestionsByLesson(teacherId: string, lessonId: string, courseId?: string) {
    if (courseId) {
      await this.verifyOwnership(courseId, teacherId);
    }

    return this.questionRepo.findByLesson(lessonId, courseId);
  }

  /** Delete a question by ID (teacher must own the course) */
  async deleteQuestion(teacherId: string, questionId: string): Promise<void> {
    const question = await this.questionRepo.findOne({
      filter: { _id: questionId },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    // If the question belongs to a course, verify teacher ownership
    if (question.courseId) {
      await this.verifyOwnership(question.courseId.toString(), teacherId);
    }

    const deleted = await this.questionRepo.deleteById(questionId);
    if (!deleted) {
      throw new NotFoundException('Question not found');
    }
  }

  // ─── Private helper ───────────────────────────────────────────────────────

  private async verifyOwnership(courseId: string, teacherId: string) {
    const course = await this.courseRepo.findByTeacher(courseId, teacherId);
    if (!course)
      throw new ForbiddenException('Course not found or access denied');
    return course;
  }
}
