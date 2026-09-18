// 「保存」と「最近見た」のしくみ。
// 記録はその人のブラウザの中だけに置き、どこにも送りません。
// サーバーを持たない作りなので、この方法がいちばん素直です。
export const appJs = `
(function () {
  var K = { saved: 'mc.saved.v1', recent: 'mc.recent.v1' };
  var MAX = { saved: 200, recent: 30 };

  function usable() {
    try { localStorage.setItem('mc.t', '1'); localStorage.removeItem('mc.t'); return true; }
    catch (e) { return false; }
  }
  if (!usable()) { document.documentElement.classList.add('no-store'); return; }

  function load(k) { try { return JSON.parse(localStorage.getItem(k) || '[]') || []; } catch (e) { return []; } }
  function store(k, v) { try { localStorage.setItem(k, JSON.stringify(v.slice(0, MAX[k === K.saved ? 'saved' : 'recent']))); } catch (e) {} }
  function pick(el) {
    var d = el.dataset;
    return { id: d.id, title: d.title, url: d.url, outlet: d.outlet || '', date: d.date || '', cat: d.cat || '' };
  }
  function has(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return true; return false; }
  function drop(list, id) { return list.filter(function (x) { return x.id !== id; }); }

  // ---- ヘッダーの件数 ----
  function paintCount() {
    var n = load(K.saved).length;
    var b = document.querySelector('[data-saved-count]');
    if (!b) return;
    b.textContent = n;
    b.hidden = n === 0;
  }

  // ---- 保存ボタン ----
  function paintButtons() {
    var saved = load(K.saved);
    Array.prototype.forEach.call(document.querySelectorAll('[data-save]'), function (b) {
      var card = b.closest('[data-id]');
      if (card) b.setAttribute('aria-pressed', String(has(saved, card.dataset.id)));
    });
  }

  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('[data-save]');
    if (b) {
      ev.preventDefault();
      var card = b.closest('[data-id]');
      if (!card) return;
      var saved = load(K.saved);
      var id = card.dataset.id;
      store(K.saved, has(saved, id) ? drop(saved, id) : [pick(card)].concat(saved));
      paintButtons(); paintCount(); if (window.mcRender) window.mcRender();
      return;
    }
    // 記事を開いたら「最近見た」に残す
    var a = ev.target.closest && ev.target.closest('[data-track]');
    if (a) {
      var c = a.closest('[data-id]');
      if (c) store(K.recent, [pick(c)].concat(drop(load(K.recent), c.dataset.id)));
    }
  });

  paintButtons(); paintCount();

  // ---- 保存した記事のページ ----
  var wrapSaved = document.getElementById('saved-list');
  var wrapRecent = document.getElementById('recent-list');
  if (!wrapSaved && !wrapRecent) return;

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function ymd(s) { return s ? String(s).replace(/-/g, '.') : ''; }

  function card(x, kind) {
    return '<div class="item" data-id="' + esc(x.id) + '" data-title="' + esc(x.title) +
      '" data-url="' + esc(x.url) + '" data-outlet="' + esc(x.outlet) + '" data-date="' + esc(x.date) +
      '" data-cat="' + esc(x.cat) + '">' +
      '<div class="item__top"><span class="cat">' + esc(x.cat) + '</span>' +
      '<span class="meta">' + esc(ymd(x.date)) + '</span><span class="dot">·</span>' +
      '<span class="meta">' + esc(x.outlet) + '</span></div>' +
      '<h3 class="item__title"><a href="' + esc(x.url) + '" target="_blank" rel="noopener nofollow" data-track>' +
      esc(x.title) + '<span class="ext">\\u2197</span></a></h3>' +
      '<div class="item__tags">' +
      (kind === 'saved'
        ? '<button class="tag tag--save" type="button" data-save aria-pressed="true">' +
          '<span class="on">保存済み</span><span class="off">保存する</span></button>'
        : '<button class="tag tag--save" type="button" data-save aria-pressed="false">' +
          '<span class="on">保存済み</span><span class="off">保存する</span></button>') +
      '</div></div>';
  }

  window.mcRender = function () {
    var saved = load(K.saved), recent = load(K.recent);
    if (wrapSaved) {
      wrapSaved.innerHTML = saved.length
        ? '<div class="feed">' + saved.map(function (x) { return card(x, 'saved'); }).join('') + '</div>'
        : '<p class="empty">保存した記事はまだありません。記事カードの「☆ 保存する」を押すと、ここにたまります。</p>';
    }
    if (wrapRecent) {
      wrapRecent.innerHTML = recent.length
        ? '<div class="feed">' + recent.map(function (x) { return card(x, 'recent'); }).join('') + '</div>'
        : '<p class="empty">まだ記事を開いていません。</p>';
    }
    var c = document.getElementById('saved-count');
    if (c) c.textContent = saved.length + '件';
    var r = document.getElementById('recent-count');
    if (r) r.textContent = recent.length + '件';
    paintButtons();
  };
  window.mcRender();

  var clear = document.getElementById('recent-clear');
  if (clear) clear.addEventListener('click', function () {
    if (!confirm('「最近見た記事」の記録を消します。よろしいですか。')) return;
    store(K.recent, []); window.mcRender();
  });
})();
`;
