import { Module } from "@nestjs/common";
import { ResponseTransformerService } from "./response-transformer.service";

@Module({
  providers: [ResponseTransformerService],
  exports: [ResponseTransformerService],
})
export class TransformerModule {}
