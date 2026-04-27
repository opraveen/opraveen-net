const MS = {
  second: 1000,
  minute: 60 * 1000,
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30.436875 * 24 * 60 * 60 * 1000,
  year: 365.2425 * 24 * 60 * 60 * 1000,
};

const accents = {
  years: "#1a9aa2",
  months: "#e85d4f",
  weeks: "#efb63e",
  days: "#4b9c67",
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
const nameInput = document.querySelector("#event-name");
const dateInput = document.querySelector("#event-date");
const timeInput = document.querySelector("#event-time");
const eventList = document.querySelector("#event-list");
const selectionSummary = document.querySelector("#selection-summary");
const selectAllButton = document.querySelector("#select-all");
const clearSelectionButton = document.querySelector("#clear-selection");
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

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const unitInterestBonus = {
  years: 600,
  months: 500,
  days: 460,
  hours: 360,
  weeks: 340,
  minutes: 210,
  seconds: 120,
};

function setDefaultDate() {
  const fallback = new Date();
  fallback.setFullYear(fallback.getFullYear() - 30);
  dateInput.value = toDateInputValue(fallback);
}

function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseSelection() {
  if (!dateInput.value) {
    return null;
  }

  const [year, month, day] = dateInput.value.split("-").map(Number);
  const [hours = 0, minutes = 0] = timeInput.value
    ? timeInput.value.split(":").map(Number)
    : [];

  return new Date(year, month - 1, day, hours, minutes, 0, 0);
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

function preciseCalendarParts(from, to) {
  let start = new Date(from);
  let end = new Date(to);

  if (start > end) {
    [start, end] = [end, start];
  }

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();

  if (days < 0) {
    months -= 1;
    days += new Date(end.getFullYear(), end.getMonth(), 0).getDate();
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
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date, months) {
  const next = new Date(date);
  const day = next.getDate();
  next.setDate(1);
  next.setMonth(next.getMonth() + months);
  const daysInTarget = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, daysInTarget));
  return next;
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

function makeEvent(name, date) {
  const id = nextId++;

  return {
    color: eventColors[(id - 1) % eventColors.length],
    date,
    id,
    name: name.trim() || `Date ${id}`,
    selected: true,
  };
}

function elapsedMsFor(event, now) {
  return Math.max(0, now - event.date);
}

function selectedEvents() {
  return events.filter((event) => event.selected);
}

function combinedElapsedMs(group, now) {
  return group.reduce((total, event) => total + elapsedMsFor(event, now), 0);
}

function futureMilestonesForEvent(event, now) {
  const elapsedMs = elapsedMsFor(event, now);
  const mode = milestoneMode();

  return milestoneDefs.flatMap((def) =>
    milestoneValues(def.unit, elapsedMs / def.ms, elapsedMs, mode)
      .map((value) => ({
        color: def.color,
        date: def.dateForEvent(event.date, value),
        displayTitle: formatMilestoneTitle(value, def.unit),
        priority: def.priority,
        sourceName: event.name,
        sourceType: "date",
        unit: def.unit,
        value,
      }))
      .filter((item) => item.date > now)
      .slice(0, 4),
  );
}

function futureMilestonesForGroup(group, now) {
  if (group.length < 2) {
    return [];
  }

  const totalElapsed = combinedElapsedMs(group, now);
  const rate = group.length;
  const mode = milestoneMode();

  return milestoneDefs.flatMap((def) =>
    milestoneValues(def.unit, totalElapsed / def.ms, totalElapsed, mode)
      .map((value) => {
        const targetMs = value * def.ms;
        const waitMs = (targetMs - totalElapsed) / rate;

        return {
          color: def.color,
          date: new Date(now.getTime() + waitMs),
          displayTitle: formatMilestoneTitle(value, def.unit),
          priority: def.priority + 0.5,
          sourceName: "Together",
          sourceType: "combined",
          unit: def.unit,
          value,
        };
      })
      .filter((item) => item.date > now && Number.isFinite(item.date.getTime()))
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
  const context = group.length === 1 ? "this date" : `${group.length} selected`;

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
      note: single ? `${calendar.months} extra` : context,
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
    timeline.innerHTML = `<p class="empty-state">Select a date to map the next celebration.</p>`;
    timelineRange.textContent = "Any unit can make the list.";
    nextToast.innerHTML = `<span class="mini-label">Next celebration</span><strong>Waiting for a date</strong>`;
    return;
  }

  const firstDate = items[0].date;
  const lastDate = items[items.length - 1].date;
  const soonest = items[0];
  const source = soonest.sourceType === "combined" ? "Together" : soonest.sourceName;
  const toast = `${source}: ${soonest.displayTitle} - ${dateFormatter.format(soonest.date)}`;

  nextToast.innerHTML = `
    <span class="mini-label">Next celebration</span>
    <strong title="${escapeHtml(toast)}">${escapeHtml(toast)}</strong>
  `;
  timelineRange.textContent = `${dateFormatter.format(firstDate)} to ${dateFormatter.format(lastDate)}`;
  timeline.style.setProperty("--milestone-count", items.length);

  timeline.innerHTML = items
    .map((item, index) => {
      const side = index % 2 === 0 ? "top" : "bottom";
      const sourceLabel = sourceLabelFor(item);
      const extraText = item.related
        .slice(0, 2)
        .map((related) => {
          const relatedSource = sourceLabelFor(related);
          const prefix = relatedSource === sourceLabel ? "" : `${relatedSource}: `;
          return `${prefix}${related.displayTitle}`;
        })
        .join(" + ");
      const extraLabel = item.related.length
        ? `also ${extraText}${item.related.length > 2 ? ` + ${item.related.length - 2} more` : ""}`
        : "";

      return `
        <article class="milestone ${side}" style="--accent: ${item.color}">
          <span class="milestone-dot" aria-hidden="true"></span>
          <div class="milestone-card">
            <strong title="${escapeHtml(item.displayTitle)}">${escapeHtml(item.displayTitle)}</strong>
            <time datetime="${item.date.toISOString()}">${dateFormatter.format(item.date)}</time>
            <span class="milestone-source" title="${escapeHtml(sourceLabel)}">${escapeHtml(sourceLabel)}</span>
            ${extraLabel ? `<span class="milestone-extra" title="${escapeHtml(extraLabel)}">${escapeHtml(extraLabel)}</span>` : ""}
          </div>
        </article>
      `;
    })
    .join("");
}

function render() {
  const now = new Date();
  const group = selectedEvents();

  granularityLabel.textContent = granularityModes[milestoneMode()].label;
  renderEventList(now);

  if (!group.length) {
    headline.textContent = events.length
      ? "Select one or more dates to start the party math."
      : "Add a date to begin.";
    metricsGrid.innerHTML = "";
    renderTimeline(group, now);
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
    headline.textContent = `${group.length} dates together: ${combined.years}y ${combined.months}m ${combined.days}d.`;
  }

  renderMetrics(totalMs, group, now);
  renderTimeline(group, now);
}

function addEventFromForm() {
  const date = parseSelection();

  if (!date || Number.isNaN(date.getTime())) {
    headline.textContent = "Choose a real date to add.";
    return;
  }

  events.push(makeEvent(nameInput.value, date));
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

granularityInput.addEventListener("input", render);

setDefaultDate();
events.push(makeEvent(nameInput.value, parseSelection()));
render();
ticker = setInterval(render, 1000);
