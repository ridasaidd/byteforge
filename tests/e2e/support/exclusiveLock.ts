import { mkdir, open, unlink } from 'node:fs/promises';
import { join } from 'node:path';

const LOCK_DIR = '/tmp/byteforge-playwright-locks';

async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function acquireExclusiveLock(
  name: string,
  timeoutMs = 120000,
  pollMs = 250,
): Promise<() => Promise<void>> {
  await mkdir(LOCK_DIR, { recursive: true });

  const lockPath = join(LOCK_DIR, `${name}.lock`);
  const deadline = Date.now() + timeoutMs;

  while (true) {
    try {
      const handle = await open(lockPath, 'wx');
      await handle.writeFile(`${process.pid}`);
      await handle.close();

      return async () => {
        await unlink(lockPath).catch(() => undefined);
      };
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;

      if (code !== 'EEXIST') {
        throw error;
      }

      if (Date.now() >= deadline) {
        throw new Error(`Timed out waiting for exclusive lock: ${name}`);
      }

      await wait(pollMs);
    }
  }
}

export async function withExclusiveLock<T>(name: string, callback: () => Promise<T>): Promise<T> {
  const release = await acquireExclusiveLock(name);

  try {
    return await callback();
  } finally {
    await release();
  }
}