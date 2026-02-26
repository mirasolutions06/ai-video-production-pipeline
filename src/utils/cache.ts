import crypto from 'crypto';
import path from 'path';
import fs from 'fs-extra';
import type { KlingCacheManifest, KlingCacheEntry } from '../types/index.js';

/**
 * Generates a deterministic SHA-256 hash from a prompt + options object.
 * Used to identify whether a Kling clip has already been generated.
 */
export function hashKlingRequest(
  prompt: string,
  options: Record<string, unknown>,
): string {
  const payload = JSON.stringify({ prompt, ...options });
  return crypto.createHash('sha256').update(payload).digest('hex').slice(0, 16);
}

/**
 * Returns the path to the Kling cache manifest for a given project.
 */
export function getCacheManifestPath(projectsRoot: string, projectName: string): string {
  return path.join(projectsRoot, projectName, 'cache', 'kling-cache.json');
}

/**
 * Loads the Kling cache manifest for a project. Returns empty object if none exists.
 */
export async function loadCacheManifest(manifestPath: string): Promise<KlingCacheManifest> {
  if (!(await fs.pathExists(manifestPath))) return {};
  return fs.readJson(manifestPath) as Promise<KlingCacheManifest>;
}

/**
 * Saves an entry to the Kling cache manifest.
 */
export async function saveCacheEntry(
  manifestPath: string,
  hash: string,
  clipPath: string,
): Promise<void> {
  const manifest = await loadCacheManifest(manifestPath);
  const entry: KlingCacheEntry = {
    hash,
    clipPath,
    createdAt: new Date().toISOString(),
  };
  manifest[hash] = entry;
  await fs.outputJson(manifestPath, manifest, { spaces: 2 });
}
