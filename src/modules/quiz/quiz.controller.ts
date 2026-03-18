import {
    Controller,
    Get,
    Post,
    Param,
    Body,
    Delete,
    Patch,
    Query,
    UseGuards,
} from '@nestjs/common';
import { QuizService } from './quiz.service';
import { CreateQuestionDto } from '../question/dto/create-question.dto';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
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
import { QuizAttemptGuard } from 'src/common';

@Controller('quiz')
export class QuizController {
    constructor(private readonly quizService: QuizService) { }

    // ═══════════════════════════════════════════════════════════════════════════
    // TEACHER ENDPOINTS
    // ═══════════════════════════════════════════════════════════════════════════



    /** POST /quiz — Teacher creates a new quiz */
    @Auth([RoleEnum.teacher, RoleEnum.admin], tokenEnum.access)
    @Post()
    async createQuiz(
        @Body() dto: CreateQuizDto,
        @User() { _id }: UserDocument,
    ): Promise<IResponse<any>> {
        const data = await this.quizService.createQuiz(_id.toString(), dto);
        return successResponse({ data, message: 'Quiz created successfully' });
    }

    /** DELETE /quiz/:id — Teacher deletes a quiz */
    @Auth([RoleEnum.teacher, RoleEnum.admin], tokenEnum.access)
    @Delete(':id')
    async deleteQuiz(
        @Param('id') quizId: string,
        @User() { _id }: UserDocument,
    ): Promise<IResponse<any>> {
        await this.quizService.deleteQuiz(_id.toString(), quizId);
        return successResponse({ message: 'Quiz deleted successfully' });
    }

    /** PATCH /quiz/:id/visibility — Teacher hides or unhides a quiz */
    @Auth([RoleEnum.teacher, RoleEnum.admin], tokenEnum.access)
    @Patch(':id/visibility')
    async toggleVisibility(
        @Param('id') quizId: string,
        @User() { _id }: UserDocument,
    ): Promise<IResponse<any>> {
        const data = await this.quizService.toggleQuizVisibility(
            _id.toString(),
            quizId,
        );
        return successResponse({
            data,
            message: (data as any)?.isHidden ? 'Quiz hidden' : 'Quiz visible',
        });
    }

    /** GET /quiz/results/lesson/:lessonId — Teacher views paginated student results for a lesson */
    @Auth([RoleEnum.teacher, RoleEnum.admin], tokenEnum.access)
    @Get('results/lesson/:lessonId')
    async getResultsByLesson(
        @Param('lessonId') lessonId: string,
        @Query() query: GetAllDto,
        @User() { _id }: UserDocument,
    ): Promise<IResponse<any>> {
        const data = await this.quizService.getResultsByLesson(
            _id.toString(),
            lessonId,
            { page: Number(query.page) || 1, size: Number(query.size) || 10, search: query.search },
        );
        return successResponse({ data, message: 'Lesson results retrieved' });
    }

    /** GET /quiz/results/course/:courseId — Teacher views paginated student results for a course */
    @Auth([RoleEnum.teacher, RoleEnum.admin], tokenEnum.access)
    @Get('results/course/:courseId')
    async getResultsByCourse(
        @Param('courseId') courseId: string,
        @Query() query: GetAllDto,
        @User() { _id }: UserDocument,
    ): Promise<IResponse<any>> {
        const data = await this.quizService.getResultsByCourse(
            _id.toString(),
            courseId,
            { page: Number(query.page) || 1, size: Number(query.size) || 10, search: query.search },
        );
        return successResponse({ data, message: 'Course results retrieved' });
    }

    /** GET /quiz/results/attempt/:attemptId — Teacher views full detail of a student's attempt */
    @Auth([RoleEnum.teacher, RoleEnum.admin], tokenEnum.access)
    @Get('results/attempt/:attemptId')
    async getAttemptForTeacher(
        @Param('attemptId') attemptId: string,
        @User() { _id }: UserDocument,
    ): Promise<IResponse<any>> {
        const data = await this.quizService.getAttemptForTeacher(_id.toString(), attemptId);
        return successResponse({ data, message: 'Attempt details retrieved' });
    }


    // ═══════════════════════════════════════════════════════════════════════════
    // STUDENT ENDPOINTS
    // ═══════════════════════════════════════════════════════════════════════════

    /** GET /quiz/my-attempts — Student sees all their attempts grouped by course */
    @Auth([RoleEnum.student,RoleEnum.teacher])
    @Get('my-attempts')
    async getMyAttempts(@User() { _id }: UserDocument): Promise<IResponse<any>> {
        const data = await this.quizService.getMyAttempts(_id.toString());
        return successResponse({ data, message: 'Attempts retrieved' });
    }

    /** GET /quiz/:id/start — Student starts a quiz (answers are hidden!) */
    @Auth([RoleEnum.student])
    @UseGuards(QuizAttemptGuard)
    @Get(':id/start')
    async startQuiz(
        @Param('id') quizId: string,
        @User() { _id }: UserDocument,
    ): Promise<IResponse<any>> {
        const data = await this.quizService.startQuiz(_id.toString(), quizId);
        return successResponse({ data, message: 'Quiz loaded' });
    }

    /** POST /quiz/:id/submit — Student submits answers and gets graded */
    @Auth([RoleEnum.student])
    @UseGuards(QuizAttemptGuard)
    @Post(':id/submit')
    async submitQuiz(
        @Param('id') quizId: string,
        @Body() dto: SubmitQuizDto,
        @User() { _id }: UserDocument,
    ): Promise<IResponse<any>> {
        const data = await this.quizService.submitQuiz(_id.toString(), quizId, dto);
        return successResponse({ data, message: 'Quiz submitted and graded' });
    }

    /** GET /quiz/attempt/:attemptId — Student views graded attempt (correct answers shown!) */
    @Auth([RoleEnum.student])
    @Get('attempt/:attemptId')
    async getAttempt(
        @Param('attemptId') attemptId: string,
        @User() { _id }: UserDocument,
    ): Promise<IResponse<any>> {
        const data = await this.quizService.getAttempt(_id.toString(), attemptId);
        return successResponse({ data, message: 'Quiz attempt retrieved' });
    }

    /** GET /quiz/performance/lesson/:lessonId — Student's lesson score vs. average */
    @Auth([RoleEnum.student])
    @Get('performance/lesson/:lessonId')
    async getLessonPerformance(
        @Param('lessonId') lessonId: string,
        @User() { _id }: UserDocument,
    ): Promise<IResponse<any>> {
        const data = await this.quizService.getLessonPerformance(
            _id.toString(),
            lessonId,
        );
        return successResponse({ data, message: 'Lesson performance retrieved' });
    }

    /** GET /quiz/performance/course/:courseId — Student's course score vs. average */
    @Auth([RoleEnum.student])
    @Get('performance/course/:courseId')
    async getCoursePerformance(
        @Param('courseId') courseId: string,
        @User() { _id }: UserDocument,
    ): Promise<IResponse<any>> {
        const data = await this.quizService.getCoursePerformance(
            _id.toString(),
            courseId,
        );
        return successResponse({ data, message: 'Course performance retrieved' });
    }
}
