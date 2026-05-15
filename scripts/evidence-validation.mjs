const isoDateTimePattern =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-](\d{2}):(\d{2}))$/u;

export function isIsoDateString(value) {
  const match = isoDateTimePattern.exec(value);
  if (!match) return false;
  const [
    ,
    yearText,
    monthText,
    dayText,
    hourText,
    minuteText,
    secondText,
    millisecondText = "0",
    ,
    offsetHourText,
    offsetMinuteText,
  ] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const millisecond = Number(millisecondText.padEnd(3, "0"));
  const offsetHour =
    typeof offsetHourText === "string" ? Number(offsetHourText) : 0;
  const offsetMinute =
    typeof offsetMinuteText === "string" ? Number(offsetMinuteText) : 0;

  if (
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    offsetHour > 23 ||
    offsetMinute > 59
  ) {
    return false;
  }

  const localDate = new Date(
    Date.UTC(year, month - 1, day, hour, minute, second, millisecond),
  );
  return (
    !Number.isNaN(Date.parse(value)) &&
    localDate.getUTCFullYear() === year &&
    localDate.getUTCMonth() === month - 1 &&
    localDate.getUTCDate() === day &&
    localDate.getUTCHours() === hour &&
    localDate.getUTCMinutes() === minute &&
    localDate.getUTCSeconds() === second &&
    localDate.getUTCMilliseconds() === millisecond
  );
}

export function isFutureIsoDateString(
  value,
  nowMs = Date.now(),
  clockSkewMs = 5 * 60 * 1000,
) {
  return isIsoDateString(value) && Date.parse(value) > nowMs + clockSkewMs;
}

export function isJsonObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isReservedEvidenceHostname(hostname) {
  const normalized = String(hostname).toLowerCase().replace(/\.$/u, "");
  if (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized === "example.com" ||
    normalized.endsWith(".example.com") ||
    normalized === "example.net" ||
    normalized.endsWith(".example.net") ||
    normalized === "example.org" ||
    normalized.endsWith(".example.org")
  ) {
    return true;
  }
  return ["example", "invalid", "test"].some(
    (suffix) => normalized === suffix || normalized.endsWith(`.${suffix}`),
  );
}

export function isPlaceholderRepositoryUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (!["github.com", "gitlab.com"].includes(url.hostname)) {
    return false;
  }
  const segments = url.pathname.split("/").filter(Boolean);
  const owner = segments[0]?.toLowerCase();
  const repo = segments[1]?.toLowerCase();
  return [owner, repo].some((segment) =>
    [
      "acme",
      "example",
      "owner",
      "repo",
      "my-org",
      "my-repo",
      "your-org",
      "your-repo",
      "your-organization",
      "your-repository",
    ].includes(segment ?? ""),
  );
}
