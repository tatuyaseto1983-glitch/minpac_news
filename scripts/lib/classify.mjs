import { readFileSync } from 'node:fs';

const rules = JSON.parse(readFileSync(new URL('../../data/keywords.json', import.meta.url), 'utf8'));

/** 取り込む価値があるかを判定する。tier が高いほど民泊制度に近い。 */
export function screen(title) {
  const hitExclude = rules.exclude.find((w) => title.includes(w));
  for (const tier of [3, 2, 1]) {
    const hits = rules.tiers[String(tier)].filter((w) => title.includes(w));
    if (!hits.length) continue;
    if (tier < 3 && hitExclude) return { keep: false, reason: `除外語「${hitExclude}」`, hits };
    return { keep: true, score: tier, hits };
  }
  return { keep: false, reason: 'キーワードなし', hits: [] };
}

export function categorize(title) {
  for (const c of rules.categories) {
    if (c.match.some((w) => title.includes(w))) return { id: c.id, name: c.name };
  }
  const last = rules.categories.at(-1);
  return { id: last.id, name: last.name };
}

export function detectAreas(title) {
  const found = rules.prefectures.filter((p) => title.includes(p) || title.includes(p.replace(/[都道府県]$/, '')));
  return found.length ? found : ['全国'];
}

export function detectBusinessTypes(title) {
  return rules.businessTypes.filter((b) => b.match.some((w) => title.includes(w))).map((b) => b.name);
}

export const categoryList = rules.categories;
export const prefectures = rules.prefectures;
