import { describe, it, expect } from "vitest";
import { isValidEmail, validatePassword, isNonEmpty } from "../validation";

describe("isValidEmail", () => {
  it("returns true for valid emails", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
    expect(isValidEmail("test.user+tag@domain.co")).toBe(true);
  });

  it("returns false for invalid emails", () => {
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail("notanemail")).toBe(false);
    expect(isValidEmail("@domain.com")).toBe(false);
    expect(isValidEmail("user@")).toBe(false);
    expect(isValidEmail("user @domain.com")).toBe(false);
  });
});

describe("validatePassword", () => {
  it("returns valid for a strong password", () => {
    const result = validatePassword("MyP@ssw0rd");
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects short passwords", () => {
    const result = validatePassword("Ab1");
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Password must be at least 8 characters long");
  });

  it("requires uppercase letter", () => {
    const result = validatePassword("lowercase1");
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Password must contain at least one uppercase letter");
  });

  it("requires lowercase letter", () => {
    const result = validatePassword("UPPERCASE1");
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Password must contain at least one lowercase letter");
  });

  it("requires a number", () => {
    const result = validatePassword("NoNumbersHere");
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Password must contain at least one number");
  });
});

describe("isNonEmpty", () => {
  it("returns true for non-empty strings", () => {
    expect(isNonEmpty("hello")).toBe(true);
  });

  it("returns false for empty or whitespace-only strings", () => {
    expect(isNonEmpty("")).toBe(false);
    expect(isNonEmpty("   ")).toBe(false);
  });
});
