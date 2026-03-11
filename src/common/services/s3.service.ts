import {
  DeleteObjectCommand,
  DeleteObjectCommandOutput,
  DeleteObjectsCommand,
  DeleteObjectsCommandOutput,
  GetObjectCommand,
  GetObjectCommandOutput,
  ListObjectsV2Command,
  ListObjectsV2CommandOutput,
  ObjectCannedACL,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

import { BadRequestException, Injectable } from '@nestjs/common';
import { storageEnum } from '../enums';
import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Upload } from '@aws-sdk/lib-storage';

@Injectable()
export class S3Service {
  private s3Client: S3Client;
  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION as string,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
      },
    });
  }
  uploadFile = async ({
    Bucket = process.env.AWS_BUCKET as string,
    ACL = 'private',
    path = 'general',
    storage = storageEnum.memory,
    file,
  }: {
    Bucket?: string;
    ACL?: ObjectCannedACL;
    path: string;
    storage?: storageEnum;
    file: Express.Multer.File;
  }): Promise<string> => {
    const command = new PutObjectCommand({
      Bucket,
      ACL,
      Key: `${process.env.APP_NAME}/${path}/${Date.now()}_${randomUUID()}/${
        file.originalname
      }`,
      Body:
        storage == storageEnum.memory
          ? file.buffer
          : createReadStream(file.path),
      ContentType: file.mimetype,
    });
    await this.s3Client.send(command);

    if (!command.input.Key) {
      throw new BadRequestException('error uploading the asset');
    }
    return command.input.Key;
  };

  uploadLargeFile = async ({
    Bucket = process.env.AWS_BUCKET as string,
    ACL = 'private',
    path = 'general',
    storage = storageEnum.disk,
    file,
  }: {
    Bucket: string;
    ACL?: ObjectCannedACL;
    path: string;
    storage: storageEnum;
    file: Express.Multer.File;
  }): Promise<string> => {
    const command = new PutObjectCommand({
      Bucket,
      ACL,
      Key: `${process.env.APP_NAME}/${path}/${Date.now()}_${randomUUID()}/${
        file.originalname
      }`,
      Body:
        storage == storageEnum.memory
          ? file.buffer
          : createReadStream(file.path),
      ContentType: file.mimetype,
    });

    const Uploaded = new Upload({
      client: this.s3Client,
      params: command as PutObjectCommand & { Bucket: string; Key: string },
    });

    const { Key } = await Uploaded.done();

    if (!Key) {
      throw new BadRequestException(' fail to upload the file');
    }

    return Key;
  };

  uploadFiles = async ({
    Bucket = process.env.AWS_BUCKET as string,
    ACL = 'private',
    path = 'general',
    storage = storageEnum.disk,
    files,
    isLarge = false,
  }: {
    Bucket?: string;
    ACL?: ObjectCannedACL;
    path: string;
    storage?: storageEnum;
    files: Express.Multer.File[];
    isLarge?: boolean;
  }): Promise<string[]> => {
    let URLs: string[] = [];
    if (isLarge) {
      URLs = await Promise.all(
        files.map((file) => {
          return this.uploadLargeFile({
            Bucket,
            ACL,
            path,
            storage,
            file,
          });
        }),
      );
    } else {
      URLs = await Promise.all(
        files.map((file) => {
          return this.uploadFile({
            Bucket,
            ACL,
            path,
            storage,
            file,
          });
        }),
      );
    }

    return URLs;
  };

  generatePreSignedPutLink = async ({
    ContentType,
    originalname,
    Bucket = process.env.AWS_BUCKET as string,
    path,
    expiresIn = Number(process.env.PRESIGNED_EXPIRES_IN),
  }: {
    ContentType: string;
    originalname: string;
    Bucket?: string;
    path: string;
    expiresIn?: number;
  }): Promise<{ URL: string; Key: string }> => {
    const command = new PutObjectCommand({
      Bucket,

      Key: `${
        process.env.APP_NAME
      }/${path}/${Date.now()}_${randomUUID()}/${originalname.replaceAll(/\s+/g, '-')}`,
      // Body: storageEnum.memory,
      ContentType,
    });

    const link = await getSignedUrl(this.s3Client, command, { expiresIn });

    if (!link || !command.input?.Key) {
      throw new BadRequestException('fail to generate put link');
    }

    return { URL: link, Key: command.input?.Key };
  };

  generatePreSignedGetLink = async ({
    download = 'false',
    downloadName,
    Bucket = process.env.AWS_BUCKET as string,
    Key,
    expiresIn = Number(process.env.PRESIGNED_EXPIRES_IN),
  }: {
    download: string;
    downloadName: string;
    Bucket?: string;
    Key: string;
    expiresIn?: number;
  }): Promise<string> => {
    const command = new GetObjectCommand({
      Bucket,
      Key,
      ResponseContentDisposition:
        download == 'true'
          ? `attachment; filename=${downloadName || Key.split('/').pop()}`
          : undefined,
    });

    const URL = await getSignedUrl(this.s3Client, command, { expiresIn });

    if (!URL || !command.input?.Key) {
      throw new BadRequestException('fail to generate get link');
    }

    return URL;
  };

  getFile = async ({
    Bucket = process.env.AWS_BUCKET as string,
    Key,
  }: {
    Bucket?: string;
    Key: string;
  }): Promise<GetObjectCommandOutput> => {
    const command = new GetObjectCommand({
      Bucket,
      Key,
    });

    const asset = await this.s3Client.send(command);

    if (!asset || !command.input?.Key) {
      throw new BadRequestException('fail to get asset');
    }

    return asset;
  };

  deleteFile = async ({
    Bucket = process.env.AWS_BUCKET as string,

    Key,
  }: {
    Bucket?: string;

    Key: string;
  }): Promise<DeleteObjectCommandOutput> => {
    const command = new DeleteObjectCommand({
      Bucket,
      Key,
    });
    return await this.s3Client.send(command);
  };

  deleteFiles = async ({
    Bucket = process.env.AWS_BUCKET as string,
    Keys,
    Quiet = false,
  }: {
    Bucket?: string;
    Quiet?: boolean;
    Keys: string[];
  }): Promise<DeleteObjectsCommandOutput> => {
    const Objects = Keys.map((Key) => {
      return { Key };
    });
    const command = new DeleteObjectsCommand({
      Bucket,
      Delete: {
        Objects,
        Quiet,
      },
    });
    return this.s3Client.send(command);
  };

  listDirectoryFiles = async ({
    Bucket = process.env.AWS_BUCKET as string,
    path,
  }: {
    Bucket?: string;
    path: string;
  }): Promise<ListObjectsV2CommandOutput> => {
    const command = new ListObjectsV2Command({
      Bucket,
      Prefix: `${process.env.APP_NAME}/${path}`,
    });
    return this.s3Client.send(command);
  };

  deleteFolderByPrefix = async ({
    Bucket = process.env.AWS_BUCKET as string,
    path,
    Quiet = false,
  }: {
    Bucket?: string;
    path: string;
    Quiet?: boolean;
  }) => {
    const list = await this.listDirectoryFiles({ path, Bucket });

    if (!list.Contents?.length) {
      throw new BadRequestException(' no files to delete');
    }
    const Keys = list.Contents.map((file) => file.Key ?? '');
    return this.deleteFiles({ Keys, Quiet, Bucket });
  };
}
