/**
 * Append-only session log for reproducibility (Phase 7). No React dependency.
 */

export type SessionEvent = {
  ts: number;
  type: string;
  payload?: Record<string, unknown>;
};

const events: SessionEvent[] = [];

export function sessionEventAppend(type: string, payload?: Record<string, unknown>): void {
  events.push({ ts: Date.now(), type, payload });
}

export function sessionEventClear(): void {
  events.length = 0;
}

export function sessionEventGetAll(): readonly SessionEvent[] {
  return events;
}

export function sessionEventExportObject(): { exportedAt: number; events: SessionEvent[] } {
  return { exportedAt: Date.now(), events: [...events] };
}

export function sessionEventExportJson(): string {
  return JSON.stringify(sessionEventExportObject(), null, 2);
}
