import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request = require("supertest");
import { AppModule } from "../src/app.module";

describe("AppController (e2e)", () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it("/healthz (GET)", () => {
    return request(app.getHttpServer())
      .get("/healthz")
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty("status");
        expect(res.body).toHaveProperty("timestamp");
      });
  });

  it("/v1/models (GET) should require authentication", () => {
    return request(app.getHttpServer()).get("/v1/models").expect(401);
  });

  it("/v1/chat/completions (POST) should require authentication", () => {
    return request(app.getHttpServer())
      .post("/v1/chat/completions")
      .send({
        model: "test-model",
        messages: [{ role: "user", content: "Hello" }],
      })
      .expect(401);
  });
});
