import { describe, expect, it } from "vitest";

import { cicdEnvFromHostname } from "@/lib/admin/cicd-env";

describe("cicdEnvFromHostname", () => {
  it("maps public prod hosts to prod", () => {
    expect(cicdEnvFromHostname("taixingai.com")).toBe("prod");
    expect(cicdEnvFromHostname("www.taixingai.com")).toBe("prod");
  });

  it("maps dev host to dev", () => {
    expect(cicdEnvFromHostname("dev.taixingai.com")).toBe("dev");
  });

  it("defaults local and LAN hosts to dev", () => {
    expect(cicdEnvFromHostname("localhost")).toBe("dev");
    expect(cicdEnvFromHostname("192.168.86.179")).toBe("dev");
  });
});
