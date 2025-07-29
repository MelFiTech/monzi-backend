import { SetMetadata } from '@nestjs/common';

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  CUSTOMER_REP = 'CUSTOMER_REP',
  DEVELOPER = 'DEVELOPER',
  SUDO_ADMIN = 'SUDO_ADMIN',
}

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
