import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { QuestionService } from './question.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { type UserDocument } from 'src/DB';
import {
  Auth,
  IResponse,
  RoleEnum,
  successResponse,
  tokenEnum,
  User,
} from 'src/common';

@Controller('question')
export class QuestionController {
  constructor(private readonly questionService: QuestionService) { }

  /** POST /question — Teacher creates a new question */
  @Auth([RoleEnum.teacher, RoleEnum.admin], tokenEnum.access)
  @Post()
  async createQuestion(
    @Body() dto: CreateQuestionDto,
    @User() { _id }: UserDocument,
  ): Promise<IResponse<any>> {
    const data = await this.questionService.createQuestion(
      _id.toString(),
      dto,
    );
    return successResponse({ data, message: 'Question created successfully' });
  }

  /** GET /question/lesson/:lessonId?courseId=xxx — Teacher gets all questions for a lesson */
  @Auth([RoleEnum.teacher, RoleEnum.admin], tokenEnum.access)
  @Get('lesson/:lessonId')
  async getQuestionsByLesson(
    @Param('lessonId') lessonId: string,
    @Query('courseId') courseId: string,
    @User() { _id }: UserDocument,
  ): Promise<IResponse<any>> {
    const data = await this.questionService.getQuestionsByLesson(
      _id.toString(),
      lessonId,
      courseId,
    );
    return successResponse({ data, message: 'Questions retrieved' });
  }

  /** DELETE /question/:id — Teacher deletes a question */
  @Auth([RoleEnum.teacher, RoleEnum.admin], tokenEnum.access)
  @Delete(':id')
  async deleteQuestion(
    @Param('id') questionId: string,
    @User() { _id }: UserDocument,
  ): Promise<IResponse<any>> {
    await this.questionService.deleteQuestion(_id.toString(), questionId);
    return successResponse({ message: 'Question deleted successfully' });
  }
}
