const SWISS_TIME_ZONE = "Europe/Zurich";

const dateTimeFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: SWISS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

const getSwissParts = (dateValue) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;

  return Object.fromEntries(
    dateTimeFormatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
};

const toUtcWallTime = ({ year, month, day, hour = 0, minute = 0, second = 0 }) =>
  Date.UTC(year, month - 1, day, hour, minute, second);

export const swissDateTimeToIso = (dateValue, timeValue = "00:00") => {
  if (!dateValue || !timeValue) return null;

  const [year, month, day] = dateValue.split("-").map(Number);
  const [hour, minute] = timeValue.split(":").map(Number);
  if ([year, month, day, hour, minute].some((value) => Number.isNaN(value))) {
    return null;
  }

  const desiredWallTime = toUtcWallTime({ year, month, day, hour, minute });
  let utcTime = desiredWallTime;

  for (let index = 0; index < 3; index += 1) {
    const parts = getSwissParts(utcTime);
    if (!parts) break;

    const actualWallTime = toUtcWallTime({
      year: Number(parts.year),
      month: Number(parts.month),
      day: Number(parts.day),
      hour: Number(parts.hour),
      minute: Number(parts.minute),
      second: Number(parts.second),
    });

    const offset = actualWallTime - desiredWallTime;
    const nextUtcTime = desiredWallTime - offset;
    if (nextUtcTime === utcTime) break;
    utcTime = nextUtcTime;
  }

  return new Date(utcTime).toISOString();
};

export const swissDateTimeInputToIso = (value) => {
  if (!value) return null;
  const [dateValue, timeValue] = value.split("T");
  return swissDateTimeToIso(dateValue, timeValue);
};

export const toSwissDateTimeInputValue = (dateValue) => {
  const parts = getSwissParts(dateValue);
  if (!parts) return "";

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
};

export const getSwissTodayInputValue = () => {
  const parts = getSwissParts(new Date());
  if (!parts) return "";

  return `${parts.year}-${parts.month}-${parts.day}`;
};

export const getSwissDateKey = (dateValue) => {
  const parts = getSwissParts(dateValue);
  if (!parts) return "";

  return `${parts.year}-${parts.month}-${parts.day}`;
};

export const getSwissCalendarDayDiff = (dateValue, fromDateValue = new Date()) => {
  const targetKey = getSwissDateKey(dateValue);
  const fromKey = getSwissDateKey(fromDateValue);
  if (!targetKey || !fromKey) return 0;

  const [targetYear, targetMonth, targetDay] = targetKey.split("-").map(Number);
  const [fromYear, fromMonth, fromDay] = fromKey.split("-").map(Number);
  const targetTime = Date.UTC(targetYear, targetMonth - 1, targetDay);
  const fromTime = Date.UTC(fromYear, fromMonth - 1, fromDay);

  return Math.ceil((targetTime - fromTime) / (1000 * 60 * 60 * 24));
};

export const formatSwissDate = (dateValue, options) =>
  new Date(dateValue).toLocaleDateString("de-CH", {
    timeZone: SWISS_TIME_ZONE,
    ...options,
  });

export const formatSwissTime = (dateValue, options) =>
  new Date(dateValue).toLocaleTimeString("de-CH", {
    timeZone: SWISS_TIME_ZONE,
    ...options,
  });

export const formatSwissDateTime = (dateValue, options) =>
  new Date(dateValue).toLocaleString("de-CH", {
    timeZone: SWISS_TIME_ZONE,
    ...options,
  });
