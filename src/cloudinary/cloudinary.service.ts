import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CloudinaryService {
  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'monzi',
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  async uploadBuffer(
    buffer: Buffer,
    folder: string = 'monzi',
    publicId?: string,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: publicId,
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        },
      );

      uploadStream.end(buffer);
    });
  }

  async uploadImageFromPath(
    filePath: string,
    folder: string = 'monzi',
  ): Promise<any> {
    return cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: 'auto',
    });
  }

  async deleteImage(publicId: string): Promise<any> {
    return cloudinary.uploader.destroy(publicId);
  }

  async getImageUrl(publicId: string, options: any = {}): Promise<string> {
    return cloudinary.url(publicId, options);
  }

  // Method to get optimized image URL for emails
  getOptimizedImageUrl(publicId: string, width: number = 600): string {
    return cloudinary.url(publicId, {
      width,
      quality: 'auto',
      fetch_format: 'auto',
    });
  }

  // Method to get thumbnail URL
  getThumbnailUrl(
    publicId: string,
    width: number = 150,
    height: number = 150,
  ): string {
    return cloudinary.url(publicId, {
      width,
      height,
      crop: 'fill',
      quality: 'auto',
    });
  }
}
