export function appendGMObservationToPrompt(systemPrompt: string, gmObservation: string) {
  // 只做后缀追加，不改原 prompt 主体，避免破坏既有 prompt 工程。
  const suffix = ['GM Observation:', gmObservation].join('\n');
  return `${systemPrompt}\n\n${suffix}`.trim();
}
