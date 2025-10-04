import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface BillService {
  id: string;
  service: string;
}

export interface DataPlan {
  bundle_id: string;
  data_bundle: string;
  amount: string;
  validity: string;
}

export interface DataPurchaseRequest {
  phone_number: string;
  bundle_id: string;
  amount: number;
  // Network not needed - Nyra knows it from bundle_id
}

export interface DataPurchaseResponse {
  success: boolean;
  message: string;
  data: {
    reference: string;
    amount: number;
    status: string;
  };
}

export interface AirtimePurchaseRequest {
  phone_number: string;
  amount: number;
  network?: string;
}

export interface AirtimePurchaseResponse {
  success: boolean;
  message: string;
  data: {
    reference: string;
    amount: number;
    status: string;
  };
}

@Injectable()
export class NyraBillProvider {
  private readonly logger = new Logger(NyraBillProvider.name);
  private readonly httpClient: AxiosInstance;
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('NYRA_BASE_URL');
    this.clientId = this.configService.get<string>('NYRA_CLIENT_ID');
    this.clientSecret = this.configService.get<string>('NYRA_CLIENT_SECRET');

    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 60000, // Increased to 60 seconds to match transfer provider
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': this.clientId,
        'Authorization': `Bearer ${this.clientSecret}`,
      },
    });

    // Add request interceptor for logging
    this.httpClient.interceptors.request.use(
      (config) => {
        this.logger.debug(`Making request to ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        this.logger.error('Request error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    this.httpClient.interceptors.response.use(
      (response) => {
        this.logger.debug(`Response from ${response.config.url}: ${response.status}`);
        return response;
      },
      (error) => {
        this.logger.error(`Response error from ${error.config?.url}:`, error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get all available bill services
   */
  async getServices(): Promise<BillService[]> {
    try {
      this.logger.log('Fetching available bill services from Nyra');
      
      const response = await this.httpClient.get('/business/vas/services');
      
      if (response.data.success) {
        this.logger.log(`Successfully fetched ${response.data.data.length} services`);
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch services');
      }
    } catch (error) {
      this.logger.error('Error fetching services:', error);
      throw new Error(`Failed to fetch services: ${error.message}`);
    }
  }

  /**
   * Get data plans for a specific network
   */
  async getDataPlans(network: 'MTN' | 'AIRTEL' | 'GLO' | '9MOBILE'): Promise<DataPlan[]> {
    try {
      this.logger.log(`Fetching data plans for ${network} from Nyra`);
      
      // Add delay to prevent rate limiting
      await this.delay(1000);
      
      const response = await this.httpClient.get('/business/vas/data-plans', {
        params: { network }
      });
      
      if (response.data.success) {
        this.logger.log(`Successfully fetched ${response.data.data.length} data plans for ${network}`);
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch data plans');
      }
    } catch (error) {
      this.logger.error(`Error fetching data plans for ${network}:`, error);
      throw new Error(`Failed to fetch data plans for ${network}: ${error.message}`);
    }
  }

  /**
   * Purchase data bundle
   */
  async purchaseData(request: DataPurchaseRequest): Promise<DataPurchaseResponse> {
    const maxRetries = 3;
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.log(`Purchasing data bundle for ${request.phone_number}, amount: ${request.amount} (attempt ${attempt}/${maxRetries})`);
        
        // Validate phone number format
        if (!this.isValidPhoneNumber(request.phone_number)) {
          throw new Error('Invalid phone number format. Use Nigerian format (e.g., 08012345678)');
        }

        // Validate amount
        if (request.amount < 100) {
          throw new Error('Minimum amount for data purchase is ₦100');
        }

        const response = await this.httpClient.post('/business/vas/data/purchase', request);
        
        if (response.data.success) {
          this.logger.log(`Data purchase successful. Reference: ${response.data.data.reference}`);
          return response.data;
        } else {
          throw new Error(response.data.message || 'Data purchase failed');
        }
      } catch (error) {
        lastError = error;
        this.logger.warn(`Attempt ${attempt}/${maxRetries} failed to purchase data:`, error.message);

        // Don't retry on validation errors
        if (error.message.includes('Invalid phone number') || error.message.includes('Minimum amount')) {
          throw error;
        }

        if (attempt < maxRetries) {
          // Wait before retrying (exponential backoff)
          const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          this.logger.log(`Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    this.logger.error('Failed to purchase data after all retries:', lastError.message);
    throw new Error(`Data purchase failed: ${lastError.message}`);
  }

  /**
   * Purchase airtime
   */
  async purchaseAirtime(request: AirtimePurchaseRequest): Promise<AirtimePurchaseResponse> {
    const maxRetries = 3;
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.log(`Purchasing airtime for ${request.phone_number}, amount: ${request.amount} (attempt ${attempt}/${maxRetries})`);
        
        // Validate phone number format
        if (!this.isValidPhoneNumber(request.phone_number)) {
          throw new Error('Invalid phone number format. Use Nigerian format (e.g., 08012345678)');
        }

        // Validate amount
        if (request.amount < 100) {
          throw new Error('Minimum amount for airtime purchase is ₦100');
        }

        // Use provided network or detect from phone number
        let network = request.network;
        if (!network) {
          network = this.detectNetwork(request.phone_number);
          if (!network) {
            throw new Error('Unable to detect network from phone number. Please provide network parameter.');
          }
        }

        // Prepare airtime purchase request with network
        const airtimeRequest = {
          phone_number: request.phone_number,
          amount: request.amount,
          network: network
        };

        const response = await this.httpClient.post('/business/vas/airtime/purchase', airtimeRequest);
        
        if (response.data.success) {
          this.logger.log(`Airtime purchase successful. Reference: ${response.data.data.reference}`);
          return response.data;
        } else {
          throw new Error(response.data.message || 'Airtime purchase failed');
        }
      } catch (error) {
        lastError = error;
        this.logger.warn(`Attempt ${attempt}/${maxRetries} failed to purchase airtime:`, error.message);

        // Don't retry on validation errors
        if (error.message.includes('Invalid phone number') || error.message.includes('Minimum amount') || error.message.includes('Unable to detect network')) {
          throw error;
        }

        if (attempt < maxRetries) {
          // Wait before retrying (exponential backoff)
          const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          this.logger.log(`Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    this.logger.error('Failed to purchase airtime after all retries:', lastError.message);
    throw new Error(`Airtime purchase failed: ${lastError.message}`);
  }

  /**
   * Validate Nigerian phone number format
   */
  private isValidPhoneNumber(phoneNumber: string): boolean {
    // Remove any non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Check if it's a valid Nigerian phone number
    // Should start with 0 and be 11 digits, or start with 234 and be 13 digits
    return /^(0[789][01]\d{8}|234[789][01]\d{8})$/.test(cleaned);
  }

  /**
   * Format phone number to Nigerian format
   */
  formatPhoneNumber(phoneNumber: string): string {
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    if (cleaned.startsWith('234')) {
      return '0' + cleaned.substring(3);
    } else if (cleaned.startsWith('0') && cleaned.length === 11) {
      return cleaned;
    } else if (cleaned.length === 10) {
      return '0' + cleaned;
    }
    
    return phoneNumber; // Return original if can't format
  }

  /**
   * Detect network from phone number
   */
  private detectNetwork(phoneNumber: string): 'MTN' | 'AIRTEL' | 'GLO' | '9MOBILE' | null {
    const cleaned = phoneNumber.replace(/\D/g, '');
    const formatted = this.formatPhoneNumber(phoneNumber);
    
    // Nigerian mobile network prefixes
    const mtnPrefixes = ['0803', '0806', '0703', '0706', '0813', '0816', '0810', '0814', '0903', '0906', '0913'];
    const airtelPrefixes = ['0802', '0808', '0708', '0812', '0901', '0902', '0904', '0907'];
    const gloPrefixes = ['0805', '0807', '0811', '0815', '0705', '0905'];
    const nineMobilePrefixes = ['0809', '0817', '0818', '0908', '0909'];
    
    for (const prefix of mtnPrefixes) {
      if (formatted.startsWith(prefix)) {
        return 'MTN';
      }
    }
    
    for (const prefix of airtelPrefixes) {
      if (formatted.startsWith(prefix)) {
        return 'AIRTEL';
      }
    }
    
    for (const prefix of gloPrefixes) {
      if (formatted.startsWith(prefix)) {
        return 'GLO';
      }
    }
    
    for (const prefix of nineMobilePrefixes) {
      if (formatted.startsWith(prefix)) {
        return '9MOBILE';
      }
    }
    
    return null;
  }

  /**
   * Add delay to prevent rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
