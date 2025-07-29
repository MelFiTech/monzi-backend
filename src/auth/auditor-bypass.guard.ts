import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';

@Injectable()
export class AuditorBypassGuard extends JwtAuthGuard {
  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Check if request is from auditor service
    const userAgent = request.headers['user-agent'];
    const auditorHeader = request.headers['x-auditor-service'];

    // Allow bypass for auditor service requests
    if (
      auditorHeader === 'internal-system' ||
      (userAgent &&
        userAgent.includes('axios') &&
        (request.ip === '127.0.0.1' || request.ip === '::1'))
    ) {
      // Set a mock user for the request to satisfy role guards
      request.user = {
        id: 'auditor-system',
        email: 'auditor@system.internal',
        role: 'SUDO_ADMIN',
        isActive: true,
      };

      return true;
    }

    // Otherwise, use normal JWT authentication
    const result = await super.canActivate(context);
    return result as boolean;
  }
}
