import fs from 'node:fs/promises';
import path from 'node:path';

const [, , inputPath, outputRoot = 'InformationGraph'] = process.argv;

if (!inputPath) {
  console.error('Usage: node scripts/exportInformationGraphJson.mjs <graph-doc.json> [output-root]');
  process.exit(1);
}

const raw = await fs.readFile(inputPath, 'utf8');
const doc = JSON.parse(raw);
const sceneId = doc.sceneId ?? 'unknown_scene';
const runId = doc.runId ?? `conversation_${doc.conversationId ?? 'unknown'}`;
const round = doc.currentRound ?? 0;
const outputDir = path.join(outputRoot, sceneId, runId, `round_${round}`);
const outputPath = path.join(outputDir, 'information_graph.json');

await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(
  outputPath,
  JSON.stringify(
    {
      sceneId,
      runId,
      conversationId: doc.conversationId,
      currentRound: round,
      exportPath: doc.exportPath,
      graph: doc.graph,
    },
    null,
    2,
  ),
  'utf8',
);

console.log(outputPath);
