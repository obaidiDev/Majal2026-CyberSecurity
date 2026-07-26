#!/usr/bin/env python3
"""Render a lab markdown file into a standalone, offline Majal-branded HTML page.

    python3 tools/md2lab.py day1/lab1-linux.md day1/lab1-linux.html "Day 1 · Lab 1"

The markdown is the source of truth: edit the .md, re-run this, commit both.
No CDNs, no fetch — the output opens straight from file:// like every deck.
"""
import html
import re
import sys
from string import Template

import mistune

# --------------------------------------------------------------------------
# markdown -> html
# --------------------------------------------------------------------------
render = mistune.create_markdown(
    escape=False,
    plugins=["table", "strikethrough", "url"],
)


def split_hero(md):
    """Peel the title, subtitle and meta table off the top of the document."""
    lines = md.splitlines()
    body_start = next(i for i, ln in enumerate(lines) if ln.startswith("## "))
    head, body = lines[:body_start], "\n".join(lines[body_start:])

    title = subtitle = ""
    meta = []
    for ln in head:
        ln = ln.strip()
        if ln.startswith("# "):
            title = ln[2:].strip()
        elif ln.startswith("**") and ln.endswith("**"):
            subtitle = ln.strip("*")
        elif ln.startswith("|"):
            cells = [c.strip() for c in ln.strip("|").split("|")]
            cells = [c for c in cells if c and not set(c) <= set("-: ")]
            if len(cells) == 2:
                meta.append((cells[0].strip("*"), cells[1]))
    return title, subtitle, meta, body


def slugify(text):
    text = re.sub(r"<[^>]+>", "", text)
    text = html.unescape(text).lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


def add_heading_ids(doc):
    """Give every h1/h2 an id and collect the table of contents."""
    toc = []

    def tag(m):
        level, attrs, text = m.group(1), m.group(2), m.group(3)
        hid = slugify(text)
        toc.append((int(level), hid, html.unescape(re.sub(r"<[^>]+>", "", text))))
        return f'<h{level} id="{hid}"{attrs}>{text}</h{level}>'

    doc = re.sub(r"<h([12])([^>]*)>(.*?)</h\1>", tag, doc, flags=re.S)
    return doc, toc


def transform(doc):
    """Turn markdown conventions into the lab's own components."""
    # `> *Hint: …*` blockquotes become fold-away hints, so learners derive first.
    doc = re.sub(
        r"<blockquote>\s*<p><em>Hint:(.*?)</em></p>\s*</blockquote>",
        lambda m: (
            '<details class="hint"><summary>Hint</summary>'
            f'<div class="hint-body">{m.group(1).strip()}</div></details>'
        ),
        doc,
        flags=re.S,
    )
    # Any other blockquote is a teaching callout.
    doc = re.sub(r"<blockquote>\s*<p>", '<div class="callout"><p>', doc)
    doc = doc.replace("</p>\n</blockquote>", "</p></div>").replace("</blockquote>", "</div>")

    # `**1.1** — task text` becomes a numbered exercise card.
    doc = re.sub(
        r"<p><strong>([0-9]+\.[0-9]+|C\.[0-9]+)</strong>\s*(?:—|-)?\s*",
        lambda m: f'<p class="task"><span class="tid">{m.group(1)}</span>',
        doc,
    )
    doc = doc.replace("<p><strong>Wrap-up question:</strong>", '<p class="wrapup"><strong>Wrap-up question:</strong>')

    # Cells escape their pipes as `\|` in markdown; the reader shouldn't see the backslash.
    doc = re.sub(
        r"<(t[dh])>(.*?)</\1>",
        lambda m: f"<{m.group(1)}>{m.group(2).replace(chr(92) + '|', '|')}</{m.group(1)}>",
        doc,
        flags=re.S,
    )

    # Wrap tables so wide ones scroll instead of blowing out the page.
    doc = re.sub(r"<table>", '<div class="tw"><table>', doc)
    doc = doc.replace("</table>", "</table></div>")
    return doc


def build_toc(toc):
    out = ['<nav class="toc" aria-label="Lab contents"><p class="toc-h">Contents</p><ul>']
    for level, hid, text in toc:
        cls = "l1" if level == 1 else "l2"
        out.append(f'<li class="{cls}"><a href="#{hid}">{html.escape(text)}</a></li>')
    out.append("</ul></nav>")
    return "\n".join(out)


TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>$title_plain</title>
<style>
:root{
  --petrol:#00567d; --petrol-d:#003f5e; --teal:#1f8f89; --turq:#33d2cb;
  --yellow:#f2d200; --ink:#12333d; --slate:#2f4f59; --muted:#5c7880;
  --bg:#f6f8f8; --bg-2:#eef3f3; --card:#fff; --line:#e0e7e8;
  --code-bg:#0f2b34; --code-ink:#dff3f2;
  --sans:"Avenir Next","Avenir","Segoe UI",system-ui,-apple-system,"Helvetica Neue",Arial,sans-serif;
  --mono:"JetBrains Mono","Cascadia Code","SF Mono",Menlo,Consolas,"DejaVu Sans Mono",monospace;
}
*{box-sizing:border-box}
html{scroll-behavior:smooth; scroll-padding-top:84px}
body{margin:0; font-family:var(--sans); color:var(--ink); background:var(--bg);
  -webkit-font-smoothing:antialiased; line-height:1.6}

/* ---- top bar ---- */
.bar{position:sticky; top:0; z-index:30; background:rgba(246,248,248,.94);
  backdrop-filter:blur(8px); border-bottom:1px solid var(--line)}
.bar .in{max-width:1240px; margin:0 auto; padding:10px 26px; display:flex;
  align-items:center; gap:16px}
.bar img{height:34px; width:auto; mix-blend-mode:multiply}
.bar .crumb{font-size:12px; font-weight:800; letter-spacing:.18em; text-transform:uppercase;
  color:var(--teal)}
.bar .spacer{flex:1}
.bar a.back{font-size:13px; font-weight:700; color:var(--petrol); text-decoration:none;
  border:1px solid var(--line); background:var(--card); padding:.45em 1em; border-radius:2px}
.bar a.back:hover{border-color:var(--petrol)}

/* ---- hero ---- */
.hero{max-width:1240px; margin:0 auto; padding:52px 26px 30px}
.hero .kicker{margin:0 0 12px; font-size:13px; font-weight:800; letter-spacing:.24em;
  text-transform:uppercase; color:var(--teal)}
.hero h1{margin:0; font-size:clamp(32px,5vw,54px); line-height:1.05; letter-spacing:-.02em;
  color:var(--petrol); font-weight:800; max-width:18ch}
.hero .rule{width:72px; height:6px; border-radius:3px; background:var(--yellow); margin:22px 0 22px}
.meta{display:flex; flex-wrap:wrap; gap:10px; margin:0; padding:0; list-style:none}
.meta li{background:var(--card); border:1px solid var(--line); border-left:3px solid var(--turq);
  padding:.5em .9em; border-radius:2px}
.meta .k{display:block; font-size:10.5px; font-weight:800; letter-spacing:.14em;
  text-transform:uppercase; color:var(--muted)}
.meta .v{font-size:14px; font-weight:700; color:var(--slate)}

/* ---- layout ---- */
.layout{max-width:1240px; margin:0 auto; padding:14px 26px 80px;
  display:grid; grid-template-columns:236px minmax(0,1fr); gap:44px; align-items:start}
.toc{position:sticky; top:78px; max-height:calc(100vh - 100px); overflow-y:auto;
  border-left:2px solid var(--line); padding-left:16px}
.toc-h{margin:0 0 10px; font-size:11px; font-weight:800; letter-spacing:.16em;
  text-transform:uppercase; color:var(--muted)}
.toc ul{list-style:none; margin:0; padding:0}
.toc li{margin:0}
.toc a{display:block; padding:3px 0; font-size:13.5px; line-height:1.35; color:var(--muted);
  text-decoration:none}
.toc a:hover{color:var(--petrol)}
.toc .l1 a{margin-top:12px; font-weight:800; font-size:12px; letter-spacing:.1em;
  text-transform:uppercase; color:var(--petrol)}
.toc .l2 a{padding-left:2px}

/* ---- content ---- */
.doc{min-width:0; max-width:78ch}
.doc h1{margin:56px 0 6px; font-size:clamp(24px,3.2vw,32px); font-weight:800; letter-spacing:-.02em;
  color:var(--petrol); border-top:4px solid var(--yellow); padding-top:18px}
.doc h2{margin:44px 0 4px; font-size:clamp(20px,2.6vw,25px); font-weight:800; letter-spacing:-.01em;
  color:var(--petrol)}
.doc h3{margin:30px 0 4px; font-size:16px; font-weight:800; letter-spacing:.02em; color:var(--teal)}
.doc p{margin:.85em 0; color:var(--slate); font-size:16px}
.doc hr{border:0; border-top:1px solid var(--line); margin:44px 0}
.doc a{color:var(--petrol)}
.doc strong{color:var(--ink)}
.doc em{color:var(--muted)}
.doc ul,.doc ol{color:var(--slate); font-size:16px}

/* code */
.doc code{font-family:var(--mono); font-size:.88em; background:var(--bg-2);
  border:1px solid var(--line); border-radius:3px; padding:.1em .38em; color:var(--petrol-d)}
.doc pre{background:var(--code-bg); color:var(--code-ink); border-radius:3px;
  border-left:4px solid var(--turq); padding:16px 18px; overflow-x:auto; margin:1.1em 0}
.doc pre code{background:none; border:0; padding:0; color:inherit; font-size:13.5px; line-height:1.55}

/* tables */
.tw{overflow-x:auto; margin:1.2em 0; border:1px solid var(--line); border-radius:2px; background:var(--card)}
.doc table{border-collapse:collapse; width:100%; font-size:14px}
.doc th{text-align:left; font-family:var(--mono); font-size:11px; font-weight:700;
  letter-spacing:.1em; text-transform:uppercase; color:var(--teal);
  background:var(--bg-2); border-bottom:1px solid var(--line); padding:10px 14px; white-space:nowrap}
.doc td{border-bottom:1px solid var(--line); padding:10px 14px; color:var(--slate);
  vertical-align:top; line-height:1.5}
.doc tbody tr:last-child td{border-bottom:0}
.doc td:first-child{color:var(--petrol); font-weight:700; white-space:nowrap}
.doc td code{white-space:nowrap}

/* callouts */
.callout{background:var(--card); border:1px solid var(--line); border-left:4px solid var(--petrol);
  border-radius:2px; padding:2px 20px; margin:1.3em 0}
.callout p{font-size:15px}

/* exercises */
.doc p.task{position:relative; background:var(--card); border:1px solid var(--line);
  border-left:4px solid var(--turq); border-radius:2px; padding:14px 18px 14px 74px;
  margin:1.5em 0 0; font-size:16px; color:var(--ink)}
.tid{position:absolute; left:16px; top:15px; font-family:var(--mono); font-weight:800; font-size:13px;
  color:var(--petrol); background:var(--bg-2); border-radius:2px; padding:.25em .55em; letter-spacing:.02em}
details.hint{margin:0 0 .2em; border:1px solid var(--line); border-top:0; background:var(--bg-2);
  border-radius:0 0 2px 2px; font-size:14.5px}
details.hint summary{cursor:pointer; list-style:none; padding:.5em 18px; font-weight:700;
  font-size:12px; letter-spacing:.12em; text-transform:uppercase; color:var(--muted)}
details.hint summary::-webkit-details-marker{display:none}
details.hint summary::before{content:"▸ "; color:var(--turq)}
details[open].hint summary::before{content:"▾ "}
details.hint summary:hover{color:var(--petrol)}
.hint-body{padding:0 18px .8em; color:var(--slate); font-style:italic}
p.wrapup{background:rgba(242,210,0,.14); border:1px solid rgba(242,210,0,.5);
  border-radius:2px; padding:14px 18px; font-size:15.5px; color:var(--ink)}

footer{border-top:1px solid var(--line); background:var(--bg)}
.foot{max-width:1240px; margin:0 auto; padding:20px 26px; display:flex; gap:16px;
  flex-wrap:wrap; justify-content:space-between; font-size:13px; color:var(--muted)}
.foot .slogan{font-weight:700; color:var(--slate)}

@media (max-width:960px){
  .layout{grid-template-columns:1fr; gap:0}
  .toc{position:static; max-height:none; border-left:0; border-top:1px solid var(--line);
    padding:16px 0 24px; margin-bottom:8px}
  .toc ul{columns:2; column-gap:24px}
}
@media print{
  .bar,.toc{display:none}
  body{background:#fff}
  .layout{display:block; padding:0 0 20px}
  details.hint{background:#fff}
  details.hint > .hint-body{display:block !important}
  .doc h1,.doc h2{break-after:avoid}
  p.task{break-inside:avoid}
}
</style>
</head>
<body>
<div class="bar">
  <div class="in">
    <img src="../MajalLogo.jpg" alt="Majal">
    <span class="crumb">$crumb</span>
    <span class="spacer"></span>
    <a class="back" href="../index.html">← Course</a>
  </div>
</div>

<div class="hero">
  <p class="kicker">$subtitle</p>
  <h1>$title</h1>
  <div class="rule"></div>
  <ul class="meta">$meta</ul>
</div>

<div class="layout">
$toc
<main class="doc">
$body
</main>
</div>

<footer>
  <div class="foot">
    <span class="slogan">Majal · Unlocking your tech horizons</span>
    <span>Cybersecurity 2026</span>
  </div>
</footer>
<script>
/* Highlight the section you're reading in the contents rail. */
(function () {
  var links = {}, heads = [];
  document.querySelectorAll('.toc a').forEach(function (a) {
    var el = document.getElementById(decodeURIComponent(a.hash.slice(1)));
    if (el) { links[el.id] = a; heads.push(el); }
  });
  var current = null;
  function sync() {
    var best = null;
    heads.forEach(function (h) {
      if (h.getBoundingClientRect().top < 140) best = h;
    });
    if (best === current) return;
    if (current) links[current.id].style.color = '';
    current = best;
    if (current) links[current.id].style.color = 'var(--petrol)';
  }
  addEventListener('scroll', sync, { passive: true });
  sync();
})();
</script>
</body>
</html>
"""


def main():
    src, dst = sys.argv[1], sys.argv[2]
    crumb = sys.argv[3] if len(sys.argv) > 3 else "Lab"

    md = open(src, encoding="utf-8").read()
    title, subtitle, meta, body_md = split_hero(md)

    body, toc = add_heading_ids(transform(render(body_md)))
    meta_html = "".join(
        f'<li><span class="k">{html.escape(k)}</span>'
        f'<span class="v">{render(v).strip()[3:-4]}</span></li>'
        for k, v in meta
    )

    page = Template(TEMPLATE).substitute(
        title_plain=html.escape(re.sub(r"\s*—\s*", " — ", title)),
        crumb=html.escape(crumb),
        subtitle=html.escape(subtitle),
        title=html.escape(title),
        meta=meta_html,
        toc=build_toc(toc),
        body=body,
    )
    open(dst, "w", encoding="utf-8").write(page)
    print(f"{src} -> {dst}  ({len(page):,} bytes, {len(toc)} headings)")


if __name__ == "__main__":
    main()
