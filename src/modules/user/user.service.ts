import { BadRequestException, Injectable } from '@nestjs/common';
import { UserDocument, UserRepository } from 'src/DB';
import { CdnService, S3Service } from 'src/common';
import { UpdateProfileDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly s3Service: S3Service,
    private readonly cdnService: CdnService,
  ) { }

  // ═══════════════════════════════════════════════════════════════════════════
  // GET PROFILE
  // ═══════════════════════════════════════════════════════════════════════════

  async profile(user: UserDocument): Promise<any> {
    const profile = await this.userRepository.findOne({
      filter: { _id: user._id },
      projection: '-password -__v',
    });

    if (!profile) {
      throw new BadRequestException('User profile not found');
    }

    return this.attachCdnUrl(profile);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UPDATE PROFILE (firstName, lastName, phone, address)
  // ═══════════════════════════════════════════════════════════════════════════

  async updateProfile(
    user: UserDocument,
    data: UpdateProfileDto,
  ): Promise<any> {
    const updated = await this.userRepository.findOneAndUpdate({
      filter: { _id: user._id },
      update: data,
      options: { new: true },
    });

    if (!updated) {
      throw new BadRequestException('Failed to update profile');
    }

    return this.attachCdnUrl(updated);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UPLOAD / REPLACE PROFILE IMAGE
  // ═══════════════════════════════════════════════════════════════════════════

  async updateProfileImage(
    user: UserDocument,
    file: Express.Multer.File,
  ): Promise<any> {
    // Fetch the current user to get the old image key for cleanup
    const currentUser = await this.userRepository.findOne({
      filter: { _id: user._id },
    });

    // Upload new image to S3
    const profileImage = await this.s3Service.uploadFile({
      file,
      path: `images/users/${user._id.toString()}/profile-image`,
    });

    // Update DB
    const updated = await this.userRepository.findOneAndUpdate({
      filter: { _id: user._id },
      update: { profileImage },
      options: { new: true },
    });

    if (!updated) {
      throw new BadRequestException('Failed to update profile image');
    }

    // Cleanup: delete old image from S3 (if one existed)
    if (currentUser?.profileImage) {
      this.s3Service
        .deleteFile({ Key: currentUser.profileImage })
        .catch((err) => console.error('Failed to delete old profile image:', err));
    }

    return this.attachCdnUrl(updated);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REMOVE PROFILE IMAGE
  // ═══════════════════════════════════════════════════════════════════════════

  async removeProfileImage(user: UserDocument): Promise<any> {
    const currentUser = await this.userRepository.findOne({
      filter: { _id: user._id },
    });

    if (!currentUser?.profileImage) {
      throw new BadRequestException('No profile image to remove');
    }

    // Remove from DB
    const updated = await this.userRepository.findOneAndUpdate({
      filter: { _id: user._id },
      update: { $unset: { profileImage: 1 } } as any,
      options: { new: true },
    });

    // Delete from S3
    this.s3Service
      .deleteFile({ Key: currentUser.profileImage })
      .catch((err) => console.error('Failed to delete profile image from S3:', err));

    return this.attachCdnUrl(updated);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  /** Convert a Mongoose doc to JSON and replace profileImage S3 key with CloudFront URL */
  private attachCdnUrl(doc: any): any {
    const obj = doc?.toJSON ? doc.toJSON() : doc;
    if (obj?.profileImage) {
      obj.profileImage = this.cdnService.getSignedUrl(obj.profileImage);
    }
    // Strip password from response
    delete obj?.password;
    return obj;
  }
}
