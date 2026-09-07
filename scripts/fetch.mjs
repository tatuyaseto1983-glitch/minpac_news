#!/usr/bin/env node
// 行政サイトから見出しをあつめて data/articles.json と data/stats.json を更新します。
// 記事本文は保存しません（見出し・日付・出典・リンクのみ）。
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { getText } from './lib/http.mjs';
import { parseRss, parseJtaYearPage, findYearPages, parseMinpakuSituation, parseMinpakuNews } from './lib/parse.mjs';
import { screen, categorize, detectAreas, detectBusinessTypes } from './lib/classify.mjs';

const root = new URL('../', import.meta.url);
const p = (rel) => new URL(rel, root);
const today = new Date().toISOString().slice(0, 10);

const sources = JSON.parse(readFileSync(p('data/sources.json'), 'utf8'));
const store = existsSync(p('data/articles.json'))
  ? JSON.parse(readFileSync(p('data/articles.json'), 'utf8'))
  : { updatedAt: null, items: [] };
const statsStore = existsSync(p('data/stats.json'))
  ? JSON.parse(readFileSync(p('data/stats.json'), 'utf8'))
  : { updatedAt: null, minpaku: null, history: [] };

// 同じURLでも見出しが違えば別の告知として扱う（施行状況の更新など）
const keyOf = (url, title) => `${url}|${title}`;
const byUrl = new Map(store.items.map((it) => [keyOf(it.url, it.title), it]));
const report = [];

for (const src of sources) {
  try {
    if (src.type === 'minpaku-situation') {
      const html = await getText(src.url);
      const s = parseMinpakuSituation(html);
      if (s.filed == null) throw new Error('件数を読み取れませんでした（ページ構成の変更かもしれません）');
      const record = { ...s, source: src.name, sourceUrl: src.url, fetchedAt: today };
      statsStore.minpaku = record;
      const last = statsStore.history.at(-1);
      if (!last || last.asOf !== record.asOf) statsStore.history.push(record);
      report.push({ source: src.id, found: 1, added: 0, note: `届出${s.filed}件 / ${s.asOf}` });
      continue;
    }

    let raw = [];
    if (src.type === 'rss') {
      raw = parseRss(await getText(src.url, { encoding: src.encoding ?? 'utf-8' }), src.url);
    } else if (src.type === 'jta-index') {
      const index = await getText(src.url);
      const years = findYearPages(index, src.url).slice(0, src.years ?? 2);
      if (!years.length) throw new Error('年別ページのリンクが見つかりません');
      for (const y of years) raw.push(...parseJtaYearPage(await getText(y.url), y.url));
    } else if (src.type === 'minpaku-news') {
      raw = parseMinpakuNews(await getText(src.url), src.url);
    }

    let added = 0;
    let kept = 0;
    const seenKeys = new Set();
    let oldestSeen = null;
    for (const item of raw) {
      const verdict = src.forceScore ? { keep: true, score: src.forceScore, hits: [] } : screen(item.title);
      if (!verdict.keep) continue;
      kept++;
      const key = keyOf(item.url, item.title);
      seenKeys.add(key);
      if (item.publishedAt && (!oldestSeen || item.publishedAt < oldestSeen)) oldestSeen = item.publishedAt;
      if (byUrl.has(key)) {
        // ルールを更新したときに、既存の記事の分類も付け直す
        Object.assign(byUrl.get(key), {
          lastSeenAt: today,
          score: verdict.score,
          category: categorize(item.title),
          areas: detectAreas(item.title),
          businessTypes: detectBusinessTypes(item.title),
          matchedKeywords: verdict.hits,
        });
        continue;
      }
      const entry = {
        id: hash(key),
        title: item.title,
        url: item.url,
        publishedAt: item.publishedAt ?? today,
        sourceId: src.id,
        sourceName: src.name,
        isPrimary: Boolean(src.primary),
        category: categorize(item.title),
        areas: detectAreas(item.title),
        businessTypes: detectBusinessTypes(item.title),
        score: verdict.score,
        matchedKeywords: verdict.hits,
        fetchedAt: today,
        lastSeenAt: today,
      };
      byUrl.set(key, entry);
      added++;
    }
    // 取得できた期間の中にあるのに今回見つからなかったものは、削除・修正されたとみなして消す
    let removed = 0;
    if (oldestSeen) {
      for (const [k, v] of byUrl) {
        if (v.sourceId !== src.id) continue;
        if (seenKeys.has(k)) continue;
        if ((v.publishedAt ?? '') < oldestSeen) continue;
        byUrl.delete(k);
        removed++;
      }
    }
    report.push({ source: src.id, found: raw.length, kept, added, removed });
  } catch (err) {
    report.push({ source: src.id, error: err.message });
  }
}

const items = [...byUrl.values()].sort(
  (a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '') || b.id.localeCompare(a.id)
);

writeFileSync(p('data/articles.json'), JSON.stringify({ updatedAt: today, count: items.length, items }, null, 2) + '\n');
writeFileSync(p('data/stats.json'), JSON.stringify({ ...statsStore, updatedAt: today }, null, 2) + '\n');

console.log('取得結果');
for (const r of report) {
  if (r.error) console.log(`  ✗ ${r.source}: ${r.error}`);
  else console.log(`  ✓ ${r.source}: 取得 ${r.found} 件 / 対象 ${r.kept ?? '-'} 件 / 新規 ${r.added} 件 / 削除 ${r.removed ?? 0} 件${r.note ? ` (${r.note})` : ''}`);
}
console.log(`保存 ${items.length} 件 → data/articles.json`);

const failures = report.filter((r) => r.error);
if (failures.length === sources.length) process.exit(1); // 全滅したときだけ失敗にする

function hash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}
