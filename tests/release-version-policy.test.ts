import { describe, expect, it } from "vitest";

// @ts-expect-error -- release policy scripts are plain ESM without declarations.
import * as releaseVersionPolicy from "../scripts/release-version-policy.mjs";

const {
  isPrivateAlpha,
  isPublicBeta,
  isPublishedReleaseVersion,
  isStableOneOrLater,
  isSupportedReleaseVersion,
  isValidReleaseVersion,
  parseReleaseVersion,
} = releaseVersionPolicy;

describe("release version policy", () => {
  it("classifies stable SemVer with build metadata as a stable release", () => {
    expect(parseReleaseVersion("1.2.3+build.7")).toMatchObject({
      major: 1,
      minor: 2,
      patch: 3,
      prerelease: null,
      build: "build.7",
    });
    expect(isStableOneOrLater("1.2.3+build.7")).toBe(true);
    expect(isPublishedReleaseVersion("1.2.3+build.7")).toBe(true);
    expect(isSupportedReleaseVersion("1.2.3+build.7")).toBe(true);
  });

  it("preserves supported alpha and beta channels with build metadata", () => {
    expect(isPrivateAlpha("0.1.0-alpha.1+ci.4")).toBe(true);
    expect(isPublicBeta("0.1.0-beta.1+ci.4")).toBe(true);
  });

  it("parses unsupported channels but leaves them unsupported", () => {
    expect(isValidReleaseVersion("1.0.0-rc.1+ci.4")).toBe(true);
    expect(isPublishedReleaseVersion("1.0.0-rc.1+ci.4")).toBe(true);
    expect(isSupportedReleaseVersion("1.0.0-rc.1+ci.4")).toBe(false);
  });

  it("rejects malformed or partial SemVer", () => {
    for (const value of [
      "1.0",
      "01.0.0",
      "1.0.0-01",
      "1.0.0+",
      "1.0.0+build..1",
    ]) {
      expect(isValidReleaseVersion(value)).toBe(false);
    }
  });
});
