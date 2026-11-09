import { CanvasDocSchema, type CanvasDoc, type Element, type Box } from "./model";

const box = (x: number, y: number, width: number, height: number): Box => ({ x, y, width, height });
function text(id: string, name: string, content: string, desktop: Box, phone: Box, size: number, phoneSize: number, colour = "#20201d", font: "sans" | "serif" | "mono" = "sans", tag: "h1" | "h2" | "p" = "p"): Element {
  return { id, type: "text", name, layer: 0, text: content, desktop, phone, tag, phoneSize,
    style: { font, size, weight: tag === "h1" ? "800" : "400", lineHeight: tag === "h1" ? 1.04 : 1.5, colour, padding: 0, align: "left" } };
}
const shape = (id: string, name: string, fill: string, desktop: Box, phone: Box, radius = 0): Element => ({ id, name, layer: 0, type: "shape", fill, desktop, phone, radius });
const image = (id: string, name: string, src: string, alt: string, desktop: Box, phone: Box): Element => ({ id, name, layer: 0, type: "image", src, alt, desktop, phone, radius: 0, fit: "cover" });
function parseExample(raw: unknown): CanvasDoc {
  const doc = CanvasDocSchema.parse(raw);
  return { ...doc, elements: doc.elements.map((e, layer) => ({ ...e, layer })) };
}

// Три разные задачи композиции, не три цветовых варианта одного шаблона.
export const examples: { id: string; name: string; doc: CanvasDoc }[] = [
  { id: "workshop", name: "Workshop / poster", doc: parseExample({
    format: "windx-free-block-prototype", version: 1, title: "Lowgear Cycle Works", background: "#eeeade", height: { desktop: 700, phone: 880 }, elements: [
      shape("signal", "Red strip", "#ba361b", box(60, 622, 1000, 8), box(24, 806, 312, 6)),
      text("eyebrow", "Workshop name", "LOWGEAR CYCLE WORKS", box(60, 44, 900, 36), box(24, 28, 312, 28), 18, 14, "#20201d", "mono"),
      text("headline", "Main heading", "Bikes fixed.\nBack on the road.", box(60, 128, 640, 220), box(24, 100, 312, 150), 72, 46, "#20201d", "sans", "h1"),
      image("bike", "Wheel illustration", "/free-editor/wheel.svg", "A bicycle wheel drawn in black and red", box(750, 112, 310, 310), box(144, 458, 192, 192)),
      text("description", "Workshop description", "Repair, service and a second life for the bike you already love.", box(64, 398, 530, 100), box(24, 292, 312, 100), 25, 21),
      text("location", "Location", "Railway arch, Hackney\nBring your bike. We will take a look.", box(64, 536, 600, 66), box(24, 710, 312, 80), 18, 16, "#393930", "mono"),
    ],
  }) },
  { id: "studio", name: "Studio / editorial", doc: parseExample({
    format: "windx-free-block-prototype", version: 1, title: "Still Room", background: "#f5f0e6", height: { desktop: 760, phone: 1080 }, elements: [
      text("name", "Studio name", "STILL ROOM", box(64, 40, 400, 32), box(24, 30, 312, 24), 17, 14, "#433e32", "mono"),
      image("vase", "Still life", "/free-editor/vase.svg", "Terracotta vessel and a branch against a warm wall", box(640, 106, 416, 570), box(24, 442, 312, 420)),
      text("headline", "Main heading", "A little space\nto slow down.", box(64, 168, 540, 230), box(24, 116, 312, 156), 75, 45, "#343d2b", "serif", "h1"),
      text("description", "Studio description", "Objects, materials and quiet corners. An independent ceramics studio in London.", box(70, 448, 470, 130), box(24, 306, 312, 102), 24, 20, "#433e32", "serif"),
      shape("line", "Fine rule", "#827c67", box(70, 630, 440, 2), box(24, 922, 312, 2)),
      text("caption", "Studio note", "Made by hand. Kept for years.", box(70, 684, 700, 35), box(24, 978, 312, 48), 16, 16, "#433e32", "mono"),
    ],
  }) },
  { id: "practice", name: "Practice / split", doc: parseExample({
    format: "windx-free-block-prototype", version: 1, title: "Field & Form", background: "#f2f3ed", height: { desktop: 680, phone: 980 }, elements: [
      shape("panel", "Dark field", "#243c33", box(0, 0, 520, 680), box(0, 0, 360, 420)),
      text("name", "Practice name", "FIELD & FORM", box(56, 48, 410, 36), box(24, 32, 312, 26), 17, 14, "#e7eddf", "mono"),
      text("headline", "Main heading", "Good spaces.\nEveryday life.", box(56, 172, 410, 240), box(24, 122, 312, 165), 54, 44, "#e7eddf", "serif", "h1"),
      text("description", "Practice description", "Architecture that starts with how you live, and makes room for what comes next.", box(590, 130, 440, 180), box(24, 466, 312, 142), 32, 25, "#243c33", "serif"),
      image("plan", "Space study", "/free-editor/space.svg", "Abstract architectural study of light and space", box(590, 364, 440, 208), box(24, 668, 312, 180)),
      text("caption", "Project note", "London / Independent architecture practice", box(590, 610, 440, 44), box(24, 900, 312, 50), 16, 14, "#243c33", "mono"),
    ],
  }) },
];

export function newElement(type: Element["type"], id: string): Element {
  const desktop = box(80, 80, 320, 140), phone = box(24, 80, 312, 140);
  if (type === "text") return text(id, "New text", "Write something worth reading.", desktop, phone, 32, 25, "#20201d", "sans", "h2");
  if (type === "image") return image(id, "New image", "/free-editor/vase.svg", "Terracotta vessel and a branch", desktop, phone);
  return shape(id, "New shape", "#ce6840", desktop, phone, 0);
}
