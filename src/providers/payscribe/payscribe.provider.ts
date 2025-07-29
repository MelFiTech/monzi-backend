import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class PayscribeProvider {
  private readonly axiosInstance: AxiosInstance;
  private readonly baseUrl: string;
  private readonly secretKey: string;
  private readonly publicKey: string;

  constructor(private configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('PAYSCRIBE_BASE_URL');
    this.secretKey = this.configService.get<string>('PAYSCRIBE_SECRET_KEY');
    this.publicKey = this.configService.get<string>('PAYSCRIBE_PUBLIC_KEY');

    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.publicKey}`,
      },
    });

    // Add request interceptor for logging
    this.axiosInstance.interceptors.request.use(
      (config) => {
        console.log('🔍 [PAYSCRIBE] Request:', {
          method: config.method?.toUpperCase(),
          url: config.url,
          headers: config.headers,
        });
        return config;
      },
      (error) => {
        console.error('❌ [PAYSCRIBE] Request error:', error);
        return Promise.reject(error);
      },
    );

    // Add response interceptor for logging
    this.axiosInstance.interceptors.response.use(
      (response) => {
        console.log('✅ [PAYSCRIBE] Response:', {
          status: response.status,
          url: response.config.url,
          data: response.data,
        });
        return response;
      },
      (error) => {
        console.error('❌ [PAYSCRIBE] Response error:', {
          status: error.response?.status,
          url: error.config?.url,
          data: error.response?.data,
        });
        return Promise.reject(error);
      },
    );
  }

  async makeRequest<T>(
    method: string,
    endpoint: string,
    data?: any,
  ): Promise<T> {
    try {
      const response = await this.axiosInstance.request({
        method,
        url: endpoint,
        data,
      });
      return response.data;
    } catch (error) {
      console.error('❌ [PAYSCRIBE] API request failed:', error);
      throw error;
    }
  }

  getAxiosInstance(): AxiosInstance {
    return this.axiosInstance;
  }
}
