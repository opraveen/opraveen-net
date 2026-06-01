const MS = {
  second: 1000,
  minute: 60 * 1000,
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  sol: 88775.244 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30.436875 * 24 * 60 * 60 * 1000,
  year: 365.2425 * 24 * 60 * 60 * 1000,
};

const accents = {
  years: "#1a9aa2",
  months: "#e85d4f",
  weeks: "#efb63e",
  days: "#4b9c67",
  sols: "#c56b45",
  hours: "#2d6cdf",
  minutes: "#9d4b78",
  seconds: "#17202a",
  together: "#08747f",
};

const eventColors = ["#1a9aa2", "#e85d4f", "#efb63e", "#4b9c67", "#9d4b78"];

const granularityModes = [
  { label: "Big moments" },
  { label: "Balanced" },
  { label: "Every excuse" },
];

const milestoneDefs = [
  {
    unit: "years",
    color: accents.years,
    priority: 6,
    ms: MS.year,
    dateForEvent: (date, value) => addYears(date, value),
  },
  {
    unit: "months",
    color: accents.months,
    priority: 5,
    ms: MS.month,
    dateForEvent: (date, value) => addMonths(date, value),
  },
  {
    unit: "days",
    color: accents.days,
    priority: 4,
    ms: MS.day,
    dateForEvent: (date, value) => addDays(date, value),
  },
  {
    unit: "sols",
    color: accents.sols,
    priority: 3.8,
    ms: MS.sol,
    dateForEvent: (date, value) => new Date(date.getTime() + value * MS.sol),
  },
  {
    unit: "hours",
    color: accents.hours,
    priority: 3.5,
    ms: MS.hour,
    dateForEvent: (date, value) => new Date(date.getTime() + value * MS.hour),
  },
  {
    unit: "weeks",
    color: accents.weeks,
    priority: 3,
    ms: MS.week,
    dateForEvent: (date, value) => addDays(date, value * 7),
  },
  {
    unit: "minutes",
    color: accents.minutes,
    priority: 2,
    ms: MS.minute,
    dateForEvent: (date, value) => new Date(date.getTime() + value * MS.minute),
  },
  {
    unit: "seconds",
    color: accents.seconds,
    priority: 1,
    ms: MS.second,
    dateForEvent: (date, value) => new Date(date.getTime() + value * MS.second),
  },
];

const form = document.querySelector("#event-form");
const introHeadline = document.querySelector("#intro-headline");
const nameInput = document.querySelector("#event-name");
const dateInput = document.querySelector("#event-date");
const timeInput = document.querySelector("#event-time");
const timeZoneSelect = document.querySelector("#time-zone");
const eventList = document.querySelector("#event-list");
const selectionSummary = document.querySelector("#selection-summary");
const selectAllButton = document.querySelector("#select-all");
const clearSelectionButton = document.querySelector("#clear-selection");
const shareButton = document.querySelector("#share-setup");
const sharePanel = document.querySelector("#share-panel");
const shareUrlInput = document.querySelector("#share-url");
const copyShareButton = document.querySelector("#copy-share");
const shareStatus = document.querySelector("#share-status");
const feedbackOpenButton = document.querySelector("#feedback-open");
const feedbackDialog = document.querySelector("#feedback-dialog");
const feedbackCloseButton = document.querySelector("#feedback-close");
const feedbackForm = document.querySelector("#feedback-form");
const feedbackMessage = document.querySelector("#feedback-message");
const feedbackStatus = document.querySelector("#feedback-status");
const headline = document.querySelector("#headline");
const nextToast = document.querySelector("#next-toast");
const metricsGrid = document.querySelector("#metrics-grid");
const timeline = document.querySelector("#timeline");
const timelineRange = document.querySelector("#timeline-range");
const granularityInput = document.querySelector("#milestone-granularity");
const granularityLabel = document.querySelector("#granularity-label");

let events = [];
let nextId = 1;
let ticker = null;
let nextFullRefreshAt = null;
let currentTimelineItems = [];

const commonTimeZones = [
  "UTC",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "Europe/London",
  "Europe/Paris",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

const zonedPartsFormatters = new Map();
let selectedTimeZone = detectTimeZone();

const formatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
});

const compactWholeFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
  notation: "compact",
});

const compactOneFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 1,
  notation: "compact",
});

let dateFormatter = makeDateFormatter(selectedTimeZone);
let dateTimeFormatter = makeDateTimeFormatter(selectedTimeZone);

const unitInterestBonus = {
  years: 600,
  months: 500,
  days: 460,
  sols: 430,
  hours: 360,
  weeks: 340,
  minutes: 210,
  seconds: 120,
};

const introHeadlines = [
  "10,000 days deserve a cake!",
  "1,000 sols deserve a cosmic cake!",
  "1B seconds deserve a huge cake!",
  "100 months deserve a treat!",
  "1,000 weeks deserve a party!",
  "Every date has a party hiding in it.",
  "Your next excuse to celebrate starts here.",
  "Tiny milestones. Big cake energy.",
  "A billion seconds calls for candles.",
  "Ordinary dates can throw surprise parties.",
  "Find the confetti hiding in your calendar.",
  "Some Tuesdays secretly deserve cake.",
  "Every milestone wants a little sparkle.",
];

function setRandomIntroHeadline() {
  if (!introHeadline) {
    return;
  }

  const index = Math.floor(Math.random() * introHeadlines.length);
  introHeadline.textContent = introHeadlines[index];
}

function detectTimeZone() {
  const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return isValidTimeZone(detected) ? detected : "UTC";
}

function isValidTimeZone(timeZone) {
  if (!timeZone || typeof timeZone !== "string") {
    return false;
  }

  try {
    new Intl.DateTimeFormat(undefined, { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function makeDateFormatter(timeZone) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function makeDateTimeFormatter(timeZone) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function getSupportedTimeZones() {
  const supported = typeof Intl.supportedValuesOf === "function"
    ? Intl.supportedValuesOf("timeZone")
    : [];
  return [...new Set([...commonTimeZones, selectedTimeZone, ...supported])]
    .filter(isValidTimeZone)
    .sort((a, b) => a.localeCompare(b));
}

function timeZoneOffsetLabel(timeZone) {
  try {
    const part = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "shortOffset",
    }).formatToParts(new Date()).find((item) => item.type === "timeZoneName");

    return part?.value.replace("GMT", "UTC") || "";
  } catch {
    return "";
  }
}

function formatTimeZoneLabel(timeZone) {
  const name = timeZone
    .replaceAll("_", " ")
    .replaceAll("/", " / ");
  const offset = timeZoneOffsetLabel(timeZone);

  return offset ? `${name} (${offset})` : name;
}

function populateTimeZoneSelect() {
  if (!timeZoneSelect) {
    return;
  }

  timeZoneSelect.innerHTML = getSupportedTimeZones()
    .map((timeZone) => `
      <option value="${escapeHtml(timeZone)}">${escapeHtml(formatTimeZoneLabel(timeZone))}</option>
    `)
    .join("");
  timeZoneSelect.value = selectedTimeZone;
  timeZoneSelect.title = selectedTimeZone;
}

function zonedPartsFormatterFor(timeZone = selectedTimeZone) {
  if (!zonedPartsFormatters.has(timeZone)) {
    zonedPartsFormatters.set(timeZone, new Intl.DateTimeFormat("en-US", {
      timeZone,
      calendar: "gregory",
      numberingSystem: "latn",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }));
  }

  return zonedPartsFormatters.get(timeZone);
}

function zonedParts(date, timeZone = selectedTimeZone) {
  const values = {};

  zonedPartsFormatterFor(timeZone).formatToParts(date).forEach((part) => {
    if (part.type !== "literal") {
      values[part.type] = Number(part.value);
    }
  });

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hours: values.hour === 24 ? 0 : values.hour,
    minutes: values.minute,
    seconds: values.second,
  };
}

function utcDateFromParts(year, monthIndex, day, hours = 0, minutes = 0, seconds = 0, ms = 0) {
  const date = new Date(0);

  date.setUTCFullYear(year, monthIndex, day);
  date.setUTCHours(hours, minutes, seconds, ms);
  return date;
}

function utcTimestampFromParts(year, monthIndex, day, hours = 0, minutes = 0, seconds = 0, ms = 0) {
  return utcDateFromParts(year, monthIndex, day, hours, minutes, seconds, ms).getTime();
}

function daysInMonth(year, month) {
  return utcDateFromParts(year, month, 0).getUTCDate();
}

function dateFromZonedValues(
  year,
  month,
  day,
  hours = 0,
  minutes = 0,
  seconds = 0,
  ms = 0,
  timeZone = selectedTimeZone,
) {
  const target = utcTimestampFromParts(year, month - 1, day, hours, minutes, seconds, ms);
  let date = new Date(target);

  for (let index = 0; index < 4; index += 1) {
    const parts = zonedParts(date, timeZone);
    const actual = utcTimestampFromParts(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hours,
      parts.minutes,
      parts.seconds,
      ms,
    );
    const delta = target - actual;

    if (delta === 0) {
      return date;
    }

    date = new Date(date.getTime() + delta);
  }

  return date;
}

function normalizeYearMonth(year, monthIndex) {
  const date = utcDateFromParts(year, monthIndex, 1);

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
  };
}

function updateDateFormatters() {
  dateFormatter = makeDateFormatter(selectedTimeZone);
  dateTimeFormatter = makeDateTimeFormatter(selectedTimeZone);
}

function rebuildEventDatesForTimeZone() {
  events = events.map((event) => {
    const dateValue = event.dateValue || toDateInputValue(event.date);
    const timeValue = event.hasTime ? event.timeValue || toTimeInputValue(event.date) : "";
    const date = dateFromParts(dateValue, timeValue);

    return {
      ...event,
      date,
      dateValue,
      timeValue,
    };
  });
}

function applyTimeZone(timeZone, options = {}) {
  if (!isValidTimeZone(timeZone)) {
    return false;
  }

  selectedTimeZone = timeZone;
  updateDateFormatters();

  if (timeZoneSelect) {
    if (![...timeZoneSelect.options].some((option) => option.value === timeZone)) {
      timeZoneSelect.add(new Option(formatTimeZoneLabel(timeZone), timeZone));
    }

    timeZoneSelect.value = timeZone;
    timeZoneSelect.title = timeZone;
  }

  if (options.rebuildEvents !== false) {
    rebuildEventDatesForTimeZone();
  }

  return true;
}

function toDateInputValue(date, timeZone = selectedTimeZone) {
  const parts = zonedParts(date, timeZone);
  const year = String(parts.year).padStart(4, "0");
  const month = String(parts.month).padStart(2, "0");
  const day = String(parts.day).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toTimeInputValue(date, timeZone = selectedTimeZone) {
  const parts = zonedParts(date, timeZone);
  const hours = String(parts.hours).padStart(2, "0");
  const minutes = String(parts.minutes).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function dateFromParts(dateValue, timeValue = "", timeZone = selectedTimeZone) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const [hours = 0, minutes = 0] = timeValue
    ? timeValue.split(":").map(Number)
    : [];

  if (![year, month, day, hours, minutes].every(Number.isFinite)) {
    return new Date(NaN);
  }

  return dateFromZonedValues(year, month, day, hours, minutes, 0, 0, timeZone);
}

function parseSelection() {
  if (!dateInput.value) {
    return null;
  }

  return dateFromParts(dateInput.value, timeInput.value);
}

function formatNumber(value, digits = 0) {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function formatWhole(value) {
  return formatter.format(Math.round(value));
}

function formatCompactWhole(value) {
  return compactWholeFormatter.format(Math.round(value));
}

function formatCompactOne(value) {
  return compactOneFormatter.format(Math.round(value));
}

function formatMilestoneValue(value, unit) {
  if (unit === "seconds" || unit === "minutes" || unit === "hours") {
    return formatCompactOne(value);
  }

  if (unit === "days" && value >= 10000) {
    return formatCompactWhole(value);
  }

  if (unit === "sols" && value >= 10000) {
    return formatCompactWhole(value);
  }

  if (unit === "months" && value >= 1000) {
    return formatCompactOne(value);
  }

  return formatWhole(value);
}

function formatUnit(value, unit) {
  return Math.round(value) === 1 ? unit.replace(/s$/, "") : unit;
}

function formatMilestoneTitle(value, unit) {
  return `${formatMilestoneValue(value, unit)} ${formatUnit(value, unit)}`;
}

function shortSourceName(value) {
  if (value === "Together") {
    return value;
  }

  return value
    .replace(/\b(birthday|anniversary|birthdate|date|day)\b/gi, "")
    .trim()
    .split(/\s+/)[0] || value;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeIcsText(value) {
  return String(value)
    .replaceAll("\\", "\\\\")
    .replaceAll("\n", "\\n")
    .replaceAll(",", "\\,")
    .replaceAll(";", "\\;");
}

function foldIcsLine(line) {
  const chunks = [];
  let remaining = line;

  while (remaining.length > 72) {
    chunks.push(remaining.slice(0, 72));
    remaining = ` ${remaining.slice(72)}`;
  }

  chunks.push(remaining);
  return chunks.join("\r\n");
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "milestone";
}

function formatIcsDate(date) {
  const parts = zonedParts(date);
  const year = String(parts.year).padStart(4, "0");
  const month = String(parts.month).padStart(2, "0");
  const day = String(parts.day).padStart(2, "0");

  return `${year}${month}${day}`;
}

function formatIcsDateTime(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function isTimedCalendarMilestone(item) {
  return ["sols", "hours", "minutes", "seconds"].includes(item.unit);
}

function calendarSummaryFor(item) {
  return `Celebrate: ${sourceLabelFor(item)} - ${titleWithAge(item)}`;
}

function calendarFilenameFor(item) {
  return `${slugify(calendarSummaryFor(item))}.ics`;
}

function calendarDescriptionFor(item) {
  const related = item.related?.length
    ? `Also on this day: ${item.related
        .map((relatedItem) => `${sourceLabelFor(relatedItem)} - ${relatedItem.displayTitle}`)
        .join(", ")}.`
    : "";

  return [
    `${titleWithAge(item)} for ${sourceLabelFor(item)}.`,
    `Milestone moment: ${dateTimeFormatter.format(item.date)}.`,
    related,
    "Made with Celebrate: https://www.opraveen.net/celebrate/",
  ].filter(Boolean).join("\n");
}

function calendarEventFor(item) {
  const now = new Date();
  const summary = calendarSummaryFor(item);
  const description = calendarDescriptionFor(item);
  const uid = `${slugify(`${summary}-${item.date.getTime()}`)}@celebrate.opraveen.net`;
  const timed = isTimedCalendarMilestone(item);
  const start = item.date;
  const end = timed ? new Date(start.getTime() + 30 * MS.minute) : addDays(start, 1);
  const dateLines = timed
    ? [
        `DTSTART:${formatIcsDateTime(start)}`,
        `DTEND:${formatIcsDateTime(end)}`,
      ]
    : [
        `DTSTART;VALUE=DATE:${formatIcsDate(start)}`,
        `DTEND;VALUE=DATE:${formatIcsDate(end)}`,
      ];
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//opraveen.net//Celebrate//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatIcsDateTime(now)}`,
    ...dateLines,
    `SUMMARY:${escapeIcsText(summary)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    "URL:https://www.opraveen.net/celebrate/",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return `${lines.map(foldIcsLine).join("\r\n")}\r\n`;
}

function milestonePartyLine(item) {
  const lines = {
    years: "Classic big-deal moment.",
    months: "Monthly confetti checkpoint.",
    weeks: "A neat weekly reason to cheer.",
    days: "Whole-day party math unlocked.",
    sols: "Mars-day party math unlocked.",
    hours: "A precise little celebration.",
    minutes: "Tiny time, huge excuse.",
    seconds: "Blink and it becomes a party.",
  };

  return lines[item.unit] || "Reason to celebrate unlocked.";
}

function titleWithAge(item) {
  return item.ageLabel ? `${item.displayTitle} (${item.ageLabel})` : item.displayTitle;
}

function milestoneDetailFor(item) {
  const source = sourceLabelFor(item);
  const moment = dateTimeFormatter.format(item.date);
  const age = item.ageLabel ? ` (${item.ageLabel})` : "";

  if (item.sourceType === "combined") {
    return `Your selected dates hit ${item.displayTitle}${age} together on ${moment}.`;
  }

  return `${source} hits ${item.displayTitle}${age} on ${moment}.`;
}

function downloadCalendarEvent(item) {
  const blob = new Blob([calendarEventFor(item)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = calendarFilenameFor(item);
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function preciseCalendarParts(from, to) {
  let start = new Date(from);
  let end = new Date(to);

  if (start > end) {
    [start, end] = [end, start];
  }

  const startParts = zonedParts(start);
  const endParts = zonedParts(end);
  let years = endParts.year - startParts.year;
  let months = endParts.month - startParts.month;
  let days = endParts.day - startParts.day;

  if (days < 0) {
    months -= 1;
    days += daysInMonth(endParts.year, endParts.month - 1);
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return { years, months, days };
}

function approximateParts(ms) {
  let remaining = Math.max(0, ms);
  const years = Math.floor(remaining / MS.year);
  remaining -= years * MS.year;
  const months = Math.floor(remaining / MS.month);
  remaining -= months * MS.month;
  const days = Math.floor(remaining / MS.day);

  return { years, months, days };
}

function addDays(date, days) {
  const parts = zonedParts(date);

  return dateFromZonedValues(
    parts.year,
    parts.month,
    parts.day + days,
    parts.hours,
    parts.minutes,
    parts.seconds,
  );
}

function addMonths(date, months) {
  const parts = zonedParts(date);
  const target = normalizeYearMonth(parts.year, parts.month - 1 + months);
  const day = Math.min(parts.day, daysInMonth(target.year, target.month));

  return dateFromZonedValues(
    target.year,
    target.month,
    day,
    parts.hours,
    parts.minutes,
    parts.seconds,
  );
}

function addYears(date, years) {
  return addMonths(date, years * 12);
}

function milestoneMode() {
  const value = Number(granularityInput.value || 1);
  return Math.min(granularityModes.length - 1, Math.max(0, value));
}

function nextMultiples(current, step, count = 8) {
  const values = [];
  let cursor = Math.ceil((current + Number.EPSILON) / step) * step;

  if (cursor <= current) {
    cursor += step;
  }

  while (values.length < count) {
    values.push(cursor);
    cursor += step;
  }

  return values;
}

function uniqueSorted(values) {
  return [...new Set(values)]
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);
}

function calendarKey(date) {
  return toDateInputValue(date);
}

function magnitudeBonus(item) {
  const rounded = Math.round(item.value);

  if (item.unit === "years") {
    if (rounded >= 10 && rounded % 10 === 0) return 190;
    if (rounded >= 10 && rounded % 5 === 0) return 140;
    return rounded < 10 ? 110 : 60;
  }

  if (item.unit === "months") {
    return rounded % 100 === 0 ? 120 : 40;
  }

  if (item.unit === "weeks") {
    return rounded % 1000 === 0 ? 110 : rounded % 100 === 0 ? 70 : 30;
  }

  if (item.unit === "days") {
    return rounded % 10000 === 0 ? 130 : rounded % 1000 === 0 ? 95 : 45;
  }

  if (item.unit === "sols") {
    return rounded % 10000 === 0 ? 120 : rounded % 1000 === 0 ? 90 : 42;
  }

  if (item.unit === "hours") {
    return rounded % 1000000 === 0 ? 155 : rounded % 100000 === 0 ? 120 : 55;
  }

  if (item.unit === "minutes") {
    return rounded % 10000000 === 0 ? 145 : rounded % 1000000 === 0 ? 115 : 45;
  }

  if (item.unit === "seconds") {
    return rounded % 1000000000 === 0 ? 250 : rounded % 100000000 === 0 ? 145 : 90;
  }

  return 0;
}

function milestoneInterestScore(item) {
  const sourceBonus = item.sourceType === "combined" ? 45 : 0;
  return unitInterestBonus[item.unit] + magnitudeBonus(item) + sourceBonus;
}

function sourceLabelFor(item) {
  return item.sourceType === "combined" ? "Together" : shortSourceName(item.sourceName);
}

function groupSameDayMilestones(items, maxItems) {
  const groups = new Map();

  for (const item of items) {
    const key = calendarKey(item.date);
    const group = groups.get(key) || [];
    group.push(item);
    groups.set(key, group);
  }

  return Array.from(groups.values())
    .map((group) => {
      const sorted = group.sort((a, b) => {
        const scoreSort = milestoneInterestScore(b) - milestoneInterestScore(a);
        return scoreSort || b.priority - a.priority || a.date - b.date;
      });
      const [primary, ...related] = sorted;

      return {
        ...primary,
        related,
      };
    })
    .sort((a, b) => {
      const dateSort = a.date - b.date;
      return dateSort || milestoneInterestScore(b) - milestoneInterestScore(a);
    })
    .slice(0, maxItems);
}

function milestoneValues(unit, current, elapsedMs, mode) {
  const years = elapsedMs / MS.year;
  const isKid = years < 10;
  const isTiny = years < 1;

  if (unit === "years") {
    if (isKid && mode > 0) {
      return uniqueSorted([
        ...nextMultiples(current, 1, 10),
        ...nextMultiples(Math.max(current, 10), mode === 2 ? 5 : 10, 4),
      ]).slice(0, 10);
    }

    const step = mode === 0 ? 10 : mode === 1 ? 5 : years < 20 ? 1 : 5;
    return nextMultiples(current, step, 10);
  }

  if (unit === "months") {
    const step = mode === 0 ? 200 : mode === 1 ? 100 : isKid ? 50 : 100;
    return nextMultiples(current, step, 8);
  }

  if (unit === "weeks") {
    const step = mode === 0 ? 1000 : mode === 1 ? 1000 : 100;
    return nextMultiples(current, step, 8);
  }

  if (unit === "days") {
    const step = mode === 0 ? 5000 : mode === 1 ? 1000 : isKid ? 500 : 1000;
    return nextMultiples(current, step, 8);
  }

  if (unit === "sols") {
    const step = mode === 0 ? 5000 : mode === 1 ? 1000 : isKid ? 500 : 1000;
    return nextMultiples(current, step, 8);
  }

  if (unit === "hours") {
    const step = mode === 0 ? 500000 : mode === 1 ? 100000 : 50000;
    return nextMultiples(current, step, 8);
  }

  if (unit === "minutes") {
    const step = isTiny
      ? mode === 0 ? 1000000 : mode === 1 ? 100000 : 10000
      : mode === 0 ? 10000000 : mode === 1 ? 1000000 : 1000000;
    return nextMultiples(current, step, 8);
  }

  if (unit === "seconds") {
    const step = isTiny
      ? mode === 0 ? 100000000 : mode === 1 ? 10000000 : 1000000
      : mode === 0 ? 1000000000 : mode === 1 ? 500000000 : 100000000;
    return nextMultiples(current, step, 8);
  }

  return [];
}

function makeEvent(name, date, options = {}) {
  const id = nextId++;
  const hasTime = Boolean(options.hasTime);

  return {
    color: eventColors[(id - 1) % eventColors.length],
    date,
    dateValue: options.dateValue || toDateInputValue(date),
    hasTime,
    id,
    name: name.trim() || `Date ${id}`,
    selected: options.selected ?? true,
    timeValue: hasTime ? options.timeValue || toTimeInputValue(date) : "",
  };
}

function elapsedMsFor(event, now) {
  return Math.max(0, now - event.date);
}

function selectedEvents() {
  return events.filter((event) => event.selected);
}

function encodeSharePayload(payload) {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

function decodeSharePayload(value) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

  return JSON.parse(new TextDecoder().decode(bytes));
}

function sharePayload() {
  return {
    v: 2,
    mode: milestoneMode(),
    tz: selectedTimeZone,
    events: events.map((event) => ({
      d: event.dateValue || toDateInputValue(event.date),
      n: event.name,
      s: event.selected,
      t: event.hasTime ? event.timeValue || toTimeInputValue(event.date) : "",
    })),
  };
}

function buildShareUrl() {
  const url = new URL(window.location.href);
  url.hash = `setup=${encodeSharePayload(sharePayload())}`;
  return url.toString();
}

function loadSharedSetup() {
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  const payloadValue = new URLSearchParams(hash).get("setup");

  if (!payloadValue) {
    return false;
  }

  try {
    const payload = decodeSharePayload(payloadValue);
    const sharedEvents = Array.isArray(payload.events) ? payload.events : [];
    const sharedMode = Number(payload.mode);
    const sharedTimeZone = isValidTimeZone(payload.tz) ? payload.tz : selectedTimeZone;

    applyTimeZone(sharedTimeZone, { rebuildEvents: false });

    nextId = 1;
    events = sharedEvents
      .slice(0, 20)
      .map((item) => {
        const dateValue = typeof item.d === "string" ? item.d : "";
        const timeValue = typeof item.t === "string" ? item.t : "";
        const date = dateFromParts(dateValue, timeValue);

        if (!dateValue || Number.isNaN(date.getTime())) {
          return null;
        }

        return makeEvent(String(item.n || "").slice(0, 36), date, {
          dateValue,
          hasTime: Boolean(timeValue),
          selected: item.s !== false,
          timeValue,
        });
      })
      .filter(Boolean);

    if (Number.isFinite(sharedMode)) {
      granularityInput.value = String(Math.min(granularityModes.length - 1, Math.max(0, sharedMode)));
    }

    return true;
  } catch (error) {
    console.warn("Could not read shared Celebrate setup.", error);
    return false;
  }
}

function refreshSharePanel() {
  shareButton.disabled = !events.length;

  if (!events.length) {
    sharePanel.hidden = true;
    shareUrlInput.value = "";
    shareStatus.textContent = "";
    return;
  }

  if (!sharePanel.hidden) {
    const value = buildShareUrl();

    if (shareUrlInput.value !== value) {
      shareUrlInput.value = value;
      shareStatus.textContent = "";
    }
  }
}

function combinedElapsedMs(group, now) {
  return group.reduce((total, event) => total + elapsedMsFor(event, now), 0);
}

function activeEventCount(group, now) {
  return group.filter((event) => event.date <= now).length;
}

function nextSelectedEventStart(group, now) {
  return group
    .filter((event) => event.date > now)
    .map((event) => event.date)
    .sort((a, b) => a - b)[0] || null;
}

function firstDate(...dates) {
  return dates
    .filter(Boolean)
    .sort((a, b) => a - b)[0] || null;
}

function dateForCombinedTarget(group, now, targetMs) {
  const starts = group
    .map((event) => event.date.getTime())
    .sort((a, b) => a - b);
  let time = now.getTime();
  let total = starts.reduce((sum, start) => sum + Math.max(0, time - start), 0);

  if (!starts.length || targetMs <= total) {
    return new Date(time);
  }

  let nextStartIndex = starts.findIndex((start) => start > time);
  if (nextStartIndex === -1) {
    nextStartIndex = starts.length;
  }

  let activeCount = nextStartIndex;

  while (total < targetMs) {
    const nextStart = nextStartIndex < starts.length
      ? starts[nextStartIndex]
      : Infinity;

    if (activeCount === 0) {
      if (!Number.isFinite(nextStart)) {
        return null;
      }

      time = nextStart;
      while (starts[nextStartIndex] <= time) {
        activeCount += 1;
        nextStartIndex += 1;
      }
      continue;
    }

    const needed = targetMs - total;
    const spanToNextStart = nextStart - time;
    const gainToNextStart = Number.isFinite(spanToNextStart)
      ? activeCount * spanToNextStart
      : Infinity;

    if (needed <= gainToNextStart) {
      return new Date(time + needed / activeCount);
    }

    total += gainToNextStart;
    time = nextStart;

    while (starts[nextStartIndex] <= time) {
      activeCount += 1;
      nextStartIndex += 1;
    }
  }

  return new Date(time);
}

function futureMilestonesForEvent(event, now) {
  const elapsedMs = elapsedMsFor(event, now);
  const mode = milestoneMode();

  return milestoneDefs.flatMap((def) =>
    milestoneValues(def.unit, elapsedMs / def.ms, elapsedMs, mode)
      .map((value) => {
        const date = def.dateForEvent(event.date, value);
        const ageYears = preciseCalendarParts(event.date, date).years;

        return {
          ageLabel: `${ageYears}Y`,
          color: def.color,
          date,
          displayTitle: formatMilestoneTitle(value, def.unit),
          priority: def.priority,
          sourceName: event.name,
          sourceType: "date",
          unit: def.unit,
          value,
        };
      })
      .filter((item) => item.date > now)
      .slice(0, 4),
  );
}

function futureMilestonesForGroup(group, now) {
  if (group.length < 2) {
    return [];
  }

  const totalElapsed = combinedElapsedMs(group, now);
  const mode = milestoneMode();

  return milestoneDefs.flatMap((def) =>
    milestoneValues(def.unit, totalElapsed / def.ms, totalElapsed, mode)
      .map((value) => {
        const targetMs = value * def.ms;
        const date = dateForCombinedTarget(group, now, targetMs);

        return {
          ageLabel: `${formatCompactWhole(targetMs / MS.year)}Y`,
          color: def.color,
          date,
          displayTitle: formatMilestoneTitle(value, def.unit),
          priority: def.priority + 0.5,
          sourceName: "Together",
          sourceType: "combined",
          unit: def.unit,
          value,
        };
      })
      .filter((item) => item.date && item.date > now && Number.isFinite(item.date.getTime()))
      .slice(0, 5),
  );
}

function futureMilestones(group, now) {
  const maxItems = [8, 10, 12][milestoneMode()];
  const byDate = (a, b) => {
    const dateSort = a.date - b.date;
    return dateSort || b.priority - a.priority;
  };
  const combinedItems = futureMilestonesForGroup(group, now).sort(byDate);
  const eventItems = group.flatMap((event) => futureMilestonesForEvent(event, now)).sort(byDate);
  const combinedYearMoments = combinedItems
    .filter((item) => item.unit === "years")
    .slice(0, 2);
  const combinedHourMoments = combinedItems
    .filter((item) => item.unit === "hours")
    .slice(0, 2);
  const eventHourMoments = eventItems
    .filter((item) => item.unit === "hours")
    .slice(0, 2);
  const featured = [
    ...combinedItems.slice(0, 4),
    ...combinedYearMoments,
    ...combinedHourMoments,
    ...eventItems.slice(0, 8),
    ...eventHourMoments,
  ];
  const filler = [...combinedItems, ...eventItems].sort(byDate);
  const unique = new Map();
  const add = (item) => {
    const key = `${toDateInputValue(item.date)}-${item.displayTitle}-${item.sourceName}`;
    if (!unique.has(key)) {
      unique.set(key, item);
    }
  };

  featured.forEach(add);

  for (const item of filler) {
    if (unique.size >= maxItems + 3) {
      break;
    }
    add(item);
  }

  const chosen = new Map();
  const addChosen = (item) => {
    const key = `${toDateInputValue(item.date)}-${item.displayTitle}-${item.sourceName}`;
    if (!chosen.has(key) && chosen.size < maxItems) {
      chosen.set(key, item);
    }
  };

  Array.from(unique.values())
    .filter((item) => item.sourceType === "combined" && item.unit === "years")
    .sort(byDate)
    .slice(0, 2)
    .forEach(addChosen);

  Array.from(unique.values())
    .sort(byDate)
    .forEach(addChosen);

  return groupSameDayMilestones(Array.from(chosen.values()).sort(byDate), maxItems);
}

function renderEventList(now) {
  const selected = selectedEvents();

  if (!events.length) {
    selectionSummary.textContent = "No dates yet";
    eventList.innerHTML = `<p class="empty-state">Add a birthday, anniversary, or tiny origin story.</p>`;
    return;
  }

  selectionSummary.textContent =
    selected.length === events.length
      ? `All ${events.length} selected`
      : `${selected.length} of ${events.length} selected`;

  eventList.innerHTML = events
    .map((event) => {
      const parts = preciseCalendarParts(event.date, now);
      const ageText =
        event.date > now
          ? `starts in ${parts.years}y ${parts.months}m ${parts.days}d`
          : `${parts.years}y ${parts.months}m ${parts.days}d`;

      return `
        <article class="event-card ${event.selected ? "selected" : ""}" style="--accent: ${event.color}">
          <input
            class="event-toggle"
            type="checkbox"
            data-id="${event.id}"
            ${event.selected ? "checked" : ""}
            aria-label="Include ${escapeHtml(event.name)}"
          />
          <div class="event-meta">
            <strong class="event-name" title="${escapeHtml(event.name)}">${escapeHtml(event.name)}</strong>
            <span class="event-age">${escapeHtml(ageText)}</span>
            <span class="event-date">${dateFormatter.format(event.date)}</span>
          </div>
          <button
            class="event-remove"
            type="button"
            data-id="${event.id}"
            aria-label="Remove ${escapeHtml(event.name)}"
            title="Remove ${escapeHtml(event.name)}"
          >x</button>
        </article>
      `;
    })
    .join("");
}

function renderMetrics(totalMs, group, now) {
  const single = group.length === 1 ? group[0] : null;
  const calendar = single ? preciseCalendarParts(single.date, now) : approximateParts(totalMs);
  const activeCount = activeEventCount(group, now);
  const context = group.length === 1
    ? single.date > now ? "until start" : "this date"
    : activeCount === group.length ? `${group.length} selected` : `${activeCount} active now`;

  const metrics = [
    {
      key: "years",
      unit: "Years",
      value: formatNumber(totalMs / MS.year, 1),
      note: single ? `${calendar.years} full` : context,
      exact: `${formatWhole(totalMs / MS.year)} years rounded`,
    },
    {
      key: "months",
      unit: "Months",
      value: totalMs < MS.year ? formatNumber(totalMs / MS.month, 1) : formatWhole(totalMs / MS.month),
      note: "rounded months",
      exact: `${formatWhole(totalMs / MS.month)} months rounded`,
    },
    {
      key: "weeks",
      unit: "Weeks",
      value: formatWhole(totalMs / MS.week),
      note: "rounded weeks",
      exact: `${formatWhole(totalMs / MS.week)} weeks rounded`,
    },
    {
      key: "days",
      unit: "Days",
      value: formatWhole(totalMs / MS.day),
      note: "whole days",
      exact: `${formatWhole(totalMs / MS.day)} days rounded`,
    },
    {
      key: "sols",
      unit: "Sols",
      value: formatWhole(totalMs / MS.sol),
      note: "Mars solar days",
      exact: `${formatWhole(totalMs / MS.sol)} Mars solar days rounded`,
    },
    {
      key: "hours",
      unit: "Hours",
      value: formatCompactWhole(totalMs / MS.hour),
      note: `${formatWhole(totalMs / MS.hour)} total`,
      exact: `${formatWhole(totalMs / MS.hour)} hours rounded`,
    },
    {
      key: "minutes",
      unit: "Minutes",
      value: formatCompactWhole(totalMs / MS.minute),
      note: `${formatWhole(totalMs / MS.minute)} total`,
      exact: `${formatWhole(totalMs / MS.minute)} minutes rounded`,
    },
    {
      key: "seconds",
      unit: "Seconds",
      value: formatCompactWhole(totalMs / MS.second),
      note: `${formatWhole(totalMs / MS.second)} total`,
      exact: `${formatWhole(totalMs / MS.second)} seconds rounded`,
    },
  ];

  metricsGrid.innerHTML = metrics
    .map(
      (metric) => `
        <article class="metric-card metric-${metric.key}" aria-label="${metric.exact}">
          <span class="metric-unit">${metric.unit}</span>
          <strong class="metric-value" title="${metric.exact}">${metric.value}</strong>
          <p class="metric-note">${metric.note}</p>
        </article>
      `,
    )
    .join("");
}

function renderTimeline(group, now) {
  const items = futureMilestones(group, now);

  if (!items.length) {
    currentTimelineItems = [];
    timeline.innerHTML = `<p class="empty-state">Add or select a date to map the next celebration.</p>`;
    timelineRange.textContent = "Any unit can make the list.";
    nextToast.innerHTML = `<span class="mini-label">Next celebration</span><strong>Waiting for a date</strong>`;
    nextFullRefreshAt = null;
    return;
  }

  const firstDate = items[0].date;
  const lastDate = items[items.length - 1].date;
  const soonest = items[0];
  const source = soonest.sourceType === "combined" ? "Together" : soonest.sourceName;
  const toast = `${source}: ${soonest.displayTitle} - ${dateFormatter.format(soonest.date)}`;

  currentTimelineItems = items;
  nextToast.innerHTML = `
    <span class="mini-label">Next celebration</span>
    <strong title="${escapeHtml(toast)}">${escapeHtml(toast)}</strong>
  `;
  timelineRange.textContent = `${dateFormatter.format(firstDate)} to ${dateFormatter.format(lastDate)}`;
  timeline.style.setProperty("--milestone-count", items.length);
  nextFullRefreshAt = soonest.date;

  timeline.innerHTML = items
    .map((item, index) => {
      const side = index % 2 === 0 ? "top" : "bottom";
      const sourceLabel = sourceLabelFor(item);
      const extraText = item.related
        .slice(0, 2)
        .map((related) => {
          const relatedSource = sourceLabelFor(related);
          const prefix = relatedSource === sourceLabel ? "" : `${relatedSource}: `;
          return `${prefix}${titleWithAge(related)}`;
        })
        .join(" + ");
      const extraLabel = item.related.length
        ? `also ${extraText}${item.related.length > 2 ? ` + ${item.related.length - 2} more` : ""}`
        : "";
      const partyLine = milestonePartyLine(item);
      const milestoneDetail = milestoneDetailFor(item);
      const relatedLine = item.related.length
        ? `Same-day bonus: ${extraText}${item.related.length > 2 ? ` + ${item.related.length - 2} more` : ""}`
        : "Add it to your calendar and give future-you a reason to smile.";
      const calendarLabel = `Add ${titleWithAge(item)} for ${sourceLabel} to calendar`;
      const ageBadge = item.ageLabel ? `<span class="milestone-age">(${escapeHtml(item.ageLabel)})</span>` : "";

      return `
        <article class="milestone milestone-${item.unit} ${side}" style="--accent: ${item.color}">
          <span class="milestone-dot" aria-hidden="true"></span>
          <span class="sparkle-burst" aria-hidden="true"></span>
          <div class="milestone-card">
            <strong title="${escapeHtml(titleWithAge(item))}">${escapeHtml(item.displayTitle)} ${ageBadge}</strong>
            <time datetime="${item.date.toISOString()}">${dateFormatter.format(item.date)}</time>
            <span class="milestone-source" title="${escapeHtml(sourceLabel)}">${escapeHtml(sourceLabel)}</span>
            ${extraLabel ? `<span class="milestone-extra" title="${escapeHtml(extraLabel)}">${escapeHtml(extraLabel)}</span>` : ""}
            <div class="milestone-popover" role="note">
              <span class="party-label">Party cue</span>
              <strong class="popover-title">${escapeHtml(partyLine)}</strong>
              <span class="popover-detail">${escapeHtml(milestoneDetail)}</span>
              <span class="popover-related">${escapeHtml(relatedLine)}</span>
            </div>
            <button class="calendar-link" type="button" data-milestone-index="${index}" aria-label="${escapeHtml(calendarLabel)}" title="Downloads an .ics calendar file">Add to calendar</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderCurrent(group, now) {
  if (!group.length) {
    headline.textContent = events.length
      ? "Select one or more dates to start the party math."
      : "Add a date to begin.";
    metricsGrid.innerHTML = "";
    return;
  }

  const totalMs = group.length === 1
    ? Math.abs(now - group[0].date)
    : combinedElapsedMs(group, now);

  if (group.length === 1) {
    const event = group[0];
    const calendar = preciseCalendarParts(event.date, now);
    const prefix = event.date > now ? `${event.name} starts in` : event.name;
    headline.textContent = `${prefix}: ${calendar.years}y ${calendar.months}m ${calendar.days}d.`;
  } else {
    const combined = approximateParts(totalMs);
    const activeCount = activeEventCount(group, now);
    const prefix = activeCount === group.length
      ? `${group.length} dates together`
      : `${activeCount} active now (${group.length} selected)`;
    headline.textContent = `${prefix}: ${combined.years}y ${combined.months}m ${combined.days}d.`;
  }

  renderMetrics(totalMs, group, now);
}

function render({ refreshEvents = true, refreshTimeline = true } = {}) {
  const now = new Date();
  const group = selectedEvents();

  granularityLabel.textContent = granularityModes[milestoneMode()].label;

  if (refreshEvents) {
    renderEventList(now);
  }

  renderCurrent(group, now);

  if (refreshTimeline) {
    renderTimeline(group, now);
    nextFullRefreshAt = firstDate(nextFullRefreshAt, nextSelectedEventStart(group, now));
  }

  refreshSharePanel();
}

function renderTick() {
  const now = new Date();

  if (nextFullRefreshAt && now >= nextFullRefreshAt) {
    render();
    return;
  }

  render({ refreshEvents: false, refreshTimeline: false });
}

async function copyShareLink() {
  const value = buildShareUrl();

  shareUrlInput.value = value;

  try {
    await navigator.clipboard.writeText(value);
    shareStatus.textContent = "Copied. This link includes personal dates.";
  } catch (error) {
    shareUrlInput.focus();
    shareUrlInput.select();

    try {
      document.execCommand("copy");
      shareStatus.textContent = "Copied. This link includes personal dates.";
    } catch {
      shareStatus.textContent = "Select the link and copy it.";
    }
  }
}

function openFeedbackDialog() {
  if (!feedbackDialog) {
    return;
  }

  feedbackDialog.hidden = false;
  feedbackStatus.textContent = "";
  feedbackMessage.focus();
}

function closeFeedbackDialog() {
  if (!feedbackDialog) {
    return;
  }

  feedbackDialog.hidden = true;
  feedbackStatus.textContent = "";
}

function encodeFeedbackForm(formData) {
  return new URLSearchParams(formData).toString();
}

function feedbackMailtoUrl(formData) {
  const message = String(formData.get("message") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const body = [
    message,
    "",
    email ? `Reply-to: ${email}` : "",
    "Sent from Celebrate feedback.",
  ]
    .filter(Boolean)
    .join("\n");

  return `mailto:opraveen@gmail.com?subject=${encodeURIComponent("Celebrate feedback")}&body=${encodeURIComponent(body)}`;
}

function openFeedbackEmailDraft(formData) {
  feedbackStatus.textContent = "Opening an email draft...";
  window.location.href = feedbackMailtoUrl(formData);
}

async function submitFeedback(event) {
  event.preventDefault();

  const submitButton = feedbackForm.querySelector("button[type='submit']");
  const formData = new FormData(feedbackForm);

  feedbackStatus.textContent = "Sending...";
  submitButton.disabled = true;

  try {
    if (!window.location.protocol.startsWith("http")) {
      throw new Error("Feedback form needs a hosted page");
    }

    const response = await fetch(feedbackForm.getAttribute("action") || "/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: encodeFeedbackForm(formData),
    });

    if (!response.ok) {
      throw new Error("Feedback form failed");
    }

    feedbackForm.reset();
    feedbackStatus.textContent = "Thank you. Feedback sent!";
  } catch (error) {
    openFeedbackEmailDraft(formData);
  } finally {
    submitButton.disabled = false;
  }
}

function addEventFromForm() {
  const date = parseSelection();

  if (!date || Number.isNaN(date.getTime())) {
    headline.textContent = "Choose a real date to add.";
    return;
  }

  events.push(makeEvent(nameInput.value, date, {
    dateValue: dateInput.value,
    hasTime: Boolean(timeInput.value),
    timeValue: timeInput.value,
  }));
  render();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  addEventFromForm();
});

eventList.addEventListener("change", (event) => {
  const toggle = event.target.closest(".event-toggle");
  if (!toggle) {
    return;
  }

  const id = Number(toggle.dataset.id);
  events = events.map((savedEvent) =>
    savedEvent.id === id ? { ...savedEvent, selected: toggle.checked } : savedEvent,
  );
  render();
});

eventList.addEventListener("click", (event) => {
  const remove = event.target.closest(".event-remove");
  if (!remove) {
    return;
  }

  const id = Number(remove.dataset.id);
  events = events.filter((savedEvent) => savedEvent.id !== id);
  render();
});

selectAllButton.addEventListener("click", () => {
  events = events.map((event) => ({ ...event, selected: true }));
  render();
});

clearSelectionButton.addEventListener("click", () => {
  events = events.map((event) => ({ ...event, selected: false }));
  render();
});

shareButton.addEventListener("click", () => {
  if (!events.length) {
    return;
  }

  sharePanel.hidden = !sharePanel.hidden;
  shareStatus.textContent = "";
  refreshSharePanel();

  if (!sharePanel.hidden) {
    shareUrlInput.focus();
    shareUrlInput.select();
  }
});

copyShareButton.addEventListener("click", () => {
  if (events.length) {
    copyShareLink();
  }
});

feedbackOpenButton.addEventListener("click", openFeedbackDialog);
feedbackCloseButton.addEventListener("click", closeFeedbackDialog);
feedbackForm.addEventListener("submit", submitFeedback);
feedbackDialog.addEventListener("click", (event) => {
  if (event.target === feedbackDialog) {
    closeFeedbackDialog();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !feedbackDialog.hidden) {
    closeFeedbackDialog();
  }
});

timeline.addEventListener("click", (event) => {
  const calendarButton = event.target.closest(".calendar-link");

  if (!calendarButton) {
    return;
  }

  const item = currentTimelineItems[Number(calendarButton.dataset.milestoneIndex)];

  if (item) {
    downloadCalendarEvent(item);
  }
});

granularityInput.addEventListener("input", () => render({ refreshEvents: false }));

timeZoneSelect.addEventListener("change", () => {
  if (applyTimeZone(timeZoneSelect.value)) {
    render();
  }
});

window.addEventListener("hashchange", () => {
  if (loadSharedSetup()) {
    render();
  }
});

populateTimeZoneSelect();
setRandomIntroHeadline();
loadSharedSetup();
render();
ticker = setInterval(renderTick, 1000);
