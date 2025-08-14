import { Module } from "@nestjs/common";
import { AuthGuard } from "./auth.guard";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { ApiKeyService } from "./api-key.service";
import { UserService } from "./user.service";
import { AuthController } from "./auth.controller";
import { ConfigurationModule } from "../config/configuration.module";
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [ConfigurationModule, ConfigModule, DatabaseModule],
  controllers: [AuthController],
  providers: [AuthGuard, JwtAuthGuard, ApiKeyService, UserService],
  exports: [AuthGuard, JwtAuthGuard, ApiKeyService, UserService],
})
export class AuthModule {}
