const YEAR_STATUSES = Object.freeze({
  PLANNED: "planned",
  ACTIVE: "active",
  CLOSED: "closed",
});

const VALID_YEAR_STATUSES = new Set(Object.values(YEAR_STATUSES));

function getYearStatus(year) {
  if (VALID_YEAR_STATUSES.has(year?.status)) return year.status;
  return year?.closed === true ? YEAR_STATUSES.CLOSED : YEAR_STATUSES.PLANNED;
}

function canTransitionYear(fromStatus, toStatus) {
  if (fromStatus === toStatus) return true;
  return (
    (fromStatus === YEAR_STATUSES.PLANNED &&
      toStatus === YEAR_STATUSES.ACTIVE) ||
    (fromStatus === YEAR_STATUSES.ACTIVE &&
      toStatus === YEAR_STATUSES.CLOSED)
  );
}

function allowsPlanning(year) {
  return [YEAR_STATUSES.PLANNED, YEAR_STATUSES.ACTIVE].includes(
    getYearStatus(year),
  );
}

function allowsGameplay(year) {
  return getYearStatus(year) === YEAR_STATUSES.ACTIVE;
}

function getYearStatusLabel(status) {
  return {
    [YEAR_STATUSES.PLANNED]: "geplant",
    [YEAR_STATUSES.ACTIVE]: "aktiv",
    [YEAR_STATUSES.CLOSED]: "abgeschlossen",
  }[status] || status;
}

module.exports = {
  YEAR_STATUSES,
  VALID_YEAR_STATUSES,
  allowsGameplay,
  allowsPlanning,
  canTransitionYear,
  getYearStatus,
  getYearStatusLabel,
};
