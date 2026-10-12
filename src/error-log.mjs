const MODULE_ID = "lumenn-lightweight";
const MAX_ROWS = 500;
const HTML_FORMAT = () => globalThis.CONST?.JOURNAL_ENTRY_PAGE_FORMATS?.HTML ?? 1;

const defaultLocalize = (key) => key;

function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
}

function pad(n) {
  return String(n).padStart(2, "0");
}

export function formatStamp(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function buildErrorReport({
  failed = [],
  reconciliationFailed = [],
  stats = {},
  moduleVersion = "unknown",
  foundryVersion = "unknown",
  date = new Date(),
} = {}) {
  const entries = [
    ...failed.map((f) => ({
      type: f.type ?? "",
      name: f.name ?? f.id ?? "",
      path: f.path ?? "",
      stage: f.stage ?? "fetch",
      error: f.error ?? "",
    })),
    // Reconciliation failures only carry an id (a document id or `root:<dir>`).
    ...reconciliationFailed.map((f) => ({
      type: "",
      name: f.id ?? "",
      path: "",
      stage: "reconcile",
      error: f.error ?? "",
    })),
  ];
  return {
    date,
    moduleVersion,
    foundryVersion,
    processed: stats.processed ?? 0,
    skipped: stats.skipped ?? 0,
    entries,
  };
}

export function renderErrorReportHtml(report, localize = defaultLocalize) {
  const t = (key, data) => localize(`${MODULE_ID}.errorLog.${key}`, data);
  const shown = report.entries.slice(0, MAX_ROWS);
  const omitted = report.entries.length - shown.length;

  const rows = shown
    .map(
      (e) => `<tr><td>${escapeHtml(e.type)}</td><td>${escapeHtml(e.name)}</td><td>${escapeHtml(e.path)}</td><td>${escapeHtml(t(`stages.${e.stage}`))}</td><td>${escapeHtml(e.error)}</td></tr>`,
    )
    .join("");
  // One line per failure so the GM can paste it straight into a bug report.
  const plain = shown
    .map((e) => [e.type, e.name, e.path, e.stage, e.error].join(" | "))
    .join("\n");

  const summary = t("summary", {
    version: report.moduleVersion,
    foundry: report.foundryVersion,
    processed: report.processed,
    skipped: report.skipped,
    failed: report.entries.length,
  });

  return [
    `<p>${escapeHtml(summary)}</p>`,
    `<table><thead><tr><th>${escapeHtml(t("columns.type"))}</th><th>${escapeHtml(t("columns.name"))}</th><th>${escapeHtml(t("columns.path"))}</th><th>${escapeHtml(t("columns.stage"))}</th><th>${escapeHtml(t("columns.error"))}</th></tr></thead><tbody>${rows}</tbody></table>`,
    omitted > 0 ? `<p>${escapeHtml(t("omitted", { count: omitted }))}</p>` : "",
    `<h3>${escapeHtml(t("copyBlock"))}</h3>`,
    `<pre>${escapeHtml(plain)}</pre>`,
  ].join("");
}

/**
 * Saves the report as a new page of a single GM-only Journal entry, creating the
 * entry on first use. Each batch run appends a page; nothing is overwritten.
 */
export async function exportErrorReportToJournal(
  report,
  {
    localize = defaultLocalize,
    JournalEntryClass = globalThis.CONFIG?.JournalEntry?.documentClass ??
      globalThis.JournalEntry,
    journals = globalThis.game?.journal,
  } = {},
) {
  const page = {
    name: localize(`${MODULE_ID}.errorLog.pageName`, {
      date: formatStamp(report.date),
    }),
    type: "text",
    text: { content: renderErrorReportHtml(report, localize), format: HTML_FORMAT() },
  };

  const existing = journals?.find?.((entry) => entry.getFlag?.(MODULE_ID, "errorLog") === true);
  if (existing) {
    await existing.createEmbeddedDocuments("JournalEntryPage", [page]);
    return existing;
  }

  return JournalEntryClass.create({
    name: localize(`${MODULE_ID}.errorLog.journalName`),
    pages: [page],
    flags: { [MODULE_ID]: { errorLog: true } },
  });
}
