const validateTimezone = (timezone) => {
  if (!timezone || typeof timezone !== "string") {
    return "UTC";
  }

  try {
    Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
    return timezone;
  } catch {
    return "UTC";
  }
};

const getShiftDate = (utcDate = new Date(), timezone = "UTC") => {
  const safeTimezone = validateTimezone(timezone);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: safeTimezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(utcDate);

  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const startOfShiftDate = (shiftDate) => new Date(`${shiftDate}T00:00:00.000Z`);

module.exports = {
  validateTimezone,
  getShiftDate,
  startOfShiftDate,
};
