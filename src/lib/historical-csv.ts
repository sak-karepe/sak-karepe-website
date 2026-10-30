import { paymentMethods, type Payment } from "@/db/schema";

export const historicalHeaders = [
  "tanggal", "no. nota", "nama pembeli", "no. HP", "nama produk", "qty", "harga satuan", "ongkir", "metode bayar", "catatan",
];
export const historicalTemplate = "\uFEFF" + historicalHeaders.join(",") + "\r\n" +
  '25/12/2023,NOTA-001,Ibu Sari,081234567890,"Tas, motif daun",2,150000,10000,transfer,Penjualan lama\r\n' +
  '25/12/2023,NOTA-001,Ibu Sari,081234567890,Syal ecoprint,1,75000,10000,transfer,Penjualan lama\r\n';
export const maxHistoricalCsvBytes = 200_000;

export type CsvError = { line: number; message: string };
export type HistoricalRow = {
  line: number;
  values: string[];
  date: Date;
  externalRef: string;
  customerName: string;
  customerPhone: string;
  productName: string;
  quantity: number;
  price: number;
  shippingCost: number;
  method: Payment["method"];
  notes: string;
};

/** CSV dengan koma, CRLF, baris baru dalam kutipan, dan kutipan ganda (RFC 4180). */
export function parseCsv(text: string) {
  const rows: { line: number; values: string[] }[] = [];
  const errors: CsvError[] = [];
  let values: string[] = [], value = "", quoted = false, closed = false, line = 1, startLine = 1;
  const field = () => { values.push(value); value = ""; closed = false; };
  const row = () => {
    field();
    if (values.some((v) => v.trim())) rows.push({ line: startLine, values });
    values = [];
  };
  const input = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted) {
      if (char === '"') {
        if (input[i + 1] === '"') { value += '"'; i++; }
        else { quoted = false; closed = true; }
      } else {
        value += char;
        if (char === "\n" || (char === "\r" && input[i + 1] !== "\n")) line++;
      }
    } else if (char === ",") field();
    else if (char === "\r" || char === "\n") {
      row();
      if (char === "\r" && input[i + 1] === "\n") i++;
      startLine = ++line;
    } else if (char === '"' && !value && !closed) quoted = true;
    else if (closed || char === '"') {
      errors.push({ line, message: "Kutipan CSV tidak valid." });
      return { rows, errors };
    } else value += char;
  }
  if (quoted) errors.push({ line: startLine, message: "Kutipan CSV belum ditutup." });
  else row();
  return { rows, errors };
}

/** Tanggal transaksi memakai awal hari WIB, sama untuk DD/MM/YYYY dan YYYY-MM-DD. */
export function parseHistoricalDate(value: string): Date | null {
  const local = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!local && !iso) return null;
  const [year, month, day] = local ? [+local[3], +local[2], +local[1]] : [+iso![1], +iso![2], +iso![3]];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (year < 1000 || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return new Date(date.getTime() - 7 * 60 * 60 * 1000);
}

export function validateHistoricalCsv(csv: string) {
  const rows: HistoricalRow[] = [], errors: CsvError[] = [];
  const noRecords: { line: number; values: string[] }[] = [];
  if (typeof csv !== "string" || new TextEncoder().encode(csv).length > maxHistoricalCsvBytes)
    return { rows, records: noRecords, errors: [{ line: 1, message: "Ukuran CSV maksimal 200 KB." }] };
  const parsed = parseCsv(csv);
  errors.push(...parsed.errors);
  if (errors.length) return { rows, records: noRecords, errors };
  const [header, ...data] = parsed.rows;
  if (!header || header.values.length !== historicalHeaders.length ||
      header.values.some((v, i) => v.trim().toLowerCase() !== historicalHeaders[i].toLowerCase()))
    return { rows, records: noRecords, errors: [{ line: header?.line ?? 1, message: "Kolom CSV harus mengikuti template yang disediakan." }] };
  if (!data.length || data.length > 1000)
    return { rows, records: noRecords, errors: [{ line: 1, message: "CSV harus berisi 1–1000 baris transaksi." }] };
  const groups = new Map<string, { signature: string; total: number }>();
  for (const record of data) {
    const { line } = record;
    const values = record.values.map((v) => v.trim());
    const [tanggal, externalRef, customerName, customerPhone, productName, qty, harga, ongkir, method, notes] = values;
    const error = (message: string) => errors.push({ line, message });
    const before = errors.length;
    if (values.length !== historicalHeaders.length) { error("Jumlah kolom tidak sesuai template."); continue; }
    const date = parseHistoricalDate(tanggal);
    if (!date) error("Tanggal tidak valid. Gunakan DD/MM/YYYY atau YYYY-MM-DD.");
    if (!externalRef) error("No. nota wajib diisi.");
    if (!customerName) error("Nama pembeli wajib diisi.");
    if (!productName) error("Nama produk wajib diisi.");
    const number = (value: string) => /^\d+$/.test(value) && Number.isSafeInteger(Number(value));
    if (!number(qty) || +qty < 1) error("Qty wajib berupa bilangan bulat lebih dari 0.");
    if (!number(harga)) error("Harga satuan wajib berupa angka rupiah tanpa pemisah.");
    if (ongkir && !number(ongkir)) error("Ongkir wajib berupa angka rupiah tanpa pemisah.");
    if (!paymentMethods.includes(method as Payment["method"])) error(`Metode bayar harus ${paymentMethods.join(", ")}.`);
    if (errors.length !== before) continue;
    const signature = JSON.stringify([date, customerName, customerPhone, +ongkir, method, notes]);
    const group = groups.get(externalRef);
    if (group && group.signature !== signature) error("Tanggal, pembeli, HP, ongkir, metode bayar, dan catatan untuk no. nota yang sama harus sama.");
    const total = (group?.total ?? +ongkir) + +qty * +harga;
    if (!Number.isSafeInteger(total)) error("Total nota terlalu besar.");
    groups.set(externalRef, { signature: group?.signature ?? signature, total });
    rows.push({ line, values, date: date!, externalRef, customerName, customerPhone, productName, quantity: +qty,
      price: +harga, shippingCost: +ongkir, method: method as Payment["method"], notes });
  }
  return { rows, records: data, errors };
}
