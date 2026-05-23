export function logCheckinStep(
  step: string,
  sessionId: string | undefined,
  startMs: number,
  extra?: Record<string, unknown>
): void {
  console.log(
    JSON.stringify({
      event: 'checkin',
      step,
      ms: Date.now() - startMs,
      sessionId: sessionId ?? null,
      ts: Date.now(),
      ...extra,
    })
  );
}
