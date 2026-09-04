const test = require("node:test");
const assert = require("node:assert/strict");
const Year = require("../models/Year");
const {
  YEAR_STATUSES,
  allowsGameplay,
  allowsPlanning,
  canTransitionYear,
  getYearStatus,
} = require("../utils/yearLifecycle");

test("year lifecycle only allows planned to active to closed", () => {
  assert.equal(
    canTransitionYear(YEAR_STATUSES.PLANNED, YEAR_STATUSES.ACTIVE),
    true,
  );
  assert.equal(
    canTransitionYear(YEAR_STATUSES.ACTIVE, YEAR_STATUSES.CLOSED),
    true,
  );
  assert.equal(
    canTransitionYear(YEAR_STATUSES.PLANNED, YEAR_STATUSES.CLOSED),
    false,
  );
  assert.equal(
    canTransitionYear(YEAR_STATUSES.CLOSED, YEAR_STATUSES.ACTIVE),
    false,
  );
});

test("planned years allow planning but not gameplay", () => {
  const year = { status: YEAR_STATUSES.PLANNED };
  assert.equal(allowsPlanning(year), true);
  assert.equal(allowsGameplay(year), false);
});

test("active years allow planning and gameplay", () => {
  const year = { status: YEAR_STATUSES.ACTIVE };
  assert.equal(allowsPlanning(year), true);
  assert.equal(allowsGameplay(year), true);
});

test("closed years are immutable", () => {
  const year = { status: YEAR_STATUSES.CLOSED };
  assert.equal(allowsPlanning(year), false);
  assert.equal(allowsGameplay(year), false);
});

test("legacy closed values remain readable during migration", () => {
  assert.equal(getYearStatus({ closed: true }), YEAR_STATUSES.CLOSED);
  assert.equal(getYearStatus({ closed: false }), YEAR_STATUSES.PLANNED);
});

test("database schema permits only one active year per data scope", () => {
  const lifecycleIndex = Year.schema.indexes().find(
    ([fields]) => fields.isTestData === 1 && fields.status === 1,
  );

  assert.ok(lifecycleIndex);
  assert.equal(lifecycleIndex[1].unique, true);
  assert.deepEqual(lifecycleIndex[1].partialFilterExpression, {
    status: YEAR_STATUSES.ACTIVE,
  });
});
