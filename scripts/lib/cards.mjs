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

// ---------- 「どんな影響がありそうか」 ----------
// 記事の中身を推測して書くことはしません。
// AI要約があればそれを、なければ こちらの分類（カテゴリ・エリア・事業形態）から
// 「誰に関係しそうか」を組み立てて出します。

const TYPE_LABEL = {
  住宅宿泊事業: '住宅宿泊事業（年180日まで）',
  簡易宿所: '簡易宿所（旅館業）',
  特区民泊: '特区民泊',
};

// 見出しに出てくる「動き」から、影響の一言を組み立てる
const SIGNALS = [
  { m: ['原則禁止', '営業禁止', '禁止へ'], t: '開業できる場所が狭まる可能性があります。すでにある施設が対象になることもあります。' },
  { m: ['受付停止', '受付終了', '新規停止'], t: '新しい申請ができなくなる可能性があります。別の制度への切り替えを考える場面です。' },
  { m: ['規制強化', '上乗せ', '厳格化', '義務'], t: '営業の条件が厳しくなる方向の動きです。追加の設備や人手が必要になることがあります。' },
  { m: ['緩和', '見直し', '簡素化', '効率化'], t: '条件がゆるくなる可能性があります。これまで難しかった物件が使えるようになることもあります。' },
  { m: ['改正', '施行', '新設'], t: '決まりそのものが変わります。届出の書類や手順に影響することがあります。' },
  { m: ['取締', '違法', '無許可', '摘発', '行政指導'], t: '許可を取らない営業への取り締まりの話です。手続きを飛ばした運営は避けてください。' },
  { m: ['トラブル', '騒音', 'ごみ', '苦情', '住民'], t: '近隣とのトラブルに関する話です。運営ルールや連絡体制を見直す材料になります。' },
  { m: ['補助', '助成', '交付', '公募'], t: '費用の一部を補える可能性があります。申請には期限があり、着工前に限られることが多い制度です。' },
  { m: ['検討', '案を', '方針', '素案', 'パブリックコメント'], t: 'まだ決まる前の段階です。いま動きを追っておくと、決まってから慌てずに済みます。' },
  { m: ['過去最多', '最多', '増加', '急増'], t: '数が増えている局面です。競合が増えるという意味でもあるので、立地の選び方に効いてきます。' },
];

const signalFor = (title) => SIGNALS.find((s) => s.m.some((w) => title.includes(w)))?.t ?? null;

const IMPACT = {
  local: (where, what) =>
    `${where}で${what}を営む方・検討中の方に関係します。自治体のルールが変わると、営業できる区域・日数・事前に必要な手続きが変わることがあります。`,
  law: (where, what) =>
    `${what}に関わる国のルールの話です。届出や許可の手順、必要な書類が変わることがあります。`,
  practice: (where, what) =>
    `これから${what}を始める方に関係します。手続きの順番や、建物・消防の条件にかかわる内容です。`,
  stats: () =>
    '市場の動きを見るための数字です。物件を選ぶときや、稼働の見込みを立てるときの材料になります。',
  subsidy: (where) =>
    `${where}で改修費などの負担を減らせる可能性があります。申請には期限があり、着工前に限られることが多い点にご注意ください。`,
  industry: (where, what) =>
    `${where}の${what}をめぐる動きです。すぐに手続きが変わるものではありませんが、流れをつかむ材料になります。`,
  system: () =>
    '届出の手続きに使う「民泊制度運営システム」からのお知らせです。運営中の方はご確認ください。',
};

export function impactFor(item) {
  if (item.summary) {
    return { label: item.summarySource === 'ai' ? 'AIによる要約（下書き）' : '要約', text: item.summary };
  }
  const blurb = blurbFor(item);
  if (blurb) return { label: 'どんな話か', text: blurb };

  const areas = item.areas.filter((a) => a !== '全国');
  const where = areas.length ? areas.slice(0, 2).join('・') : '全国';
  const types = item.businessTypes.map((t) => TYPE_LABEL[t] ?? t);
  const what = types.length ? types.join('・') : '民泊・簡易宿所';

  const signal = signalFor(item.title);
  if (signal) {
    const who = areas.length ? `${where}で${what}を営む方・検討中の方へ。` : `${what}に関わる方へ。`;
    return { label: 'どう効きそうか', text: `${who}${signal}` };
  }
  const fn = IMPACT[item.category.id] ?? IMPACT.industry;
  return { label: '関係しそうな方', text: fn(where, what) };
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
