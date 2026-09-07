// カード表示まわり（カテゴリの見た目、要約、民泊事業者への影響、同じ話題のまとめ）
import { readFileSync, existsSync } from 'node:fs';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// カテゴリは6つ。色は3系統（規制＝グリーン、実務とお金＝アンバー、市場と業界＝ニュートラル）
export const CATEGORY = {
  local:    { hue: 'var(--c-local)' },
  law:      { hue: 'var(--c-law)' },
  market:   { hue: 'var(--c-market)' },
  start:    { hue: 'var(--c-start)' },
  subsidy:  { hue: 'var(--c-subsidy)' },
  industry: { hue: 'var(--c-industry)' },
};
export const hueOf = (item) => (CATEGORY[item.category.id] ?? CATEGORY.industry).hue;

// ---------- 要約 ----------
const blurbFile = new URL('../../data/blurbs.json', import.meta.url);
const blurbs = existsSync(blurbFile) ? JSON.parse(readFileSync(blurbFile, 'utf8')).rules ?? [] : [];

/** 記事の中身の要約。AIが作ったものか、行政の発表につける定型の説明だけ。 */
export function summaryFor(item) {
  if (item.summary) return { text: item.summary, ai: item.summarySource === 'ai' };
  // 報道は見出ししか手元にないので、こちらで中身を説明することはしません
  if (!item.isPrimary) return null;
  const hit = blurbs.find((b) => b.match.some((w) => item.title.includes(w)));
  return hit ? { text: hit.text, ai: false } : null;
}

// ---------- 民泊事業者への影響 ----------
// 記事の中身の要約ではなく、「読んだ人が次に何を確認すればいいか」を出します。
// 見出しに出てくる動きと、こちらで付けた分類だけから組み立てています。

const TYPE_LABEL = { 住宅宿泊事業: '住宅宿泊事業', 簡易宿所: '簡易宿所（旅館業）', 特区民泊: '特区民泊' };

// 見出しに市区町村名が出ていれば、都道府県より優先して使う（同じ文が並ぶのを避けるため）
const CITIES = Object.keys(
  JSON.parse(readFileSync(new URL('../../data/keywords.json', import.meta.url), 'utf8')).cityToPref ?? {}
).filter((c) => c.length >= 2).sort((a, b) => b.length - a.length);
const placeOf = (item) => {
  const city = CITIES.find((c) => item.title.includes(c) && /[区市町村]$/.test(c));
  if (city) return city;
  const areas = item.areas.filter((a) => a !== '全国');
  return areas.length ? areas.slice(0, 2).join('・') : null;
};

const SIGNALS = [
  { m: ['原則禁止', '営業禁止', '禁止へ'],
    t: '検討中の物件が対象区域に入るかどうか、用途地域と条例の施行時期を確認してください。すでにある施設が対象になる場合もあります。' },
  { m: ['受付停止', '受付終了', '新規停止'],
    t: '新しい申請ができるかどうかと、別の制度（旅館業など）へ切り替えられるかを確認してください。' },
  { m: ['規制強化', '上乗せ', '厳格化', '義務', '常駐'],
    t: '追加で必要になる設備・人員と、いつから適用されるかを確認してください。運営費に直接効いてきます。' },
  { m: ['緩和', '見直し', '簡素化', '効率化'],
    t: 'これまで条件に合わなかった物件が対象になる可能性があります。適用範囲と時期を確認してください。' },
  { m: ['改正', '施行', '新設'],
    t: '届出・許可の書類や手順が変わる可能性があります。申請前に最新の様式を確認してください。' },
  { m: ['取締', '違法', '無許可', '摘発', '行政処分', '過料'],
    t: '許可の有無に加えて、標識の掲示や宿泊者名簿など運営上の義務を満たしているか確認してください。' },
  { m: ['トラブル', '騒音', 'ごみ', '苦情', '住民'],
    t: '近隣への周知方法と、苦情を受ける窓口・連絡体制を確認してください。条例で義務づけられる場合があります。' },
  { m: ['補助', '助成', '交付', '公募'],
    t: '対象の要件と申請期限、着工前かどうかを確認してください。着工後は対象外になる制度が多くあります。' },
  { m: ['検討', '案を', '案の', '方針', '素案', 'パブリックコメント', '意見募集'],
    t: 'まだ決まる前の段階です。意見募集の期限と施行予定日を確認し、決まる前に影響範囲を見積もってください。' },
  { m: ['過去最多', '最多', '増加', '急増'],
    t: '同じエリアで供給がどれだけ増えているかを確認し、価格と稼働率の前提を見直してください。' },
];

const FALLBACK = {
  local: '自治体ごとに条件が変わります。物件所在地の市区町村で、区域・日数の制限と事前相談の要否を確認してください。',
  law: '国のルールに関わる内容です。届出や許可の手順に影響しないか、管轄窓口で確認してください。',
  start: '手続きや設備の条件に関わる内容です。物件を決める前に、消防署と保健所へ事前相談することをおすすめします。',
  market: '市場の動きを見る材料です。物件を選ぶときや、稼働の見込みを立てるときの前提として使えます。',
  subsidy: '費用の一部を補える可能性があります。対象の要件と申請期限を確認してください。',
  industry: 'すぐに手続きが変わるものではありませんが、これからの規制や競合の動きを読む材料になります。',
};

export function impactFor(item) {
  const where = placeOf(item);
  const types = item.businessTypes.map((t) => TYPE_LABEL[t] ?? t);
  const what = types.length ? types.join('・') : '民泊';

  const signal = SIGNALS.find((s) => s.m.some((w) => item.title.includes(w)))?.t;
  if (signal) {
    const head = where ? `${where}で${what}を検討・運営している場合、` : `${what}を検討・運営している場合、`;
    return { text: head + signal };
  }
  const base = FALLBACK[item.category.id] ?? FALLBACK.industry;
  return { text: where ? `${where}に関わる内容です。${base}` : base };
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

const daysApart = (a, b) => Math.abs((new Date(a ?? 0) - new Date(b ?? 0)) / 86400000);

/**
 * 同じ出来事を扱った報道をひとまとめにする。
 * 代表は「よく見かける媒体のもの」を優先し、同点なら見出しが長いほうを選びます。
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
      if (rank(item) > rank(hit.lead)) { hit.others.push(hit.lead); hit.lead = item; hit.grams = g; }
      else hit.others.push(item);
      continue;
    }
    clusters.push({ lead: item, grams: g, others: [] });
  }
  return clusters.map(({ lead, others }) => ({ lead, others }));
}

export { esc };
