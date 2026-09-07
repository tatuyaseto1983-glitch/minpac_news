// e-Stat の応答から、必要な数字だけを取り出す処理。
// API を叩く部分と分けてあるので、応答の形を再現したデータで検証できます。

export const list = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);

/** 「1,234」→1234、「-」「***」「…」→null（秘匿・該当なしの記号） */
export const toNumber = (raw) => {
  if (raw == null) return null;
  const s = String(raw).replace(/,/g, '').trim();
  if (!s || /^[-‐－…\*×xX]+$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

/** CLASS_OBJ から「分類ID → {コード: 名前}」の対応表を作る */
export function classNames(statsData) {
  const out = {};
  for (const obj of list(statsData?.CLASS_INF?.CLASS_OBJ)) {
    out[obj['@id']] = Object.fromEntries(list(obj.CLASS).map((c) => [c['@code'], c['@name']]));
  }
  return out;
}

export const tableTitle = (statsData) => {
  const t = statsData?.TABLE_INF?.TITLE;
  return String(t?.$ ?? t ?? '');
};

/**
 * いちばん新しい時点の、全国の値と都道府県別の内訳を取り出す。
 * ind = { key, label, unit, areaClass, nationwideCode, statsDataId }
 */
export function extractIndicator(statsData, ind) {
  const values = list(statsData?.DATA_INF?.VALUE);
  if (!values.length) throw new Error('数値が空でした');

  const names = classNames(statsData);
  const areaKey = `@${ind.areaClass ?? 'area'}`;
  if (!values.some((v) => v[areaKey] != null)) {
    throw new Error(`分類「${ind.areaClass ?? 'area'}」が見つかりません（--meta で分類IDを確認してください）`);
  }

  const times = values.map((v) => v['@time']).filter(Boolean);
  if (!times.length) throw new Error('時点（time）が入っていません');
  const latest = times.sort().at(-1);
  const rows = values.filter((v) => v['@time'] === latest);

  const nationwide = rows.find((v) => v[areaKey] === (ind.nationwideCode ?? '00000'));
  const byArea = rows
    .filter((v) => v[areaKey] && v[areaKey] !== (ind.nationwideCode ?? '00000'))
    .map((v) => ({ area: names[ind.areaClass ?? 'area']?.[v[areaKey]] ?? v[areaKey], value: toNumber(v.$) }))
    .filter((r) => r.value != null)
    .sort((a, b) => b.value - a.value)
    .slice(0, 47);

  return {
    label: ind.label,
    unit: ind.unit ?? '',
    period: names.time?.[latest] ?? latest,
    nationwide: nationwide ? toNumber(nationwide.$) : null,
    byArea,
    tableTitle: tableTitle(statsData),
    statsDataId: ind.statsDataId,
  };
}
