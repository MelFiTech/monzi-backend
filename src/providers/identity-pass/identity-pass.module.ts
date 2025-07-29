import { Module } from '@nestjs/common';
import { IdentityPassProvider } from './identity-pass.provider';

@Module({
  providers: [IdentityPassProvider],
  exports: [IdentityPassProvider],
})
export class IdentityPassModule {}
