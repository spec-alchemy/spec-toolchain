import type {
  FieldSpec,
  ObjectSpec
} from "./spec.js";

export function hasDescription(description?: string): description is string {
  return Boolean(description && description.trim().length > 0);
}

export function resolveFieldDescription(
  field: FieldSpec,
  object?: ObjectSpec
): string | undefined {
  if (hasDescription(field.description)) {
    return field.description.trim();
  }

  const matchingObjectField = object?.fields.find((candidate) => candidate.id === field.id);

  if (hasDescription(matchingObjectField?.description)) {
    return matchingObjectField.description.trim();
  }

  return undefined;
}

export function hasFieldExplanation(field: FieldSpec, object?: ObjectSpec): boolean {
  return resolveFieldDescription(field, object) !== undefined;
}
