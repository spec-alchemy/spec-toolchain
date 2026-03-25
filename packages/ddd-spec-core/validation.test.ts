import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import type { ErrorObject } from "ajv";
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

test("standalone object schema accepts v2 aggregate objects with relations", async () => {
  const validate = await createStandaloneSchemaValidator("object.schema.json");
  const objectSpec = {
    kind: "object",
    id: "Order",
    title: "Order",
    role: "aggregate",
    lifecycleField: "status",
    lifecycle: ["draft", "submitted"],
    fields: [
      {
        id: "status",
        type: "OrderStatus",
        required: true,
        structure: "enum",
        target: "OrderStatus"
      },
      {
        id: "customerId",
        type: "uuid",
        required: true,
        structure: "reference",
        target: "Customer"
      }
    ],
    relations: [
      {
        id: "belongsToCustomer",
        kind: "reference",
        target: "Customer",
        field: "customerId",
        description: "Links the order to its customer."
      }
    ]
  };

  assertSchemaValidationPasses(validate, objectSpec);
});

test("standalone object schema accepts v2 enum objects with values", async () => {
  const validate = await createStandaloneSchemaValidator("object.schema.json");
  const objectSpec = {
    kind: "object",
    id: "OrderStatus",
    title: "Order Status",
    role: "enum",
    values: ["draft", "submitted", "paid"]
  };

  assertSchemaValidationPasses(validate, objectSpec);
});

test("standalone object schema requires enum objects to declare values", async () => {
  const validate = await createStandaloneSchemaValidator("object.schema.json");
  const objectSpec = {
    kind: "object",
    id: "OrderStatus",
    title: "Order Status",
    role: "enum"
  };

  const errors = assertSchemaValidationFails(validate, objectSpec);

  assert.ok(
    errors.some(
      (error) =>
        error.keyword === "required" &&
        typeof error.params === "object" &&
        error.params !== null &&
        "missingProperty" in error.params &&
        error.params.missingProperty === "values"
    )
  );
});

test("standalone object schema rejects invalid field reference semantics", async () => {
  const validate = await createStandaloneSchemaValidator("object.schema.json");
  const missingStructure = {
    kind: "object",
    id: "Order",
    title: "Order",
    role: "aggregate",
    lifecycleField: "status",
    lifecycle: ["draft"],
    fields: [
      {
        id: "status",
        type: "OrderStatus",
        required: true,
        target: "OrderStatus"
      }
    ]
  };
  const missingTarget = {
    kind: "object",
    id: "Order",
    title: "Order",
    role: "aggregate",
    lifecycleField: "status",
    lifecycle: ["draft"],
    fields: [
      {
        id: "status",
        type: "OrderStatus",
        required: true,
        structure: "enum"
      }
    ]
  };

  const missingStructureErrors = assertSchemaValidationFails(validate, missingStructure);
  const missingTargetErrors = assertSchemaValidationFails(validate, missingTarget);

  assert.ok(
    missingStructureErrors.some(
      (error) => error.instancePath === "/fields/0" && error.keyword === "required"
    )
  );
  assert.ok(
    missingTargetErrors.some(
      (error) => error.instancePath === "/fields/0" && error.keyword === "required"
    )
  );
});

test("standalone canonical index schema requires version 2", async () => {
  const validate = await createStandaloneSchemaValidator("canonical-index.schema.json");
  const indexSpec = {
    version: 1,
    id: "order-payment",
    title: "Order Payment",
    summary: "Tracks the order payment flow.",
    vocabulary: {
      viewerDetails: "canonical/vocabulary/viewer-detail-semantics.yaml"
    },
    domain: {
      objects: ["canonical/objects/order.object.yaml"],
      commands: ["canonical/commands/submit-order.command.yaml"],
      events: ["canonical/events/order-submitted.event.yaml"],
      aggregates: ["canonical/aggregates/order.aggregate.yaml"],
      processes: ["canonical/processes/order-payment.process.yaml"]
    }
  };

  const errors = assertSchemaValidationFails(validate, indexSpec);

  assert.ok(
    errors.some((error) => error.instancePath === "/version" && error.keyword === "const")
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

type Ajv2020Constructor = new (options?: Record<string, unknown>) => {
  addSchema: (schema: object, key?: string) => void;
  compile: (schema: object) => JsonSchemaValidator;
};

type JsonSchemaValidator = {
  (data: unknown): boolean;
  errors?: ErrorObject[] | null;
};

async function createStandaloneSchemaValidator(
  schemaFileName: string
): Promise<JsonSchemaValidator> {
  const schemaDirPath = dirname(CORE_SCHEMA_PATH);
  const [businessSpecSchemaSource, schemaSource] = await Promise.all([
    readFile(join(schemaDirPath, "business-spec.schema.json"), "utf8"),
    readFile(join(schemaDirPath, schemaFileName), "utf8")
  ]);
  const businessSpecSchema = JSON.parse(businessSpecSchemaSource) as object;
  const Ajv2020 = (await import("ajv/dist/2020.js")).default as unknown as Ajv2020Constructor;
  const ajv = new Ajv2020({ allErrors: true, strict: false });

  ajv.addSchema(businessSpecSchema);
  ajv.addSchema(businessSpecSchema, "business-spec.schema.json");

  return ajv.compile(JSON.parse(schemaSource) as object);
}

function assertSchemaValidationPasses(
  validate: JsonSchemaValidator,
  data: unknown
): void {
  assert.equal(validate(data), true, formatSchemaErrors(validate.errors));
}

function assertSchemaValidationFails(
  validate: JsonSchemaValidator,
  data: unknown
): readonly ErrorObject[] {
  assert.equal(validate(data), false);

  return validate.errors ?? [];
}

function formatSchemaErrors(errors: readonly ErrorObject[] | null | undefined): string {
  return (errors ?? [])
    .map((error) => `${error.instancePath || "/"} ${error.message ?? "is invalid"}`)
    .join("\n");
}
