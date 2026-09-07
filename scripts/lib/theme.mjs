export const css = `
:root{
  --ink:#16211F; --ink-2:#4B5C59; --ink-3:#7F8F8C;
  --paper:#F1F5F4; --surface:#FFFFFF; --surface-2:#F8FAF9;
  --line:#D9E3E1; --line-strong:#B9C8C5;
  --teal:#2EA89E; --teal-deep:#14514C; --teal-soft:#E1F0EE;
  --amber:#E0A45C; --amber-deep:#8A5A18; --amber-soft:#FAEBD8;
  --alert:#BF5245; --alert-soft:#FAE6E3;
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
}}
:root[data-theme=dark]{
  --ink:#E7EEEC; --ink-2:#A6B5B2; --ink-3:#768784;
  --paper:#0D1514; --surface:#161F1E; --surface-2:#1C2726;
  --line:#2A3634; --line-strong:#3D4D4A;
  --teal:#48C4B9; --teal-deep:#A6E1DA; --teal-soft:#123330;
  --amber:#E9B67A; --amber-deep:#F0CB9C; --amber-soft:#33260F;
  --alert:#E0796B; --alert-soft:#38201C;
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
.site-header{background:var(--surface);border-bottom:1px solid var(--line);position:sticky;top:0;z-index:20}
.site-header .wrap{display:flex;align-items:center;gap:20px;min-height:58px;flex-wrap:wrap;padding-top:8px;padding-bottom:8px}
.brand{display:flex;align-items:center;gap:9px;font-family:var(--display);font-weight:900;font-size:17px;
  color:var(--ink);text-decoration:none;letter-spacing:-.01em}
.brand .mk{width:18px;height:18px;border-radius:4px;background:linear-gradient(135deg,var(--teal) 55%,var(--amber) 55%)}
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
  border-bottom:2px solid var(--ink);padding-bottom:7px;margin-bottom:4px}
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
