const TEST_MODE_HEADER = "x-test-mode";

function isTestModeRequest(req) {
  return (
    req.headers?.[TEST_MODE_HEADER] === "true" ||
    req.query?.testMode === "true"
  );
}

function testModeMiddleware(req, res, next) {
  req.isTestMode = isTestModeRequest(req);
  next();
}

function scopedFilter(req, filter = {}) {
  return req.isTestMode
    ? { ...filter, isTestData: true }
    : { ...filter, isTestData: { $ne: true } };
}

function modeFilter(isTestData, filter = {}) {
  return isTestData
    ? { ...filter, isTestData: true }
    : { ...filter, isTestData: { $ne: true } };
}

module.exports = {
  testModeMiddleware,
  scopedFilter,
  modeFilter,
};
