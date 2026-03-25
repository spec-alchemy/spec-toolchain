import assert from "node:assert/strict";
import test from "node:test";
import {
  validateBusinessSpecSchema,
  validateBusinessSpecSemantics
} from "./index.js";
import {
  cloneBusinessSpec,
  CORE_SCHEMA_PATH,
  loadConnectionCardReviewFixture
} from "./test-fixtures.js";

test("schema validation accepts the canonical fixture", async () => {
  const spec = await loadConnectionCardReviewFixture();

  await assert.doesNotReject(async () => {
    await validateBusinessSpecSchema(spec, {
      schemaPath: CORE_SCHEMA_PATH
    });
  });
});

test("schema validation rejects malformed spec structure", async () => {
  const spec = cloneBusinessSpec(await loadConnectionCardReviewFixture());
  const invalidSpec = spec as unknown as Record<string, unknown>;
  delete invalidSpec.summary;

  await assert.rejects(
    validateBusinessSpecSchema(invalidSpec as never, {
      schemaPath: CORE_SCHEMA_PATH
    }),
    /Business spec schema validation failed:/
  );
});

test("schema validation rejects v1 business spec bundles", async () => {
  const spec = cloneBusinessSpec(await loadConnectionCardReviewFixture());
  const invalidSpec = spec as typeof spec & { version: 1 };
  invalidSpec.version = 1;

  await assert.rejects(
    validateBusinessSpecSchema(invalidSpec as never, {
      schemaPath: CORE_SCHEMA_PATH
    }),
    /\/version must be equal to constant/
  );
});

test("semantic validation accepts the canonical fixture", async () => {
  const spec = await loadConnectionCardReviewFixture();

  assert.doesNotThrow(() => {
    validateBusinessSpecSemantics(spec);
  });
});

test("semantic validation rejects broken aggregate bindings", async () => {
  const spec = cloneBusinessSpec(await loadConnectionCardReviewFixture());
  const commands = spec.domain.commands as typeof spec.domain.commands extends readonly (infer Item)[]
    ? Item[]
    : never;

  commands[0] = {
    ...commands[0],
    target: "MissingObject"
  };

  assert.throws(
    () => {
      validateBusinessSpecSemantics(spec);
    },
    /targets unknown object MissingObject/
  );
});

test("semantic validation rejects enum fields targeting non-enum objects", async () => {
  const spec = cloneBusinessSpec(await loadConnectionCardReviewFixture());
  const objects = spec.domain.objects as typeof spec.domain.objects extends readonly (infer Item)[]
    ? Item[]
    : never;
  const connectionObject = objects.find((object) => object.id === "Connection");

  assert.ok(connectionObject && connectionObject.role === "aggregate");

  const fields = connectionObject.fields as typeof connectionObject.fields extends readonly (infer Item)[]
    ? Item[]
    : never;
  const statusField = fields.find((field) => field.id === "status");

  assert.ok(statusField);
  statusField.target = "Connection";

  assert.throws(
    () => {
      validateBusinessSpecSemantics(spec);
    },
    /Object Connection field status enum target Connection must reference enum object/
  );
});

test("semantic validation rejects field targets without structure", async () => {
  const spec = cloneBusinessSpec(await loadConnectionCardReviewFixture());
  const objects = spec.domain.objects as typeof spec.domain.objects extends readonly (infer Item)[]
    ? Item[]
    : never;
  const cardObject = objects.find((object) => object.id === "Card");

  assert.ok(cardObject && cardObject.role === "aggregate");

  const fields = cardObject.fields as typeof cardObject.fields extends readonly (infer Item)[]
    ? Item[]
    : never;
  const connectionField = fields.find((field) => field.id === "connectionId");

  assert.ok(connectionField);
  delete connectionField.structure;

  assert.throws(
    () => {
      validateBusinessSpecSemantics(spec);
    },
    /Object Card field connectionId target requires structure/
  );
});
