const semverPattern =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/u;

export function parseReleaseVersion(version) {
  if (typeof version !== "string") return null;
  const match = semverPattern.exec(version);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ?? null,
    build: match[5] ?? null,
  };
}

export function isValidReleaseVersion(version) {
  return parseReleaseVersion(version) !== null;
}

export function isPrivateAlpha(version) {
  const parsed = parseReleaseVersion(version);
  return (
    parsed !== null &&
    parsed.prerelease !== null &&
    /^alpha[.-].+$/u.test(parsed.prerelease)
  );
}

export function isPublicBeta(version) {
  const parsed = parseReleaseVersion(version);
  return (
    parsed !== null &&
    parsed.prerelease !== null &&
    /^beta[.-].+$/u.test(parsed.prerelease)
  );
}

export function isStableOneOrLater(version) {
  const parsed = parseReleaseVersion(version);
  return parsed !== null && parsed.prerelease === null && parsed.major >= 1;
}

export function isSupportedReleaseVersion(version) {
  return (
    isPrivateAlpha(version) ||
    isPublicBeta(version) ||
    isStableOneOrLater(version)
  );
}

export function isBetaPackageTag(value) {
  return value === "beta" || isPublicBeta(value);
}

export function isPublishedReleaseVersion(version) {
  const parsed = parseReleaseVersion(version);
  return (
    parsed !== null &&
    (parsed.major !== 0 ||
      parsed.minor !== 0 ||
      parsed.patch !== 0 ||
      parsed.prerelease !== null)
  );
}

export function isPlaceholderPrerelease(version) {
  const parsed = parseReleaseVersion(version);
  return (
    parsed !== null &&
    parsed.major === 0 &&
    parsed.minor === 0 &&
    parsed.patch === 0 &&
    parsed.prerelease !== null
  );
}

export function isPlaceholderReleaseVersion(version) {
  const parsed = parseReleaseVersion(version);
  return (
    parsed !== null &&
    parsed.major === 0 &&
    parsed.minor === 0 &&
    parsed.patch === 0
  );
}
