import { Injectable } from '@nestjs/common';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class EmailImagesService {
  constructor(private cloudinaryService: CloudinaryService) {}

  // Get optimized image URLs for email templates
  getEmailImageUrls() {
    return {
      logo: this.cloudinaryService.getOptimizedImageUrl('monzi/emails/fkeoczu7hzdhk9hwlzsm', 200),
      banner: this.cloudinaryService.getOptimizedImageUrl('monzi/emails/y4ndg158hw7nfpuzrxg1', 600),
      whatsapp: this.cloudinaryService.getOptimizedImageUrl('monzi/emails/monzi/emails/whatsapp', 24),
      instagram: this.cloudinaryService.getOptimizedImageUrl('monzi/emails/monzi/emails/instagram', 24),
      twitter: this.cloudinaryService.getOptimizedImageUrl('monzi/emails/monzi/emails/twitter', 24),
      monziLogo: this.cloudinaryService.getOptimizedImageUrl('monzi/emails/monzi/emails/monzi', 200),
    };
  }

  // Get specific image URL
  getImageUrl(publicId: string, width: number = 600): string {
    return this.cloudinaryService.getOptimizedImageUrl(publicId, width);
  }

  // Get logo URL
  getLogoUrl(): string {
    return this.cloudinaryService.getOptimizedImageUrl('monzi/emails/fkeoczu7hzdhk9hwlzsm', 200);
  }

  // Get banner URL
  getBannerUrl(): string {
    return this.cloudinaryService.getOptimizedImageUrl('monzi/emails/y4ndg158hw7nfpuzrxg1', 600);
  }

  // Get social media icon URLs
  getSocialIconsUrls() {
    return {
      whatsapp: this.cloudinaryService.getOptimizedImageUrl('monzi/emails/monzi/emails/whatsapp', 24),
      instagram: this.cloudinaryService.getOptimizedImageUrl('monzi/emails/monzi/emails/instagram', 24),
      twitter: this.cloudinaryService.getOptimizedImageUrl('monzi/emails/monzi/emails/twitter', 24),
    };
  }

  // Get Monzi logo URL (SVG version)
  getMonziLogoUrl(): string {
    return this.cloudinaryService.getOptimizedImageUrl('monzi/emails/monzi/emails/monzi', 200);
  }
} 