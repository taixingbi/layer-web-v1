import { describe, expect, it } from "vitest";

import { forgotPasswordErrorMessage, messageFromGatewayBody } from "./gateway-error-message";

describe("messageFromGatewayBody", () => {
  it("reads string detail", () => {
    expect(messageFromGatewayBody({ detail: "email rate limit exceeded" })).toBe(
      "email rate limit exceeded",
    );
  });

  it("reads validation array detail", () => {
    expect(
      messageFromGatewayBody({
        detail: [{ type: "value_error", msg: "value is not a valid email address" }],
      }),
    ).toBe("value is not a valid email address");
  });
});

describe("forgotPasswordErrorMessage", () => {
  it("maps rate limit to friendly copy", () => {
    expect(
      forgotPasswordErrorMessage(400, { detail: "email rate limit exceeded" }),
    ).toBe("Too many reset emails were sent. Please wait about an hour before trying again.");
  });
});
