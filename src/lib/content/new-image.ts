import type { ContentSection } from "./fields";

export const newImageSection: ContentSection = { index: -2, composition: "media.image", fields: [
  { path: "photo", kind: "photo", value: "", required: true, max: 500 },
  { path: "caption", kind: "text", value: "", required: false, max: 500 },
] };
