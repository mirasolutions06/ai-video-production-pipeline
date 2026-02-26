#!/usr/bin/env node
import 'dotenv/config';
import { program } from 'commander';
import { runPipeline } from '../pipeline/index.js';
import { listVoices } from '../pipeline/elevenlabs.js';
import { logger } from '../utils/logger.js';

program
  .requiredOption('--project <name>', 'Project name to run the pipeline for')
  .option('--list-voices', 'List available ElevenLabs voices and exit')
  .parse();

const opts = program.opts<{ project: string; listVoices?: boolean }>();

async function main(): Promise<void> {
  if (opts.listVoices === true) {
    await listVoices();
    return;
  }

  logger.step(`Starting pipeline for project: ${opts.project}`);

  const finalPath = await runPipeline(opts.project);
  logger.success(`Pipeline complete! Final video: ${finalPath}`);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  logger.error(`Pipeline failed: ${message}`);
  if (err instanceof Error && err.stack) {
    logger.info(err.stack);
  }
  process.exit(1);
});
