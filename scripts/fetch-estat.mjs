#!/usr/bin/env node
// e-Stat API から宿泊の統計を取り込みます。
//
//   ESTAT_APP_ID=xxxx npm run estat -- --list            表を探す
//   ESTAT_APP_ID=xxxx npm run estat -- --meta 0003314402 表の中身（分類項目）を見る
//   ESTAT_APP_ID=xxxx npm run estat                       data/estat.json の設定にしたがって取り込む
//
// appId が無ければ何もせず終了します（自動更新を止めないため）。
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { list, extractIndicator } from './lib/estat.mjs';

const root = new URL('../', import.meta.url);
const p = (rel) => new URL(rel, root);
const API = 'https://api.e-stat.go.jp/rest/3.0/app/json/';

const appId = process.env.ESTAT_APP_ID;
const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : null;
};
const has = (name) => process.argv.includes(name);

if (!appId) {
  console.log('ESTAT_APP_ID が設定されていないので、e-Stat の取り込みは行いませんでした。');
  console.log('  取得先： https://www.e-stat.go.jp/api/ （無料の利用登録でアプリケーションIDが発行されます）');
  process.exit(0);
}

const conf = JSON.parse(readFileSync(p('data/estat.json'), 'utf8'));

async function api(path, params) {
  const url = new URL(path, API);
  url.searchParams.set('appId', appId);
  for (const [k, v] of Object.entries(params)) if (v != null && v !== '') url.searchParams.set(k, v);
  const res = await fetch(url, { headers: { 'User-Agent': 'minpaku-news-bot/0.1' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${await res.text().then((t) => t.slice(0, 200))}`);
  const json = await res.json();
  const head = Object.values(json)[0]?.RESULT;
  if (head && Number(head.STATUS) !== 0) throw new Error(`e-Stat エラー ${head.STATUS}: ${head.ERROR_MSG}`);
  return json;
}

// ---------- 表を探す ----------
if (has('--list')) {
  const word = arg('--list');
  const json = await api('getStatsList', {
    statsCode: conf.statsCode,
    searchWord: word && !word.startsWith('--') ? word : undefined,
    limit: 500,
  });
  const inf = json.GET_STATS_LIST?.DATALIST_INF;
  const tables = list(inf?.TABLE_INF);
  console.log(`${conf.statsName}（統計コード ${conf.statsCode}）　該当 ${inf?.NUMBER ?? tables.length}件 / 取得 ${tables.length}件\n`);
  // 新しい調査時期のものから見たいので、SURVEY_DATE の降順に並べる
  const sorted = tables.slice().sort((a, b) => String(b.SURVEY_DATE ?? '').localeCompare(String(a.SURVEY_DATE ?? '')));
  for (const t of sorted) {
    const title = String(t.TITLE?.$ ?? t.TITLE ?? '');
    console.log(`  ${t['@id']}  [${t.SURVEY_DATE ?? '-'}] [更新 ${t.UPDATED_DATE ?? '-'}] ${title.slice(0, 92)}`);
  }
  console.log('\n使えそうなIDを data/estat.json の statsDataId に入れてください。');
  process.exit(0);
}

// ---------- 統計コードをまたいで探す ----------
const searchWord = arg('--search');
if (searchWord) {
  const json = await api('getStatsList', { searchWord, limit: 500 });
  const inf = json.GET_STATS_LIST?.DATALIST_INF;
  const tables = list(inf?.TABLE_INF);
  console.log(`「${searchWord}」の検索結果　該当 ${inf?.NUMBER ?? tables.length}件 / 取得 ${tables.length}件\n`);
  const sorted = tables.slice().sort((a, b) => String(b.SURVEY_DATE ?? '').localeCompare(String(a.SURVEY_DATE ?? '')));
  for (const t of sorted.slice(0, 60)) {
    const title = String(t.TITLE?.$ ?? t.TITLE ?? '');
    const stat = `${t.STAT_NAME?.['@code'] ?? '-'} ${t.STAT_NAME?.$ ?? ''}`;
    console.log(`  ${t['@id']}  [${t.SURVEY_DATE ?? '-'}] [${stat}] ${title.slice(0, 70)}`);
  }
  process.exit(0);
}

// ---------- 表の分類項目を見る ----------
const metaId = arg('--meta');
if (metaId) {
  const json = await api('getMetaInfo', { statsDataId: metaId });
  const info = json.GET_META_INFO?.METADATA_INF;
  console.log('表：', info?.TABLE_INF?.TITLE?.$ ?? info?.TABLE_INF?.TITLE);
  for (const obj of list(info?.CLASS_INF?.CLASS_OBJ)) {
    const items = list(obj.CLASS);
    console.log(`\n[${obj['@id']}] ${obj['@name']}　${items.length}項目`);
    for (const c of items.slice(0, 8)) console.log(`   ${c['@code']}  ${c['@name']}`);
    if (items.length > 8) console.log(`   …ほか${items.length - 8}項目`);
  }
  process.exit(0);
}

// ---------- 設定にしたがって取り込む ----------
const targets = conf.indicators.filter((i) => i.statsDataId);
if (!targets.length) {
  // まだ表を決めていないので、候補をログに出しておく（このログを見て statsDataId を決めます）
  console.log('data/estat.json の statsDataId がまだ空です。候補の表を出します。\n');
  const json = await api('getStatsList', { statsCode: conf.statsCode, limit: 100 });
  const tables = list(json.GET_STATS_LIST?.DATALIST_INF?.TABLE_INF);
  console.log(`${conf.statsName}（統計コード ${conf.statsCode}）の表 ${tables.length}件`);
  for (const t of tables) {
    const title = String(t.TITLE?.$ ?? t.TITLE ?? '');
    console.log(`  ${t['@id']}  [${t.CYCLE ?? '-'}] [${t.SURVEY_DATE ?? '-'}] ${title.slice(0, 100)}`);
  }
  console.log('\n上のIDから使うものを選んで data/estat.json に設定してください。');
  process.exit(0);
}

const today = new Date().toISOString().slice(0, 10);
const store = existsSync(p('data/stats.json'))
  ? JSON.parse(readFileSync(p('data/stats.json'), 'utf8')) : {};
store.estat ??= {};

for (const ind of targets) {
  try {
    const json = await api('getStatsData', { statsDataId: ind.statsDataId, limit: 100000 });
    const r = extractIndicator(json.GET_STATS_DATA?.STATISTICAL_DATA, ind);
    store.estat[ind.key] = {
      ...r,
      source: `${conf.provider} ${conf.statsName}（e-Stat）`,
      sourceUrl: `https://www.e-stat.go.jp/dbview?sid=${ind.statsDataId}`,
      fetchedAt: today,
    };
    console.log(`  ✓ ${ind.label}：${r.period}　全国 ${r.nationwide == null ? '—' : r.nationwide.toLocaleString('ja-JP')}${r.unit}　都道府県別 ${r.byArea.length}件`);
    console.log(`      表：${r.tableTitle.slice(0, 70)}`);
    console.log(`      絞り込み：${Object.entries(r.filters ?? {}).map(([k, v]) => `${k}=${v}`).join(' / ') || 'なし'}`);
    console.log(`      上位：${r.byArea.slice(0, 3).map((a) => `${a.area} ${a.value.toLocaleString('ja-JP')}`).join('、')}`);
  } catch (err) {
    console.log(`  ✗ ${ind.label}：${err.message}`);
  }
}

writeFileSync(p('data/stats.json'), JSON.stringify({ ...store, updatedAt: today }, null, 2) + '\n');
console.log('data/stats.json を更新しました。');
