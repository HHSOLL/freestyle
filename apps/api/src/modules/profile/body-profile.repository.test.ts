import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import test from "node:test";
import { buildBodyProfileRevision, type BodyProfileRecord, type BodyProfileUpsertInput } from "@freestyle/contracts";
import {
  BodyProfileRevisionConflictError,
  createFileBodyProfilePersistencePort,
  createMemoryBodyProfilePersistencePort,
} from "./body-profile.repository.js";

const createProfileInput = (): BodyProfileUpsertInput => ({
  profile: {
    version: 2,
    gender: "female",
    bodyFrame: "balanced",
    simple: {
      heightCm: 172,
      shoulderCm: 44,
      chestCm: 91,
      waistCm: 74,
      hipCm: 95,
      inseamCm: 79,
    },
  },
});

const createProfileRecord = (): BodyProfileRecord => ({
  profile: createProfileInput().profile,
  version: 2,
  revision: buildBodyProfileRevision(createProfileInput().profile),
  updatedAt: "2026-04-19T12:00:00.000Z",
});

test("memory body-profile persistence port isolates users and round-trips canonical records", async () => {
  const port = createMemoryBodyProfilePersistencePort();

  assert.equal(await port.getBodyProfileRecordForUser("user-a"), null);

  const saved = await port.upsertBodyProfileRecordForUser("user-a", createProfileInput());
  assert.equal(saved.profile.simple.heightCm, 172);
  assert.equal(saved.version, 2);
  assert.equal(saved.revision, buildBodyProfileRevision(saved.profile));

  assert.equal((await port.getBodyProfileRecordForUser("user-a"))?.profile.simple.heightCm, 172);
  assert.equal(await port.getBodyProfileRecordForUser("user-b"), null);
});

test("body-profile persistence rejects stale baseRevision writes", async () => {
  const port = createMemoryBodyProfilePersistencePort();
  const first = await port.upsertBodyProfileRecordForUser("user-a", createProfileInput());

  await assert.rejects(
    () =>
      port.upsertBodyProfileRecordForUser("user-a", {
        ...createProfileInput(),
        baseRevision: "body-profile:stale",
      }),
    (error: unknown) =>
      error instanceof BodyProfileRevisionConflictError &&
      error.currentBodyProfile?.revision === first.revision,
  );
});

test("file body-profile persistence port reads legacy object-map stores and filters malformed rows", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "freestyle-body-profile-repo-"));
  const storePath = path.join(tempDir, "body-profiles.json");
  fs.writeFileSync(
    storePath,
    JSON.stringify(
      {
        "user-a": createProfileRecord(),
        "user-b": {
          profile: {
            version: 2,
            simple: {
              heightCm: "bad",
            },
          },
        },
      },
      null,
      2,
    ),
    "utf8",
  );

  const port = createFileBodyProfilePersistencePort({ storePath });
  assert.equal((await port.getBodyProfileRecordForUser("user-a"))?.profile.simple.heightCm, 172);
  assert.equal(await port.getBodyProfileRecordForUser("user-b"), null);

  fs.rmSync(tempDir, { recursive: true, force: true });
});

test("file body-profile persistence port writes a versioned envelope for future adapter replacement", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "freestyle-body-profile-repo-"));
  const storePath = path.join(tempDir, "body-profiles.json");
  const port = createFileBodyProfilePersistencePort({ storePath });

  await port.upsertBodyProfileRecordForUser("user-a", createProfileInput());

  const raw = JSON.parse(fs.readFileSync(storePath, "utf8")) as {
    version?: unknown;
    items?: Record<string, BodyProfileRecord>;
  };
  assert.equal(raw.version, 1);
  assert.equal(raw.items?.["user-a"]?.profile.simple.heightCm, 172);

  fs.rmSync(tempDir, { recursive: true, force: true });
});
