import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { getSignedUrl } from '@aws-sdk/cloudfront-signer';

@Injectable()
export class CdnService {
    private readonly domain: string;
    private readonly keyPairId: string;
    private readonly privateKey: string;
    private readonly expiresInMs: number;
    private readonly logger = new Logger(CdnService.name);

    constructor() {
        this.domain = process.env.CLOUDFRONT_DOMAIN as string;
        this.keyPairId = process.env.CLOUDFRONT_KEY_PAIR_ID as string;

        // Default signed URL lifetime: 2 hours (configurable via env)
        this.expiresInMs =
            Number(process.env.CLOUDFRONT_SIGNED_URL_EXPIRES) || 1000 * 60 * 60 * 2;

        if (process.env.CLOUDFRONT_PRIVATE_KEY) {
            this.privateKey = process.env.CLOUDFRONT_PRIVATE_KEY.replace(/\\n/g, '\n');
        } else {
            this.logger.error('CRITICAL: CloudFront Private Key is missing from .env!');
        }
    }

    /** Generate a time-limited CloudFront signed URL for a given S3 object key */
    getSignedUrl(fileKey: string): string {
        try {
            const expiresAt = new Date(Date.now() + this.expiresInMs).toISOString();

            return getSignedUrl({
                url: `${this.domain}/${fileKey}`,
                keyPairId: this.keyPairId,
                privateKey: this.privateKey,
                dateLessThan: expiresAt,
            });
        } catch (error) {
            this.logger.error(`Failed to sign URL for file: ${fileKey}`, error);
            throw new InternalServerErrorException('Failed to generate secure media link');
        }
    }
}
