import { Module } from '@nestjs/common';
import { ApiKeyController } from './api-key.controller';
import { AuthModule } from '../auth/auth.module';
import { MetricsModule } from '../metrics/metrics.module';

@Module({
  imports: [AuthModule, MetricsModule],
  controllers: [ApiKeyController],
})
export class AdminModule {}
