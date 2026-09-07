// カード表示まわり（カテゴリの色、サムネイル生成、同じ話題のまとめ）
import { readFileSync, existsSync } from 'node:fs';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// カテゴリごとの色と文字。色は意味を持たせ、ティール（制度）とアンバー（お金）をブランド軸に置く。
export const CATEGORY = {
  law:      { glyph: '法', hue: 'var(--c-law)',      soft: 'var(--c-law-soft)' },
  local:    { glyph: '条', hue: 'var(--c-local)',    soft: 'var(--c-local-soft)' },
  stats:    { glyph: '統', hue: 'var(--c-stats)',    soft: 'var(--c-stats-soft)' },
  subsidy:  { glyph: '助', hue: 'var(--c-subsidy)',  soft: 'var(--c-subsidy-soft)' },
  practice: { glyph: '実', hue: 'var(--c-practice)', soft: 'var(--c-practice-soft)' },
  industry: { glyph: '業', hue: 'var(--c-industry)', soft: 'var(--c-industry-soft)' },
  system:   { glyph: '知', hue: 'var(--c-system)',   soft: 'var(--c-system-soft)' },
};
const meta = (id) => CATEGORY[id] ?? CATEGORY.industry;

// 記事ごとに同じ絵にならないよう、URLから決まる数を作る
const seedOf = (s) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return Math.abs(h);
};

/**
 * サムネイル。外部サイトの画像は借りず、CSSで描きます。
 * 1枚あたり約90バイト。1000枚並べても100KBに届きません。
 */
export function thumb(item, { tall = false } = {}) {
  const m = meta(item.category.id);
  const seed = seedOf(item.url + item.title);
  const v = (i, min, max) => min + ((seed >> (i * 4)) % (max - min));
  return `<div class="thumb${tall ? ' thumb--tall' : ''}"
    style="--x1:${v(0, 8, 46)}%;--y1:${v(1, 12, 60)}%;--x2:${v(2, 58, 94)}%;--y2:${v(3, 30, 88)}%"
    aria-hidden="true"><b>${m.glyph}</b></div>`;
}

// ---------- 同じ話題をまとめる ----------
const normalize = (t) =>
  t.replace(/[【】「」『』（）()\[\]、。，．・…“”"'’\s\-–—:：!！?？＝=＜＞<>／\/｜|]/g, '');

const bigrams = (t) => {
  const s = normalize(t).slice(0, 60);
  const out = new Set();
  for (let i = 0; i < s.length - 1; i++) out.add(s[i] + s[i + 1]);
  return out;
};

const overlap = (a, b) => {
  if (!a.size || !b.size) return 0;
  let n = 0;
  for (const g of a) if (b.has(g)) n++;
  return n / Math.min(a.size, b.size);
};

const daysApart = (a, b) =>
  Math.abs((new Date(a ?? 0) - new Date(b ?? 0)) / 86400000);

/**
 * 同じ出来事を扱った報道をひとまとめにする。
 * 代表は「よく見かける媒体のもの」を優先し、同点なら見出しが長いほうを選びます。
 * 媒体の格付けは持たず、集めた記事の中での掲載本数から自動で決めています。
 */
export function clusterNews(items, { threshold = 0.35, windowDays = 5 } = {}) {
  const freq = {};
  for (const it of items) freq[it.sourceName] = (freq[it.sourceName] ?? 0) + 1;
  const rank = (it) => (freq[it.sourceName] ?? 0) * 1000 + Math.min(it.title.length, 60);

  const clusters = [];
  for (const item of items) {
    const g = bigrams(item.title);
    const hit = clusters.find(
      (c) => overlap(g, c.grams) >= threshold && daysApart(item.publishedAt, c.lead.publishedAt) <= windowDays
    );
    if (hit) {
      if (rank(item) > rank(hit.lead)) {
        hit.others.push(hit.lead);
        hit.lead = item;
        hit.grams = g;
      } else {
        hit.others.push(item);
      }
      continue;
    }
    clusters.push({ lead: item, grams: g, others: [] });
  }
  return clusters.map(({ lead, others }) => ({ lead, others }));
}

// ---------- 一言メモ ----------
const blurbFile = new URL('../../data/blurbs.json', import.meta.url);
const blurbs = existsSync(blurbFile) ? JSON.parse(readFileSync(blurbFile, 'utf8')).rules ?? [] : [];

/** よく出てくる型の記事に、こちらの言葉で短い説明をつける */
export function blurbFor(item) {
  if (item.summary) return item.summary; // AIや手作業でつけた要約があればそれを優先
  // 報道の見出しにこちらの言葉で説明を足すと、書かれていないことを足しかねないので付けません
  if (!item.isPrimary) return null;
  const hit = blurbs.find((b) => b.match.some((w) => item.title.includes(w)));
  return hit ? hit.text : null;
}

export { esc };
