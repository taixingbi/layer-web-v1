import { describe, expect, it } from "vitest";

import { hasProfilePatchFields, whitelistProfilePatch } from "./profile";

describe("whitelistProfilePatch", () => {
  it("keeps editable fields only", () => {
    expect(
      whitelistProfilePatch({
        username: "alice",
        display_name: "Alice",
        team: "ai-platform",
        group: "engineering",
        email: "hacker@evil.com",
        roles: ["admin"],
        plan: "enterprise",
      }),
    ).toEqual({
      username: "alice",
      display_name: "Alice",
      team: "ai-platform",
      group: "engineering",
    });
  });

  it("strips empty strings", () => {
    expect(whitelistProfilePatch({ username: "  ", display_name: "Bob" })).toEqual({
      display_name: "Bob",
    });
  });

  it("hasProfilePatchFields is false when nothing editable", () => {
    const patch = whitelistProfilePatch({ roles: ["admin"], plan: "free" });
    expect(hasProfilePatchFields(patch)).toBe(false);
  });
});
