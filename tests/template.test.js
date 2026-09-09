import { describe, expect, it } from "vitest";
import fs from "node:fs";

describe("batch menu template", () => {
  it("renders one ApplicationV2 root element", () => {
    const template = fs
      .readFileSync("templates/batch-menu.hbs", "utf8")
      .trim();

    expect(template.startsWith('<section class="lumenn-batch-content">')).toBe(
      true,
    );
    expect(template.endsWith("</section>")).toBe(true);
    expect(template).toContain("{{asset.format}}");
    expect(template).toContain("lumenn-lightweight.dialog.webpSkipped");
  });
});
