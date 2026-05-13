import { useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { buildMemoryFiles } from "../memory/memory.ts";
import type { WorldMemorySnapshot } from "../../convex/agent/memory.ts";
import type { Id } from "../../convex/_generated/dataModel";

const MEMORY_SYNC_INTERVAL_MS = 30_000;
const MEMORY_SYNC_ENDPOINT = "/__memory_sync";

async function pushMemoryFiles(files: ReturnType<typeof buildMemoryFiles>) {
  const response = await fetch(MEMORY_SYNC_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ files }),
  });
  if (!response.ok) {
    throw new Error(`Memory sync failed with HTTP ${response.status}`);
  }
}

export function useMemoryAutoSync(worldId: Id<"worlds"> | undefined) {
  const enabled = import.meta.env.DEV;
  const snapshot = useQuery(
    api.agent.memory.getWorldMemorySnapshot,
    enabled && worldId ? { worldId } : "skip",
  ) as WorldMemorySnapshot | undefined | null;
  const snapshotRef = useRef<WorldMemorySnapshot | null | undefined>(snapshot);
  const lastSignatureRef = useRef("");

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    if (!snapshot) {
      return;
    }

    let cancelled = false;

    const sync = async () => {
      const currentSnapshot = snapshotRef.current;
      if (!currentSnapshot || cancelled) {
        return;
      }
      const files = buildMemoryFiles(currentSnapshot);
      const signature = JSON.stringify(files);
      if (signature === lastSignatureRef.current) {
        return;
      }
      await pushMemoryFiles(files);
      lastSignatureRef.current = signature;
    };

    void sync().catch((error) => {
      console.warn("Failed to sync memory files:", error);
    });

    const intervalId = window.setInterval(() => {
      void sync().catch((error) => {
        console.warn("Failed to sync memory files:", error);
      });
    }, MEMORY_SYNC_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [enabled, snapshot]);
}
