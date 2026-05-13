import type {
  WorldMemorySnapshot,
  MemorySnapshotEntry,
} from "../../convex/agent/memory.ts";

export type MemoryFileEntry = {
  filePath: string;
  content: string;
};

export type CharacterMemoryDocument = {
  version: 1;
  generatedAt: number;
  worldId: string;
  playerId: string;
  name: string;
  character: string;
  personality: {
    identity: string;
    plan: string;
    publicProfile?: string;
  };
  thoughts: MemorySnapshotEntry[];
  observations: MemorySnapshotEntry[];
  conversationExperiences: MemorySnapshotEntry[];
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function sanitizeFileToken(value: string) {
  return value
    .replace(/[<>:"/\\|?*\x00-\x1f]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/\.+$/g, "")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .toLowerCase();
}

function characterMemoryFileName(
  character: string,
  name: string,
  playerId: string,
) {
  const byName = slugify(name);
  const fallback = sanitizeFileToken(playerId);
  const suffix = byName || fallback || "unknown";
  return `${sanitizeFileToken(character) || "character"}-${suffix}.json`;
}

function memorySort(a: MemorySnapshotEntry, b: MemorySnapshotEntry) {
  return b.lastAccess - a.lastAccess || b._creationTime - a._creationTime;
}

export function buildCharacterMemoryDocument(
  snapshot: WorldMemorySnapshot["characters"][number],
  worldId: string,
  generatedAt: number,
): CharacterMemoryDocument {
  return {
    version: 1,
    generatedAt,
    worldId,
    playerId: snapshot.playerId,
    name: snapshot.name,
    character: snapshot.character,
    personality: {
      identity: snapshot.identity,
      plan: snapshot.plan,
      publicProfile: snapshot.publicProfile,
    },
    thoughts: [...snapshot.memories.reflection].sort(memorySort),
    observations: [...snapshot.memories.relationship].sort(memorySort),
    conversationExperiences: [...snapshot.memories.conversation].sort(
      memorySort,
    ),
  };
}

export function buildMemoryFiles(
  snapshot: WorldMemorySnapshot,
): MemoryFileEntry[] {
  const generatedAt = snapshot.updatedAt;
  const files = snapshot.characters.map((character) => {
    const document = buildCharacterMemoryDocument(
      character,
      String(snapshot.worldId),
      generatedAt,
    );
    const fileName = characterMemoryFileName(
      character.character,
      character.name,
      character.playerId,
    );
    return {
      filePath: fileName,
      content: JSON.stringify(document, null, 2),
    } satisfies MemoryFileEntry;
  });

  const indexDocument = {
    version: 1 as const,
    generatedAt,
    worldId: String(snapshot.worldId),
    characters: snapshot.characters.map((character) => ({
      playerId: character.playerId,
      name: character.name,
      character: character.character,
      filePath: characterMemoryFileName(
        character.character,
        character.name,
        character.playerId,
      ),
      counts: {
        thoughts: character.memories.reflection.length,
        observations: character.memories.relationship.length,
        conversationExperiences: character.memories.conversation.length,
      },
    })),
  };

  files.push({
    filePath: "index.json",
    content: JSON.stringify(indexDocument, null, 2),
  });

  return files;
}
