export const css = `
:root{
  --ink:#16211F; --ink-2:#4B5C59; --ink-3:#7F8F8C;
  --paper:#F1F5F4; --surface:#FFFFFF; --surface-2:#F8FAF9;
  --line:#D9E3E1; --line-strong:#B9C8C5;
  --teal:#2EA89E; --teal-deep:#14514C; --teal-soft:#E1F0EE;
  --amber:#E0A45C; --amber-deep:#8A5A18; --amber-soft:#FAEBD8;
  --alert:#BF5245; --alert-soft:#FAE6E3;
  --on-hue:#FFFFFF;
  --c-law:#2EA89E; --c-local:#B5713C; --c-practice:#3E8B84; --c-subsidy:#C99440;
  --c-stats:#5C7E96; --c-industry:#7C8791; --c-system:#8A9693;
  --k1:#2EA89E; --k2:#C99440; --k1-pale:#AFDBD5;
  --display:"Zen Kaku Gothic New","Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif;
  --body:"Noto Sans JP","Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif;
  --mono:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,monospace;
}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]){
  --ink:#E7EEEC; --ink-2:#A6B5B2; --ink-3:#768784;
  --paper:#0D1514; --surface:#161F1E; --surface-2:#1C2726;
  --line:#2A3634; --line-strong:#3D4D4A;
  --teal:#48C4B9; --teal-deep:#A6E1DA; --teal-soft:#123330;
  --amber:#E9B67A; --amber-deep:#F0CB9C; --amber-soft:#33260F;
  --alert:#E0796B; --alert-soft:#38201C;
  --on-hue:#0D1514;
  --c-law:#48C4B9; --c-local:#DB9A63; --c-practice:#63B5AD; --c-subsidy:#E4B978;
  --c-stats:#8FAEC4; --c-industry:#A3AEB8; --c-system:#A8B4B1;
  --k1:#2FA398; --k2:#BB8942; --k1-pale:#28524D;
}}
:root[data-theme=dark]{
  --ink:#E7EEEC; --ink-2:#A6B5B2; --ink-3:#768784;
  --paper:#0D1514; --surface:#161F1E; --surface-2:#1C2726;
  --line:#2A3634; --line-strong:#3D4D4A;
  --teal:#48C4B9; --teal-deep:#A6E1DA; --teal-soft:#123330;
  --amber:#E9B67A; --amber-deep:#F0CB9C; --amber-soft:#33260F;
  --alert:#E0796B; --alert-soft:#38201C;
  --on-hue:#0D1514;
  --c-law:#48C4B9; --c-local:#DB9A63; --c-practice:#63B5AD; --c-subsidy:#E4B978;
  --c-stats:#8FAEC4; --c-industry:#A3AEB8; --c-system:#A8B4B1;
  --k1:#2FA398; --k2:#BB8942; --k1-pale:#28524D;
}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--body);font-size:15px;line-height:1.8;
  -webkit-font-smoothing:antialiased}
h1,h2,h3,h4{font-family:var(--display);margin:0;line-height:1.4;text-wrap:balance}
p,ul,ol,table{margin:0}
a{color:var(--teal);text-underline-offset:3px}
a:hover{color:var(--teal-deep)}
:focus-visible{outline:2px solid var(--teal);outline-offset:2px}
.wrap{max-width:1060px;margin:0 auto;padding:0 20px}
.scroller{overflow-x:auto}

/* header */
.site-header{background:var(--surface);border-bottom:1px solid var(--line);position:sticky;top:0;z-index:20;
  box-shadow:inset 0 3px 0 var(--teal)}
.site-header .wrap{display:flex;align-items:center;gap:20px;min-height:58px;flex-wrap:wrap;padding-top:8px;padding-bottom:8px}
.brand{display:flex;align-items:center;gap:9px;font-family:var(--display);font-weight:900;font-size:17px;
  color:var(--ink);text-decoration:none;letter-spacing:-.01em}
.brand .mk{width:26px;height:15px;flex:none;background:
  radial-gradient(circle 6.5px at 6.5px 7.5px, var(--teal) 0 6.5px, transparent 6.5px),
  radial-gradient(circle 6.5px at 19.5px 7.5px, var(--teal) 0 6.5px, transparent 6.5px),
  linear-gradient(var(--teal),var(--teal)) 6.5px 5.5px/13px 4px no-repeat;
  background-repeat:no-repeat}
.brand .mk::after{content:"";display:block;width:26px;height:15px;background:
  radial-gradient(circle 2.6px at 6.5px 7.5px, var(--surface) 0 2.6px, transparent 2.6px),
  radial-gradient(circle 2.6px at 19.5px 7.5px, var(--surface) 0 2.6px, transparent 2.6px)}
.site-nav{display:flex;gap:16px;font-size:13px;flex-wrap:wrap}
.site-nav a{color:var(--ink-2);text-decoration:none}
.site-nav a:hover,.site-nav a[aria-current=page]{color:var(--teal-deep)}
.site-nav a[aria-current=page]{border-bottom:2px solid var(--teal);padding-bottom:2px}

/* generic bits */
.eyebrow{font-family:var(--mono);font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-3)}
.page-title{font-size:clamp(24px,3.4vw,34px);font-weight:900;letter-spacing:-.01em;margin:6px 0 8px}
.lede{color:var(--ink-2);max-width:64ch}
.stamp{font-family:var(--mono);font-size:11px;color:var(--ink-3)}
.chip{display:inline-flex;align-items:center;font-family:var(--mono);font-size:10.5px;letter-spacing:.05em;
  padding:2px 7px;border:1px solid var(--line-strong);color:var(--ink-2);text-decoration:none;white-space:nowrap}
a.chip:hover{border-color:var(--teal);color:var(--teal-deep)}
.chip.cat{background:var(--teal-soft);border-color:transparent;color:var(--teal-deep);font-weight:700}
.chip.gov{background:var(--amber-soft);border-color:transparent;color:var(--amber-deep);font-weight:700}
.chip.hot{background:var(--alert-soft);border-color:transparent;color:var(--alert);font-weight:700}
.blockhead{display:flex;align-items:baseline;justify-content:space-between;gap:12px;
  border-bottom:2px solid var(--teal);padding-bottom:7px;margin-bottom:4px}
.blockhead h2{font-size:15px;font-weight:800;letter-spacing:.02em}
.blockhead .stamp{white-space:nowrap}

/* news list */
.newslist{list-style:none;padding:0;margin:0}
.newslist li{display:grid;grid-template-columns:82px 1fr;gap:14px;padding:14px 0;border-bottom:1px solid var(--line)}
.newslist .d{font-family:var(--mono);font-size:11.5px;color:var(--ink-3);font-variant-numeric:tabular-nums;padding-top:3px}
.newslist h3{font-size:15px;font-weight:700;margin-bottom:5px}
.newslist h3 a{color:var(--ink);text-decoration:none}
.newslist h3 a:hover{color:var(--teal-deep);text-decoration:underline}
.newslist .tags{display:flex;gap:5px;flex-wrap:wrap;margin-top:7px}
.newslist .src{font-family:var(--mono);font-size:10.5px;color:var(--ink-3)}
.ext::after{content:" ↗";color:var(--ink-3);font-size:11px}

/* layout */
.cols{display:grid;grid-template-columns:1fr 320px;gap:40px;align-items:start;margin:28px 0 56px}
.side{display:flex;flex-direction:column;gap:26px;position:sticky;top:76px}
.panel{background:var(--surface);border:1px solid var(--line);padding:16px 18px}
.panel h2{font-size:14px;font-weight:800;margin-bottom:8px}
.panel p{font-size:13px;color:var(--ink-2)}
.panel.accent{background:var(--teal-soft);border-color:transparent}
.panel.accent h2{color:var(--teal-deep)}

/* figures */
.figs{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:1px;background:var(--line);
  border:1px solid var(--line)}
.figs>div{background:var(--surface);padding:13px 15px}
.figs dt{font-family:var(--mono);font-size:10.5px;letter-spacing:.06em;color:var(--ink-3)}
.figs dd{margin:3px 0 0;font-family:var(--display);font-weight:900;font-size:24px;letter-spacing:-.02em;
  font-variant-numeric:tabular-nums}
.figs .unit{font-size:13px;font-weight:700;color:var(--ink-2);margin-left:2px}

/* chips grid */
.chipgrid{display:flex;flex-wrap:wrap;gap:6px}

/* article body */
.prose{max-width:68ch}
.prose h2{font-size:20px;font-weight:800;margin:34px 0 10px;padding-bottom:6px;border-bottom:1px solid var(--line)}
.prose h3{font-size:16px;font-weight:800;margin:26px 0 8px}
.prose p{margin:0 0 14px}
.prose ul,.prose ol{margin:0 0 16px;padding-left:1.3em}
.prose li{margin-bottom:5px}
.prose table{border-collapse:collapse;width:100%;font-size:14px;margin:0 0 18px}
.prose th,.prose td{border:1px solid var(--line);padding:8px 11px;text-align:left}
.prose th{background:var(--surface-2);font-family:var(--mono);font-size:11px;letter-spacing:.08em;color:var(--ink-3);font-weight:400}
.prose hr{border:0;border-top:1px solid var(--line);margin:26px 0}
.summarybox{background:var(--surface-2);border-left:3px solid var(--amber);padding:14px 18px;margin:20px 0}
.summarybox .k{font-family:var(--display);font-weight:800;font-size:13px;letter-spacing:.06em;color:var(--amber-deep)}
.summarybox ul{margin:8px 0 0;padding-left:1.2em;font-size:14px}
.disclaimer{background:var(--alert-soft);padding:12px 16px;font-size:13px;color:var(--ink-2);margin:24px 0}

/* filters */
.filters{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;background:var(--surface);
  border:1px solid var(--line);padding:14px 16px;margin:20px 0 8px}
.filters label{display:block;font-family:var(--mono);font-size:10px;letter-spacing:.12em;color:var(--ink-3);margin-bottom:4px}
.filters select,.filters input{width:100%;font-family:var(--body);font-size:14px;padding:6px 8px;
  background:var(--surface);color:var(--ink);border:1px solid var(--line-strong);border-radius:0}
.count{font-family:var(--mono);font-size:12px;color:var(--ink-3);margin:10px 0}
.empty{padding:28px 0;color:var(--ink-3);font-size:14px}

/* 記事の行（左：見出しとタグ／右：どんな影響がありそうか） */
.cardgrid{display:flex;flex-direction:column;gap:10px;margin-top:18px}
.card{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);
  background:var(--surface);border:1px solid var(--line);border-left:4px solid var(--cat);
  text-decoration:none;color:inherit;
  transition:box-shadow .16s ease, transform .16s ease, border-color .16s ease}
.card:hover,.card:focus-visible{box-shadow:0 12px 26px -20px rgba(10,40,38,.5);transform:translateX(2px);
  border-color:var(--line-strong);border-left-color:var(--cat)}
.card__main{padding:15px 20px;display:flex;flex-direction:column;gap:8px;min-width:0}
.card__side{padding:15px 20px;border-left:1px dashed var(--line);background:var(--surface-2);
  display:flex;flex-direction:column;gap:5px;justify-content:center;min-width:0}
.card__meta{display:flex;align-items:center;gap:8px;font-family:var(--mono);font-size:10.5px;color:var(--ink-3);
  font-variant-numeric:tabular-nums}
.card__meta .src{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.card__title{font-family:var(--display);font-size:16px;font-weight:800;line-height:1.55;letter-spacing:-.005em;
  display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.card:hover .card__title{color:var(--cat)}
.card__label{font-family:var(--mono);font-size:9.5px;letter-spacing:.14em;color:var(--cat);font-weight:700}
.card__text{font-size:12.5px;color:var(--ink-2);line-height:1.8;
  display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}
.card__foot{margin-top:auto;padding-top:6px;display:flex;gap:5px;flex-wrap:wrap;align-items:center}
.card__more{font-family:var(--mono);font-size:10px;color:var(--cat);font-weight:700}
.chip.cat{background:var(--cat,var(--teal));border-color:transparent;color:var(--on-hue);font-weight:700}
.chip.gov{background:var(--amber-soft);border-color:transparent;color:var(--amber-deep);font-weight:700}
.chip.press{background:transparent;border-color:var(--line-strong);color:var(--ink-3)}

/* いちばん上の1本 */
.herowrap{margin-top:20px}
.herowrap>.eyebrow{display:block;margin-bottom:7px;color:var(--ink-2)}
.hero{border-left-width:6px;margin-top:0}
.hero .card__side{background:color-mix(in srgb,var(--cat) 9%,var(--surface))}
.hero .card__main{padding:24px 26px;gap:11px}
.hero .card__side{padding:24px 26px}
.hero .card__title{font-size:clamp(19px,2.1vw,24px);font-weight:900;line-height:1.45;letter-spacing:-.015em;
  -webkit-line-clamp:4}
.hero .card__text{font-size:13.5px;-webkit-line-clamp:6}

@media(max-width:720px){
  .card{grid-template-columns:1fr}
  .card__side{border-left:none;border-top:1px dashed var(--line)}
  .hero .card__main,.hero .card__side{padding:18px 20px}
}

/* section heading with count */
.sectionhead{display:flex;align-items:center;gap:12px;margin-top:46px}
.sectionhead h2{font-size:19px;font-weight:900;letter-spacing:-.01em;white-space:nowrap}
.sectionhead .rule{flex:1;height:2px;background:linear-gradient(90deg,var(--teal),var(--line) 34%)}
.sectionhead .stamp{white-space:nowrap}

/* マガジン風の一覧レイアウト */
.crumb{font-family:var(--mono);font-size:10.5px;color:var(--ink-3);padding:18px 0 0;letter-spacing:.06em}
.crumb a{color:var(--ink-3);text-decoration:none}
.crumb a:hover{color:var(--teal-deep)}
.maghead{text-align:center;padding:34px 0 40px}
.maghead h1{font-size:clamp(22px,3vw,30px);font-weight:900;letter-spacing:.16em;margin-bottom:10px}
.maghead p{max-width:60ch;margin:0 auto;color:var(--ink-2);font-size:13.5px}
.maglayout{display:grid;grid-template-columns:minmax(0,1fr) 244px;gap:46px;align-items:start;
  padding-bottom:60px}
.magsec{margin-bottom:38px}
.magsec>h2{font-family:var(--mono);font-size:11px;letter-spacing:.2em;color:var(--ink-3);font-weight:400;
  border-bottom:1px solid var(--line);padding-bottom:10px;margin-bottom:18px;text-transform:uppercase}

/* 注目の2枚 */
.feature2{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.feat{display:flex;flex-direction:column;text-decoration:none;color:inherit;
  transition:transform .16s ease, box-shadow .16s ease}
.feat:hover,.feat:focus-visible{transform:translateY(-3px);box-shadow:0 16px 34px -24px rgba(10,40,38,.55)}
.feat__panel{background:var(--cat);padding:20px 22px;min-height:154px;display:flex;flex-direction:column;
  justify-content:flex-end;gap:9px;position:relative;overflow:hidden}
.feat__panel::before{content:"";position:absolute;inset:0;
  background:radial-gradient(circle at 82% 12%,rgba(255,255,255,.16),transparent 52%)}
.feat__meta{position:relative;font-family:var(--mono);font-size:10px;color:#fff;opacity:.85;letter-spacing:.06em}
.feat__title{position:relative;font-family:var(--display);font-size:16.5px;font-weight:800;line-height:1.55;
  color:#fff;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.feat__body{border:1px solid var(--line);border-top:none;background:var(--surface);padding:13px 16px;flex:1;
  display:flex;flex-direction:column;gap:8px}
.feat__label{font-family:var(--mono);font-size:9.5px;letter-spacing:.14em;color:var(--cat);font-weight:700}
.feat__text{font-size:12.5px;color:var(--ink-2);line-height:1.75;
  display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.feat__tags{margin-top:auto;padding-top:4px;display:flex;gap:5px;flex-wrap:wrap}

/* サイドバー */
.magside{position:sticky;top:76px;display:flex;flex-direction:column;gap:30px}
.magside h2{font-family:var(--mono);font-size:11px;letter-spacing:.2em;color:var(--ink-3);font-weight:400;
  border-bottom:1px solid var(--line);padding-bottom:9px;margin-bottom:14px}
.searchrow{display:flex;gap:8px}
.searchrow input{flex:1;min-width:0;font-family:var(--body);font-size:13px;padding:7px 10px;
  background:var(--surface);color:var(--ink);border:1px solid var(--line-strong);border-radius:0}
.searchrow button{font-family:var(--display);font-size:12px;font-weight:700;padding:7px 13px;cursor:pointer;
  background:var(--teal);color:#fff;border:none;white-space:nowrap}
.searchrow button:hover{background:var(--teal-deep)}
.taggroup+.taggroup{margin-top:18px}
.taggroup>p{font-size:11px;color:var(--ink-3);margin-bottom:7px}
.taglist{display:flex;flex-wrap:wrap;gap:6px}
.tagbtn{font-family:var(--mono);font-size:10.5px;padding:4px 9px;border:1px solid var(--line);
  background:var(--surface);color:var(--ink-2);cursor:pointer;line-height:1.5}
.tagbtn:hover{border-color:var(--teal);color:var(--teal-deep)}
.tagbtn[aria-pressed=true]{background:var(--teal);border-color:var(--teal);color:#fff}
.activefilter{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px;font-size:12.5px;
  color:var(--ink-2)}
.clearbtn{font-family:var(--mono);font-size:10.5px;padding:3px 9px;border:1px solid var(--line-strong);
  background:transparent;color:var(--ink-2);cursor:pointer}
.clearbtn:hover{border-color:var(--alert);color:var(--alert)}

/* ページ送り */
.pager{display:flex;align-items:center;justify-content:center;gap:7px;margin:30px 0 10px;flex-wrap:wrap}
.pager button{font-family:var(--mono);font-size:12px;min-width:28px;height:28px;padding:0 6px;cursor:pointer;
  background:transparent;border:none;color:var(--ink-2);border-radius:99px}
.pager button:hover{color:var(--teal-deep)}
.pager button[aria-current=true]{background:var(--teal);color:#fff;font-weight:700}
.pager .arrow{border:1px solid var(--line-strong);width:30px;height:30px;border-radius:99px}
.pager .arrow:disabled{opacity:.3;cursor:default}
.pager .gap{color:var(--ink-3);padding:0 2px}

@media(max-width:900px){
  .maglayout{grid-template-columns:1fr;gap:34px}
  .magside{position:static}
  .feature2{grid-template-columns:1fr}
}

/* charts */
.chartcard{background:var(--surface);border:1px solid var(--line);padding:20px 22px;margin-top:16px}
.chartcard h3{font-size:15px;font-weight:800}
.chartcard>.stamp{display:block;margin-top:4px}
.chartcard .lead{font-size:13.5px;color:var(--ink-2);margin-top:10px;line-height:1.8}
.legend{display:flex;gap:16px;flex-wrap:wrap;margin-top:14px;font-size:12px;color:var(--ink-2)}
.legend i{width:11px;height:11px;border-radius:2px;display:inline-block;margin-right:6px;vertical-align:-1px}
.hbars{display:flex;flex-direction:column;gap:11px;margin-top:14px}
.hbar{display:grid;grid-template-columns:minmax(84px,26%) 1fr minmax(62px,auto);gap:12px;align-items:center;
  font-size:13px}
.hbar__name{color:var(--ink-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hbar__track{height:14px;background:var(--surface-2);border-radius:2px;overflow:hidden}
.hbar__fill{height:100%;border-radius:0 4px 4px 0;background:var(--k,var(--k1));min-width:3px}
.hbar__val{font-family:var(--mono);font-weight:700;font-variant-numeric:tabular-nums;text-align:right;
  font-size:12.5px}
.propbar{display:flex;height:30px;gap:2px;margin-top:16px;border-radius:3px;overflow:hidden}
.propbar i{display:block;height:100%}
.proplegend{display:flex;flex-wrap:wrap;gap:18px;margin-top:11px;font-size:12.5px;color:var(--ink-2)}
.proplegend b{font-family:var(--mono);font-variant-numeric:tabular-nums;color:var(--ink)}
.caveat{background:var(--surface-2);border-left:3px solid var(--line-strong);padding:13px 16px;margin-top:16px;
  font-size:12.5px;color:var(--ink-2);line-height:1.8}
.srctable{border-collapse:collapse;width:100%;font-size:13px;margin-top:14px}
.srctable th,.srctable td{border:1px solid var(--line);padding:9px 12px;text-align:left;vertical-align:top}
.srctable th{background:var(--surface-2);font-family:var(--mono);font-size:10.5px;letter-spacing:.1em;
  color:var(--ink-3);font-weight:400}

/* footer */
.site-footer{border-top:1px solid var(--line);background:var(--surface);margin-top:40px}
.site-footer .wrap{padding-top:26px;padding-bottom:44px;display:flex;flex-direction:column;gap:12px}
.site-footer .stamp{max-width:70ch;line-height:1.9}
.brandbar{display:flex;height:4px;width:110px;overflow:hidden}
.brandbar i{display:block;height:100%}
.brandbar i:first-child{background:var(--teal);width:68%}
.brandbar i:last-child{background:var(--amber);width:32%}

@media(max-width:860px){
  .cols{grid-template-columns:1fr;gap:30px}
  .side{position:static}
  .newslist li{grid-template-columns:1fr;gap:4px}
}
`;
