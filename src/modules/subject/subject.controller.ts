import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
} from '@nestjs/common';
import { SubjectService } from './subject.service';
import {
    CreateSubjectDto,
    UpdateSubjectDto,
    SubjectParamsDto,
} from './dto/subject.dto';
import { Auth, IResponse, RoleEnum, successResponse, User } from 'src/common';


@Controller('subject')
export class SubjectController {
    constructor(private readonly subjectService: SubjectService) { }

    @Auth([RoleEnum.admin])
    @Post('/')
    async create(@Body() body: CreateSubjectDto): Promise<IResponse<any>> {
        const subject = await this.subjectService.create(body);
        return successResponse({
            data: { subjectId: subject._id, name: subject.name },
            message: 'Subject created successfully',
        });
    }

    @Get('/')
    async findAll(): Promise<IResponse<any>> {
        const subjects = await this.subjectService.findAll();
        return successResponse({ data: { subjects } });
    }

    @Auth([RoleEnum.admin , RoleEnum.student , RoleEnum.teacher])
    @Get('/:id/courses')
    async getCoursesBySubject(
        @Param() { id:subjectId }: SubjectParamsDto,
        @User()  user : any,
    ): Promise<IResponse<any>> {
        const courses = await this.subjectService.getCoursesBySubject(subjectId ,user.role);
        return successResponse({ data: { courses } });
    }

    @Get('/:id/teachers')
    async getTeachersBySubject(
        @Param() { id }: SubjectParamsDto,
    ): Promise<IResponse<any>> {
        const teachers = await this.subjectService.getTeachersBySubject(id);
        return successResponse({ data: { teachers }, message: 'Teachers retrieved' });
    }

    @Get('/:id')
    async findById(@Param() { id }: SubjectParamsDto): Promise<IResponse<any>> {
        const subject = await this.subjectService.findById(id);
        return successResponse({ data: { subject } });
    }

    @Auth([RoleEnum.admin])
    @Patch('/:id')
    async update(
        @Param() { id }: SubjectParamsDto,
        @Body() body: UpdateSubjectDto,
    ): Promise<IResponse<any>> {
        const subject = await this.subjectService.update(id, body);
        return successResponse({
            data: { subject },
            message: 'Subject updated successfully',
        });
    }

    @Auth([RoleEnum.admin])
    @Delete('/:id')
    async delete(@Param() { id }: SubjectParamsDto): Promise<IResponse> {
        await this.subjectService.delete(id);
        return successResponse({ message: 'Subject deleted successfully' });
    }
}
