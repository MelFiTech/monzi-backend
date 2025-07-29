import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ClientAuthGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const clientId = request.headers['x-client-id'];
    const authorization = request.headers['authorization'];

    // Check if required headers are present
    if (!clientId) {
      throw new UnauthorizedException('Missing x-client-id header');
    }

    if (!authorization) {
      throw new UnauthorizedException('Missing Authorization header');
    }

    // Validate Authorization header format
    if (!authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid Authorization header format. Expected: Bearer <client_secret>');
    }

    const clientSecret = authorization.substring(7); // Remove 'Bearer ' prefix

    // Validate client credentials against environment variables
    const validClientId = this.configService.get<string>('NYRA_CLIENT_ID');
    const validClientSecret = this.configService.get<string>('NYRA_CLIENT_SECRET');

    if (!validClientId || !validClientSecret) {
      throw new UnauthorizedException('Client authentication not configured');
    }

    if (clientId !== validClientId) {
      throw new UnauthorizedException('Invalid client ID');
    }

    if (clientSecret !== validClientSecret) {
      throw new UnauthorizedException('Invalid client secret');
    }

    // Store client info in request for later use
    request.clientId = clientId;
    request.clientSecret = clientSecret;

    return true;
  }
} 