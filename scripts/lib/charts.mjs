// グラフ部品。外部ライブラリは使わず、HTMLとCSSで描きます。
// 色は2色だけ（ティール＝民泊新法、アンバー＝旅館業法）。
// 値はすべて棒の横に直接書くので、色が見分けられなくても読めます。
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const jp = (n) => Number(n).toLocaleString('ja-JP');

/** 横棒。rows = [{ name, value, key, note }]  key は 'k1' か 'k2' */
export function hbars(rows, { unit = '', max } = {}) {
  const top = max ?? Math.max(...rows.map((r) => r.value)) * 1.02;
  return `<div class="hbars">${rows.map((r) => `
    <div class="hbar" title="${esc(r.name)}：${jp(r.value)}${esc(unit)}${r.note ? `（${esc(r.note)}）` : ''}">
      <span class="hbar__name">${esc(r.name)}</span>
      <div class="hbar__track"><div class="hbar__fill" style="width:${((r.value / top) * 100).toFixed(1)}%;--k:var(--${r.key ?? 'k1'})"></div></div>
      <span class="hbar__val">${jp(r.value)}${esc(unit)}</span>
    </div>`).join('')}</div>`;
}

/** 全体を分け合う帯。parts = [{ name, value, key }] */
export function proportionBar(parts, { unit = '' } = {}) {
  const total = parts.reduce((a, p) => a + p.value, 0);
  return `<div class="propbar">${parts.map((p) => `
      <i style="width:${((p.value / total) * 100).toFixed(1)}%;background:var(--${p.key})"
         title="${esc(p.name)}：${jp(p.value)}${esc(unit)}"></i>`).join('')}</div>
    <div class="proplegend">${parts.map((p) => `
      <span><i style="display:inline-block;width:11px;height:11px;border-radius:2px;margin-right:6px;
        vertical-align:-1px;background:var(--${p.key})"></i>${esc(p.name)}
        <b>${jp(p.value)}${esc(unit)}</b>（${Math.round((p.value / total) * 100)}%）</span>`).join('')}</div>`;
}

export function legend(items) {
  return `<div class="legend">${items.map((i) => `<span><i style="background:var(--${i.key})"></i>${esc(i.name)}</span>`).join('')}</div>`;
}

export { jp, esc };
