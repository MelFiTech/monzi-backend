import { Injectable, BadRequestException } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class IdentityPassProvider {
  private readonly baseUrl =
    process.env.IDENTITY_PASS_BASE_URL || 'https://api.prembly.com';
  private readonly apiKey = process.env.IDENTITY_PASS_API_KEY;
  private readonly appId = process.env.IDENTITY_PASS_APP_ID;

  async verifyBVN(bvn: string): Promise<any> {
    try {
      const url = `${this.baseUrl}/identitypass/verification/bvn`;
      const headers = {
        accept: 'application/json',
        'app-id': this.appId,
        'content-type': 'application/x-www-form-urlencoded',
        'x-api-key': this.apiKey,
      };
      const data = `number=${bvn}`;
      const response = await axios.post(url, data, { headers, timeout: 30000 });
      if (!response.data || !response.data.status) {
        throw new BadRequestException('Identity Pass BVN verification failed');
      }
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new BadRequestException(
          error.response.data?.detail ||
            'Identity Pass BVN verification failed',
        );
      }
      throw new BadRequestException('Identity Pass BVN verification failed');
    }
  }
}
