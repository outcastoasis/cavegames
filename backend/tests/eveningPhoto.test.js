const test = require("node:test");
const assert = require("node:assert/strict");
const cloudinary = require("../config/cloudinary");
const Evening = require("../models/Evening");
const {
  MAX_EVENING_PHOTO_BYTES,
} = require("../middleware/eveningPhotoUpload");
const {
  buildEveningPhotoPresentation,
  buildOriginalPhotoUrl,
  uploadEveningPhotoOriginal,
} = require("../services/eveningPhotoService");
const {
  canModifyEveningPhoto,
  isEveningPhotoParticipant,
} = require("../utils/eveningPhoto");
const {
  getGroupPhotoOriginal,
  uploadGroupPhoto,
} = require("../controllers/eveningController");

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("evening photos respect the Cloudinary Free plan size limit", () => {
  assert.equal(MAX_EVENING_PHOTO_BYTES, 10 * 1024 * 1024);
});

test("evening photo policy follows status and admin rules", () => {
  const leader = { _id: "user-1", role: "user" };
  const admin = { _id: "admin-1", role: "admin" };

  assert.equal(canModifyEveningPhoto({ status: "offen" }, leader), false);
  assert.equal(canModifyEveningPhoto({ status: "fixiert" }, leader), true);
  assert.equal(
    canModifyEveningPhoto({ status: "abgeschlossen" }, leader),
    true,
  );
  assert.equal(canModifyEveningPhoto({ status: "gesperrt" }, leader), false);
  assert.equal(canModifyEveningPhoto({ status: "gesperrt" }, admin), true);
});

test("only participants and admins may request the original", () => {
  const evening = {
    participantIds: [
      "64b000000000000000000001",
      { _id: "64b000000000000000000002" },
    ],
  };

  assert.equal(
    isEveningPhotoParticipant(evening, {
      _id: "64b000000000000000000001",
      role: "user",
    }),
    true,
  );
  assert.equal(
    isEveningPhotoParticipant(evening, {
      _id: "64b000000000000000000003",
      role: "user",
    }),
    false,
  );
  assert.equal(
    isEveningPhotoParticipant(evening, {
      _id: "64b000000000000000000003",
      role: "admin",
    }),
    true,
  );
});

test("presentation URLs optimize delivery while the original URL stays untransformed", () => {
  cloudinary.config({ cloud_name: "test-cloud" });
  const photo = {
    publicId: "spielabend/evenings/abend-1/group-photo-random",
    version: 42,
    format: "jpg",
    width: 4032,
    height: 3024,
  };

  const presentation = buildEveningPhotoPresentation(photo);
  const originalUrl = buildOriginalPhotoUrl(photo);

  assert.match(presentation.url, /c_limit,h_1600,w_1600\/q_auto:good\/f_auto/);
  assert.match(presentation.srcSet, /h_480,w_480/);
  assert.match(presentation.srcSet, /h_960,w_960/);
  assert.match(presentation.srcSet, /h_1600,w_1600/);
  assert.doesNotMatch(originalUrl, /q_auto|f_auto|c_limit/);
  assert.match(originalUrl, /\/v42\/.+\.jpg/);
});

test("evening uploads preserve the original and use an unpredictable asset ID", async (t) => {
  const originalUpload = cloudinary.uploader.upload;
  let receivedPath;
  let receivedOptions;
  cloudinary.uploader.upload = async (filePath, options) => {
    receivedPath = filePath;
    receivedOptions = options;
    return { public_id: options.public_id };
  };
  t.after(() => {
    cloudinary.uploader.upload = originalUpload;
  });

  await uploadEveningPhotoOriginal("temporary-photo.heic", "abend-1");

  assert.equal(receivedPath, "temporary-photo.heic");
  assert.equal(receivedOptions.folder, "spielabend/evenings/abend-1");
  assert.equal(receivedOptions.overwrite, false);
  assert.match(receivedOptions.public_id, /^group-photo-[a-f0-9]{32}$/);
  assert.equal("transformation" in receivedOptions, false);
});

test("an open evening rejects photo uploads before contacting storage", async (t) => {
  const originalFindOne = Evening.findOne;
  Evening.findOne = async () => ({ status: "offen" });
  t.after(() => {
    Evening.findOne = originalFindOne;
  });

  const req = {
    params: { id: "64b000000000000000000001" },
    body: {},
    file: { path: "missing-test-upload", originalname: "abend.jpg" },
    user: { _id: "64b000000000000000000002", role: "user" },
    isTestMode: false,
  };
  const res = createResponse();

  await uploadGroupPhoto(req, res);

  assert.equal(res.statusCode, 409);
  assert.match(res.body.error, /fixierten oder abgeschlossenen/);
});

test("a participant receives the unchanged original URL", async (t) => {
  cloudinary.config({ cloud_name: "test-cloud" });
  const originalFindOne = Evening.findOne;
  Evening.findOne = async () => ({
    participantIds: ["64b000000000000000000001"],
    groupPhotoPublicId: "spielabend/evenings/abend-1/group-photo-random",
    groupPhotoVersion: 17,
    groupPhotoFormat: "heic",
    groupPhotoOriginalFilename: "cavegames.heic",
  });
  t.after(() => {
    Evening.findOne = originalFindOne;
  });

  const req = {
    params: { id: "64b000000000000000000010" },
    user: { _id: "64b000000000000000000001", role: "user" },
    isTestMode: false,
  };
  const res = createResponse();

  await getGroupPhotoOriginal(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.filename, "cavegames.heic");
  assert.match(res.body.url, /\/v17\/.+\.heic/);
  assert.doesNotMatch(res.body.url, /q_auto|f_auto|c_limit/);
});
