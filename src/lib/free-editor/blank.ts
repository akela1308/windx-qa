import { CanvasDocSchema, type CanvasDoc } from "./model";
export function blankCanvas(
  title: string,
  text: string,
  background = "#ffffff",
  colour = "#20201d",
): CanvasDoc {
  return CanvasDocSchema.parse({
    format: "windx-free-block",
    version: 1,
    title,
    background,
    height: { desktop: 500, phone: 520 },
    elements: [
      {
        id: "text-1",
        name: text,
        type: "text",
        layer: 0,
        desktop: { x: 80, y: 80, width: 960, height: 120 },
        phone: { x: 24, y: 60, width: 312, height: 120 },
        text,
        tag: "h2",
        style: {
          font: "sans",
          size: 48,
          weight: "600",
          lineHeight: 1.15,
          colour,
          align: "left",
          padding: 0,
        },
        phoneSize: 32,
      },
    ],
  });
}
