// Field Atlas style: this page is the specimen workbench—left rail for preparation, right canvas for findings.
import { useMemo, useState } from "react";
import { Copy, FileJson, FileUp, Languages, RefreshCw, ScanSearch, Sparkles } from "lucide-react";

type BlockData = { name?: string; display?: string | { translationKey?: string }; rootId?: number };
type BlockRow = { id: number; count: number; data?: BlockData; key?: string; ja: string; en: string; name: string };

type Result = { fileName: string; schematicName: string; size: [number, number, number]; totalCells: number; rows: BlockRow[]; wiki: string; warnings: string[] };

const defaultBlockData: BlockData[] = [
  { name: "Unloaded", display: "Unloaded" },
  { name: "Dirt", display: { translationKey: "item:dirt" } },
  { name: "Messy Dirt", display: { translationKey: "item:messyDirt" } },
  { name: "Grass Block", display: { translationKey: "item:grassBlock" } },
  { name: "Sand", display: { translationKey: "item:sand" } },
  { name: "Clay", display: { translationKey: "item:clay" } },
];
const defaultJa: Record<string, string> = { dirt: "土", messyDirt: "粗い土", grassBlock: "草ブロック", sand: "砂", clay: "粘土" };
const defaultEn: Record<string, string> = { dirt: "Dirt", messyDirt: "Messy Dirt", grassBlock: "Grass Block", sand: "Sand", clay: "Clay" };

function readUInt8(bytes: Uint8Array, state: { i: number }) { if (state.i >= bytes.length) throw new Error("Avroデータが途中で終わっています。"); return bytes[state.i++]; }
function readVarint(bytes: Uint8Array, state: { i: number }) { let value = 0, shift = 0; while (true) { const b = readUInt8(bytes, state); value += (b & 127) * 2 ** shift; if (!(b & 128)) return value; shift += 7; if (shift > 35) throw new Error("Avro整数が大きすぎます。"); } }
function readInt(bytes: Uint8Array, state: { i: number }) { const n = readVarint(bytes, state); return n % 2 === 0 ? n / 2 : -(n + 1) / 2; }
function readString(bytes: Uint8Array, state: { i: number }) { const len = readInt(bytes, state); if (len < 0 || state.i + len > bytes.length) throw new Error("Avro文字列の長さが不正です。"); const value = new TextDecoder().decode(bytes.slice(state.i, state.i + len)); state.i += len; return value; }
function readBytes(bytes: Uint8Array, state: { i: number }) { const len = readInt(bytes, state); if (len < 0 || state.i + len > bytes.length) throw new Error("Avro bytesの長さが不正です。"); const value = bytes.slice(state.i, state.i + len); state.i += len; return value; }
function readArray<T>(bytes: Uint8Array, state: { i: number }, reader: () => T) { const out: T[] = []; let block = readInt(bytes, state); while (block !== 0) { if (block < 0) { const byteSize = readInt(bytes, state); void byteSize; block = -block; } if (block > 1000000) throw new Error("Avro配列の要素数が不正です。"); for (let i = 0; i < block; i++) out.push(reader()); block = readInt(bytes, state); } return out; }
function decodeRle(bytes: Uint8Array) { const state = { i: 0 }; const ids: number[] = []; while (state.i < bytes.length) { const count = readVarint(bytes, state); const id = readVarint(bytes, state); if (!count) throw new Error("RLEのcountが0です。"); for (let i = 0; i < count; i++) ids.push(id); } return ids; }
function parseSchematic(buffer: ArrayBuffer) {
  const all = new Uint8Array(buffer); if (all.length < 4) throw new Error("bloxdschemのヘッダーがありません。");
  const bytes = all.slice(4); const state = { i: 0 }; const name = readString(bytes, state); const x = readInt(bytes, state); const y = readInt(bytes, state); const z = readInt(bytes, state); const size: [number, number, number] = [readInt(bytes, state), readInt(bytes, state), readInt(bytes, state)];
  const chunks = readArray(bytes, state, () => ({ x: readInt(bytes, state), y: readInt(bytes, state), z: readInt(bytes, state), blocks: readBytes(bytes, state) }));
  const ids: number[] = []; chunks.forEach((chunk) => ids.push(...decodeRle(chunk.blocks)));
  return { name, position: [x, y, z], size, chunks, ids };
}
function asRecord(value: unknown): Record<string, string> { if (!value || typeof value !== "object" || Array.isArray(value)) return {}; return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([, v]) => typeof v === "string")) as Record<string, string>; }
function resolveDisplay(data: BlockData | undefined, ja: Record<string, string>, en: Record<string, string>) {
  if (!data) return { key: undefined, ja: "不明なブロック", en: "Unknown block", name: "Unknown" };
  if (typeof data.display === "string") return { key: undefined, ja: data.display, en: data.display, name: data.name || data.display };
  const raw = data.display?.translationKey || ""; const key = raw.startsWith("item:") ? raw.slice(5) : raw; const fallback = data.name || key || "Unknown";
  return { key, ja: ja[key] || fallback, en: en[key] || fallback, name: data.name || key || "Unknown" };
}
function buildResult(fileName: string, schematic: ReturnType<typeof parseSchematic>, blockDatas: BlockData[], ja: Record<string, string>, en: Record<string, string>): Result {
  const counts = new Map<number, number>(); schematic.ids.forEach((id) => counts.set(id, (counts.get(id) || 0) + 1)); const warnings: string[] = [];
  counts.forEach((count, id) => { const rootId = blockDatas[id]?.rootId; if (typeof rootId === "number" && rootId !== id) { counts.set(id, 0); counts.set(rootId, (counts.get(rootId) || 0) + count); } });
  const rows = Array.from(counts.entries()).filter(([, count]) => count > 0).sort((a, b) => a[0] - b[0]).map(([id, count]) => { const data = blockDatas[id]; const resolved = resolveDisplay(data, ja, en); if (!data) warnings.push(`ID ${id} のblockDataがありません。`); return { id, count, data, ...resolved }; });
  const wiki = rows.map((row) => `|&attachref(アイテム一覧/${row.name}.png,,50x50);|[[${row.ja}&br;${row.en}>アイテム/${row.ja}]]|${row.count}|`).join("\n");
  return { fileName, schematicName: schematic.name, size: schematic.size, totalCells: schematic.ids.length, rows, wiki, warnings };
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null); const [blockDataText, setBlockDataText] = useState(JSON.stringify(defaultBlockData, null, 2)); const [jaText, setJaText] = useState(JSON.stringify(defaultJa, null, 2)); const [enText, setEnText] = useState(JSON.stringify(defaultEn, null, 2)); const [result, setResult] = useState<Result | null>(null); const [error, setError] = useState(""); const [copied, setCopied] = useState(false); const [busy, setBusy] = useState(false);
  const dataCount = useMemo(() => { try { return JSON.parse(blockDataText).length; } catch { return 0; } }, [blockDataText]);
  async function analyze() { if (!file) { setError("まずbloxdschemファイルを選択してください。"); return; } setBusy(true); setError(""); setCopied(false); try { const blockDatas = JSON.parse(blockDataText) as BlockData[]; const ja = asRecord(JSON.parse(jaText)); const en = asRecord(JSON.parse(enText)); const parsed = parseSchematic(await file.arrayBuffer()); setResult(buildResult(file.name, parsed, blockDatas, ja, en)); } catch (e) { setResult(null); setError(e instanceof Error ? e.message : "解析に失敗しました。"); } finally { setBusy(false); } }
  async function copyWiki() { if (!result) return; await navigator.clipboard.writeText(result.wiki); setCopied(true); setTimeout(() => setCopied(false), 1600); }
  function loadJson(setter: (value: string) => void) { return (event: React.ChangeEvent<HTMLInputElement>) => { const selected = event.target.files?.[0]; if (!selected) return; selected.text().then(setter).catch(() => setError("JSONファイルを読み込めませんでした。")); }; }
  return <div className="atlas-shell">
    <header className="topbar"><div className="brand"><img src="/manus-storage/block-atlas-logo_a3c9219e.png" alt="" /><div><span className="eyebrow">FIELD ATLAS / SCHEMATIC LAB</span><strong className="wordmark">block atlas</strong></div></div><div className="top-meta"><span>LOCAL ANALYSIS</span><span className="status-dot" /> browser only</div></header>
    <main className="workbench">
      <aside className="rail">
        <div className="rail-intro"><div className="progress-spine" aria-hidden="true"><i /><i /><i /><i /></div><span className="index-number">01</span><h1>構造を読み、<br /><em>素材を数える。</em></h1><p>bloxdschemを標本台に載せて、ブロックの内訳をWiki形式へ整えます。</p></div>
        <section className="rail-section"><div className="section-label"><span>02</span> SOURCE</div><label className="dropzone"><FileUp size={18} /><span>{file ? file.name : "bloxdschemを選択"}</span><input type="file" accept=".bloxdschem" onChange={(e) => setFile(e.target.files?.[0] || null)} /></label></section>
        <section className="rail-section"><div className="section-label"><span>03</span> DICTIONARIES</div><ConfigField label="blockDatas.json" count={`${dataCount} records`} value={blockDataText} onChange={setBlockDataText} onFile={loadJson(setBlockDataText)} /><ConfigField label="ja.json" value={jaText} onChange={setJaText} onFile={loadJson(setJaText)} /><ConfigField label="en.json" value={enText} onChange={setEnText} onFile={loadJson(setEnText)} /></section>
        <button className="analyze-button" onClick={analyze} disabled={busy}>{busy ? <RefreshCw className="spin" size={17} /> : <ScanSearch size={17} />}{busy ? "解析中…" : "解析を実行"}</button>
        {error && <div className="error-box">{error}</div>}
        <div className="rail-note"><Sparkles size={14} /> rootIdを自動で統合。metaブロックは素材数から除外します。</div>
      </aside>
      <section className="canvas">
        <div className="canvas-heading"><div><span className="eyebrow">SPECIMEN REPORT / {result ? "READY" : "WAITING"}</span><h2>{result ? result.schematicName : "ブロック標本レポート"}</h2></div>{result && <div className="file-tag">{result.fileName}<br /><span>{result.size.join(" × ")} blocks</span></div>}</div>
        {!result ? <div className="empty-state"><div className="report-zones" aria-hidden="true"><span>OVERVIEW / 01</span><span>INVENTORY / 02</span><span>EXPORT / 03</span></div><img src="/manus-storage/block-atlas-empty_899a4e86.png" alt="" /><div><span className="eyebrow">NO SPECIMEN LOADED</span><h3>まだ標本がありません。</h3><p>左のレールからファイルと辞書を読み込み、解析を始めてください。</p></div></div> : <><div className="stat-strip"><Stat label="TOTAL CELLS" value={result.totalCells.toLocaleString()} /><Stat label="VISIBLE BLOCKS" value={result.rows.length.toString().padStart(2, "0")} /><Stat label="ROOT NORMALIZED" value="ON" accent /></div><div className="results-layout"><div className="block-panel"><div className="panel-title"><div><span className="eyebrow">INVENTORY / ID ASC</span><h3>ブロック内訳</h3></div><span className="panel-count">{result.rows.length} kinds</span></div><div className="block-list">{result.rows.map((row) => <article className="block-row" key={row.id}><div className="block-id">{String(row.id).padStart(3, "0")}</div><div className="block-swatch" style={{ background: `hsl(${(row.id * 47) % 360} 42% 48%)` }} /><div className="block-copy"><strong>{row.ja}</strong><span>{row.en} · {row.key ? `item:${row.key}` : "literal display"}</span></div><div className="block-qty">{row.count.toLocaleString()}<small>blocks</small></div></article>)}</div></div><div className="wiki-panel"><div className="panel-title"><div><span className="eyebrow">EXPORT / PUKIWIKI</span><h3>Wiki行</h3></div><button className="copy-button" onClick={copyWiki}><Copy size={15} />{copied ? "コピー済み" : "コピー"}</button></div><pre>{result.wiki}</pre>{result.warnings.length > 0 && <div className="warning-box">{result.warnings.map((warning) => <div key={warning}>{warning}</div>)}</div>}</div></div></>}
      </section>
    </main>
  </div>;
}
function ConfigField({ label, count, value, onChange, onFile }: { label: string; count?: string; value: string; onChange: (value: string) => void; onFile: (event: React.ChangeEvent<HTMLInputElement>) => void }) { return <div className="config-field"><div><label>{label}</label>{count && <span>{count}</span>}<input type="file" accept=".json" onChange={onFile} /></div><textarea value={value} onChange={(e) => onChange(e.target.value)} spellCheck={false} /></div>; }
function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) { return <div className={`stat ${accent ? "stat-accent" : ""}`}><span>{label}</span><strong>{value}</strong></div>; }
