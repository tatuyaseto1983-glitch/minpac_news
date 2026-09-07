import { absolute } from './http.mjs';

const uncdata = (s) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');

const strip = (s) =>
  uncdata(s)
   .replace(/<[^>]*>/g, '')
   .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
   .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
   .replace(/\s+/g, ' ').trim();

/** RSS 1.0 / 2.0 のどちらでも <item> を拾う */
export function parseRss(xml, sourceUrl) {
  const out = [];
  for (const m of xml.matchAll(/<item[\s>][\s\S]*?<\/item>/g)) {
    const block = m[0];
    const title = strip(block.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '');
    const link = strip(block.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? '');
    const date = block.match(/<dc:date>([\s\S]*?)<\/dc:date>/)?.[1]
              ?? block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? '';
    if (!title || !link) continue;
    out.push({ title, url: absolute(link, sourceUrl).replace(/^http:/, 'https:'), publishedAt: toIsoDate(date) });
  }
  return out;
}

/** 観光庁「報道発表」トップから、年別一覧ページのURLを新しい順で取り出す */
export function findYearPages(html, baseUrl) {
  return [...html.matchAll(/<div class="c-links__item">\s*<a href="([^"]+)">\s*(\d{4})年/g)]
    .map((m) => ({ url: absolute(m[1], baseUrl), year: Number(m[2]) }))
    .sort((a, b) => b.year - a.year);
}

/** 観光庁 年別報道発表ページ（日付ブロック＋リンクの繰り返し） */
export function parseJtaYearPage(html, baseUrl) {
  const out = [];
  for (const m of html.matchAll(
    /<p class="c-text-list__text">\s*(\d{4})年(\d{1,2})月(\d{1,2})日\s*<\/p>([\s\S]*?)<\/ul>/g
  )) {
    const [, y, mo, d, listHtml] = m;
    const publishedAt = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    for (const a of listHtml.matchAll(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
      const title = strip(a[2]);
      if (!title) continue;
      out.push({ title, url: absolute(a[1], baseUrl), publishedAt });
    }
  }
  return out;
}

/** Google ニュースの検索RSS。見出し・媒体名・リンクだけを扱う */
export function parseGoogleNews(xml) {
  const out = [];
  for (const m of xml.matchAll(/<item>[\s\S]*?<\/item>/g)) {
    const block = m[0];
    const outlet = strip(block.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] ?? '');
    let title = strip(block.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '');
    const link = strip(block.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? '');
    if (!title || !link) continue;
    // 「見出し - 媒体名」の末尾を落とす
    if (outlet && title.endsWith(` - ${outlet}`)) title = title.slice(0, -(outlet.length + 3)).trim();
    else title = title.replace(/\s-\s[^-]{2,30}$/, '').trim();
    const date = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? '';
    out.push({ title, url: link, publishedAt: toIsoDate(date), outlet: outlet || '報道' });
  }
  return out;
}

/** 民泊制度ポータルの「新着情報」リスト（日付＋区分＋本文） */
export function parseMinpakuNews(html, baseUrl) {
  const out = [];
  for (const m of html.matchAll(
    /<li>\s*<span class="date">\s*(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日\s*<\/span>([\s\S]*?)<\/li>/g
  )) {
    const [, y, mo, d, rest] = m;
    const label = strip(rest.match(/<p class="news_[^"]*">([\s\S]*?)<\/p>/)?.[1] ?? '');
    const link = rest.match(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
    const linked = link ? strip(link[2]) : '';
    const plain = strip(rest.replace(/<p class="news_[^"]*">[\s\S]*?<\/p>/, ''));
    let title = linked.length > 8 ? linked : plain;
    if (!title) continue;
    if (title.length > 110) title = title.slice(0, 109) + '…';
    out.push({
      title: label ? `【${label}】${title}` : title,
      url: link ? absolute(link[1], baseUrl) : baseUrl,
      publishedAt: `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    });
  }
  return out;
}

/** 「９万3,475」「4万1,909」「2,725」のような表記を数値にする */
function jpNumber(raw) {
  const han = raw.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/,/g, '');
  const man = han.match(/^(\d+)万(\d*)$/);
  if (man) return Number(man[1]) * 10000 + Number(man[2] || 0);
  return Number(han);
}

/** 厚労省「旅館業の概要」から営業許可施設数を取り出す */
export function parseRyokanStats(html) {
  const text = strip(html);
  const n = (re) => {
    const m = text.match(re);
    return m ? jpNumber(m[1]) : null;
  };
  return {
    asOfLabel: text.match(/(令和[０-９0-9元]+年[０-９0-9]+月末)現在の旅館業の営業許可施設数/)?.[1] ?? null,
    total: n(/営業許可施設数は、?([０-９0-9万,]+)施設/),
    delta: n(/前年度より([０-９0-9万,]+)施設/),
    hotels: n(/旅館・ホテル営業数は([０-９0-9万,]+)施設/),
    kani: n(/簡易宿所数は([０-９0-9万,]+)施設/),
  };
}

/** 観光庁の「宿泊旅行統計調査」報道発表ページから、最新月の数字を取り出す */
export function parseLodgingStats(html) {
  const t = strip(html);
  const man = (v) => Math.round(Number(String(v).replace(/,/g, '')) * 10000); // 「5,467万人泊」→ 54,670,000
  const pct = (v) => Number(String(v).replace(/[△▲]/, '-'));

  // 最初に出てくる月がいちばん新しい（第1次速報）
  const total = t.match(/(\d{4})年(\d{1,2})月の延べ宿泊者数（全体）は、?\s*([\d,]+)万人泊\s*[（(]前年同月比\s*([-+△▲\d.]+)\s*[%％]/);
  if (!total) return null;
  const jp = t.match(/うち日本人延べ宿泊者数は、?\s*([\d,]+)万人泊\s*[（(]前年同月比\s*([-+△▲\d.]+)\s*[%％]/);
  const fg = t.match(/外国人延べ宿泊者数は、?\s*([\d,]+)万人泊\s*[（(]前年同月比\s*([-+△▲\d.]+)\s*[%％]/);
  const occ = t.match(new RegExp(`${total[1]}年${total[2]}月の客室稼働率は全体で\\s*([\\d.]+)\\s*[%％]`));

  // 集計方法の変更など、読むときの注意書きを拾っておく
  const caution = t.match(/(統計精度の[\s\S]{0,180}?留意。)/)?.[1] ?? null;

  return {
    period: `${total[1]}年${total[2]}月`,
    overnight: { value: man(total[3]), yoy: pct(total[4]) },
    overnightJapanese: jp ? { value: man(jp[1]), yoy: pct(jp[2]) } : null,
    overnightForeign: fg ? { value: man(fg[1]), yoy: pct(fg[2]) } : null,
    occupancy: occ ? Number(occ[1]) : null,
    caution,
  };
}

/**
 * 民泊制度ポータル「各自治体の窓口案内（条例等の状況等）」から、
 * 自治体ごとの担当部署・連絡先・公式ページ・条例の有無を取り出す。
 * 「条例」の印は観光庁が付けているものをそのまま使います（こちらの判断は入れません）。
 */
export function parseMunicipalities(html, baseUrl, slugToPref) {
  const rows = [...html.matchAll(/<tr[^>]*class="summary_table_inner_top"[^>]*>([\s\S]*?)<\/tr>/g)];
  const out = {};
  let current = null;

  // strip() は改行も空白に潰すので、<br> はいったん目印に置き換えてから分ける
  const cellLines = (h) => strip(h.replace(/<br\s*\/?>/gi, ' ¦ ')).split('¦').map((x) => x.trim()).filter(Boolean);
  const cellText = (h) => cellLines(h).join(' ');

  for (const [, body] of rows) {
    const cells = [...body.matchAll(/<(t[hd])([^>]*)>([\s\S]*?)<\/\1>/g)]
      .map((m) => ({ attrs: m[2], html: m[3] }));
    if (!cells.length) continue;
    // 都道府県の行は、先頭に都道府県名と届出先PDFのセル（group_head）が入る
    const offset = /group_head/.test(cells[0].attrs) ? 1 : 0;
    const head = cells[offset]?.html;
    if (head == null) continue;

    // 都道府県の行には <a id="tokyo"> のような目印が入っている
    const anchor = head.match(/<a\s+id="([a-z]+)"/)?.[1];
    if (anchor && slugToPref[anchor]) {
      current = slugToPref[anchor];
      out[current] ??= { pref: current, self: null, municipalities: [] };
    }
    if (!current) continue;

    const link = head.match(/<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/);
    let name = strip(link?.[2] ?? head).replace(/\（?下記以外\）?/g, '').trim();
    if (!name) continue;
    // 「条例」の小さな印
    const hasOrdinance = /list_small_box[\s\S]*?条例/.test(head);

    const lines = cellLines(cells[offset + 2]?.html ?? '');
    const tel = lines.join(' ').match(/0\d{1,4}-\d{1,4}-\d{3,4}/)?.[0] ?? null;
    // 電話番号だけの行は住所から外す（同じ番号を二度出さないため）
    const address = lines.filter((l) => !(tel && l.replace(/[（(].*$/, '').trim() === tel)).join(' ') || null;

    const entry = {
      name,
      url: link?.[1] ?? null,
      hasOrdinance,
      dept: cellText(cells[offset + 1]?.html ?? '') || null,
      address,
      tel,
    };
    if (anchor && slugToPref[anchor]) out[current].self = entry;
    else out[current].municipalities.push(entry);
  }

  // 条例まとめのPDF（観光庁が用意しているもの）
  const pdfs = [...html.matchAll(/各自治体の([^<]{2,20})は<a href="([^"]+\.pdf)"/g)]
    .map((m) => ({ title: `各自治体の${m[1]}`, url: absolute(m[2], baseUrl) }));

  return { areas: out, pdfs };
}

/** 民泊制度ポータル「施行状況」ページから件数を取り出す */
export function parseMinpakuSituation(html) {
  const text = strip(html);
  const asOf = text.match(/届出及び登録の状況（([^）]+)時点）/)?.[1] ?? null;
  const num = (re) => {
    const v = text.match(re)?.[1];
    return v ? Number(v.replace(/,/g, '')) : null;
  };
  const filed = num(/住宅宿泊事業の届出件数は([\d,]+)件/);
  const closed = num(/事業廃止件数が([\d,]+)件/);
  return {
    asOf,
    filed,
    closed,
    active: filed != null && closed != null ? filed - closed : null,
    managers: num(/住宅宿泊管理業の登録件数は([\d,]+)件/),
    brokers: num(/住宅宿泊仲介業の登録件数は([\d,]+)件/),
  };
}

const ERAS = { 令和: 2018, 平成: 1988, 昭和: 1925 };

/** 「（令和８年４月21日）」のような和暦表記を YYYY-MM-DD に直す */
export function warekiToIso(text) {
  const m = text.match(/(令和|平成|昭和)\s*([0-9０-９元]+)\s*年\s*([0-9０-９]+)\s*月\s*([0-9０-９]+)\s*日/);
  if (!m) return null;
  const z = (v) => Number(String(v).replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace('元', '1'));
  const year = ERAS[m[1]] + z(m[2]);
  return `${year}-${String(z(m[3])).padStart(2, '0')}-${String(z(m[4])).padStart(2, '0')}`;
}

/** 厚労省「旅館業のページ」から、通知・法令・資料のリンクを節ごとに取り出す */
export function parseMhlwDocs(html, baseUrl, wanted) {
  const sections = [];
  for (const want of wanted) {
    const start = html.indexOf(`id="${want.anchor}"`);
    if (start < 0) continue;
    // 次の見出し（id="h2_freeN"）までを1つの節として切り出す
    const next = html.slice(start + 1).search(/id="h2_free\d+"/);
    const seg = next < 0 ? html.slice(start) : html.slice(start, start + 1 + next);

    const groups = [];
    // 「旅館業法全般」のような小見出しつきのまとまり
    for (const g of seg.matchAll(/<li>([^<]{2,40})\s*<ul class="m-listLink">([\s\S]*?)<\/ul>/g)) {
      const label = strip(g[1]);
      const items = extractLinks(g[2], baseUrl);
      if (items.length) groups.push({ label, items });
    }
    // 小見出しのない一枚もののリスト
    if (!groups.length) {
      for (const u of seg.matchAll(/<ul class="m-listLink">([\s\S]*?)<\/ul>/g)) {
        const items = extractLinks(u[1], baseUrl);
        if (items.length) groups.push({ label: null, items });
      }
    }
    if (groups.length) sections.push({ title: want.title, anchor: want.anchor, groups });
  }
  return sections;
}

function extractLinks(html, baseUrl) {
  const out = [];
  const seen = new Set();
  for (const a of html.matchAll(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
    const rawTitle = strip(a[2]);
    if (!rawTitle) continue;
    // 「［PDF形式:130KB］［130KB］」のようなファイル情報を切り離す
    const sizes = [...rawTitle.matchAll(/［([^］]*?(?:KB|MB|PDF)[^］]*?)］/g)].map((m) => m[1]);
    const title = rawTitle.replace(/［[^］]*(?:KB|MB|PDF)[^］]*］/g, '').replace(/\s+/g, ' ').trim();
    const url = absolute(a[1], baseUrl);
    if (seen.has(url + title)) continue;
    seen.add(url + title);
    out.push({
      title,
      url,
      date: warekiToIso(rawTitle),
      fileType: /\.pdf(\?|$)/i.test(url) ? 'PDF' : /elaws\.e-gov\.go\.jp/.test(url) ? 'e-Gov 法令' : 'ページ',
      size: sizes.map((v) => v.replace(/^PDF形式[:：]\s*/, '').trim())
                 .filter((v) => /^[\d.]+\s*(KB|MB)$/i.test(v)).pop() ?? null,
    });
  }
  return out;
}

function toIsoDate(raw) {
  if (!raw) return null;
  const d = new Date(raw.trim());
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

/** 観光庁「施行状況」ページから、見出しの文言でPDFのリンクを探す */
export function findPdfLink(html, baseUrl, label) {
  for (const m of html.matchAll(/<a\s[^>]*href="([^"]+\.pdf)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    if (strip(m[2]).includes(label)) return absolute(m[1], baseUrl);
  }
  return null;
}

/**
 * 観光庁「都道府県別届出状況一覧」のPDFを pdftotext -layout で文字にしたものを読み取る。
 * 表は「都道府県」「保健所設置市」「特別区」の3列が横に並んでいて、
 * どの列も「通し番号・名前・届出件数・事業廃止件数・届出住宅数」の5つ組。
 */
export function parseFilingsPdf(text, { prefectures, cityToPref }) {
  const n = (v) => Number(String(v).replace(/,/g, ''));
  const prefSet = new Set(prefectures);
  const asOf = warekiToIso(text.match(/(令和[^\n]{0,14}?日)\s*時点/)?.[1] ?? '');

  const rows = [];
  const unmapped = [];
  const ROW = /(\d{1,2})\s+(\S+?)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)(?=\s|$)/g;
  for (const line of text.split('\n')) {
    for (const m of line.matchAll(ROW)) {
      const name = m[2];
      let kind = null;
      let prefecture = null;
      if (prefSet.has(name)) { kind = 'prefecture'; prefecture = name; }
      else if (name.endsWith('区')) { kind = 'ward'; prefecture = '東京都'; } // この表の「区」は特別区だけ
      else if (name.endsWith('市')) { kind = 'city'; prefecture = cityToPref[name] ?? null; }
      else continue;
      if (!prefecture) { unmapped.push(name); continue; }
      rows.push({ no: n(m[1]), name, kind, prefecture, filed: n(m[3]), closed: n(m[4]), homes: n(m[5]) });
    }
  }

  // 表の下にある集計欄。読み取りが正しいかを突き合わせるために使う。
  const totals = {};
  const KIND_OF = { 都道府県: 'prefecture', 保健所設置市: 'city', 特別区: 'ward', 合計: 'all' };
  for (const m of text.matchAll(/^[ \t]*(都道府県|保健所設置市|特別区|合計)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)(?=\s|$)/gm)) {
    totals[KIND_OF[m[1]]] = { filed: n(m[2]), closed: n(m[3]), homes: n(m[4]) };
  }

  const byPrefecture = {};
  for (const r of rows) {
    const a = (byPrefecture[r.prefecture] ??= {
      prefecture: r.prefecture, filed: 0, closed: 0, homes: 0, breakdown: [],
    });
    a.filed += r.filed; a.closed += r.closed; a.homes += r.homes;
    a.breakdown.push({ name: r.name, kind: r.kind, filed: r.filed, closed: r.closed, homes: r.homes });
  }
  for (const a of Object.values(byPrefecture)) {
    a.breakdown.sort((x, y) => y.homes - x.homes);
  }

  return {
    asOf,
    rows,
    unmapped,
    totals,
    byPrefecture,
    managers: readLabelled(text, 0),
    brokers: readLabelled(text, 1),
    tokku: readTokku(text),
  };
}

/** 「登録件数 4,529 件」が1行に2つ並ぶ（住宅宿泊管理業／仲介業の順） */
function readLabelled(text, index) {
  const hit = [...text.matchAll(/登録件数\s+([\d,]+)\s*件/g)][index];
  return hit ? Number(hit[1].replace(/,/g, '')) : null;
}

/** 特区民泊の認定居室数（時点が月末までしか書かれていないので、表記のまま持つ） */
function readTokku(text) {
  const rooms = text.match(/([\d,]+)\s+居室/);
  if (!rooms) return null;
  return {
    rooms: Number(rooms[1].replace(/,/g, '')),
    asOfLabel: text.match(/特区民泊の認定居室数[\s\S]{0,60}?（([^）]+?)時点）/)?.[1] ?? null,
  };
}

/** 読み取り結果が表の集計欄と合っているかを確かめる。合わなければ理由を投げる。 */
export function checkFilings(r, { expect = 47 } = {}) {
  const prefs = Object.keys(r.byPrefecture).length;
  if (r.unmapped.length) throw new Error(`どの都道府県か分からない市があります: ${[...new Set(r.unmapped)].join('、')}`);
  if (prefs !== expect) throw new Error(`都道府県が${prefs}件しか揃いませんでした（表の作りが変わったかもしれません）`);
  if (!r.asOf) throw new Error('「◯年◯月◯日時点」を読み取れませんでした');

  const sum = (kind) => r.rows.filter((x) => kind === 'all' || x.kind === kind)
    .reduce((a, x) => ({ filed: a.filed + x.filed, closed: a.closed + x.closed, homes: a.homes + x.homes }),
      { filed: 0, closed: 0, homes: 0 });
  const LABEL = { prefecture: '都道府県', city: '保健所設置市', ward: '特別区', all: '合計' };
  for (const kind of ['prefecture', 'city', 'ward', 'all']) {
    const want = r.totals[kind];
    if (!want) throw new Error(`集計欄の「${LABEL[kind]}」を読み取れませんでした`);
    const got = sum(kind);
    for (const key of ['filed', 'closed', 'homes']) {
      if (got[key] !== want[key]) {
        throw new Error(`${LABEL[kind]}の合計が合いません（読み取り${got[key].toLocaleString('ja-JP')} / 表${want[key].toLocaleString('ja-JP')}）`);
      }
    }
  }
  return r;
}

/**
 * 観光庁「宿泊旅行統計調査」報道発表のPDFから、都道府県別の3つの表を読み取る。
 * 表はどれも「施設所在地」が先頭で、全国の行が1行だけ先に来る。
 * この3表は第2次速報（＝本文の見出しより1か月前）の数字である点に注意。
 */
export function parseLodgingPdf(text, { prefectures }) {
  const n = (v) => Number(String(v).replace(/,/g, ''));
  // PDFには半角の -+ と全角の －＋ が混ざっている
  const sign = (v) => Number(String(v).replace(/[－▲△]/g, '-').replace(/[＋]/g, '+'));
  const prefSet = new Set(prefectures);

  const lines = text.split('\n');
  // 表の見出し行を探し、そこから下を読む
  // 同じ文言が節の見出しにも出てくるので、時点が書かれている行のほうを表の見出しとみなす
  const PERIOD = /（(\d{4}年\d{1,2}月)（(第\d次速報)））/;
  const tableAt = (caption) => {
    const hits = lines.map((l, i) => [l, i]).filter(([l]) => l.includes(caption));
    const [line, i] = hits.find(([l]) => PERIOD.test(l)) ?? hits[0] ?? [];
    return i == null ? null : { start: i, period: line.match(PERIOD) };
  };

  // 表ごとに「名前＋数字の並び」を読み、全国と47都道府県が揃った時点で打ち切る
  const readTable = (caption, row) => {
    const at = tableAt(caption);
    if (!at) return null;
    const out = { national: null, areas: {}, period: at.period?.[1] ?? null, stage: at.period?.[2] ?? null };
    for (let i = at.start + 1; i < lines.length; i++) {
      const m = lines[i].trim().match(row);
      if (!m) continue;
      const name = m[1];
      if (name === '全国') { out.national = m; continue; }
      if (!prefSet.has(name)) continue;
      out.areas[name] = m;
      if (Object.keys(out.areas).length === prefSet.size) break;
    }
    return out;
  };

  const NUM = String.raw`([\d,]+)`;
  const PCT = String.raw`([－＋+-]?[\d.]+)\s*[%％]`;
  const t1 = readTable('都道府県別延べ宿泊者数及び日本人延べ宿泊者数',
    new RegExp(String.raw`^(\S+)\s+${NUM}\s+${PCT}\s+${NUM}\s+${PCT}$`));
  const t2 = readTable('都道府県別外国人延べ宿泊者数',
    new RegExp(String.raw`^(\S+)\s+${NUM}\s+${PCT}\s+([\d.]+)\s*[%％]$`));
  // 稼働率の表は「値・順位」が6種類ぶん並ぶ。使うのは全体と、いちばん右の簡易宿所。
  const t3 = readTable('都道府県別宿泊施設タイプ別客室稼働率',
    new RegExp(String.raw`^(\S+)\s+([\d.]+)\s+(\d+|-)\s+([－＋+-]?[\d.]+)\s+(?:[\d.]+\s+(?:\d+|-)\s+){4}([\d.]+)\s+(\d+|-)$`));

  const pick = (t, name) => (name === '全国' ? t?.national : t?.areas?.[name]);
  const build = (name) => {
    const a = pick(t1, name), b = pick(t2, name), c = pick(t3, name);
    if (!a) return null;
    return {
      overnight: n(a[2]), overnightYoy: sign(a[3]),
      japanese: n(a[4]), japaneseYoy: sign(a[5]),
      foreign: b ? n(b[2]) : null, foreignYoy: b ? sign(b[3]) : null,
      foreignShare: b ? Number(b[4]) : null,
      occupancy: c ? Number(c[2]) : null,
      occupancyRank: c && c[3] !== '-' ? Number(c[3]) : null,
      occupancyYoyDiff: c ? sign(c[4]) : null,
      kaniOccupancy: c ? Number(c[5]) : null,
      kaniRank: c && c[6] !== '-' ? Number(c[6]) : null,
    };
  };

  const areas = {};
  for (const pref of prefectures) {
    const v = build(pref);
    if (v) areas[pref] = { prefecture: pref, ...v };
  }
  return {
    period: t1?.period ?? null,
    stage: t1?.stage ?? null,
    occupancyPeriod: t3?.period ?? null,
    national: build('全国'),
    areas,
    // 稼働率の表に載っていない都道府県があれば、あとで気づけるように残す
    missingOccupancy: prefectures.filter((x) => !pick(t3, x)),
    missingForeign: prefectures.filter((x) => !pick(t2, x)),
  };
}

/** 読み取った延べ宿泊者数が、表の「全国」の行と合っているかを確かめる */
export function checkLodging(r) {
  if (!r.national) throw new Error('「全国」の行を読み取れませんでした');
  const got = Object.keys(r.areas).length;
  if (got !== 47) throw new Error(`都道府県が${got}件しか揃いませんでした（表の作りが変わったかもしれません）`);
  if (r.missingForeign.length) throw new Error(`外国人の表に無い都道府県があります: ${r.missingForeign.join('、')}`);
  if (r.missingOccupancy.length) throw new Error(`稼働率の表に無い都道府県があります: ${r.missingOccupancy.join('、')}`);
  for (const key of ['overnight', 'japanese', 'foreign']) {
    const sum = Object.values(r.areas).reduce((a, x) => a + (x[key] ?? 0), 0);
    const want = r.national[key];
    // 四捨五入の都合でぴったり合わないことがあるので、0.5%までは許す
    if (Math.abs(sum - want) / want > 0.005) {
      throw new Error(`全国の合計が合いません（${key}：読み取り${sum.toLocaleString('ja-JP')} / 表${want.toLocaleString('ja-JP')}）`);
    }
  }
  return r;
}

export { strip };
