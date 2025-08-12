import { Module } from "@nestjs/common";
import { AuthGuard } from "./auth.guard";
import { ConfigurationModule } from "../config/configuration.module";

@Module({
  imports: [ConfigurationModule],
  providers: [AuthGuard],
  exports: [AuthGuard],
})
export class AuthModule {}
