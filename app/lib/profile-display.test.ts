import { describe, expect, it } from "vitest";

import {
  formatMemberSince,
  formatJoinedMonthYear,
  formatPlanLabel,
  profileHeadline,
  profileInitials,
  roleBadgeClass,
} from "./profile-display";

describe("formatMemberSince", () => {
  it("formats gateway EST timestamp", () => {
    expect(formatMemberSince("2026-05-17 16:59:29 EDT")).toBe("May 17, 2026");
  });
});

describe("formatJoinedMonthYear", () => {
  it("returns short joined label", () => {
    expect(formatJoinedMonthYear("2026-05-17 16:59:29 EDT")).toBe("Joined May 2026");
  });
});

describe("roleBadgeClass", () => {
  it("maps admin and user", () => {
    expect(roleBadgeClass("admin")).toContain("admin");
    expect(roleBadgeClass("user")).toContain("user");
  });
});

describe("profileHeadline", () => {
  it("joins team and department", () => {
    expect(
      profileHeadline({
        id: "1",
        team: "AI Platform",
        group: "Engineering",
      }),
    ).toBe("AI Platform · Engineering");
  });
});

describe("profileInitials", () => {
  it("uses display name", () => {
    expect(
      profileInitials({ id: "1", display_name: "Taixing Bi", username: "guest" }),
    ).toBe("TB");
  });
});

describe("formatPlanLabel", () => {
  it("capitalizes plan", () => {
    expect(formatPlanLabel("pro")).toBe("Pro plan");
  });
});
