import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import type { ErrorObject } from "ajv";
import YAML from "yaml";
import {
  validateBusinessSpecSchema,
  validateBusinessSpecSemantics,
  validateDomainModelWorkspaceSchema
} from "./index.js";
import {
  DOMAIN_MODEL_SCHEMA_PATH,
  MINIMAL_FIXTURE_ENTRY_PATH,
  cloneBusinessSpec,
  loadMinimalFixture
} from "./test-fixtures.js";

const DOMAIN_MODEL_SCHEMA_DIR_PATH = dirname(DOMAIN_MODEL_SCHEMA_PATH);

test("schema validation accepts the minimal version 1 domain model fixture", async () => {
  await assert.doesNotReject(async () => {
    await validateDomainModelWorkspaceSchema({
      entryPath: MINIMAL_FIXTURE_ENTRY_PATH,
      schemaPath: DOMAIN_MODEL_SCHEMA_PATH
    });
  });
});

test("domain model index schema rejects malformed version 1 index structure", async () => {
  const index = YAML.parse(
    await readFile(MINIMAL_FIXTURE_ENTRY_PATH, "utf8")
  ) as Record<string, unknown>;
  delete index.summary;

  await assert.rejects(
    validateBusinessSpecSchema(index, {
      schemaPath: DOMAIN_MODEL_SCHEMA_PATH
    }),
    /Domain model schema validation failed:/
  );
});

test("standalone version 1 domain model index schema rejects legacy domain keys", async () => {
  const validate = await createDomainModelSchemaValidator("index.schema.json");
  const legacyIndex = {
    version: 1,
    id: "legacy-domain-shape",
    title: "Legacy Domain Shape",
    summary: "Should be rejected.",
    domain: {
      objects: "./objects"
    }
  };

  const errors = assertSchemaValidationFails(validate, legacyIndex);

  assert.ok(
    errors.some(
      (error) =>
        error.instancePath === "" &&
        error.keyword === "required" &&
        typeof error.params === "object" &&
        error.params !== null &&
        "missingProperty" in error.params &&
        error.params.missingProperty === "model"
    )
  );
});

test("standalone version 1 scenario schema accepts ordered business steps", async () => {
  const validate = await createDomainModelSchemaValidator("scenario.schema.json");
  const scenario = {
    kind: "scenario",
    id: "order-review-flow",
    title: "Order Review Flow",
    summary: "Minimal scenario.",
    goal: "Approve an order",
    ownerContext: "orders",
    steps: [
      {
        id: "draft-order",
        title: "Draft Order",
        context: "orders",
        actor: "customer",
        outgoingMessages: ["submit-order"],
        next: ["awaiting-review"]
      },
      {
        id: "awaiting-review",
        title: "Awaiting Review",
        context: "orders",
        incomingMessages: ["submit-order"],
        final: true,
        outcome: "approved"
      }
    ]
  };

  assertSchemaValidationPasses(validate, scenario);
});

test("standalone version 1 aggregate schema requires transitions to declare ids", async () => {
  const validate = await createDomainModelSchemaValidator("aggregate.schema.json");
  const aggregate = {
    kind: "aggregate",
    id: "order",
    title: "Order",
    summary: "Tracks order settlement.",
    context: "orders",
    lifecycleComplexity: true,
    states: ["draft", "submitted"],
    initialState: "draft",
    transitions: [
      {
        from: "draft",
        to: "submitted",
        onMessage: "submit-order"
      }
    ]
  };

  const errors = assertSchemaValidationFails(validate, aggregate);

  assert.ok(
    errors.some(
      (error) =>
        error.instancePath === "/transitions/0" &&
        error.keyword === "required" &&
        typeof error.params === "object" &&
        error.params !== null &&
        "missingProperty" in error.params &&
        error.params.missingProperty === "id"
    )
  );
});

test("semantic validation accepts the minimal version 1 domain model fixture", async () => {
  const spec = await loadMinimalFixture();

  assert.doesNotThrow(() => {
    validateBusinessSpecSemantics(spec);
  });
});

test("semantic validation rejects scenarios whose owner context does not exist", async () => {
  const spec = cloneBusinessSpec(await loadMinimalFixture());
  const [scenario] = spec.scenarios;

  if (!scenario) {
    throw new Error("Expected the minimal fixture to include a scenario.");
  }

  scenario.ownerContext = "missing-context";

  assert.throws(() => {
    validateBusinessSpecSemantics(spec);
  }, /ownerContext missing-context must reference existing context/);
});

test("semantic validation rejects final steps without outcomes", async () => {
  const spec = cloneBusinessSpec(await loadMinimalFixture());
  const [scenario] = spec.scenarios;
  const finalStep = scenario?.steps.find((step) => step.final);

  if (!scenario || !finalStep) {
    throw new Error("Expected the minimal fixture to include a final scenario step.");
  }

  delete (finalStep as { outcome?: string }).outcome;

  assert.throws(() => {
    validateBusinessSpecSemantics(spec);
  }, /final step .* must define outcome/);
});

type JsonSchemaValidator = {
  (data: unknown): boolean;
  errors?: ErrorObject[] | null;
};

type AjvConstructor = new (options?: Record<string, unknown>) => {
  addSchema: (schema: object, key?: string) => void;
  compile: (schema: object) => JsonSchemaValidator;
};

async function createDomainModelSchemaValidator(schemaFileName: string): Promise<JsonSchemaValidator> {
  const schemaPath = join(DOMAIN_MODEL_SCHEMA_DIR_PATH, schemaFileName);
  const [schemaSource, sharedSchemaSource] = await Promise.all([
    readFile(schemaPath, "utf8"),
    readFile(join(DOMAIN_MODEL_SCHEMA_DIR_PATH, "shared.schema.json"), "utf8")
  ]);
  const Ajv2020 = (await import("ajv/dist/2020.js")).default as unknown as AjvConstructor;
  const ajv = new Ajv2020({ allErrors: true, strict: false });

  ajv.addSchema(JSON.parse(sharedSchemaSource) as object);

  return ajv.compile(JSON.parse(schemaSource) as object);
}

function assertSchemaValidationPasses(
  validate: JsonSchemaValidator,
  value: unknown
): void {
  assert.equal(validate(value), true, formatSchemaErrors(validate.errors ?? []));
}

function assertSchemaValidationFails(
  validate: JsonSchemaValidator,
  value: unknown
): readonly ErrorObject[] {
  assert.equal(validate(value), false, "Expected schema validation to fail.");

  return validate.errors ?? [];
}

function formatSchemaErrors(errors: readonly ErrorObject[]): string {
  if (errors.length === 0) {
    return "Schema validation failed without diagnostics.";
  }

  return errors
    .map((error) => `${error.instancePath || "/"} ${error.message ?? "is invalid"}`)
    .join("\n");
}
