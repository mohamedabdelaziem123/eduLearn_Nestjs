import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';

export interface CreateQuickLinkDto {
  email: string;
  full_name: string;
  phone_number: string;
  amount_cents: number;
  reference_id?: string;
  items?: {
    name: string;
    amount_cents: number;
    description?: string;
    quantity: number;
  }[];
}

@Injectable()
export class paymentService {
  private readonly logger = new Logger(paymentService.name);
  private readonly BASE_URL = 'https://accept.paymob.com/v1/intention/';

  constructor(private readonly configService: ConfigService) {}

  async createQuickLink(data: CreateQuickLinkDto) {
    const integrationId = this.configService.get<number>(
      'PAYMOB_INTEGRATION_ID',
    );
    const iframeId = this.configService.get<number>('PAYMOB_IFRAME_ID');
    const secretKey = this.configService.get<string>('PAYMOB_SECRET_KEY');

    const nameParts = data.full_name.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || 'Customer';

    const payload = {
      amount: data.amount_cents,
      currency: 'EGP',
      payment_methods: [Number(integrationId)],
      expiration: 900, // 900 seconds = 15 minutes
      billing_data: {
        first_name: firstName,
        last_name: lastName,
        phone_number: data.phone_number,
        email: data.email,
        apartment: 'NA',
        floor: 'NA',
        street: 'NA',
        building: 'NA',
        shipping_method: 'NA',
        postal_code: 'NA',
        city: 'NA',
        country: 'NA',
        state: 'NA',
      },
      special_reference: data.reference_id,
    };

    try {
      const response = await axios.post(this.BASE_URL, payload, {
        headers: {
          Authorization: `Token ${secretKey}`,
          'Content-Type': 'application/json',
        },
      });

      const paymentKey = response.data.payment_keys?.[0]?.key;

      if (!paymentKey) {
        throw new BadRequestException('Paymob did not return a payment key');
      }

      return `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${paymentKey}`;
    } catch (error: any) {
      this.logger.error('Paymob Error:', error.response?.data || error.message);
      throw new BadRequestException(
        error.response?.data?.detail || 'Failed to generate payment link',
      );
    }
  }

  validateHmac(data: any, hmac: string): boolean {
    // 1. CONFIRM THE ENV VARIABLE NAME
    // Make sure your .env has "PAYMOB_HMAC" (as you wrote here)
    // OR "PAYMOB_HMAC_SECRET" (as I suggested before).
    // They MUST match exactly.
    const secret = this.configService.get<string>('PAYMOB_HMAC');

    if (!data || !secret || !hmac) {
      console.log('❌ Missing Data:', {
        hasData: !!data,
        hasSecret: !!secret,
        hasHmac: !!hmac,
      });
      return false;
    }

    // Keys sorted alphabetically (Correct)
    const keys = [
      'amount_cents',
      'created_at',
      'currency',
      'error_occured',
      'has_parent_transaction',
      'id',
      'integration_id',
      'is_3d_secure',
      'is_auth',
      'is_capture',
      'is_refunded',
      'is_standalone_payment',
      'is_voided',
      'order',
      'owner',
      'pending',
      'source_data.pan',
      'source_data.sub_type',
      'source_data.type',
      'success',
    ];

    const concatenated = keys
      .map((key) => {
        let value;
        if (key === 'order') {
          // Handle both Object (POST) and ID (GET)
          value = data.order?.id ?? data.order;
        } else if (key.includes('.')) {
          const [parent, child] = key.split('.');
          value = data[parent]?.[child];
        } else {
          value = data[key];
        }

        // ⚠️ CRITICAL FIX: Explicitly convert booleans to strings
        if (value === true) return 'true';
        if (value === false) return 'false';

        // Handle null/undefined as empty string
        return value ?? '';
      })
      .join(''); // Join with NO separator

    const calculated = crypto
      .createHmac('sha512', secret)
      .update(concatenated)
      .digest('hex');

    // 🔍 DEBUGGING: Compare these two in your terminal
    console.log('--- HMAC DEBUG ---');
    console.log('Secret Used (Last 4):', '...' + secret.slice(-4)); // Check if this matches Dashboard
    console.log('Concatenated String:', concatenated);
    console.log('Calculated:', calculated);
    console.log('Received:  ', hmac);
    console.log('Match?', calculated === hmac);
    console.log('------------------');

    return calculated === hmac;
  }

  async refundTransaction(transactionId: number, amountCents: number) {
  try {
    // 1. Get your Secret Key from .env (the one starting with egy_sk_test)
    const secretKey = this.configService.get<string>('PAYMOB_SECRET_KEY');

    // 2. Make the Refund Request using the Token header
    const response = await axios.post(
      'https://accept.paymob.com/api/acceptance/void_refund/refund',
      {
        transaction_id: transactionId,
        amount_cents: amountCents * 100,
      },
      {
        headers: {
          // This is the same authentication style you used for payment keys
          Authorization: `Token ${secretKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('💰 Refund Response:', response.data);
    return response.data;
  } catch (error) {
    // Paymob gives detailed error messages in error.response.data
    console.error('❌ Refund Failed:', error.response?.data || error.message);
    throw new BadRequestException('Refund processing failed');
  }
}
}
