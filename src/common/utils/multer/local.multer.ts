import { diskStorage } from 'multer';
import type { Request } from 'express';
import { ImulterFile } from '../../interfaces/index';
import { resolve } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { BadGatewayException } from '@nestjs/common';

export const validFilesFormat = {
  image: ['image/jpg', 'image/jpeg', 'image/gif', 'image/png'],
  video: ['video/mp4', 'video/mpeg', 'video/quicktime'],
  pdf: ['application/pdf'],
};

export const localFileUpload = ({
  path = 'general',
  sizeMB = 5,
  fileValidation = validFilesFormat.image,
}: {
  path: string;
  sizeMB?: number;
  fileValidation?: string[];
}): MulterOptions => {
  const basePath = `uploads/${path}`;

  const absolutePath = resolve(basePath);
  return {
    storage: diskStorage({
      destination(
        req: Request,
        file: Express.Multer.File,
        callback: (error: Error | null, destination: string) => void,
      ) {
        if (!existsSync(absolutePath)) {
          mkdirSync(absolutePath, { recursive: true });
        }

        callback(null, absolutePath);
        return;
      },
      filename(
        req: Request,
        file: ImulterFile,
        callback: (error: Error | null, filename: string) => void,
      ) {
        const filename = `${randomUUID()}_${file.originalname}`;
        file.finalPath = `${basePath}/${filename}`;

        callback(null, filename);
      },
    }),

    fileFilter(
      req: Request,
      file: Express.Multer.File,
      callback: (error: Error | null, acceptFile: boolean) => void,
    ): void {
      if (!fileValidation.includes(file.mimetype)) {
        callback(
          new BadGatewayException('validation error', {
            cause: {
              key: 'file',
              issues: [{ path: 'file', message: 'in-valid format' }],
            },
          }),
          false,
        );
      }
      callback(null, true);
    },
    limits: { fileSize: sizeMB * 1024 * 1024 },
  };
};
