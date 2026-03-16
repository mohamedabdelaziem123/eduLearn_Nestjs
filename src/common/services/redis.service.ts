import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly redisClient: Redis;
  private readonly logger = new Logger(RedisService.name);

  constructor() {
    // Paste your Upstash or Redis Cloud URL in your .env file
    this.redisClient = new Redis(process.env.REDIS_URL as string);
    this.redisClient.on('connect', () => {
      this.logger.log('✅ Successfully connected to Upstash Redis!');
    });

    this.redisClient.on('error', (err) => {
      this.logger.error('❌ Redis Connection Error:', err);
    });
  }

  /**
   * Add an access token to the blocklist with TTL
   * Uses atomic SET operation with EX flag for TTL
   * @param token - The JWT access token string
   * @param timeToLiveSeconds - TTL in seconds (remaining token validity)
   * @throws Error if Redis connection fails
   */
  async setTokenToBlocklist(
    token: string,
    timeToLiveSeconds: number,
  ): Promise<void> {
    try {
      await this.redisClient.set(token, 'revoked', 'EX', timeToLiveSeconds);
      this.logger.debug(
        `Token added to blocklist with TTL: ${timeToLiveSeconds}s`,
      );
    } catch (error) {
      this.logger.error('Failed to add token to blocklist', error);
      throw error;
    }
  }

  /**
   * Check if an access token is revoked
   * @param token - The JWT access token string
   * @returns true if token is blocklisted, false otherwise
   * @throws Error if Redis connection fails
   */
  async isTokenRevoked(token: string): Promise<boolean> {
    try {
      const result = await this.redisClient.get(token);
      return result === 'revoked';
    } catch (error) {
      this.logger.error('Failed to check token revocation status', error);
      throw error;
    }
  }

  /**
   * Store forgot-password verification state after OTP is verified.
   * @param email - The user's email
   * @param ttlSeconds - Time to live in seconds
   */
  async setForgotPasswordVerified(
    email: string,
    ttlSeconds: number,
  ): Promise<void> {
    const key = `forgot-pwd-verified:${email}`;
    await this.redisClient.set(key, 'verified', 'EX', ttlSeconds);
  }

  /**
   * Check if the forgot-password OTP was verified recently.
   * @param email - The user's email
   * @returns true if verified flag exists, false otherwise
   */
  async isForgotPasswordVerified(email: string): Promise<boolean> {
    const key = `forgot-pwd-verified:${email}`;
    const result = await this.redisClient.get(key);
    return result === 'verified';
  }

  /**
   * Delete the forgot-password verification key after password reset.
   * @param email - The user's email
   */
  async deleteForgotPasswordVerified(email: string): Promise<void> {
    const key = `forgot-pwd-verified:${email}`;
    await this.redisClient.del(key);
  }

  // ====================================================================
  // --- NEW GENERIC METHODS ADDED FOR OTP FLOW (DO NOT DELETE) ---
  // ====================================================================

  /**
   * Get a generic string value from Redis
   */
  async get(key: string): Promise<string | null> {
    try {
      return await this.redisClient.get(key);
    } catch (error) {
      this.logger.error(`Failed to get key: ${key}`, error);
      throw error;
    }
  }

  /**
   * Set a generic string value in Redis with an optional expiration
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      if (ttlSeconds) {
        // 'EX' tells Redis the TTL is in seconds
        await this.redisClient.set(key, value, 'EX', ttlSeconds);
      } else {
        await this.redisClient.set(key, value);
      }
    } catch (error) {
      this.logger.error(`Failed to set key: ${key}`, error);
      throw error;
    }
  }

  /**
   * Delete a generic key from Redis
   */
  async del(key: string): Promise<void> {
    try {
      await this.redisClient.del(key);
    } catch (error) {
      this.logger.error(`Failed to delete key: ${key}`, error);
      throw error;
    }
  }

  // ====================================================================

  /**
   * Clean up connection when the app stops
   */
  onModuleDestroy() {
    this.redisClient.disconnect();
    this.logger.log('Redis connection closed');
  }
}