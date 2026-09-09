#!/usr/bin/env node
// 報道記事の見出し画像（各社のサーバーにあるもの）のURLを集めます。
// 画像そのものは保存しません。参照するURLだけを data/articles.json に書き足します。
//
//   node scripts/fetch-images.mjs [--limit 40] [--retry]
//
// ・新しい記事から順に、まだ試していないものだけを見にいきます
// ・取れなかった記事は二度目を試しません（--retry を付けたときだけやり直します）
// ・1件につきGoogleと各社へ数回アクセスするため、1回の実行で扱う件数に上限を置いています
import { readFileSync, writeFileSync } from 'node:fs';
import { resolveGoogleNews, findOgImage, checkImage } from './lib/gnews.mjs';

const root = new URL('../', import.meta.url);
const p = (rel) => new URL(rel, root);
const today = new Date().toISOString().slice(0, 10);

const args = process.argv.slice(2);
const limit = Number(args[args.indexOf('--limit') + 1]) || 40;
const retry = args.includes('--retry');

const store = JSON.parse(readFileSync(p('data/articles.json'), 'utf8'));
const targets = store.items
  .filter((n) => !n.isPrimary && n.url.includes('news.google.com'))
  .filter((n) => (retry ? !n.image : n.imageTriedAt == null))
  .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
  .slice(0, limit);

if (!targets.length) {
  console.log('画像を探す対象はありません');
  process.exit(0);
}

console.log(`画像を探します（対象 ${targets.length} 件 / 全体 ${store.items.length} 件）`);
let got = 0;
const fails = new Map();

for (const n of targets) {
  n.imageTriedAt = today;
  try {
    const articleUrl = await resolveGoogleNews(n.url);
    n.articleUrl = articleUrl;
    const image = await findOgImage(articleUrl);
    await checkImage(image);
    n.image = image;
    got++;
    console.log(`  ✓ ${n.sourceName}　${new URL(articleUrl).host}`);
  } catch (err) {
    delete n.image;
    const key = `${n.sourceName}：${err.message}`;
    fails.set(key, (fails.get(key) ?? 0) + 1);
  }
}

writeFileSync(p('data/articles.json'), JSON.stringify({ ...store, updatedAt: today }, null, 2) + '\n');

const withImage = store.items.filter((x) => x.image).length;
console.log(`\n取れた ${got} 件 / 試した ${targets.length} 件　（画像つきの記事は全体で ${withImage} 件）`);
for (const [reason, count] of [...fails].sort((a, b) => b[1] - a[1])) {
  console.log(`  ✗ ${reason}${count > 1 ? ` ×${count}` : ''}`);
}
