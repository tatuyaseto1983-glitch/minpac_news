// Google ニュースのリンクから、記事の本当のURLと見出し画像を取りにいきます。
//
// なぜ手間がかかるのか：
//   Google ニュースのリンクは行き先が隠されていて、そのままでは各社のページに辿り着けません。
//   Google 自身の変換窓口に問い合わせて、はじめて本当のURLが分かります。
// 気をつけていること：
//   ・1件ずつ間隔をあけて、まとめて叩かない
//   ・取れなかった記事は二度目を試さない（記録に残して打ち止めにする）
//   ・画像は各社のサーバーにあるものを、そのまま参照します（保存はしません）
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let lastAt = 0;
const GAP_MS = 1200;
async function polite(url, init = {}) {
  const wait = Math.max(0, lastAt + GAP_MS - Date.now());
  if (wait) await sleep(wait);
  lastAt = Date.now();
  return fetch(url, {
    ...init,
    headers: { 'User-Agent': UA, 'Accept-Language': 'ja', ...(init.headers ?? {}) },
    redirect: 'follow',
    signal: AbortSignal.timeout(20000),
  });
}

/** Google ニュースのリンク → 各社の記事URL */
export async function resolveGoogleNews(gnUrl) {
  const res = await polite(gnUrl);
  if (!res.ok) throw new Error(`Google ニュース HTTP ${res.status}`);
  const html = await res.text();
  const id = html.match(/data-n-a-id="([^"]+)"/)?.[1];
  const ts = html.match(/data-n-a-ts="(\d+)"/)?.[1];
  const sg = html.match(/data-n-a-sg="([^"]+)"/)?.[1];
  if (!id || !ts || !sg) throw new Error('行き先の情報が見つかりません（Google側の作りが変わった可能性）');

  const inner = JSON.stringify(['garturlreq',
    [['X', 'X', ['X', 'X'], null, null, 1, 1, 'JP:ja', null, 1, null, null, null, null, null, 0, 1],
      'X', 'X', 1, [1, 1, 1], 1, 1, null, 0, 0, null, 0],
    id, Number(ts), sg]);
  const rpc = await polite(
    'https://news.google.com/_/DotsSplashUi/data/batchexecute?rpcids=Fbv4je&hl=ja&gl=JP',
    { method: 'POST', body: 'f.req=' + encodeURIComponent(JSON.stringify([[['Fbv4je', inner, null, 'generic']]])),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' } }
  );
  const text = await rpc.text();
  const url = text.match(/garturlres\\",\\"(https?:[^\\"]+)/)?.[1];
  if (!url) throw new Error('行き先のURLを取り出せません');
  return url.replace(/\\u003d/g, '=').replace(/\\u0026/g, '&').replace(/\\\//g, '/');
}

/** 記事ページの og:image（SNS用の画像）を取り出す */
export async function findOgImage(articleUrl) {
  const res = await polite(articleUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const og = html.match(/<meta[^>]+property=["']og:image(?::url)?["'][^>]+content=["']([^"']+)/i)?.[1]
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::url)?["']/i)?.[1]
    ?? html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)/i)?.[1];
  if (!og) throw new Error('画像の指定がありません');
  return new URL(og, res.url).toString();
}

/** 実際に開ける画像か、重すぎないかを確かめる */
export async function checkImage(imageUrl, { maxBytes = 900_000 } = {}) {
  const res = await polite(imageUrl, { headers: { Referer: 'https://tatuyaseto1983-glitch.github.io/' } });
  try {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const type = res.headers.get('content-type') ?? '';
    if (!type.startsWith('image/')) throw new Error(`画像ではありません（${type || '種類不明'}）`);
    const size = Number(res.headers.get('content-length') ?? 0);
    if (size > maxBytes) throw new Error(`重すぎます（${Math.round(size / 1024)}KB）`);
    return { type, size };
  } finally {
    res.body?.cancel?.().catch(() => {});
  }
}
