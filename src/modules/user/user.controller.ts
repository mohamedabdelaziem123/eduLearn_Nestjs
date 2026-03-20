import {
  Controller,
  Get,
  Patch,
  Delete,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { UserService } from './user.service';
import {
  Auth,
  cloudUpload,
  IResponse,
  RoleEnum,
  successResponse,
  tokenEnum,
  User,
  validFilesFormat,
} from 'src/common';
import type { UserDocument } from 'src/DB';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpdateProfileDto } from './dto/update-user.dto';
import { UserResponse } from './entities/user.entity';

@Controller('user')
@Auth([RoleEnum.student, RoleEnum.teacher, RoleEnum.admin], tokenEnum.access)
export class UserController {
  constructor(private readonly userService: UserService) { }

  // ─── GET PROFILE ─────────────────────────────────────────────────────────

  @Get('profile')
  async getProfile(@User() user: UserDocument): Promise<IResponse<UserResponse>> {
    const data = await this.userService.profile(user);
    return successResponse({ data, message: 'Profile retrieved' });
  }

  // ─── UPDATE PROFILE (text fields) ────────────────────────────────────────

  @Patch('profile')
  async updateProfile(
    @User() user: UserDocument,
    @Body() body: UpdateProfileDto,
  ): Promise<IResponse<UserResponse>> {
    const data = await this.userService.updateProfile(user, body);
    return successResponse({ data, message: 'Profile updated successfully' });
  }

  // ─── UPLOAD / REPLACE PROFILE IMAGE ──────────────────────────────────────

  @Post('profile/image')
  @UseInterceptors(
    FileInterceptor(
      'image',
      cloudUpload({ fileValidation: validFilesFormat.image }),
    ),
  )
  async updateProfileImage(
    @User() user: UserDocument,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: true,
        validators: [new MaxFileSizeValidator({ maxSize: 2 * 1024 * 1024 })],
      }),
    )
    file: Express.Multer.File,
  ): Promise<IResponse<UserResponse>> {
    const data = await this.userService.updateProfileImage(user, file);
    return successResponse({ data, message: 'Profile image updated' });
  }

  // ─── REMOVE PROFILE IMAGE ───────────────────────────────────────────────

  @Delete('profile/image')
  async removeProfileImage(
    @User() user: UserDocument,
  ): Promise<IResponse<UserResponse>> {
    const data = await this.userService.removeProfileImage(user);
    return successResponse({ data, message: 'Profile image removed' });
  }
}
