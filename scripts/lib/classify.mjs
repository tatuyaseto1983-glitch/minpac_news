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

export function categorize(title, areas = []) {
  // 地域が特定できていて規制の話なら「自治体ルール」に寄せる
  const local = rules.categories.find((c) => c.id === 'local');
  const areaSpecific = areas.some((a) => a !== '全国');
  if (areaSpecific && rules.localSignals.some((w) => title.includes(w))) {
    return { id: local.id, name: local.name };
  }
  for (const c of rules.categories) {
    if (c.match.some((w) => title.includes(w))) return { id: c.id, name: c.name };
  }
  const last = rules.categories.at(-1);
  return { id: last.id, name: last.name };
}

export function detectAreas(title) {
  const found = new Set();
  // まず都道府県名をそのまま探し、当たった分は本文から取り除く
  // （「東京都新宿区」の中の「京都」を京都府と誤読しないため）
  let rest = title;
  for (const p of rules.prefectures) {
    if (rest.includes(p)) {
      found.add(p);
      rest = rest.split(p).join('　');
    }
  }
  for (const [city, pref] of Object.entries(rules.cityToPref ?? {})) {
    if (rest.includes(city)) found.add(pref);
  }
  return found.size ? [...found] : ['全国'];
}

/** 中身の薄い配信元かどうか */
export function isBlockedOutlet(name) {
  if (!name) return false;
  return (rules.outletBlocklist ?? []).some((b) => name.includes(b));
}

/** ドメインしか返ってこない配信元に読める名前を当てる */
export function normalizeOutlet(name) {
  if (!name) return name;
  return (rules.outletNames ?? {})[name] ?? name;
}

export function detectBusinessTypes(title) {
  return rules.businessTypes.filter((b) => b.match.some((w) => title.includes(w))).map((b) => b.name);
}

export const categoryList = rules.categories;
export const prefectures = rules.prefectures;
