export const css = `
/* ---------------- tokens ---------------- */
:root{
  /* 面と文字：白〜ごく薄いグレー。枠線は最小限にして、余白と背景で階層をつくる */
  --paper:#F7F9F8; --surface:#FFFFFF; --surface-2:#F1F5F4; --surface-3:#E9EFEE;
  --ink:#0F1A19; --ink-2:#576866; --ink-3:#869593;
  --line:#E5EBEA; --line-2:#D2DCDA;

  /* 主色は深いグリーン。ブラウン／アンバーはアクセントだけに使う */
  --green:#2EA89E; --green-deep:#14514C; --green-ink:#1B7C74; --green-soft:#E9F4F2;
  --amber:#C08340; --amber-soft:#FAF1E6;
  --alert:#B4503F; --alert-soft:#FBEAE6;

  /* カテゴリは6つ。色は3系統だけに抑える（規制＝グリーン、実務／お金＝アンバー、市場・業界＝ニュートラル） */
  --c-local:var(--green); --c-law:var(--green-ink);
  --c-market:#5E7C8C; --c-industry:#7E8A88;
  --c-start:var(--amber); --c-subsidy:#A9722F;

  /* グラフ */
  --k1:#2EA89E; --k2:#C08340; --k1-pale:#B4DDD7;
  --on-hue:#FFFFFF;

  --sans:"Inter","Zen Kaku Gothic New","Hiragino Kaku Gothic ProN","Yu Gothic",system-ui,sans-serif;
  --r:6px; --r-sm:4px; --r-pill:999px;
  --wrap:1200px;
  --shadow:0 1px 2px rgba(16,40,38,.04), 0 8px 24px -18px rgba(16,40,38,.28);
  --shadow-lift:0 2px 4px rgba(16,40,38,.05), 0 18px 40px -24px rgba(16,40,38,.4);
}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]){
  --paper:#0B1211; --surface:#141C1B; --surface-2:#1B2423; --surface-3:#232E2C;
  --ink:#E9F0EE; --ink-2:#A2B1AF; --ink-3:#768683;
  --line:#232E2D; --line-2:#334140;
  --green:#3EBFB3; --green-deep:#9FDED6; --green-ink:#5CCBC0; --green-soft:#122E2B;
  --amber:#D79E5E; --amber-soft:#2E2314;
  --alert:#D47764; --alert-soft:#33201C;
  --c-market:#8AA6B5; --c-industry:#9AA5A3; --c-subsidy:#C79355;
  --k1:#2FA398; --k2:#BB8942; --k1-pale:#28524D;
  --on-hue:#0B1211;
  --shadow:0 1px 2px rgba(0,0,0,.3), 0 8px 24px -18px rgba(0,0,0,.7);
  --shadow-lift:0 2px 4px rgba(0,0,0,.35), 0 18px 40px -24px rgba(0,0,0,.8);
}}
:root[data-theme=dark]{
  --paper:#0B1211; --surface:#141C1B; --surface-2:#1B2423; --surface-3:#232E2C;
  --ink:#E9F0EE; --ink-2:#A2B1AF; --ink-3:#768683;
  --line:#232E2D; --line-2:#334140;
  --green:#3EBFB3; --green-deep:#9FDED6; --green-ink:#5CCBC0; --green-soft:#122E2B;
  --amber:#D79E5E; --amber-soft:#2E2314;
  --alert:#D47764; --alert-soft:#33201C;
  --c-market:#8AA6B5; --c-industry:#9AA5A3; --c-subsidy:#C79355;
  --k1:#2FA398; --k2:#BB8942; --k1-pale:#28524D;
  --on-hue:#0B1211;
  --shadow:0 1px 2px rgba(0,0,0,.3), 0 8px 24px -18px rgba(0,0,0,.7);
  --shadow-lift:0 2px 4px rgba(0,0,0,.35), 0 18px 40px -24px rgba(0,0,0,.8);
}

/* ---------------- base ---------------- */
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}
body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--sans);
  font-size:15px;line-height:1.85;font-weight:400;-webkit-font-smoothing:antialiased;
  font-feature-settings:"palt" 1}
h1,h2,h3,h4{margin:0;font-weight:700;line-height:1.45;letter-spacing:-.015em;text-wrap:balance}
p,ul,ol,dl,table,figure{margin:0}
a{color:var(--green-ink);text-decoration:none;text-underline-offset:3px}
a:hover{text-decoration:underline}
button{font-family:inherit}
:focus-visible{outline:2px solid var(--green);outline-offset:2px;border-radius:var(--r-sm)}
.wrap{max-width:var(--wrap);margin:0 auto;padding:0 20px}
.scroller{overflow-x:auto}
.num{font-variant-numeric:tabular-nums;letter-spacing:0}

/* 文字階層：タイトル / 本文 / 補助 の3段でメリハリをつける */
.h-page{font-size:clamp(23px,2.4vw,30px);font-weight:700;letter-spacing:-.025em}
.h-sec{font-size:16px;font-weight:700;letter-spacing:-.01em}
.eyebrow{font-size:11px;font-weight:600;letter-spacing:.12em;color:var(--ink-3);text-transform:uppercase}
.meta{font-size:12px;font-weight:500;color:var(--ink-3);font-variant-numeric:tabular-nums}
.sub{font-size:14px;color:var(--ink-2);line-height:1.85}
.micro{font-size:11.5px;color:var(--ink-3);line-height:1.8}

/* ---------------- header ---------------- */
.site-header{position:sticky;top:0;z-index:40;background:color-mix(in srgb,var(--surface) 92%,transparent);
  backdrop-filter:saturate(1.4) blur(12px);border-bottom:1px solid var(--line);
  transition:box-shadow .18s ease}
.site-header.is-small{box-shadow:0 1px 10px rgba(16,40,38,.07)}
.site-header .wrap{display:flex;align-items:center;gap:26px;height:66px;transition:height .18s ease}
.site-header.is-small .wrap{height:52px}
.brand{display:flex;align-items:center;gap:9px;font-weight:700;font-size:16.5px;color:var(--ink);
  letter-spacing:-.02em;flex:none}
.brand:hover{text-decoration:none}
.brand .mk{width:24px;height:14px;flex:none;background:
  radial-gradient(circle 6px at 6px 7px,var(--green) 0 6px,transparent 6px),
  radial-gradient(circle 6px at 18px 7px,var(--green) 0 6px,transparent 6px),
  linear-gradient(var(--green),var(--green)) 6px 5px/12px 4px no-repeat;background-repeat:no-repeat}
.brand .mk::after{content:"";display:block;width:24px;height:14px;background:
  radial-gradient(circle 2.4px at 6px 7px,var(--surface) 0 2.4px,transparent 2.4px),
  radial-gradient(circle 2.4px at 18px 7px,var(--surface) 0 2.4px,transparent 2.4px)}
.site-nav{display:flex;gap:22px;font-size:13.5px;font-weight:500;margin-right:auto}
.site-nav a{color:var(--ink-2);position:relative;padding:4px 0}
.site-nav a:hover{color:var(--ink);text-decoration:none}
.site-nav a[aria-current=page]{color:var(--ink);font-weight:600}
.site-nav a[aria-current=page]::after{content:"";position:absolute;left:0;right:0;bottom:-2px;height:2px;
  background:var(--green);border-radius:2px}
.headsearch{display:flex;align-items:center;gap:7px;flex:none;border:1px solid var(--line-2);
  border-radius:var(--r-pill);padding:6px 14px;color:var(--ink-3);font-size:12.5px;background:var(--surface)}
.headsearch:focus-within{border-color:var(--green)}
.headsearch svg{width:13px;height:13px;flex:none}
.headsearch input{border:0;background:none;font:inherit;color:var(--ink);width:150px;padding:0;outline:none}
.headsearch input::placeholder{color:var(--ink-3)}
@media(max-width:820px){
  .site-header .wrap{height:auto;padding-top:10px;padding-bottom:10px;flex-wrap:wrap;gap:12px 18px}
  .site-header.is-small .wrap{height:auto}
  .site-nav{order:3;width:100%;gap:16px;overflow-x:auto;font-size:13px;margin-right:0;
    scrollbar-width:none;white-space:nowrap}
  .site-nav::-webkit-scrollbar{display:none}
  .headsearch{margin-left:auto;flex:1;min-width:0;max-width:320px}
  .headsearch input{width:100%}
}

/* ---------------- ラベル・タグ ---------------- */
/* カテゴリ＝文字ラベル（色面は使わない）。エリア＝枠線のピル。役割で見た目を分ける */
.cat{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:700;color:var(--cat,var(--green));
  letter-spacing:.02em;white-space:nowrap}
.cat::before{content:"";width:6px;height:6px;border-radius:2px;background:currentColor;flex:none}
.tag{display:inline-flex;align-items:center;font-size:11.5px;font-weight:500;color:var(--ink-2);
  border:1px solid var(--line-2);border-radius:var(--r-pill);padding:2px 10px;white-space:nowrap;background:var(--surface)}
a.tag:hover{border-color:var(--green);color:var(--green-ink);text-decoration:none}
.tag--gov{border-color:transparent;background:var(--green-soft);color:var(--green-ink);font-weight:600}
.dot{color:var(--ink-3);font-size:11px}

/* ---------------- ニュースカード ---------------- */
.feed{display:flex;flex-direction:column;gap:10px}
.item{display:block;background:var(--surface);border-radius:var(--r);padding:18px 20px;color:inherit;
  box-shadow:var(--shadow);transition:box-shadow .16s ease,transform .16s ease}
.item:hover{box-shadow:var(--shadow-lift);transform:translateY(-2px);text-decoration:none}
.item__top{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-bottom:8px}
.item__title{font-size:17px;font-weight:700;line-height:1.6;letter-spacing:-.015em;color:var(--ink)}
.item:hover .item__title{color:var(--green-deep)}
.item__sum{font-size:13.5px;color:var(--ink-2);line-height:1.85;margin-top:7px}
.item__tags{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px;align-items:center}

/* 民泊事業者への影響：本文と混ざらないよう、薄いグリーンの面で分ける */
.impact{background:var(--green-soft);border-radius:var(--r-sm);padding:11px 14px;margin-top:12px}
.impact--n{background:var(--amber-soft)}
.impact__k{font-size:10.5px;font-weight:700;letter-spacing:.1em;color:var(--green-deep);display:block;
  margin-bottom:4px}
.impact--n .impact__k{color:var(--amber)}
.impact__t{font-size:13px;color:var(--ink);line-height:1.8}

/* 最重要ニュース1件 */
.lead{background:var(--surface);border-radius:var(--r);padding:26px 28px;box-shadow:var(--shadow);
  display:block;color:inherit;transition:box-shadow .16s ease,transform .16s ease}
.lead:hover{box-shadow:var(--shadow-lift);transform:translateY(-2px);text-decoration:none}
.lead__title{font-size:clamp(20px,2.3vw,26px);font-weight:700;line-height:1.5;letter-spacing:-.025em;
  margin:10px 0 0;color:var(--ink)}
.lead:hover .lead__title{color:var(--green-deep)}
.lead__body{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:26px;margin-top:14px;
  align-items:start}
.lead .impact{margin-top:0}
@media(max-width:760px){.lead{padding:20px}.lead__body{grid-template-columns:1fr;gap:14px}}

/* ---------------- セクション見出し ---------------- */
.sec{margin-top:40px}
.sec__head{display:flex;align-items:baseline;gap:6px 12px;margin-bottom:14px;flex-wrap:wrap}
.sec__head h2{font-size:16px;font-weight:700;letter-spacing:-.01em}
.sec__head .meta{margin-left:auto;white-space:nowrap}
@media(max-width:640px){.sec__head .meta{margin-left:0;white-space:normal;width:100%}}
.sec__more{font-size:13px;font-weight:500;margin-top:14px;display:inline-block}

/* 中央寄せのページ見出し（一覧ページ） */
.maghead{text-align:center;padding:22px 0 28px}
.maghead h1{font-size:clamp(22px,2.4vw,29px);letter-spacing:.06em;margin-bottom:9px}
.maghead p{max-width:62ch;margin:0 auto;color:var(--ink-2);font-size:14px;text-wrap:pretty}
.maghead .meta{display:block;margin-top:8px}

/* 注目の2枚 */
.feature2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.feature2 .item__title{font-size:16px}
@media(max-width:640px){.feature2{grid-template-columns:1fr}}

/* ---------------- ページ頭 ---------------- */
.phead{padding:26px 0 22px}
.phead h1{margin-bottom:6px}
.phead .sub{max-width:56ch}
.phead .meta{margin-top:8px;display:block}
.crumb{font-size:11.5px;color:var(--ink-3);padding-top:16px;font-weight:500}
.crumb a{color:var(--ink-3)}

/* ---------------- 2カラム ---------------- */
.two{display:grid;grid-template-columns:minmax(0,1fr) 268px;gap:44px;align-items:start;padding-bottom:64px}
.rail{position:sticky;top:84px;display:flex;flex-direction:column;gap:26px}
.rail section>h2{font-size:12px;font-weight:700;letter-spacing:.08em;color:var(--ink-3);margin-bottom:11px}
@media(max-width:900px){.two{grid-template-columns:1fr;gap:32px}.rail{position:static}}

/* 検索ボックス */
.sbox{display:flex;gap:8px}
.sbox input{flex:1;min-width:0;font-family:inherit;font-size:14px;padding:9px 12px;color:var(--ink);
  background:var(--surface);border:1px solid var(--line-2);border-radius:var(--r-sm)}
.sbox input::placeholder{color:var(--ink-3)}
.sbox button{font-size:13px;font-weight:600;padding:9px 15px;cursor:pointer;background:var(--green);color:#fff;
  border:none;border-radius:var(--r-sm);white-space:nowrap}
.sbox button:hover{background:var(--green-deep)}
.sbox--big input{font-size:15px;padding:13px 16px}
.sbox--big button{padding:13px 22px;font-size:14px}

/* サイドバーの選択リスト */
.pills{display:flex;flex-wrap:wrap;gap:7px}
.pill{font-size:12px;font-weight:500;padding:5px 12px;border:1px solid var(--line-2);border-radius:var(--r-pill);
  background:var(--surface);color:var(--ink-2);cursor:pointer;line-height:1.6}
.pill:hover{border-color:var(--green);color:var(--green-ink)}
.pill[aria-pressed=true]{background:var(--green);border-color:var(--green);color:#fff}
a.pill:hover{text-decoration:none}
.linklist{display:flex;flex-direction:column}
.linklist a{padding:9px 0;font-size:13.5px;color:var(--ink-2);border-bottom:1px solid var(--line)}
.linklist a:last-child{border-bottom:none}
.linklist a:hover{color:var(--green-ink);text-decoration:none}

/* ---------------- ページ送り ---------------- */
.pager{display:flex;align-items:center;justify-content:center;gap:6px;margin:32px 0 8px;flex-wrap:wrap}
.pager button{font-size:13px;font-weight:500;min-width:32px;height:32px;padding:0 8px;cursor:pointer;
  background:transparent;border:none;color:var(--ink-2);border-radius:var(--r-sm);font-variant-numeric:tabular-nums}
.pager button:hover{background:var(--surface-2);color:var(--ink)}
.pager button[aria-current=true]{background:var(--green);color:#fff;font-weight:600}
.pager .arrow{border:1px solid var(--line-2);width:32px;border-radius:var(--r-pill)}
.pager .arrow:disabled{opacity:.35;cursor:default;background:transparent}
.pager .gap{color:var(--ink-3);padding:0 2px}
.empty{padding:40px 0;color:var(--ink-3);font-size:14px;text-align:center}

/* ---------------- ダッシュボード部品 ---------------- */
.hero{padding:44px 0 8px;text-align:center}
.hero h1{font-size:clamp(24px,3.2vw,36px);letter-spacing:-.03em;line-height:1.4}
.hero p{margin:12px auto 0;max-width:46ch;color:var(--ink-2);font-size:14.5px}
.hero .sbox{max-width:560px;margin:22px auto 0}

.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}
.tile{background:var(--surface);border-radius:var(--r);padding:16px 18px;box-shadow:var(--shadow)}
.tile dt{font-size:11.5px;font-weight:500;color:var(--ink-3);letter-spacing:.02em}
.tile dd{margin:5px 0 0;font-size:27px;font-weight:700;letter-spacing:-.03em;font-variant-numeric:tabular-nums;
  line-height:1.2}
.tile .u{font-size:13px;font-weight:600;color:var(--ink-2);margin-left:3px;letter-spacing:0}
.tile .d{font-size:11.5px;font-weight:500;color:var(--ink-3);margin-top:3px;display:block}
.tile--soft{background:var(--surface-2);box-shadow:none}
.tile--soft dd{font-size:15px;font-weight:600;color:var(--ink-3);letter-spacing:0}

.steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(178px,1fr));gap:10px}
.step{background:var(--surface);border-radius:var(--r);padding:16px 18px;box-shadow:var(--shadow);
  display:flex;flex-direction:column;gap:6px;color:inherit}
.step:hover{box-shadow:var(--shadow-lift);text-decoration:none}
.step__n{font-size:11px;font-weight:700;letter-spacing:.12em;color:var(--green)}
.step__t{font-size:14.5px;font-weight:700;letter-spacing:-.01em;line-height:1.55}
.step__d{font-size:12.5px;color:var(--ink-2);line-height:1.75}

.cards3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
@media(max-width:900px){.cards3{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:560px){.cards3{grid-template-columns:1fr}}
.mini{background:var(--surface);border-radius:var(--r);padding:16px 18px;box-shadow:var(--shadow);color:inherit;
  display:flex;flex-direction:column;gap:6px}
.mini:hover{box-shadow:var(--shadow-lift);text-decoration:none}
.mini h3{font-size:14.5px;font-weight:700;letter-spacing:-.01em}
.mini p{font-size:12.5px;color:var(--ink-2);line-height:1.75}

/* ---------------- 全幅の帯（トップページ） ---------------- */
/* 画面いっぱいに色の面を敷き、中身だけ .wrap で中央に寄せる */
.band{padding:44px 0}
.band > .wrap{padding-top:0;padding-bottom:0}
.band--soft{background:var(--surface-2)}
.band--dark{background:var(--green-deep);color:#EAF5F3}
.band--dark .sec__head h2,.band--dark h2{color:#FFFFFF}
.band--dark .meta,.band--dark .sec__head .meta{color:#A8CFC9}
.band--dark .sec__more{color:#BFE3DD}

/* いちばん上の注目記事 */
.top{background:var(--green-deep);color:#EAF5F3;border-radius:var(--r);padding:34px 34px 30px;
  display:block;position:relative;overflow:hidden;min-height:230px}
.top::after{content:"";position:absolute;inset:0;pointer-events:none;
  background:radial-gradient(120% 90% at 82% 8%,rgba(46,168,158,.34),transparent 62%)}
.top > *{position:relative;z-index:1}
.top:hover{text-decoration:none}
.top__eyebrow{font-size:11px;font-weight:700;letter-spacing:.14em;color:#9FDED6;display:block}
.top__title{font-size:clamp(22px,2.9vw,34px);font-weight:700;line-height:1.45;letter-spacing:-.03em;
  margin:12px 0 0;color:#FFFFFF;max-width:24ch}
.top:hover .top__title{text-decoration:underline;text-underline-offset:4px}
.top__meta{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;font-size:12px;color:#A8CFC9}
.top__sum{margin:14px 0 0;font-size:14px;line-height:1.9;color:#CFE7E3;max-width:52ch}
.top .tag{border-color:rgba(255,255,255,.28);color:#CFE7E3;background:transparent}
@media(max-width:640px){.top{padding:24px 22px}}

/* 各社の記事画像（保存はせず、相手のサーバーのものを参照する）。
   読み込めなかったときは onerror でこの枠ごと消す */
/* 画像の枠。写真が無い記事・読み込めなかった記事は、
   下に敷いたカテゴリ色の面がそのまま出る（高さが揃い、崩れない） */
.thumb{display:block;position:relative;overflow:hidden;border-radius:var(--r-sm);
  aspect-ratio:16/9;margin:-16px -18px 10px;background:var(--surface-3)}
.thumb img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.thumb__ph{position:absolute;inset:0;display:flex;align-items:flex-end;padding:11px 13px;
  font-size:11.5px;font-weight:700;letter-spacing:.1em;font-style:normal;
  color:var(--cat,var(--green));
  background:linear-gradient(135deg,
    color-mix(in srgb,var(--cat,var(--green)) 24%,transparent),
    color-mix(in srgb,var(--cat,var(--green)) 6%,transparent))}
.mini .thumb{border-radius:var(--r) var(--r) 0 0;background:rgba(0,0,0,.22)}
.mini .thumb__ph{color:#8FC3BC;
  background:linear-gradient(135deg,rgba(126,211,201,.20),rgba(126,211,201,.03))}

/* 注目の1本に画像があるとき */
.top--img{padding-top:0;padding-left:0;padding-right:0}
.top__img{position:relative;aspect-ratio:21/9;overflow:hidden;background:#0C2B29}
.top__img img{width:100%;height:100%;object-fit:cover;display:block;opacity:.55}
.top__img::after{content:"";position:absolute;inset:0;
  background:linear-gradient(180deg,rgba(20,81,76,.25),rgba(20,81,76,.96))}
.top--img .top__eyebrow,.top--img .top__title,.top--img .top__sum,.top--img .top__meta{
  padding-left:34px;padding-right:34px}
.top--img .top__eyebrow{margin-top:-64px}
.top--img .top__title{max-width:30ch}
@media(max-width:640px){
  .top--img .top__eyebrow,.top--img .top__title,.top--img .top__sum,.top--img .top__meta{
    padding-left:22px;padding-right:22px}
  .top--img .top__eyebrow{margin-top:-40px}
  .top__img{aspect-ratio:16/9}
}

/* 見出しつきの箱（カテゴリ記事） */
.box{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:20px 22px 22px;
  margin-top:14px}
.box__head{display:flex;align-items:center;gap:10px;margin-bottom:14px}
.box__head h3{font-size:14.5px;font-weight:700;letter-spacing:-.01em}
.box__head a{margin-left:auto;font-size:12.5px;font-weight:600;color:var(--green-ink);white-space:nowrap}

/* 深く知る（本文だけの横並び） */
.readrow{display:block;border-top:1px solid var(--line);padding:20px 0;color:inherit}
.readrow:first-child{border-top:0}
.readrow:hover{text-decoration:none}
.readrow h3{font-size:17px;font-weight:700;letter-spacing:-.02em;line-height:1.6;margin:8px 0 0;max-width:34ch}
.readrow:hover h3{color:var(--green-deep)}
.readrow p{font-size:13px;color:var(--ink-2);line-height:1.85;margin:8px 0 0;max-width:60ch}
.readrow .more{font-size:12.5px;font-weight:600;color:var(--green-ink);margin-top:10px;display:inline-block}

/* さらに学ぶ */
.learn{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}
.learn a{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:20px;
  color:inherit;display:flex;flex-direction:column;gap:6px}
.learn a:hover{border-color:var(--green);text-decoration:none}
.learn strong{font-size:14.5px;font-weight:700;letter-spacing:-.01em}
.learn span{font-size:12.5px;color:var(--ink-2);line-height:1.75}

.notice{background:var(--surface-2);border-radius:var(--r-sm);padding:13px 16px;font-size:12.5px;
  color:var(--ink-2);line-height:1.8}

/* ---------------- 本文 ---------------- */
.prose{max-width:70ch}
.prose h2{font-size:19px;margin:38px 0 12px}
.prose h3{font-size:15.5px;margin:28px 0 8px}
.prose p{margin:0 0 15px;font-size:15px;color:var(--ink-2);line-height:1.95}
.prose ul,.prose ol{margin:0 0 18px;padding-left:1.35em;color:var(--ink-2)}
.prose li{margin-bottom:6px}
.prose strong{color:var(--ink);font-weight:700}
.prose table{border-collapse:collapse;width:100%;font-size:14px;margin:0 0 20px}
.prose th,.prose td{border-bottom:1px solid var(--line);padding:10px 12px;text-align:left}
.prose th{font-size:11.5px;font-weight:600;letter-spacing:.06em;color:var(--ink-3)}
.prose hr{border:0;border-top:1px solid var(--line);margin:30px 0}
.summarybox{background:var(--green-soft);border-radius:var(--r);padding:16px 20px;margin:20px 0}
.summarybox .k{font-size:11px;font-weight:700;letter-spacing:.1em;color:var(--green-deep)}
.summarybox ul{margin:8px 0 0;padding-left:1.25em;font-size:14px;color:var(--ink)}
.disclaimer{background:var(--alert-soft);border-radius:var(--r-sm);padding:13px 16px;font-size:12.5px;
  color:var(--ink-2);margin:24px 0;line-height:1.8}

/* ---------------- グラフ ---------------- */
.panel{background:var(--surface);border-radius:var(--r);padding:22px 24px;box-shadow:var(--shadow);margin-top:14px}
.panel h3{font-size:15px;font-weight:700}
.panel>.meta{display:block;margin-top:4px}
.panel .lead-t{font-size:13.5px;color:var(--ink-2);margin-top:12px;line-height:1.85}
.legend{display:flex;gap:16px;flex-wrap:wrap;margin-top:14px;font-size:12px;color:var(--ink-2)}
.legend i{width:10px;height:10px;border-radius:2px;display:inline-block;margin-right:6px;vertical-align:-1px}
.hbars{display:flex;flex-direction:column;gap:12px;margin-top:16px}
.hbar{display:grid;grid-template-columns:minmax(80px,24%) 1fr minmax(58px,auto);gap:12px;align-items:center;
  font-size:13px}
.hbar__name{color:var(--ink-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hbar__track{height:12px;background:var(--surface-2);border-radius:var(--r-pill);overflow:hidden}
.hbar__fill{height:100%;border-radius:var(--r-pill);background:var(--k,var(--k1));min-width:4px}
.hbar__val{font-weight:600;font-variant-numeric:tabular-nums;text-align:right;font-size:12.5px}
.propbar{display:flex;height:26px;gap:2px;margin-top:16px;border-radius:var(--r-sm);overflow:hidden}
.propbar i{display:block;height:100%}
.proplegend{display:flex;flex-wrap:wrap;gap:18px;margin-top:11px;font-size:12.5px;color:var(--ink-2)}
.proplegend b{font-variant-numeric:tabular-nums;color:var(--ink);font-weight:600}
.srctable{border-collapse:collapse;width:100%;font-size:13px;margin-top:14px}
.srctable th,.srctable td{border-bottom:1px solid var(--line);padding:10px 12px;text-align:left;vertical-align:top}
.srctable th{font-size:11px;font-weight:600;letter-spacing:.08em;color:var(--ink-3)}

/* ---------------- footer ---------------- */
.site-footer{border-top:1px solid var(--line);background:var(--surface);margin-top:56px}
.site-footer .wrap{padding:32px 20px 52px;display:flex;flex-direction:column;gap:16px}
.footnav{display:flex;gap:20px;flex-wrap:wrap;font-size:13px}
.footnav a{color:var(--ink-2)}
.site-footer .micro{max-width:76ch}
.brandbar{display:flex;height:3px;width:96px;border-radius:2px;overflow:hidden}
.brandbar i{display:block;height:100%}
.brandbar i:first-child{background:var(--green);width:70%}
.brandbar i:last-child{background:var(--amber);width:30%}
`;
