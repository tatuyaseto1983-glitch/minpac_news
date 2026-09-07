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
 * 表が持っている「地域」「時間」以外の分類について、どの区分を使うかを決める。
 * 設定で指定があればそれを、なければ「総数」にあたる区分を選びます。
 * どちらも無ければ、選べる区分を並べて失敗させます（黙って一部だけ集計しないため）。
 */
export function resolveAxes(statsData, ind) {
  const areaId = ind.areaClass ?? 'area';
  const chosen = {};
  for (const obj of list(statsData?.CLASS_INF?.CLASS_OBJ)) {
    const id = obj['@id'];
    if (id === 'time' || id === areaId) continue;
    const items = list(obj.CLASS);
    const fixed = ind.filters?.[id];
    if (fixed) { chosen[id] = { code: fixed, name: items.find((c) => c['@code'] === fixed)?.['@name'] ?? fixed }; continue; }
    if (items.length === 1) { chosen[id] = { code: items[0]['@code'], name: items[0]['@name'] }; continue; }
    const total = items.find((c) => /^(総数|合計|計|全体)/.test(String(c['@name']).trim()));
    if (total) { chosen[id] = { code: total['@code'], name: total['@name'] }; continue; }
    throw new Error(
      `分類「${obj['@name']}（${id}）」でどれを使うか決められません。` +
      `data/estat.json の filters に指定してください。選択肢：` +
      items.slice(0, 6).map((c) => `${c['@code']}=${c['@name']}`).join('、')
    );
  }
  return chosen;
}

/**
 * いちばん新しい時点の、全国の値と都道府県別の内訳を取り出す。
 * ind = { key, label, unit, areaClass, nationwideCode, statsDataId, filters }
 */
export function extractIndicator(statsData, ind) {
  const values = list(statsData?.DATA_INF?.VALUE);
  if (!values.length) throw new Error('数値が空でした');

  const names = classNames(statsData);
  const areaKey = `@${ind.areaClass ?? 'area'}`;
  if (!values.some((v) => v[areaKey] != null)) {
    throw new Error(`分類「${ind.areaClass ?? 'area'}」が見つかりません（--meta で分類IDを確認してください）`);
  }

  // 内訳の軸を1つに絞る（絞らないと同じ県の行がいくつも出てしまう）
  const axes = resolveAxes(statsData, ind);
  const onAxes = (v) => Object.entries(axes).every(([id, c]) => v[`@${id}`] === c.code);
  const picked = values.filter(onAxes);
  if (!picked.length) throw new Error('絞り込みの条件に合う行がありませんでした');

  const times = picked.map((v) => v['@time']).filter(Boolean);
  if (!times.length) throw new Error('時点（time）が入っていません');
  const latest = times.sort().at(-1);
  const rows = picked.filter((v) => v['@time'] === latest);

  // 同じ地域が複数行あるなら、絞り込みが足りていない
  const seen = new Set();
  for (const v of rows) {
    const a = v[areaKey];
    if (a && seen.has(a)) throw new Error(`同じ地域の行が複数あります（絞り込み不足）：${names[areaKey.slice(1)]?.[a] ?? a}`);
    if (a) seen.add(a);
  }

  const nationwide = rows.find((v) => v[areaKey] === (ind.nationwideCode ?? '00000'));
  // 「施設所在地」には運輸局なども含まれるので、都道府県だけに絞る
  const isPref = (name) => /[都道府県]$/.test(String(name).trim());
  const byArea = rows
    .filter((v) => v[areaKey] && v[areaKey] !== (ind.nationwideCode ?? '00000'))
    .map((v) => ({ area: names[ind.areaClass ?? 'area']?.[v[areaKey]] ?? v[areaKey], value: toNumber(v.$) }))
    .filter((r) => r.value != null)
    .filter((r) => (ind.prefecturesOnly === false ? true : isPref(r.area)))
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
    filters: Object.fromEntries(Object.entries(axes).map(([id, c]) => [id, c.name])),
  };
}
