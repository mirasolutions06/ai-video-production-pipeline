import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs-extra';
import { logger } from '../utils/logger.js';
import {
  hashKlingRequest,
  getCacheManifestPath,
  loadCacheManifest,
  saveCacheEntry,
} from '../utils/cache.js';
import { extractLastFrame } from './frames.js';
import type { KlingOptions } from '../types/index.js';

const KLING_BASE_URL = 'https://api.klingai.com';
const MAX_POLL_ATTEMPTS = 60; // 10 minutes at 10s intervals
const POLL_INTERVAL_MS = 10_000;

/**
 * Generates a short-lived JWT for Kling API authentication.
 * Token is valid for 30 minutes. Regenerated before each request to avoid expiry.
 *
 * Kling JWT format:
 * - Header: { alg: "HS256", typ: "JWT" }
 * - Payload: { iss: <api_key>, exp: <now + 1800>, nbf: <now - 5> }
 * - Signed with HMAC-SHA256 using the API secret
 */
function generateKlingToken(): string {
  const apiKey = process.env['KLING_API_KEY'];
  const apiSecret = process.env['KLING_API_SECRET'];

  if (!apiKey || !apiSecret) {
    throw new Error('KLING_API_KEY and KLING_API_SECRET must be set in .env');
  }

  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    { iss: apiKey, exp: now + 1800, nbf: now - 5 },
    apiSecret,
    { algorithm: 'HS256', header: { alg: 'HS256', typ: 'JWT' } },
  );
}

/**
 * Polls a Kling task until it completes or fails.
 * Uses exponential-ish polling with a fixed 10s interval (Kling tasks take 1-5 minutes).
 *
 * @param taskId - Task ID returned by the Kling submission endpoint
 * @param pollEndpoint - Endpoint path to poll (e.g. /v1/videos/text2video)
 * @returns Video download URL on success
 */
async function pollKlingTask(taskId: string, pollEndpoint: string): Promise<string> {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    await new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

    const token = generateKlingToken();
    const response = await fetch(`${KLING_BASE_URL}${pollEndpoint}/${taskId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error(
        `Kling poll failed for task ${taskId}: HTTP ${response.status} — ${await response.text()}`,
      );
    }

    const data = await response.json() as {
      data?: {
        task_status?: string;
        task_result?: { videos?: Array<{ url?: string }> };
      };
    };

    const status = data.data?.task_status;
    const videos = data.data?.task_result?.videos;

    logger.info(
      `Kling task ${taskId}: ${status ?? 'unknown'} (poll ${attempt + 1}/${MAX_POLL_ATTEMPTS})`,
    );

    if (status === 'succeed') {
      const url = videos?.[0]?.url;
      if (!url) {
        throw new Error(
          `Kling task ${taskId} succeeded but returned no video URL. ` +
          `Check the Kling dashboard for the completed task.`,
        );
      }
      return url;
    }

    if (status === 'failed') {
      throw new Error(
        `Kling task ${taskId} failed. ` +
        `Check your prompt for content policy violations or try a different model.`,
      );
    }
    // status === 'processing' or 'submitted' → keep polling
  }

  throw new Error(
    `Kling task ${taskId} timed out after ${(MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS) / 60_000} minutes. ` +
    `The task may still be running — check the Kling dashboard and download manually if needed.`,
  );
}

/**
 * Downloads a video from a URL and saves it to disk.
 */
async function downloadVideo(url: string, destPath: string): Promise<void> {
  await fs.ensureDir(path.dirname(destPath));
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(
      `Failed to download video from Kling CDN: HTTP ${response.status}. ` +
      `URL: ${url}`,
    );
  }
  const buffer = await response.arrayBuffer();
  await fs.writeFile(destPath, Buffer.from(buffer));
}

/**
 * Generates a Kling video clip from a text prompt (text-to-video mode).
 */
async function generateTextToVideo(
  prompt: string,
  options: KlingOptions,
  outputPath: string,
): Promise<void> {
  const token = generateKlingToken();
  const model = options.model ?? 'kling-v1-5';

  const response = await fetch(`${KLING_BASE_URL}/v1/videos/text2video`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model_name: model,
      prompt,
      aspect_ratio: options.aspectRatio,
      duration: String(options.duration),
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Kling text2video submission failed: HTTP ${response.status} — ${body}\n` +
      `Prompt: "${prompt.slice(0, 100)}"`,
    );
  }

  const data = await response.json() as { data?: { task_id?: string } };
  const taskId = data.data?.task_id;
  if (!taskId) {
    throw new Error(
      `Kling text2video did not return a task_id. Response: ${JSON.stringify(data)}`,
    );
  }

  logger.step(`Kling text-to-video task submitted: ${taskId}. Polling for completion...`);
  const videoUrl = await pollKlingTask(taskId, '/v1/videos/text2video');
  await downloadVideo(videoUrl, outputPath);
}

/**
 * Generates a Kling video clip from a storyboard image (image-to-video mode).
 * The image is base64-encoded and sent inline with the request.
 */
async function generateImageToVideo(
  prompt: string,
  imageReferencePath: string,
  options: KlingOptions,
  outputPath: string,
): Promise<void> {
  const token = generateKlingToken();
  const model = options.model ?? 'kling-v1-5';

  const imageBuffer = await fs.readFile(imageReferencePath);
  const base64Image = imageBuffer.toString('base64');
  const ext = path.extname(imageReferencePath).toLowerCase().slice(1);
  const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';

  const response = await fetch(`${KLING_BASE_URL}/v1/videos/image2video`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model_name: model,
      prompt,
      image: `data:${mimeType};base64,${base64Image}`,
      aspect_ratio: options.aspectRatio,
      duration: String(options.duration),
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Kling image2video submission failed: HTTP ${response.status} — ${body}\n` +
      `Image: ${imageReferencePath}`,
    );
  }

  const data = await response.json() as { data?: { task_id?: string } };
  const taskId = data.data?.task_id;
  if (!taskId) {
    throw new Error(
      `Kling image2video did not return a task_id. Response: ${JSON.stringify(data)}`,
    );
  }

  logger.step(`Kling image-to-video task submitted: ${taskId}. Polling for completion...`);
  const videoUrl = await pollKlingTask(taskId, '/v1/videos/image2video');
  await downloadVideo(videoUrl, outputPath);
}

/**
 * Main entry point for Kling clip generation.
 *
 * Checks the cache first. If a clip with the same prompt + options was already
 * generated for this project, returns the cached path without hitting the API.
 *
 * After generation, automatically extracts the last frame and saves it to
 * assets/storyboard/scene-N-lastframe.png for use in Gemini's feedback loop.
 *
 * @param prompt - Scene description
 * @param options - Aspect ratio, duration, model, project context (projectName, sceneIndex)
 * @param projectsRoot - Root folder containing all projects
 * @param imageReference - Optional path to Gemini storyboard image (enables image-to-video mode)
 * @returns Absolute path to the downloaded .mp4 clip
 */
export async function generateKlingClip(
  prompt: string,
  options: KlingOptions,
  projectsRoot: string,
  imageReference?: string,
): Promise<string> {
  const { projectName, sceneIndex, ...hashableOptions } = options;

  // Build cache hash from prompt + options (excluding project-specific context)
  const cacheHash = hashKlingRequest(prompt, {
    ...hashableOptions,
    imageReference: imageReference ?? null,
  });

  const manifestPath = getCacheManifestPath(projectsRoot, projectName);
  const manifest = await loadCacheManifest(manifestPath);

  const cachedEntry = manifest[cacheHash];
  if (cachedEntry !== undefined) {
    if (await fs.pathExists(cachedEntry.clipPath)) {
      logger.skip(`Using cached Kling clip for scene ${sceneIndex}: ${cachedEntry.clipPath}`);
      return cachedEntry.clipPath;
    }
    // Cache entry exists but file is missing — regenerate
    logger.warn(
      `Cache entry found for scene ${sceneIndex} but file is missing. Regenerating...`,
    );
  }

  const outputPath = path.join(
    projectsRoot,
    projectName,
    'output/clips',
    `scene-${sceneIndex}.mp4`,
  );

  logger.step(
    imageReference
      ? `Generating Kling image-to-video for scene ${sceneIndex}...`
      : `Generating Kling text-to-video for scene ${sceneIndex}...`,
  );

  if (imageReference) {
    await generateImageToVideo(prompt, imageReference, options, outputPath);
  } else {
    await generateTextToVideo(prompt, options, outputPath);
  }

  logger.success(`Kling clip saved: ${outputPath}`);

  // Save to cache manifest
  await saveCacheEntry(manifestPath, cacheHash, outputPath);

  // Extract last frame for Gemini visual continuity feedback loop
  await extractLastFrame(outputPath, sceneIndex, projectsRoot, projectName);

  return outputPath;
}
