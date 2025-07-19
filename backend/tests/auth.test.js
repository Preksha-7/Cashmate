import request from "supertest";
import app from "../src/app.js";

describe("Auth routes", () => {
  it("should register a user", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Test User",
      email: "testuser@example.com",
      password: "12345678",
    });
    expect(res.statusCode).toEqual(201);
    git;
  });
});
