import type { VideoConfig } from '../types/index.js';

/**
 * Validates that required environment variables are set.
 * Call this at pipeline start before any API calls.
 */
export function validateEnv(keys: string[]): void {
  const missing = keys.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      `Add them to your .env file and restart.`,
    );
  }
}

/**
 * Validates a VideoConfig object for required fields and logical consistency.
 * Throws descriptive errors so the user knows exactly what to fix.
 */
export function validateConfig(config: VideoConfig): void {
  if (!config.format) {
    throw new Error(
      `config.json is missing "format". ` +
      `Valid values: youtube-short | tiktok | ad-16x9 | ad-1x1 | web-hero`,
    );
  }

  if (!config.title) {
    throw new Error(`config.json is missing "title".`);
  }

  if (!Array.isArray(config.clips) || config.clips.length === 0) {
    throw new Error(
      `config.json "clips" array is empty. ` +
      `Add at least one clip with a "prompt" or "imageReference".`,
    );
  }

  for (let i = 0; i < config.clips.length; i++) {
    const clip = config.clips[i];
    if (!clip) throw new Error(`clips[${i}] is undefined`);
    if (!clip.prompt && !clip.imageReference && !clip.url) {
      throw new Error(
        `clips[${i}] has no "prompt", "imageReference", or "url". ` +
        `Each clip needs at least one of these.`,
      );
    }
  }

  if (config.music && config.musicVolume !== undefined) {
    if (config.musicVolume < 0 || config.musicVolume > 1) {
      throw new Error(`config.json "musicVolume" must be between 0 and 1.`);
    }
  }
}
