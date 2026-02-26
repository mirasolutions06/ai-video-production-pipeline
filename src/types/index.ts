// ─── Format & Style Enums ──────────────────────────────────────────────────

export type VideoFormat =
  | 'youtube-short'
  | 'tiktok'
  | 'ad-16x9'
  | 'ad-1x1'
  | 'web-hero';

export type CaptionStyle = 'word-by-word' | 'line-by-line';
export type TransitionType = 'crossfade' | 'cut' | 'wipe';
export type KlingModel = 'kling-v1' | 'kling-v1-5' | 'kling-v2';
export type AspectRatio = '9:16' | '16:9' | '1:1';

// ─── Config Interfaces ─────────────────────────────────────────────────────

export interface BrandColors {
  primary: string;
  secondary?: string;
  accent?: string;
}

export interface CTAConfig {
  text: string;
  subtext?: string;
  /** Duration of CTA overlay in seconds. Default: 3 */
  durationSeconds?: number;
}

export interface KlingClip {
  /** Text prompt describing what should happen in this clip */
  prompt?: string;
  /** Absolute or project-relative path to Gemini storyboard image (enables image-to-video mode) */
  imageReference?: string;
  /** Pre-generated clip URL — skip Kling generation entirely */
  url?: string;
  /** Clip duration in seconds. Default: 5 */
  duration?: 5 | 10;
}

export interface VideoConfig {
  format: VideoFormat;
  title: string;
  client?: string;
  /** Voiceover script. If provided, ElevenLabs generates audio. */
  script?: string;
  /** ElevenLabs voice ID. Run `npm run pipeline -- --project X --list-voices` to see options. */
  voiceId?: string;
  clips: KlingClip[];
  /** Default: crossfade */
  transition?: TransitionType;
  /** Default: true for shorts/tiktok, false for web-hero */
  captions?: boolean;
  /** Default: word-by-word */
  captionStyle?: CaptionStyle;
  captionPosition?: 'bottom' | 'center' | 'top';
  /** Text shown at top of frame for first 2 seconds (hook) */
  hookText?: string;
  cta?: CTAConfig;
  /** Use music.mp3 from assets/audio/ if true */
  music?: boolean;
  /** Background music volume 0-1. Default: 0.15 */
  musicVolume?: number;
}

// ─── Kling API ─────────────────────────────────────────────────────────────

export interface KlingOptions {
  aspectRatio: AspectRatio;
  duration: 5 | 10;
  model?: KlingModel;
  projectName: string;
  sceneIndex: number;
}

export interface KlingCacheEntry {
  hash: string;
  clipPath: string;
  createdAt: string;
}

export interface KlingCacheManifest {
  [hash: string]: KlingCacheEntry;
}

// ─── ElevenLabs ────────────────────────────────────────────────────────────

export interface ElevenLabsOptions {
  voiceId: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
}

// ─── Whisper / Captions ────────────────────────────────────────────────────

export interface CaptionWord {
  word: string;
  start: number;
  end: number;
}

export interface WhisperResult {
  words: CaptionWord[];
  fullText: string;
  language: string;
}

// ─── Assets ────────────────────────────────────────────────────────────────

export interface StoryboardFrame {
  sceneIndex: number;
  imagePath: string;
  lastFramePath?: string;
}

export interface ProjectAssets {
  logo?: string;
  fontBold?: string;
  fontRegular?: string;
  brandColors?: BrandColors;
  styleReference?: string;
  subjectReference?: string;
  locationReference?: string;
  storyboardFrames: StoryboardFrame[];
  backgroundMusic?: string;
}

// ─── Remotion Props ────────────────────────────────────────────────────────

export interface CompositionProps {
  config: VideoConfig;
  assets: ProjectAssets;
  captions: CaptionWord[];
  clipPaths: string[];
}

// ─── Format Metadata (derived) ─────────────────────────────────────────────

export interface FormatMeta {
  width: number;
  height: number;
  fps: number;
  aspectRatio: AspectRatio;
  defaultCaptions: boolean;
}
