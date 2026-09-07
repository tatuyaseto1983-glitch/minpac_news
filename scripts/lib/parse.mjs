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

export { strip };
