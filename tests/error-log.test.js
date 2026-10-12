import { describe, it, expect, vi } from "vitest";
import {
  buildErrorReport,
  renderErrorReportHtml,
  exportErrorReportToJournal,
  formatStamp,
} from "../src/error-log.mjs";

const failed = [
  {
    id: "gk1",
    name: "Vagão <Impossível>",
    type: "Scene Background",
    path: "assets/Vag%C3%A3o.png",
    stage: "fetch",
    error: "Arquivo não encontrado no índice do FilePicker",
  },
];

describe("error log", () => {
  it("merges batch and reconciliation failures into one report", () => {
    const report = buildErrorReport({
      failed,
      reconciliationFailed: [{ id: "root:assets", error: "boom" }],
      stats: { processed: 70, skipped: 0 },
      moduleVersion: "0.0.11",
      foundryVersion: "14.367",
    });

    expect(report.entries).toHaveLength(2);
    expect(report.entries[0]).toMatchObject({
      stage: "fetch",
      path: "assets/Vag%C3%A3o.png",
    });
    expect(report.entries[1]).toMatchObject({
      stage: "reconcile",
      name: "root:assets",
    });
    expect(report.processed).toBe(70);
  });

  it("escapes document names and errors so the Journal cannot receive markup", () => {
    const html = renderErrorReportHtml(
      buildErrorReport({
        failed: [{ ...failed[0], error: '<img src=x onerror="alert(1)">' }],
      }),
    );

    expect(html).toContain("Vagão &lt;Impossível&gt;");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  });

  it("caps the table and says how many rows were left out", () => {
    const many = Array.from({ length: 520 }, (_, i) => ({
      ...failed[0],
      id: `id${i}`,
    }));
    const html = renderErrorReportHtml(buildErrorReport({ failed: many }));

    expect(html.match(/<tr><td>/g)).toHaveLength(500);
    expect(html).toContain("omitted");
  });

  it("creates a GM-only Journal on first export", async () => {
    const create = vi.fn().mockResolvedValue({ name: "Log" });
    const result = await exportErrorReportToJournal(
      buildErrorReport({ failed }),
      {
        JournalEntryClass: { create },
        journals: { find: () => undefined },
      },
    );

    expect(result.name).toBe("Log");
    const data = create.mock.calls[0][0];
    expect(data.flags["lumenn-lightweight"].errorLog).toBe(true);
    expect(data.pages).toHaveLength(1);
    expect(data.pages[0]).toMatchObject({ type: "text", text: { format: 1 } });
    expect(data).not.toHaveProperty("ownership");
  });

  it("appends a page to the existing Journal instead of creating another", async () => {
    const entry = {
      getFlag: (module, key) =>
        module === "lumenn-lightweight" && key === "errorLog",
      createEmbeddedDocuments: vi.fn().mockResolvedValue([]),
    };
    const create = vi.fn();
    const result = await exportErrorReportToJournal(
      buildErrorReport({ failed }),
      {
        JournalEntryClass: { create },
        journals: { find: (fn) => (fn(entry) ? entry : undefined) },
      },
    );

    expect(result).toBe(entry);
    expect(create).not.toHaveBeenCalled();
    expect(entry.createEmbeddedDocuments).toHaveBeenCalledWith(
      "JournalEntryPage",
      [expect.objectContaining({ type: "text" })],
    );
  });

  it("formats the page stamp in local time without locale surprises", () => {
    expect(formatStamp(new Date(2026, 9, 12, 7, 5))).toBe("2026-10-12 07:05");
  });
});
