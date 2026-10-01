import { describe, it, expect } from "vitest";
import {
  loginSchema,
  signupSchema,
  createProjectSchema,
  createApplicationSchema,
} from "../lib/validations";

describe("Validation Schemas", () => {
  describe("loginSchema", () => {
    it("validates correct login credentials", () => {
      const result = loginSchema.safeParse({
        email: "founder@startup.com",
        password: "securepassword123",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid email formats", () => {
      const result = loginSchema.safeParse({
        email: "invalid-email",
        password: "securepassword123",
      });
      expect(result.success).toBe(false);
    });

    it("rejects an empty password", () => {
      const result = loginSchema.safeParse({
        email: "valid@email.com",
        password: "",
      });
      expect(result.success).toBe(false);
    });

    it("accepts a legacy password that predates the stronger signup rules", () => {
      const result = loginSchema.safeParse({
        email: "valid@email.com",
        password: "abc123",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("signupSchema", () => {
    it("accepts candidate signup", () => {
      const result = signupSchema.safeParse({
        fullName: "Aarav Patel",
        email: "aarav@example.com",
        password: "Password123",
        role: "candidate",
        acceptTerms: "on",
      });
      expect(result.success).toBe(true);
    });

    it("refuses signup without accepting the Terms", () => {
      const result = signupSchema.safeParse({
        fullName: "Aarav Patel",
        email: "aarav@example.com",
        password: "Password123",
        role: "candidate",
      });
      expect(result.success).toBe(false);
    });

    it("accepts company signup", () => {
      const result = signupSchema.safeParse({
        fullName: "Priya Sharma",
        email: "priya@techstartup.in",
        password: "Password123",
        role: "company",
        acceptTerms: "on",
      });
      expect(result.success).toBe(true);
    });

    it.each([
      ["too short", "Pass1"],
      ["no uppercase", "password123"],
      ["no lowercase", "PASSWORD123"],
      ["no number or symbol", "PasswordOnly"],
    ])("rejects a password with %s", (_label, password) => {
      const result = signupSchema.safeParse({
        fullName: "Aarav Patel",
        email: "aarav@example.com",
        password,
        role: "candidate",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid roles like admin", () => {
      const result = signupSchema.safeParse({
        fullName: "Hacker",
        email: "hacker@example.com",
        password: "Password123",
        role: "admin",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("createProjectSchema", () => {
    it("validates complete project specification", () => {
      const result = createProjectSchema.safeParse({
        title: "Build REST API for Inventory System",
        category: "backend",
        description:
          "Develop a clean Node.js and PostgreSQL REST API for warehouse stock tracking.",
        problemStatement:
          "Current warehouse team faces discrepancy issues with spreadsheet logging.",
        context:
          "We are scaling our quick-commerce backend team and hiring a Junior Backend Engineer.",
        requirements: ["Node.js", "PostgreSQL", "JWT Auth"],
        deliverables: ["GitHub repo", "OpenAPI spec", "README"],
        acceptanceCriteria: ["CRUD endpoints functional", "Passes auth checks"],
        evaluationCriteria: ["Schema design", "Code organization", "Test coverage"],
        expectedHours: 8,
        paymentAmount: 5000,
        currency: "INR",
        applicationDeadline: "2026-10-01T00:00:00Z",
        projectDeadline: "2026-10-10T00:00:00Z",
      });
      expect(result.success).toBe(true);
    });

    it("enforces minimum payment requirement to protect candidate labor", () => {
      const result = createProjectSchema.safeParse({
        title: "Build REST API for Inventory System",
        category: "backend",
        description:
          "Develop a clean Node.js and PostgreSQL REST API for warehouse stock tracking.",
        problemStatement:
          "Current warehouse team faces discrepancy issues with spreadsheet logging.",
        context:
          "We are scaling our quick-commerce backend team and hiring a Junior Backend Engineer.",
        requirements: ["Node.js"],
        deliverables: ["GitHub repo"],
        acceptanceCriteria: ["CRUD endpoints functional"],
        evaluationCriteria: ["Schema design"],
        expectedHours: 8,
        paymentAmount: 500, // Below minimum 1000 INR
        currency: "INR",
        applicationDeadline: "2026-10-01T00:00:00Z",
        projectDeadline: "2026-10-10T00:00:00Z",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("createApplicationSchema", () => {
    it("validates application payload", () => {
      const result = createApplicationSchema.safeParse({
        projectId: "123e4567-e89b-12d3-a456-426614174000",
        coverMessage:
          "I have built REST APIs with Express and PostgreSQL, and I would love to tackle this challenge.",
        relevantExperience: "Built an ecommerce inventory backend project on GitHub.",
      });
      expect(result.success).toBe(true);
    });

    it("rejects non-UUID project IDs", () => {
      const result = createApplicationSchema.safeParse({
        projectId: "not-a-uuid",
        coverMessage:
          "I have built REST APIs with Express and PostgreSQL, and I would love to tackle this challenge.",
      });
      expect(result.success).toBe(false);
    });
  });
});
