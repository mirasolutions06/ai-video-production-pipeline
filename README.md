# AI Video Production Pipeline

An AI-assisted video production system for creating short-form and ad-format video content. It orchestrates Kling (AI video generation), ElevenLabs (voiceover), OpenAI Whisper (captions), and Remotion (final composition) into a single CLI-driven pipeline.

Designed for solo creators and small studios working in **Antigravity** — an IDE that has both Claude Code and Gemini built in side by side. The workflow leverages Gemini's native image generation for storyboarding and Kling's image-to-video for clip generation, with an automated feedback loop to maintain visual continuity across scenes.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [API Key Setup](#api-key-setup)
4. [Full Workflow Walkthrough](#full-workflow-walkthrough)
5. [How Antigravity Works](#how-antigravity-works)
6. [The Gemini Feedback Loop](#the-gemini-feedback-loop)
7. [CLI Commands](#cli-commands)
8. [config.json Reference](#configjson-reference)
9. [Asset Folder Structure](#asset-folder-structure)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- **Node.js 20 or higher** — [nodejs.org](https://nodejs.org)
- **FFmpeg installed system-wide** — used for last-frame extraction and video probing

Install FFmpeg on macOS:

```bash
brew install ffmpeg
```

Verify both are available:

```bash
node --version   # should be v20.x.x or higher
ffmpeg -version  # should print ffmpeg version info
```

---

## Installation

```bash
git clone <repo-url> "gemini test"
cd "gemini test"
npm install
cp .env.example .env   # or create .env manually (see below)
```

Create `.env` in the project root with your API keys:

```env
KLING_API_KEY=
KLING_API_SECRET=
ELEVENLABS_API_KEY=
OPENAI_API_KEY=
```

Leave the values blank for now — fill them in after the API key setup below.

---

## API Key Setup

### Kling (AI Video Generation)

1. Sign up at [dashboard.klingai.com](https://dashboard.klingai.com)
2. Navigate to **API** in the sidebar
3. Create a new API key — you will receive both a **Key** and a **Secret**
4. Add both to `.env`:
   ```
   KLING_API_KEY=your_key_here
   KLING_API_SECRET=your_secret_here
   ```

Kling charges per video generation. Each clip costs credits based on duration and model. Check the dashboard for current pricing.

### ElevenLabs (Voiceover)

1. Sign up at [elevenlabs.io](https://elevenlabs.io)
2. Go to **Profile Settings** → **API Keys**
3. Create and copy your API key
4. Add it to `.env`:
   ```
   ELEVENLABS_API_KEY=your_key_here
   ```
5. Find a voice to use by running:
   ```bash
   npm run pipeline -- --project <any-project> --list-voices
   ```
   Copy the voice ID into `config.json` under `voiceId`.

### OpenAI (Whisper Captions)

1. Sign up at [platform.openai.com](https://platform.openai.com)
2. Go to **API Keys** and create a new secret key
3. Add it to `.env`:
   ```
   OPENAI_API_KEY=your_key_here
   ```

OpenAI is only used for Whisper transcription (caption generation). It is not used for any generative text or image tasks.

---

## Full Workflow Walkthrough

A complete video production from zero to final MP4 follows these steps.

### Step 1 — Create a new project

```bash
npm run new-project -- --name nike-summer-ad --format youtube-short
```

This scaffolds the full folder structure under `projects/nike-summer-ad/` and creates a starter `config.json`. Supported formats: `youtube-short`, `tiktok`, `ad-16x9`, `ad-1x1`, `web-hero`.

### Step 2 — Add your brand and reference assets

Drop files into the project's asset folders before generating anything:

- `assets/reference/style.jpg` — A film still, photo, or mood board image that sets the visual vibe. **This is the most important file.** Gemini uses it as a style reference when generating storyboard images.
- `assets/brand/logo.png` — Your logo with a transparent background.
- `assets/brand/brand.json` — Edit the pre-generated hex color palette.
- `assets/audio/music.mp3` — Optional background track.

### Step 3 — Generate storyboard images with Gemini

Switch to Gemini inside Antigravity. Open your `style.jpg` reference and ask:

> "Generate a storyboard image for scene 1 in the style of this reference. The scene shows [describe your scene]."

Save Gemini's output to `projects/nike-summer-ad/assets/storyboard/scene-1.png`.

### Step 4 — Edit config.json

Open `projects/nike-summer-ad/config.json` and fill in:

- `title` — used in the final output filename
- `script` — the full voiceover narration text
- `voiceId` — ElevenLabs voice ID
- `clips` — one entry per scene with a `prompt` describing the action
- `hookText` — bold text shown at the top for the first 2 seconds (optional)
- `cta` — end screen call to action (optional)

The `clips` array does not need `imageReference` paths if you follow the storyboard naming convention (`scene-1.png`, `scene-2.png`, etc.) — the pipeline auto-discovers them.

### Step 5 — Run the pipeline

```bash
npm run pipeline -- --project nike-summer-ad
```

The pipeline runs all steps in order, skipping anything already completed:

1. Validates your `.env` and `config.json`
2. Generates voiceover audio via ElevenLabs
3. Transcribes the audio via Whisper (if captions are enabled)
4. Generates each Kling clip (image-to-video if storyboard exists, text-to-video otherwise)
5. Extracts the last frame of each clip (for Gemini feedback loop)
6. Bundles and renders the final composition via Remotion
7. Packages the final MP4 with a timestamp into `output/final/`

**All steps are idempotent.** Re-running the pipeline never duplicates API calls — Kling results are cached in `cache/kling-cache.json` and voiceover/captions are cached by file presence.

### Step 6 — Continue scenes using the feedback loop

After the pipeline runs, each scene will have a `scene-N-lastframe.png` in `assets/storyboard/`. Switch back to Gemini in Antigravity and show it the last frame:

> "Here is the last frame of scene 1. Generate scene 2 continuing naturally from this moment. Keep the same lighting, color palette, and visual style."

Save the output as `scene-2.png`, add the scene to `config.json`, and run the pipeline again.

### Step 7 — Delivery

Final videos land in:

```
projects/nike-summer-ad/output/final/nike-summer-ad-youtube-short-1709123456789.mp4
```

The filename includes the project title, format, and a Unix timestamp to prevent overwrites.

---

## How Antigravity Works

Antigravity is the IDE used for this project. It has two AI assistants available within the same application:

- **Claude Code** — the CLI tool you are using right now. It handles code, file operations, the pipeline, and any task that involves reading or writing the project.
- **Gemini** — Google's multimodal AI with native image generation. It is used for visual work: generating storyboard images, iterating on them, and analyzing reference images.

You switch between them within the same IDE without leaving the application. The two AIs complement each other:

| Task | Tool |
|------|------|
| Generate storyboard images | Gemini |
| Analyze a reference image for style notes | Gemini |
| Edit config.json | Claude Code |
| Run pipeline commands | Claude Code |
| Debug pipeline errors | Claude Code |
| Continue a scene from a last frame | Gemini |
| Write voiceover scripts | Either |

The key insight is that Gemini's image output is the input to the pipeline, and the pipeline's frame extraction output feeds back to Gemini. The two tools form a closed loop.

---

## The Gemini Feedback Loop

Visual continuity across scenes is achieved through a structured feedback loop between Gemini and Kling.

```
Gemini generates            Pipeline runs Kling
scene-1.png           →     image-to-video           →   scene-1.mp4
(storyboard start)          (using scene-1.png)

                                    |
                                    v

Gemini generates            Pipeline extracts
scene-2.png           ←     scene-1-lastframe.png
(continuing from            (auto-saved to assets/storyboard/)
 last frame)
```

**Step by step:**

1. Ask Gemini to generate a storyboard image for scene 1 → save as `assets/storyboard/scene-1.png`
2. Run the pipeline → Kling generates `output/clips/scene-1.mp4` using `scene-1.png` as the starting frame
3. The pipeline automatically extracts the last frame of the clip and saves it as `assets/storyboard/scene-1-lastframe.png`
4. Show Gemini `scene-1-lastframe.png` → ask it to generate scene 2 continuing naturally from that moment
5. Save as `scene-2.png` → run pipeline again
6. Repeat for all scenes

Because each scene starts visually from exactly where the previous scene ended, the final video has natural continuity even though each clip was generated independently by Kling.

**Why this works better than pure text prompting:**

Text-to-video models like Kling interpret prompts independently. Two identical prompts will produce visually unrelated clips. By anchoring each clip to an image (the last frame of the previous clip), Kling is constrained to continue from a specific visual state. Combined with a consistent Gemini style reference, this produces a coherent-looking video.

---

## CLI Commands

### Create a new project

```bash
npm run new-project -- --name <project-name> --format <format>
```

| Argument | Required | Description |
|----------|----------|-------------|
| `--name` | Yes | Project name. Use kebab-case. Creates `projects/<name>/`. |
| `--format` | Yes | One of: `youtube-short`, `tiktok`, `ad-16x9`, `ad-1x1`, `web-hero` |

Examples:

```bash
npm run new-project -- --name brand-launch --format ad-16x9
npm run new-project -- --name product-teaser --format tiktok
```

### Run the pipeline

```bash
npm run pipeline -- --project <project-name>
```

| Argument | Required | Description |
|----------|----------|-------------|
| `--project` | Yes | Name of the project folder under `projects/` |

Example:

```bash
npm run pipeline -- --project brand-launch
```

### List available ElevenLabs voices

```bash
npm run pipeline -- --project <any-project> --list-voices
```

Prints all available voices with their IDs. The project name is required by the CLI but not used when `--list-voices` is passed. Use any existing project name.

Example:

```bash
npm run pipeline -- --project brand-launch --list-voices
```

### Open Remotion Studio

```bash
npm run remotion
```

Opens the Remotion visual preview UI in your browser. Useful for checking how the composition looks before committing to a full render.

### TypeScript type check

```bash
npm run build
```

Runs `tsc --noEmit` to check for type errors without producing output files. Run this first if the pipeline throws unexpected errors.

---

## config.json Reference

Each project's `config.json` maps to the `VideoConfig` TypeScript type. All fields are listed below.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `format` | `VideoFormat` | Yes | — | Output format. See formats table below. |
| `title` | `string` | Yes | — | Used in the output filename. |
| `client` | `string` | No | — | Client name. Shown in lower thirds if the composition supports it. |
| `script` | `string` | No | `""` | Voiceover narration text. If empty, voiceover is skipped. |
| `voiceId` | `string` | No | — | ElevenLabs voice ID. Required if `script` is set. |
| `clips` | `KlingClip[]` | Yes | — | Array of scene definitions. At least one required. |
| `transition` | `string` | No | `"crossfade"` | Transition between clips: `crossfade`, `cut`, or `wipe`. |
| `captions` | `boolean` | No | Format default | Whether to render captions. Default `true` for shorts/TikTok. |
| `captionStyle` | `string` | No | `"word-by-word"` | `word-by-word` highlights one word at a time. `line-by-line` shows full lines. |
| `captionPosition` | `string` | No | `"bottom"` | Where captions appear: `bottom`, `center`, or `top`. |
| `hookText` | `string` | No | `""` | Bold text shown at the top of the frame for the first 2 seconds. |
| `cta` | `CTAConfig` | No | — | End screen call to action overlay. |
| `music` | `boolean` | No | `false` | If `true`, uses `assets/audio/music.mp3` as background music. |
| `musicVolume` | `number` | No | `0.15` | Background music volume from 0 to 1. |

### VideoFormat options

| Format | Dimensions | Aspect Ratio | Default Captions |
|--------|-----------|--------------|-----------------|
| `youtube-short` | 1080x1920 | 9:16 | Yes |
| `tiktok` | 1080x1920 | 9:16 | Yes |
| `ad-16x9` | 1920x1080 | 16:9 | No |
| `ad-1x1` | 1080x1080 | 1:1 | No |
| `web-hero` | 1920x1080 | 16:9 | No |

### KlingClip fields

Each entry in the `clips` array is a `KlingClip` object:

| Field | Type | Description |
|-------|------|-------------|
| `prompt` | `string` | Scene description sent to Kling. Describes the action and motion in the clip. |
| `imageReference` | `string` | Path to a storyboard image. Enables image-to-video mode. Optional if using the auto-discovery naming convention (`scene-N.png`). |
| `url` | `string` | URL to a pre-generated MP4. Skips Kling entirely — the file is downloaded and used directly. |
| `duration` | `5 \| 10` | Clip duration in seconds. Default: `5`. |

Only one of `imageReference`, `url`, or `prompt` is needed per clip, though `prompt` is always recommended even in image-to-video mode (it guides the motion).

### CTAConfig fields

| Field | Type | Description |
|-------|------|-------------|
| `text` | `string` | Main CTA text (e.g. `"Shop Now"`). |
| `subtext` | `string` | Optional secondary line (e.g. `"Limited time offer"`). |
| `durationSeconds` | `number` | How long the CTA overlay is shown. Default: `3`. |

### Example config.json

```json
{
  "format": "youtube-short",
  "title": "summer-campaign",
  "client": "Nike",
  "script": "This summer, move like never before. The new Air Max — built for the streets.",
  "voiceId": "pNInz6obpgDQGcFmaJgB",
  "clips": [
    {
      "prompt": "A runner sprints through a neon-lit city street at dusk, dynamic camera tracking",
      "duration": 5
    },
    {
      "prompt": "Close up of Nike Air Max shoes hitting wet asphalt, water splashing in slow motion",
      "duration": 5
    },
    {
      "prompt": "The runner stops, looks at camera, confident smile, city lights bokeh background",
      "duration": 5
    }
  ],
  "transition": "crossfade",
  "captions": true,
  "captionStyle": "word-by-word",
  "captionPosition": "bottom",
  "hookText": "Move different this summer",
  "cta": {
    "text": "Shop Air Max",
    "subtext": "nikeshoes.com",
    "durationSeconds": 3
  },
  "music": true,
  "musicVolume": 0.12
}
```

---

## Asset Folder Structure

Each project lives in `projects/[name]/` with this structure:

```
projects/[name]/
│
├── config.json                        # Video configuration (edit this)
│
├── assets/
│   ├── brand/
│   │   ├── logo.png                   # Brand logo, transparent background recommended
│   │   ├── font-bold.ttf              # Optional custom font (bold weight)
│   │   ├── font-regular.ttf           # Optional custom font (regular weight)
│   │   └── brand.json                 # Brand colors: { "primary", "secondary", "accent" }
│   │
│   ├── reference/
│   │   ├── style.jpg                  # Visual mood reference — show this to Gemini first
│   │   ├── subject.jpg                # Optional: person or product reference
│   │   └── location.jpg               # Optional: location/environment reference
│   │
│   ├── storyboard/
│   │   ├── scene-1.png                # Gemini-generated image for scene 1 (you save this)
│   │   ├── scene-1-lastframe.png      # AUTO-GENERATED by pipeline after Kling runs
│   │   ├── scene-2.png                # Gemini-generated from scene-1-lastframe (you save this)
│   │   ├── scene-2-lastframe.png      # AUTO-GENERATED
│   │   └── ...                        # Continue for all scenes
│   │
│   └── audio/
│       ├── music.mp3                  # Background track (set music: true in config)
│       └── sfx/                       # Sound effects (optional, named descriptively)
│
├── cache/
│   ├── kling-cache.json               # Prevents duplicate Kling API calls
│   └── captions.json                  # Whisper transcript cache
│
└── output/
    ├── audio/
    │   └── voiceover.mp3              # ElevenLabs-generated voiceover
    ├── clips/
    │   ├── scene-1.mp4                # Kling output per scene
    │   └── scene-2.mp4
    └── final/
        └── [title]-[format]-[timestamp].mp4   # Final deliverable
```

### Storyboard image requirements

- Format: PNG (preferred) or JPG
- Resolution: Minimum 768x768. Ideal: 1080x1920 for 9:16 formats, 1920x1080 for 16:9
- Content: A clean, high-quality static image representing the start of the scene

### Auto-discovery

The pipeline automatically finds all `scene-N.png` files in `assets/storyboard/` in numerical order and matches them to clips by scene index. You do not need to add `imageReference` paths to `config.json` as long as you follow the naming convention.

### What is and is not committed to git

The `.gitignore` excludes:
- `projects/*/output/` — rendered videos and audio
- `projects/*/cache/` — API response caches
- `*.mp4` and `*.mp3` — all media files
- `node_modules/` and `dist/`
- `.env` — never commit API keys

Source assets (storyboard images, brand files, reference images) are committed. Generated outputs are not.

---

## Troubleshooting

### Kling API returns 401 Unauthorized

The Kling JWT token has expired or the key/secret pair is wrong. The pipeline generates a fresh JWT before every request, so a 401 usually means the credentials in `.env` are incorrect.

Check that `KLING_API_KEY` and `KLING_API_SECRET` match exactly what is shown in the [Kling dashboard](https://dashboard.klingai.com). They are separate values — the Key is not the Secret.

### Kling task stuck in "processing" for more than 10 minutes

The pipeline polls for up to 10 minutes (60 attempts at 10-second intervals). If a task times out, the most common cause is a content policy violation — Kling silently holds tasks that contain policy-violating prompts rather than immediately failing them.

Open the [Kling dashboard](https://dashboard.klingai.com), find the task under **Video Generation**, and check its status. Revise the prompt to remove any flagged content and re-run the pipeline.

### FFmpeg not found

```
Error: spawn ffmpeg ENOENT
```

FFmpeg is not installed or not on your `PATH`.

```bash
which ffmpeg   # should return a path like /opt/homebrew/bin/ffmpeg
```

If nothing is returned:

```bash
brew install ffmpeg
```

Then restart your terminal and try again.

### Remotion bundle error

```
Error: Could not find file ...
```

This usually means a TypeScript error is preventing the bundle from resolving. Run the type check first:

```bash
npm run build
```

Fix any reported errors, then re-run the pipeline.

### Whisper returns no word timestamps

Whisper word-level timestamps require audio of at least 1 second. If `script` in `config.json` is very short (a single word or fewer than 5 characters), the Whisper response may omit timestamps.

Either expand the script or set `captions: false` in `config.json` to skip caption generation for that project.

### ElevenLabs quota exceeded

```
Error: quota_exceeded
```

You have used all available characters on your ElevenLabs plan for the current billing period. Check your usage at [elevenlabs.io/subscription](https://elevenlabs.io/subscription). Either upgrade your plan or wait for the billing cycle to reset.

The cached voiceover at `output/audio/voiceover.mp3` will be reused on subsequent runs — re-running the pipeline does not regenerate audio if the file already exists.

### "No config.json found"

You are running the pipeline for a project that has not been created yet. Run:

```bash
npm run new-project -- --name <project-name> --format <format>
```

### "No clips were generated or downloaded"

The pipeline completed all generation steps but ended up with an empty clip list. Possible causes:

- All clips have neither a `prompt` nor a `url` in `config.json`
- Kling failed silently for every clip (check the Kling dashboard)
- The `clips` array in `config.json` is empty or missing

### Storyboard images not being picked up

The pipeline logs `"No storyboard frames found"` and falls back to text-to-video mode. This is not an error — it means the pipeline could not find `scene-N.png` files in `assets/storyboard/`.

Check that the images are named exactly `scene-1.png`, `scene-2.png`, etc. (lowercase, no spaces). Verify the files are inside `assets/storyboard/` and not inside a subfolder.
