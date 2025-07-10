import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') return;

    // Get all model names from Prisma client
    const modelNames = Reflect.ownKeys(this).filter(
      (key): key is string =>
        typeof key === 'string' &&
        !key.startsWith('_') &&
        !key.startsWith('$') &&
        typeof this[key as keyof this] === 'object' &&
        this[key as keyof this] !== null &&
        'deleteMany' in (this[key as keyof this] as any),
    );

    return Promise.all(
      modelNames.map((modelName) =>
        (this[modelName as keyof this] as any).deleteMany(),
      ),
    );
  }
}
