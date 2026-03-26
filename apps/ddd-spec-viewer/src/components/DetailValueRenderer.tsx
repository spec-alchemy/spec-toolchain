import React from "react";
import type {
  ViewerDetailValue,
  ViewerFieldRelationDetailValue
} from "../types";

interface DetailValueRendererProps {
  value: ViewerDetailValue;
}

export function DetailValueRenderer({ value }: DetailValueRendererProps) {
  switch (value.kind) {
    case "text":
      return (
        <div
          className="whitespace-pre-wrap text-[13px] leading-6 text-foreground/90"
          data-component="detail-value"
          data-kind="text"
        >
          {value.text}
        </div>
      );
    case "section":
      return (
        <section className="space-y-2" data-component="detail-value" data-kind="section">
          {value.title ? (
            <p
              className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted-foreground"
              data-slot="section-title"
            >
              {value.title}
            </p>
          ) : null}
          <div className="space-y-2" data-slot="section-children">
            {value.children.map((child, index) => (
              <DetailValueRenderer
                key={`section-${value.title ?? "untitled"}-${index}`}
                value={child}
              />
            ))}
          </div>
        </section>
      );
    case "list":
      return (
        <div className="space-y-2" data-component="detail-value" data-kind="list">
          {value.items.map((item, index) => (
            <DetailValueRenderer key={`list-item-${index}`} value={item} />
          ))}
        </div>
      );
    case "record":
      return (
        <dl
          className="grid gap-2 rounded-xl border border-border/70 bg-background/75 p-2.5"
          data-component="detail-value"
          data-kind="record"
        >
          {value.entries.map((entry, index) => (
            <div
              className="grid gap-1"
              data-slot="record-entry"
              key={`record-entry-${entry.label}-${index}`}
            >
              <dt className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted-foreground">
                {entry.label}
              </dt>
              <dd className="m-0">
                <DetailValueRenderer value={entry.value} />
              </dd>
            </div>
          ))}
        </dl>
      );
    case "field":
      return (
        <article
          className="rounded-xl border border-border/70 bg-background/75 p-2.5"
          data-component="detail-value"
          data-kind="field"
        >
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-[13px] font-semibold text-foreground">{value.name}</span>
            <span className="text-[12px] leading-5 text-muted-foreground">
              {formatFieldMetadata(value)}
            </span>
          </div>
          {value.description ? (
            <p className="mt-1.5 text-[13px] leading-6 text-foreground/85">{value.description}</p>
          ) : null}
        </article>
      );
  }
}

function formatFieldMetadata(value: Extract<ViewerDetailValue, { kind: "field" }>): string {
  return [
    value.fieldType,
    value.required ? "required" : "optional",
    value.relation ? formatFieldRelation(value.relation) : "scalar value"
  ].join(" · ");
}

function formatFieldRelation(relation: ViewerFieldRelationDetailValue): string {
  const relationLabel = (() => {
    switch (relation.kind) {
      case "reference":
        return `references ${relation.target}`;
      case "composition":
        return `owns ${relation.target}`;
      case "enum":
        return `uses enum ${relation.target}`;
    }
  })();

  return relation.cardinality ? `${relationLabel} (${relation.cardinality})` : relationLabel;
}
