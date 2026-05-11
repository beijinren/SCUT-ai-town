import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Plugin } from 'vite';

function memoryFileWriterPlugin(): Plugin {
  const memoryDir = path.resolve(process.cwd(), 'memory');

  return {
    name: 'memory-file-writer',
    configureServer(server) {
      server.middlewares.use('/__memory_sync', async (req, res, next) => {
        if (req.method !== 'POST') {
          next();
          return;
        }

        try {
          const chunks: Buffer[] = [];
          for await (const chunk of req) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          }
          const rawBody = Buffer.concat(chunks).toString('utf8');
          const parsed = JSON.parse(rawBody) as {
            files?: Array<{ filePath: string; content: string }>;
          };
          if (!Array.isArray(parsed.files)) {
            throw new Error('Missing files payload.');
          }

          await fs.mkdir(memoryDir, { recursive: true });

          const expectedTopLevelFiles = new Set<string>();

          for (const file of parsed.files) {
            const normalized = file.filePath.replace(/^[/\\]+/, '');
            if (!normalized || normalized.includes('..')) {
              throw new Error(`Invalid memory file path: ${file.filePath}`);
            }
            expectedTopLevelFiles.add(normalized.split('/')[0]);
            const targetPath = path.resolve(memoryDir, normalized);
            if (!targetPath.startsWith(memoryDir)) {
              throw new Error(`Refusing to write outside memory directory: ${file.filePath}`);
            }
            await fs.mkdir(path.dirname(targetPath), { recursive: true });
            await fs.writeFile(targetPath, file.content, 'utf8');
          }

          const currentEntries = await fs.readdir(memoryDir, { withFileTypes: true });
          for (const entry of currentEntries) {
            if (!expectedTopLevelFiles.has(entry.name)) {
              const stalePath = path.resolve(memoryDir, entry.name);
              await fs.rm(stalePath, { recursive: true, force: true });
            }
          }

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true, written: parsed.files.length }));
        } catch (error) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              ok: false,
              error: error instanceof Error ? error.message : 'Unknown memory sync error',
            }),
          );
        }
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  base: '/ai-town',
  plugins: [react(), memoryFileWriterPlugin()],
  server: {
    allowedHosts: ['ai-town-your-app-name.fly.dev', 'localhost', '127.0.0.1'],
  },
});
