<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Visual reference library

Before changing site creation, read `docs/design-quality.md` and
`docs/research/design-references-2026/README.md`. The 100 reviewed 2026 award
references supply authored observations through `src/lib/design/references.ts`.
They are inspiration, not mandatory templates, licensed production assets or
proof that model weights were trained. Preserve explicit owner styles, selected
templates, image provenance and the scope of narrow edits. Do not claim better
visual quality from passing structural tests alone.

Read `docs/generator-comparison-2026-11-06/README.md` before changing the creation
contract or model routing. New AI creation requires a private visualPlan. Keep
raw evaluation responses separate from deterministic image framing, preserve
manual cropping, and never rerun the paid comparison as an ordinary check.

For shared composition CSS changes, run `tests/comparison-layout-audit.mts`.
It renders the saved comparison documents with current code and checks text
clipping, overlap, fonts and images across seven widths without paid AI calls.
Document scroll width alone cannot detect text hidden inside clipped blocks.
