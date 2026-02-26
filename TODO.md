# TODO

## High Priority

- [ ] **Remotion bundle setup** — `renderMedia` in `src/pipeline/index.ts` currently passes `serveUrl: process.cwd()`. This needs `bundle()` from `@remotion/bundler` to produce a proper serve URL before calling `selectComposition`/`renderMedia`. Without this, Remotion can't resolve static files (clips, logo, etc.) at render time.

- [ ] **Static file serving for clips** — Kling clips live in `projects/[name]/output/clips/` but Remotion's `staticFile()` resolves relative to its public folder. Need to either symlink/copy clips into the bundle's public dir before rendering, or configure the bundle's `publicDir` to point at the project folder.

- [ ] **Wipe transition** — `TransitionType` includes `'wipe'` but only `'crossfade'` and `'cut'` are handled in compositions. Add the wipe presentation from `@remotion/transitions/wipe`.

- [ ] **Ad composition audio** — `Ad.tsx` has no voiceover or music. Add the same audio pattern from `YoutubeShort.tsx` so ad format supports narration.

## Medium Priority

- [ ] **ElevenLabs voice listing cache** — `listVoices()` hits the API every call. Cache the response to a local file (e.g. `~/.video-pipeline-voices.json`) and only refresh if >24h old.

- [ ] **Kling model selection per clip** — `model` is set globally in the pipeline (`kling-v1-5`). Expose it as a per-clip option in `KlingClip` and thread it through to `generateKlingClip`.

- [ ] **Multi-format output from one project** — Allow a single project to produce multiple formats (e.g. both `youtube-short` and `ad-1x1`) without duplicating the project folder.

- [ ] **`--dry-run` flag** — Add to `run-pipeline.ts` to validate config, load assets, and report what would happen without making any API calls.

- [ ] **`--skip-kling` flag** — Skip video generation and use whatever clips already exist in `output/clips/`. Useful when iterating on captions, audio, or Remotion compositions.

- [ ] **`--skip-voiceover` flag** — Similar skip for ElevenLabs when only re-rendering visuals.

## Lower Priority

- [ ] **Scene duration auto-calculation** — If `captions` is enabled and a script is provided, calculate optimal per-clip duration from the voiceover length divided by number of clips, rather than requiring manual duration in each clip.

- [ ] **Music looping/trimming** — Current implementation plays music as-is. If the music track is shorter than the video, it cuts out. Add FFmpeg-based loop-and-trim before passing to Remotion.

- [ ] **SFX support** — `assets/audio/sfx/` folder exists but nothing reads it. Add SFX trigger points to `KlingClip` (e.g. `sfx: 'swoosh'`) and play them at scene transitions.

- [ ] **Subtitle file export** — After Whisper transcription, export an `.srt` file to `output/audio/captions.srt` for platforms that accept external subtitle files.

- [ ] **Progress bar for Kling polling** — Replace the per-attempt log line with an in-place progress indicator (e.g. dots or a spinner) to reduce terminal noise during the 2–10 min wait.

- [ ] **Config validation for `imageReference` paths** — `validateConfig` checks that each clip has a prompt/imageReference/url but doesn't verify that imageReference paths actually exist. Add an async existence check.

- [ ] **Windows support** — `execFile('ffmpeg', ...)` and `execFile('ffprobe', ...)` assume Unix-style paths. Test and fix path handling for Windows.

## Ideas / Future

- [ ] **Gemini image generation via API** — Instead of manually switching to Gemini in Antigravity, call the Gemini API directly from the pipeline to auto-generate storyboard frames from the style reference. Would close the loop entirely.

- [ ] **Preview mode** — Render a low-res proxy (e.g. 540p, CRF 35) first for quick review before committing to a full-quality render.

- [ ] **Project templates** — Pre-configured `config.json` templates for common use cases (product launch, event promo, personal brand) that `new-project` can scaffold from with `--template <name>`.

- [ ] **Web UI** — A minimal Next.js dashboard to browse projects, view generated clips, trigger pipeline runs, and preview final videos without touching the CLI.
