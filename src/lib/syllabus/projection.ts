type Cell = { v?: unknown; p?: { body?: { dataStream?: string } } };
type Sheet = { cellData?: Record<string, Record<string, Cell>> };
export type Workbook = { sheets?: Record<string, Sheet>; sheetOrder?: string[] };

const cleanText = (value: unknown) => value == null ? "" : String(value).trim();
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function parseDate(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(Date.UTC(1899, 11, 30) + value * 86400000).toISOString().slice(0, 10);
  }
  const text = cleanText(value);
  if (!text) return null;
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return iso[1] + "-" + iso[2].padStart(2, "0") + "-" + iso[3].padStart(2, "0");
  const local = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (local) return local[3] + "-" + local[2].padStart(2, "0") + "-" + local[1].padStart(2, "0");
  return null;
}

function parseMinutes(value: string): number | null {
  const normalized = normalize(value);
  const hours = normalized.match(/(\d+(?:[.,]\d+)?)\s*h/);
  const minutes = normalized.match(/(\d+(?:[.,]\d+)?)\s*min/);
  if (hours) return Math.round(Number(hours[1].replace(",", ".")) * 60);
  if (minutes) return Math.round(Number(minutes[1].replace(",", ".")));
  return null;
}

export function projectSessions(workbook: Workbook) {
  const sheetId = workbook.sheetOrder?.[0] ?? Object.keys(workbook.sheets ?? {})[0];
  const sheet = sheetId ? workbook.sheets?.[sheetId] : undefined;
  const cells = sheet?.cellData ?? {};
  const header = cells["0"] ?? {};
  const columns = Object.keys(header).map(Number).sort((a, b) => a - b);
  const fieldByColumn = new Map<number, string>();
  for (const column of columns) {
    const cell = header[String(column)];
    const label = normalize(cleanText(cell?.v ?? cell?.p?.body?.dataStream));
    if (label.includes("semana")) fieldByColumn.set(column, "week_number");
    else if (label.includes("fecha")) fieldByColumn.set(column, "planned_date");
    else if ((label.includes("numero") || label.startsWith("n de ")) && label.includes("actividad")) fieldByColumn.set(column, "activity_number");
    else if (label.includes("actividades docente") || label === "tema" || label === "temas") fieldByColumn.set(column, "topic");
    else if (label.includes("forma de ensenanza")) fieldByColumn.set(column, "teaching_form");
    else if (label === "tiempo" || label === "duracion") fieldByColumn.set(column, "duration_minutes");
    else if (label === "lugar") fieldByColumn.set(column, "location");
    else if (label.includes("experimental autonomo")) fieldByColumn.set(column, "autonomous_experiment");
    else if (label.includes("trabajo independiente")) fieldByColumn.set(column, "independent_work");
    else if (label.includes("medios de ensenanza")) fieldByColumn.set(column, "teaching_aids");
  }

  const rowKeys = Object.keys(cells).map(Number).filter((row) => row > 0).sort((a, b) => a - b);
  const rows: Record<string, unknown>[] = [];
  for (const row of rowKeys) {
    const rowCells = cells[String(row)] ?? {};
    const projected: Record<string, unknown> = { row_order: row };
    const additional: Record<string, string> = {};
    for (const column of Object.keys(rowCells).map(Number)) {
      const cell = rowCells[String(column)];
      const value = cell?.v ?? cell?.p?.body?.dataStream ?? "";
      const field = fieldByColumn.get(column);
      const headerText = cleanText(header[String(column)]?.v);
      if (!field) {
        if (headerText && cleanText(value)) additional[headerText] = cleanText(value);
        continue;
      }
      if (field === "week_number" || field === "activity_number") {
        const number = Number.parseInt(cleanText(value), 10);
        projected[field] = Number.isFinite(number) ? number : null;
      } else if (field === "planned_date") {
        projected[field] = parseDate(value);
      } else if (field === "duration_minutes") {
        projected[field] = parseMinutes(cleanText(value));
      } else {
        projected[field] = cleanText(value);
      }
    }
    const isNonempty = Object.entries(projected).some(([key, value]) =>
      key !== "row_order" && value !== null && value !== undefined && value !== "",
    );
    if (isNonempty) {
      projected.additional_data = additional;
      rows.push(projected);
    }
  }
  return rows;
}
