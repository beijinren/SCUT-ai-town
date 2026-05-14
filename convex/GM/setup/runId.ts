function sanitizeRunPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
}

export function createRunId(sceneId: string, now = Date.now(), randomPart?: string): string {
  const scenePart = sanitizeRunPart(sceneId) || 'scene';
  const suffix = randomPart ?? Math.random().toString(36).slice(2, 8);
  return `run_${scenePart}_${now}_${suffix}`;
}
