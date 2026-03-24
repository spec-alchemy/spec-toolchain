import type { AggregateSpec } from "../../canonical/index.js";
import { sendParent } from "xstate";

export type CanonicalMessageEnvelope = {
  type: string;
} & Record<string, unknown>;

export function projectAggregateMachineStates(aggregate: AggregateSpec): Record<string, object> {
  return Object.fromEntries(
    Object.entries(aggregate.states).map(([stateId, state]) => {
      // 把 canonical 中的 command -> target -> emit 规则翻译成 XState 可执行的 on 配置。
      const on = state.on
        ? Object.fromEntries(
            Object.entries(state.on).map(([commandType, transition]) => {
              return [
                commandType,
                {
                  target: transition.target,
                  actions: sendParent(({ event }) => ({
                    type: transition.emit.type,
                    ...projectEventPayload(event as CanonicalMessageEnvelope, transition.emit.payloadFrom)
                  }))
                }
              ];
            })
          )
        : undefined;

      return [stateId, on ? { on } : {}];
    })
  );
}

function projectEventPayload(
  command: CanonicalMessageEnvelope,
  payloadFrom: Record<string, string>
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(payloadFrom).map(([fieldId, reference]) => {
      return [fieldId, resolveCommandReference(command, reference)];
    })
  );
}

function resolveCommandReference(command: CanonicalMessageEnvelope, reference: string): unknown {
  const prefix = "$command.";

  if (!reference.startsWith(prefix)) {
    throw new Error(`Unsupported payload reference: ${reference}`);
  }

  return command[reference.slice(prefix.length)];
}
