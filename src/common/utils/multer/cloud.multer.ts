import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { Request } from 'express';
import { diskStorage, FileFilterCallback, memoryStorage } from 'multer';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { storageEnum } from 'src/common/enums';

export const cloudUpload = ({
  storageType = storageEnum.memory,
  fileValidation,
  sizeMB = 5,
}: {
  storageType?: storageEnum;
  fileValidation: string[];
  sizeMB?: number;
}): MulterOptions => {
  return {
    storage:
      storageType == storageEnum.disk
        ? diskStorage({
            destination: tmpdir(),

            filename(
              req: Request,
              file: Express.Multer.File,
              callback: (error: Error | null, filename: string) => void,
            ): void {
              callback(null, `${randomUUID()}_${file.originalname}`);
            },
          })
        : memoryStorage(),

    fileFilter(
      req: Request,
      file: Express.Multer.File,
      callback: FileFilterCallback,
    ): void {
      if (!fileValidation.includes(file.mimetype)) {
        callback(
          new BadRequestException('validation error', {
            cause: {
              key: 'file',
              issues: [{ path: 'file', message: 'in-valid format' }],
            },
          }),
        );
      }
      callback(null, true);
    },
  };
};
