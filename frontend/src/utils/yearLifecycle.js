export const YEAR_STATUSES = Object.freeze({
  PLANNED: "planned",
  ACTIVE: "active",
  CLOSED: "closed",
});

const yearStatusMeta = {
  [YEAR_STATUSES.PLANNED]: {
    label: "Geplant",
    optionLabel: "geplant",
    tone: "neutral",
  },
  [YEAR_STATUSES.ACTIVE]: {
    label: "Aktiv",
    optionLabel: "aktiv",
    tone: "primary",
  },
  [YEAR_STATUSES.CLOSED]: {
    label: "Abgeschlossen",
    optionLabel: "abgeschlossen",
    tone: "success",
  },
};

export function getYearStatus(year) {
  if (yearStatusMeta[year?.status]) return year.status;
  return year?.closed ? YEAR_STATUSES.CLOSED : YEAR_STATUSES.PLANNED;
}

export function getYearStatusMeta(year) {
  return yearStatusMeta[getYearStatus(year)];
}

export function isYearWritable(year) {
  return getYearStatus(year) !== YEAR_STATUSES.CLOSED;
}
