import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import type { ErrorObject } from "ajv";
import YAML from "yaml";
import {
  validateBusinessSpecSchema,
  validateBusinessSpecSemantics
} from "./index.js";
import {
  cloneBusinessSpec,
  CORE_SCHEMA_PATH,
  loadConnectionCardReviewFixture
} from "./test-fixtures.js";

const VNEXT_SCHEMA_DIR_PATH = join(dirname(CORE_SCHEMA_PATH), "vnext");
const VNEXT_EXAMPLE_ROOT_PATH = join(
  dirname(CORE_SCHEMA_PATH),
  "../../../examples/vnext-minimal/canonical-vnext"
);
const VNEXT_MODEL_COLLECTIONS = [
  {
    key: "contexts",
    schemaFile: "context.schema.json",
    suffix: ".context.yaml"
  },
  {
    key: "actors",
    schemaFile: "actor.schema.json",
    suffix: ".actor.yaml"
  },
  {
    key: "systems",
    schemaFile: "system.schema.json",
    suffix: ".system.yaml"
  },
  {
    key: "scenarios",
    schemaFile: "scenario.schema.json",
    suffix: ".scenario.yaml"
  },
  {
    key: "messages",
    schemaFile: "message.schema.json",
    suffix: ".message.yaml"
  },
  {
    key: "aggregates",
    schemaFile: "aggregate.schema.json",
    suffix: ".aggregate.yaml"
  },
  {
    key: "policies",
    schemaFile: "policy.schema.json",
    suffix: ".policy.yaml"
  }
] as const;

type VnextCollectionKey = (typeof VNEXT_MODEL_COLLECTIONS)[number]["key"];

interface VnextCanonicalIndexSpec {
  version: 3;
  id: string;
  title: string;
  summary: string;
  model: Record<VnextCollectionKey, string | string[]>;
}

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

test("standalone object schema accepts v2 entity objects with relations", async () => {
  const validate = await createStandaloneSchemaValidator("object.schema.json");
  const objectSpec = {
    kind: "object",
    id: "Order",
    title: "Order",
    role: "entity",
    lifecycleField: "status",
    lifecycle: ["draft", "submitted"],
    fields: [
      {
        id: "status",
        type: "OrderStatus",
        required: true,
        ref: {
          kind: "enum",
          objectId: "OrderStatus"
        }
      },
      {
        id: "customerId",
        type: "uuid",
        required: true,
        ref: {
          kind: "reference",
          objectId: "Customer"
        }
      }
    ],
    relations: [
      {
        id: "belongsToCustomer",
        kind: "reference",
        target: "Customer",
        cardinality: "0..n",
        description: "Links the order to its customer."
      }
    ]
  };

  assertSchemaValidationPasses(validate, objectSpec);
});

test("standalone object schema accepts v2 value objects", async () => {
  const validate = await createStandaloneSchemaValidator("object.schema.json");
  const objectSpec = {
    kind: "object",
    id: "OrderLine",
    title: "Order Line",
    role: "value-object",
    fields: [
      {
        id: "sku",
        type: "string",
        required: true
      },
      {
        id: "status",
        type: "OrderStatus",
        required: true,
        ref: {
          kind: "enum",
          objectId: "OrderStatus"
        }
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
  const missingKind = {
    kind: "object",
    id: "Order",
    title: "Order",
    role: "entity",
    lifecycleField: "status",
    lifecycle: ["draft"],
    fields: [
      {
        id: "status",
        type: "OrderStatus",
        required: true,
        ref: {
          objectId: "OrderStatus"
        }
      }
    ]
  };
  const missingObjectId = {
    kind: "object",
    id: "Order",
    title: "Order",
    role: "entity",
    lifecycleField: "status",
    lifecycle: ["draft"],
    fields: [
      {
        id: "status",
        type: "OrderStatus",
        required: true,
        ref: {
          kind: "enum"
        }
      }
    ]
  };

  const missingKindErrors = assertSchemaValidationFails(validate, missingKind);
  const missingObjectIdErrors = assertSchemaValidationFails(validate, missingObjectId);

  assert.ok(
    missingKindErrors.some(
      (error) => error.instancePath === "/fields/0/ref" && error.keyword === "required"
    )
  );
  assert.ok(
    missingObjectIdErrors.some(
      (error) => error.instancePath === "/fields/0/ref" && error.keyword === "required"
    )
  );
});

test("standalone object schema rejects invalid relation cardinality", async () => {
  const validate = await createStandaloneSchemaValidator("object.schema.json");
  const objectSpec = {
    kind: "object",
    id: "Order",
    title: "Order",
    role: "entity",
    lifecycleField: "status",
    lifecycle: ["draft"],
    fields: [
      {
        id: "status",
        type: "OrderStatus",
        required: true,
        ref: {
          kind: "enum",
          objectId: "OrderStatus"
        }
      }
    ],
    relations: [
      {
        id: "belongsToCustomer",
        kind: "reference",
        target: "Customer",
        cardinality: "many"
      }
    ]
  };

  const errors = assertSchemaValidationFails(validate, objectSpec);

  assert.ok(
    errors.some(
      (error) => error.instancePath === "/relations/0/cardinality" && error.keyword === "enum"
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

test("standalone vnext canonical index schema accepts directory references and file collections", async () => {
  const validate = await createVnextSchemaValidator("canonical-index.schema.json");
  const indexSpec = {
    version: 3,
    id: "approval-flow-vnext",
    title: "Approval Flow vNext",
    summary: "Preview vNext canonical index with mixed collection reference styles.",
    model: {
      contexts: "./contexts",
      actors: ["./actors/requester.actor.yaml", "./actors/approver.actor.yaml"],
      systems: "./systems",
      scenarios: "./scenarios",
      messages: "./messages",
      aggregates: "./aggregates",
      policies: "./policies"
    }
  };

  assertSchemaValidationPasses(validate, indexSpec);
});

test("standalone vnext canonical index schema rejects legacy domain keys", async () => {
  const validate = await createVnextSchemaValidator("canonical-index.schema.json");
  const indexSpec = {
    version: 3,
    id: "approval-flow-vnext",
    title: "Approval Flow vNext",
    summary: "Incorrectly tries to keep the old domain-centered shape.",
    domain: {
      objects: ["./objects/request.object.yaml"]
    }
  };

  const errors = assertSchemaValidationFails(validate, indexSpec);

  assert.ok(
    errors.some(
      (error) =>
        (error.instancePath === "" || error.instancePath === "/") &&
        (error.keyword === "required" || error.keyword === "additionalProperties")
    )
  );
});

test("standalone vnext aggregate schema accepts explicit lifecycle complexity declarations", async () => {
  const validate = await createVnextSchemaValidator("aggregate.schema.json");
  const aggregateSpec = {
    kind: "aggregate",
    id: "order",
    title: "Order",
    summary: "Tracks order state transitions that deserve a dedicated lifecycle view.",
    context: "orders",
    lifecycleComplexity: true,
    states: ["draft", "submitted", "confirmed"],
    initialState: "draft",
    transitions: [
      {
        id: "submit-order",
        from: "draft",
        to: "submitted",
        onMessage: "submit-order"
      }
    ]
  };

  assertSchemaValidationPasses(validate, aggregateSpec);
});

test("standalone vnext aggregate schema rejects non-boolean lifecycle complexity markers", async () => {
  const validate = await createVnextSchemaValidator("aggregate.schema.json");
  const aggregateSpec = {
    kind: "aggregate",
    id: "order",
    title: "Order",
    summary: "Tracks order state transitions that deserve a dedicated lifecycle view.",
    context: "orders",
    lifecycleComplexity: "high",
    states: ["draft", "submitted"],
    initialState: "draft",
    transitions: [
      {
        id: "submit-order",
        from: "draft",
        to: "submitted",
        onMessage: "submit-order"
      }
    ]
  };

  const errors = assertSchemaValidationFails(validate, aggregateSpec);

  assert.ok(
    errors.some(
      (error) =>
        error.instancePath === "/lifecycleComplexity" &&
        error.keyword === "type"
    )
  );
});

test("minimal vnext canonical example validates against v3 schemas", async () => {
  const index = await loadYamlFile<VnextCanonicalIndexSpec>(
    join(VNEXT_EXAMPLE_ROOT_PATH, "index.yaml")
  );
  const validateIndex = await createVnextSchemaValidator("canonical-index.schema.json");

  assertSchemaValidationPasses(validateIndex, index);

  for (const collection of VNEXT_MODEL_COLLECTIONS) {
    const validateEntry = await createVnextSchemaValidator(collection.schemaFile);
    const filePaths = await resolveVnextCollectionPaths(
      VNEXT_EXAMPLE_ROOT_PATH,
      index.model[collection.key],
      collection.suffix
    );

    assert.ok(filePaths.length > 0, `${collection.key} should contain at least one schema file`);

    for (const filePath of filePaths) {
      const document = await loadYamlFile<Record<string, unknown>>(filePath);

      assertSchemaValidationPasses(validateEntry, document);
    }
  }
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
    /Command confirmConnection target MissingObject must reference existing object/
  );
});

test("semantic validation rejects invalid object roles", async () => {
  const spec = cloneBusinessSpec(await loadConnectionCardReviewFixture());
  const objects = asMutableArray(spec.domain.objects);
  const connectionObject = objects.find((object) => object.id === "Connection");

  assert.ok(connectionObject);
  (connectionObject as typeof connectionObject & { role: string }).role = "aggregate";

  assert.throws(
    () => {
      validateBusinessSpecSemantics(spec);
    },
    /Object Connection role aggregate must be one of entity, value-object, enum/
  );
});

test("semantic validation rejects enum objects without values", async () => {
  const spec = cloneBusinessSpec(await loadConnectionCardReviewFixture());
  const objects = asMutableArray(spec.domain.objects);
  const enumObject = objects.find((object) => object.id === "ConnectionStatus");

  assert.ok(enumObject && enumObject.role === "enum");
  delete (enumObject as { values?: unknown }).values;

  assert.throws(
    () => {
      validateBusinessSpecSemantics(spec);
    },
    /Object ConnectionStatus role enum values must be a non-empty array/
  );
});

test("semantic validation rejects entity objects declaring enum values", async () => {
  const spec = cloneBusinessSpec(await loadConnectionCardReviewFixture());
  const objects = asMutableArray(spec.domain.objects);
  const connectionObject = objects.find((object) => object.id === "Connection");

  assert.ok(connectionObject && connectionObject.role === "entity");
  (connectionObject as typeof connectionObject & { values?: readonly string[] }).values = [
    "suggested"
  ];

  assert.throws(
    () => {
      validateBusinessSpecSemantics(spec);
    },
    /Object Connection role entity cannot declare values/
  );
});

test("semantic validation rejects enum objects declaring aggregate-only fields", async () => {
  const spec = cloneBusinessSpec(await loadConnectionCardReviewFixture());
  const objects = asMutableArray(spec.domain.objects);
  const enumObject = objects.find((object) => object.id === "ConnectionStatus");

  assert.ok(enumObject && enumObject.role === "enum");
  (enumObject as typeof enumObject & { fields?: unknown[] }).fields = [];

  assert.throws(
    () => {
      validateBusinessSpecSemantics(spec);
    },
    /Object ConnectionStatus role enum cannot declare fields/
  );
});

test("semantic validation rejects enum fields targeting non-enum objects", async () => {
  const spec = cloneBusinessSpec(await loadConnectionCardReviewFixture());
  const objects = spec.domain.objects as typeof spec.domain.objects extends readonly (infer Item)[]
    ? Item[]
    : never;
  const connectionObject = objects.find((object) => object.id === "Connection");

  assert.ok(connectionObject && connectionObject.role === "entity");

  const fields = connectionObject.fields as typeof connectionObject.fields extends readonly (infer Item)[]
    ? Item[]
    : never;
  const statusField = fields.find((field) => field.id === "status");

  assert.ok(statusField);
  assert.ok(statusField.ref);
  statusField.ref.objectId = "Connection";

  assert.throws(
    () => {
      validateBusinessSpecSemantics(spec);
    },
    /Object Connection field status enum target Connection must reference enum object/
  );
});

test("semantic validation rejects field references targeting missing objects", async () => {
  const spec = cloneBusinessSpec(await loadConnectionCardReviewFixture());
  const objects = asMutableArray(spec.domain.objects);
  const cardObject = objects.find((object) => object.id === "Card");

  assert.ok(cardObject && cardObject.role === "entity");

  const fields = asMutableArray(cardObject.fields);
  const connectionField = fields.find((field) => field.id === "connectionId");

  assert.ok(connectionField);
  assert.ok(connectionField.ref);
  connectionField.ref.objectId = "MissingObject";

  assert.throws(
    () => {
      validateBusinessSpecSemantics(spec);
    },
    /Object Card field connectionId reference target MissingObject must reference existing object/
  );
});

test("semantic validation rejects malformed field refs", async () => {
  const spec = cloneBusinessSpec(await loadConnectionCardReviewFixture());
  const objects = spec.domain.objects as typeof spec.domain.objects extends readonly (infer Item)[]
    ? Item[]
    : never;
  const cardObject = objects.find((object) => object.id === "Card");

  assert.ok(cardObject && cardObject.role === "entity");

  const fields = cardObject.fields as typeof cardObject.fields extends readonly (infer Item)[]
    ? Item[]
    : never;
  const connectionField = fields.find((field) => field.id === "connectionId");

  assert.ok(connectionField);
  assert.ok(connectionField.ref);
  delete (connectionField.ref as { kind?: unknown }).kind;

  assert.throws(
    () => {
      validateBusinessSpecSemantics(spec);
    },
    /Object Card field connectionId ref.kind undefined must be one of enum, composition, reference/
  );
});

test("semantic validation rejects object relations that duplicate field refs", async () => {
  const spec = cloneBusinessSpec(await loadConnectionCardReviewFixture());
  const objects = asMutableArray(spec.domain.objects);
  const cardObject = objects.find((object) => object.id === "Card");

  assert.ok(cardObject && cardObject.role === "entity");
  cardObject.relations = [
    {
      id: "sourceConnection",
      kind: "reference",
      target: "Connection"
    }
  ];

  assert.throws(
    () => {
      validateBusinessSpecSemantics(spec);
    },
    /Object Card relation sourceConnection duplicates field-level relation reference -> Connection/
  );
});

test("semantic validation rejects object relations targeting missing objects", async () => {
  const spec = cloneBusinessSpec(await loadConnectionCardReviewFixture());
  const objects = asMutableArray(spec.domain.objects);
  const cardObject = objects.find((object) => object.id === "Card");

  assert.ok(cardObject && cardObject.role === "entity");
  cardObject.relations = [
    {
      id: "missingConnection",
      kind: "reference",
      target: "MissingObject"
    }
  ];

  assert.throws(
    () => {
      validateBusinessSpecSemantics(spec);
    },
    /Object Card relation missingConnection target MissingObject must reference existing object/
  );
});

test("semantic validation rejects composition refs targeting aggregate roots", async () => {
  const spec = cloneBusinessSpec(await loadConnectionCardReviewFixture());
  const objects = asMutableArray(spec.domain.objects);
  const cardObject = objects.find((object) => object.id === "Card");

  assert.ok(cardObject && cardObject.role === "entity");
  const fields = asMutableArray(cardObject.fields);
  const contentField = fields.find((field) => field.id === "content");

  assert.ok(contentField && contentField.ref);
  contentField.ref.objectId = "Connection";

  assert.throws(
    () => {
      validateBusinessSpecSemantics(spec);
    },
    /Object Card field content composition target Connection cannot reference aggregate root object/
  );
});

test("semantic validation rejects multiple composition parents", async () => {
  const spec = cloneBusinessSpec(await loadConnectionCardReviewFixture());
  const objects = asMutableArray(spec.domain.objects);
  const connectionObject = objects.find((object) => object.id === "Connection");

  assert.ok(connectionObject && connectionObject.role === "entity");
  connectionObject.relations = [
    {
      id: "alsoOwnsContent",
      kind: "composition",
      target: "CardContent"
    }
  ];

  assert.throws(
    () => {
      validateBusinessSpecSemantics(spec);
    },
    /Object CardContent cannot have more than one composition parent: Card, Connection/
  );
});

test("semantic validation rejects invalid object relation cardinality", async () => {
  const spec = cloneBusinessSpec(await loadConnectionCardReviewFixture());
  const objects = asMutableArray(spec.domain.objects);
  const cardObject = objects.find((object) => object.id === "Card");

  assert.ok(cardObject && cardObject.role === "entity");
  cardObject.relations = [
    {
      id: "relatedConnection",
      kind: "reference",
      target: "Connection",
      cardinality: "many" as unknown as "1"
    }
  ];

  assert.throws(
    () => {
      validateBusinessSpecSemantics(spec);
    },
    /Object Card relation relatedConnection cardinality many must be one of 1, 0\.\.1, 0\.\.n, 1\.\.n/
  );
});

test("semantic validation rejects aggregates targeting missing objects", async () => {
  const spec = cloneBusinessSpec(await loadConnectionCardReviewFixture());
  const aggregates = asMutableArray(spec.domain.aggregates);

  aggregates.push({
    ...aggregates[0],
    objectId: "MissingObject"
  });

  assert.throws(
    () => {
      validateBusinessSpecSemantics(spec);
    },
    /Aggregate MissingObject objectId must reference existing object/
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

function asMutableArray<Value>(values: readonly Value[]): Value[] {
  return values as Value[];
}

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

async function createVnextSchemaValidator(schemaFileName: string): Promise<JsonSchemaValidator> {
  const schemaFileNames = (await readdir(VNEXT_SCHEMA_DIR_PATH))
    .filter((fileName) => fileName.endsWith(".json"))
    .sort();
  const rootSchemaSource = await readFile(join(VNEXT_SCHEMA_DIR_PATH, schemaFileName), "utf8");
  const Ajv2020 = (await import("ajv/dist/2020.js")).default as unknown as Ajv2020Constructor;
  const ajv = new Ajv2020({ allErrors: true, strict: false });

  for (const fileName of schemaFileNames) {
    if (fileName === schemaFileName) {
      continue;
    }

    const schemaSource = await readFile(join(VNEXT_SCHEMA_DIR_PATH, fileName), "utf8");
    ajv.addSchema(JSON.parse(schemaSource) as object);
  }

  return ajv.compile(JSON.parse(rootSchemaSource) as object);
}

async function resolveVnextCollectionPaths(
  rootPath: string,
  reference: string | readonly string[],
  suffix: string
): Promise<readonly string[]> {
  if (Array.isArray(reference)) {
    return reference.map((relativePath) => join(rootPath, relativePath));
  }

  const dirPath = join(rootPath, reference);
  const fileNames = (await readdir(dirPath))
    .filter((fileName) => fileName.endsWith(suffix))
    .sort();

  return fileNames.map((fileName) => join(dirPath, fileName));
}

async function loadYamlFile<Value>(filePath: string): Promise<Value> {
  const source = await readFile(filePath, "utf8");

  return YAML.parse(source) as Value;
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
