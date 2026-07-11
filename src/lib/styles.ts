/**
 * The 12 portrait styles, ported from 1号美图 (originally Doubao-targeted)
 * and re-written as Flux Kontext instruction prompts. License red line: the
 * production engine is Replicate/Flux Kontext only.
 *
 * Every prompt carries the likeness clause up front — the art-portrait
 * experiment showed Kontext keeps pose/composition but drifts on fur color
 * and expression unless hammered, and even then drift can occur; the face
 * gate + preview-before-pay flow are the product-level guards.
 */

export interface PortraitStyle {
  id: string;
  name: string;
  prompt: string;
  accent: string;
  occasion?: boolean;
  /** Pulled from the live gallery (red-line or quality failure) but kept for iteration. */
  disabled?: boolean;
}

const KEEP =
  "Keep it unmistakably the same individual pet as the photo: identical fur colors, identical coat markings and patches in the same places, same face shape, same eye color, same expression. Use only fur colors that exist in the photo — never add tan, brown or any other color the pet does not have. Do not change the animal's breed, proportions or pose.";

const ALL_STYLES: PortraitStyle[] = [
  {
    id: "classic-oil",
    name: "Classic Oil Painting",
    prompt: `Turn this photo into a museum-quality classical oil painting portrait. ${KEEP} Rich impasto brushstrokes, warm chiaroscuro lighting, deep umber background, canvas texture, dignified fine-art look.`,
    accent: "#8a5a2b",
  },
  {
    id: "watercolor",
    name: "Watercolor",
    prompt: `Turn this photo into a delicate watercolor painting. ${KEEP} Soft wet-on-wet washes, blooming pigment edges, white paper showing through, loose expressive strokes, light and airy palette.`,
    accent: "#7ca6c4",
  },
  {
    id: "pencil-sketch",
    name: "Pencil Sketch",
    prompt: `Turn this photo into a detailed graphite pencil sketch portrait. ${KEEP} Draw the mouth exactly as it appears in the photo — do not add or change teeth. Fine cross-hatching, soft shading, fur texture rendered in careful pencil strokes, off-white sketchbook paper background.`,
    accent: "#6b6b6b",
  },
  {
    id: "renaissance-royal",
    name: "Renaissance Royal Portrait",
    prompt: `Turn this photo into a regal renaissance royal portrait: dress the pet in ornate aristocratic robes with a lace ruff collar and gold embroidery. ${KEEP} Dark palatial background, dramatic candlelight, oil-on-canvas texture, majestic and noble.`,
    accent: "#7a1f2b",
  },
  {
    id: "dreamy-animation",
    name: "Dreamy Animation",
    prompt: `Turn this photo into a heartwarming animated-movie style portrait. ${KEEP} Big expressive glossy eyes, soft painterly background with warm sunlight and floating dust motes, whimsical storybook atmosphere, lush hand-painted look.`,
    accent: "#e8a34c",
  },
  {
    id: "pop-art",
    name: "Pop Art",
    prompt: `Turn this photo into a bold 1960s pop-art screen print: divide the canvas into four quadrant panels, each repeating this same pet portrait in a different vivid color scheme. ${KEEP} Flat saturated colors, thick black outlines, heavy halftone dot texture, high-contrast gallery poster look.`,
    accent: "#e0447c",
  },
  {
    id: "cyberpunk-neon",
    name: "Cyberpunk Neon",
    prompt: `Turn this photo into a futuristic cyberpunk portrait. ${KEEP} Glowing neon pink and cyan rim lighting, rainy night city bokeh background, holographic reflections, high-contrast cinematic sci-fi mood.`,
    accent: "#0fd4d4",
  },
  {
    id: "christmas-card",
    name: "Christmas Card",
    prompt: `Turn this photo into a cozy christmas greeting-card illustration: put a knitted red santa hat and scarf on the pet. ${KEEP} Snowy pine trees and warm fairy lights in the background, gentle falling snow, festive watercolor-and-ink style.`,
    accent: "#b23a35",
    occasion: true,
  },
  {
    id: "birthday-party",
    name: "Birthday Party",
    prompt: `Turn this photo into a joyful fully-painted birthday party portrait: put a colorful cone party hat on the pet. ${KEEP} Warm festive painted background with garlands and glowing string lights, confetti and balloons, a birthday cake with lit candles, lush storybook illustration style.`,
    accent: "#f2b13d",
    occasion: true,
  },
  {
    id: "superhero-comic",
    name: "Superhero Comic",
    prompt: `Turn this photo into a dynamic superhero comic-book cover: give the pet a plain flowing red cape with absolutely no logos, letters, emblems or symbols anywhere on the cape or chest. ${KEEP} Bold ink outlines, halftone shading, explosive comic burst background, heroic composition.`,
    accent: "#2d4fa1",
    // 🔴 2026-07-11 two live tests both produced a Superman shield despite
    // explicit no-logo instructions — trademark red line. Off until solved.
    disabled: true,
  },
  {
    id: "knitted-wool",
    name: "Knitted Wool",
    prompt: `Turn this photo into an adorable knitted wool doll version of the pet, with visible yarn stitches and soft felt texture. ${KEEP.replace("Do not change the animal's breed, proportions or pose.", "Keep the same pose.")} Handmade plush toy look, sitting on a wooden shelf, warm soft lighting, cozy craft photography.`,
    accent: "#c98a6b",
  },
  {
    id: "vintage-photo",
    name: "Vintage Photo",
    prompt: `Turn this photo into a vintage 1920s studio photograph. ${KEEP} Warm sepia tones, soft film grain, gentle vignette, classic formal portrait composition, aged photographic paper texture.`,
    accent: "#9c7b52",
  },
];

export const STYLES: PortraitStyle[] = ALL_STYLES.filter((s) => !s.disabled);

export function getStyle(id: string): PortraitStyle | undefined {
  // Lookup goes through the enabled list only — a disabled style can't be
  // invoked by POSTing its id directly either.
  return STYLES.find((s) => s.id === id);
}
