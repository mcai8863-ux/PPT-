import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(root, "work", "ppt_tips.json");
const buildDir = path.join(root, "work", "epub-build");
const metaInfDir = path.join(buildDir, "META-INF");
const oebpsDir = path.join(buildDir, "OEBPS");
const chaptersDir = path.join(oebpsDir, "chapters");
const outputDir = path.join(root, "outputs");
const outputPath = path.join(outputDir, "我的PPT内容写作技巧.epub");
const mottoOutputPath = path.join(outputDir, "MottoPing-PPT格言.txt");
const temporaryOutput = path.join(root, "work", "我的PPT内容写作技巧.epub");

const book = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
fs.mkdirSync(metaInfDir, { recursive: true });
fs.mkdirSync(chaptersDir, { recursive: true });
fs.mkdirSync(outputDir, { recursive: true });

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const xhtml = (title, body) => `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="zh-CN" xml:lang="zh-CN">
<head>
  <meta charset="UTF-8"/>
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" type="text/css" href="../style.css"/>
</head>
<body>${body}</body>
</html>`;

const listItems = (items) => items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");

const fullTipText = (tip) => {
  const lines = [
    `① 技巧名称：${tip.title}`,
    "",
    "② 为什么有效",
    ...tip.why,
    "",
    "③ 怎么做",
    ...tip.steps.map((step, index) => `${index + 1}. ${step}`),
    "",
    "④ 改写前 / 改写后",
    `改写前：${tip.before}`,
    `改写后：${tip.after}`,
  ];
  if (tip.dataNote) lines.push(tip.dataNote);
  lines.push(
    "",
    "⑤ 一句话练习",
    tip.exercise,
    "",
    "⑥ 一页 PPT 结构实例",
    `${tip.pageExample.page}｜${tip.pageExample.title}`,
    "",
    `● 二级标题：${tip.pageExample.subtitle}`
  );
  for (const module of tip.pageExample.modules) {
    lines.push("", `□ ${module.heading}：`, "");
    for (const item of module.items) {
      lines.push(`${item.label}：${item.text}`);
    }
  }
  lines.push("", `● ${tip.pageExample.conclusionLabel ?? "关键结论"}：${tip.pageExample.conclusion}`, "", `已发送主题：${tip.topic}`);
  return lines.join("\n");
};

for (const [index, tip] of book.tips.entries()) {
  const number = String(index + 1).padStart(2, "0");
  const moduleHtml = tip.pageExample.modules.map((module) => `
    <section class="example-module">
      <p class="module-title">□ ${escapeHtml(module.heading)}</p>
      <ul class="example-list">
        ${module.items.map((item) => `<li><strong>${escapeHtml(item.label)}：</strong>${escapeHtml(item.text)}</li>`).join("")}
      </ul>
    </section>`).join("");

  const body = `
  <article>
    <p class="chapter-number">技巧 ${number}</p>
    <h1>${escapeHtml(tip.title)}</h1>
    <p class="meta">${escapeHtml(tip.date)} · ${escapeHtml(tip.topic)}</p>

    <p class="section-title">为什么有效</p>
    ${tip.why.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}

    <p class="section-title">怎么做</p>
    <ol>${listItems(tip.steps)}</ol>

    <p class="section-title">改写前 / 改写后</p>
    <div class="before"><span>改写前</span><p>${escapeHtml(tip.before)}</p></div>
    <div class="after"><span>改写后</span><p>${escapeHtml(tip.after)}</p></div>
    ${tip.dataNote ? `<p class="note">${escapeHtml(tip.dataNote)}</p>` : ""}

    <p class="section-title">一句话练习</p>
    <p class="exercise">${escapeHtml(tip.exercise)}</p>

    <p class="section-title">一页 PPT 结构实例</p>
    <section class="slide-example">
      <p class="example-title">${escapeHtml(tip.pageExample.page)}｜${escapeHtml(tip.pageExample.title)}</p>
      <p class="subtitle">● 二级标题：${escapeHtml(tip.pageExample.subtitle)}</p>
      ${moduleHtml}
      <p class="conclusion">● ${escapeHtml(tip.pageExample.conclusionLabel ?? "关键结论")}：${escapeHtml(tip.pageExample.conclusion)}</p>
    </section>
  </article>`;

  fs.writeFileSync(
    path.join(chaptersDir, `${tip.id}.xhtml`),
    xhtml(tip.title, body),
    "utf8"
  );
}

const navItems = book.tips.map((tip, index) =>
  `<li><a href="chapters/${escapeHtml(tip.id)}.xhtml">技巧 ${String(index + 1).padStart(2, "0")}｜${escapeHtml(tip.title)}</a></li>`
).join("");

fs.writeFileSync(path.join(buildDir, "mimetype"), "application/epub+zip", "utf8");
fs.writeFileSync(path.join(metaInfDir, "container.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`, "utf8");

fs.writeFileSync(path.join(oebpsDir, "nav.xhtml"), `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="zh-CN">
<head><meta charset="UTF-8"/><title>目录</title><link rel="stylesheet" type="text/css" href="style.css"/></head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>目录</h1>
    <ol>${navItems}</ol>
  </nav>
</body>
</html>`, "utf8");

fs.writeFileSync(path.join(oebpsDir, "cover.xhtml"), `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="zh-CN">
<head><meta charset="UTF-8"/><title>${escapeHtml(book.bookTitle)}</title><link rel="stylesheet" type="text/css" href="style.css"/></head>
<body class="cover">
  <main>
    <p class="eyebrow">PRESENTATION WRITING NOTES</p>
    <h1>${escapeHtml(book.bookTitle)}</h1>
    <p class="cover-subtitle">每天一个方法，把观点写清楚，把页面讲明白</p>
    <p class="cover-author">${escapeHtml(book.author)}</p>
  </main>
</body>
</html>`, "utf8");

fs.writeFileSync(path.join(oebpsDir, "style.css"), `
body { font-family: -apple-system, "PingFang SC", "Noto Sans CJK SC", sans-serif; color: #202532; line-height: 1.24; margin: 3%; }
p { margin: 0.18em 0; }
h1 { color: #13233f; line-height: 1.18; margin: 0.1em 0 0.2em; }
.section-title { color: #0f6b5c; font-size: 1em !important; font-weight: 700; line-height: 1.2; margin: 0.58em 0 0.2em; border-bottom: 1px solid #d9e4e1; padding-bottom: 0.1em; }
.example-title { color: #13233f; font-size: 1em !important; font-weight: 700; line-height: 1.2; margin: 0 0 0.2em; }
.module-title { color: #0f6b5c; font-size: 1em !important; font-weight: 700; line-height: 1.2; margin: 0.3em 0 0.1em; }
ol, ul { margin-top: 0.15em; margin-bottom: 0.25em; }
li { margin: 0.05em 0; }
.chapter-number, .eyebrow { color: #d56f3e; font-weight: 700; letter-spacing: 0.08em; }
.meta { color: #6b7280; font-size: 0.88em; }
.before, .after { border-left: 3px solid; padding: 0.3em 0.55em; margin: 0.25em 0; background: #f7f8fa; }
.before { border-color: #a7adb8; }
.after { border-color: #0f8a73; background: #edf8f5; }
.before span, .after span { font-size: 0.82em; font-weight: 700; color: #6b7280; }
.before p, .after p { margin: 0.1em 0; }
.note { color: #5b6472; font-size: 0.92em; }
.exercise { background: #fff5ed; padding: 0.35em 0.55em; border-radius: 0.3em; }
.slide-example { border: 1px solid #cdd7e2; padding: 0.45em; background: #fbfcfe; }
.subtitle { color: #4b5563; }
.example-list { list-style: none; padding-left: 0.4em; }
.conclusion { font-weight: 700; color: #0f6b5c; border-top: 1px solid #d9e4e1; padding-top: 0.25em; }
.cover { margin: 0; padding: 12% 10%; background: #10243d; color: white; }
.cover main { margin-top: 28%; }
.cover h1 { color: white; font-size: 2.2em; }
.cover-subtitle { color: #dbe5ef; font-size: 1.05em; }
.cover-author { margin-top: 5em; color: #8fd2c5; }
nav ol { padding-left: 1.4em; }
nav li { margin: 0.45em 0; }
nav a { color: #13233f; text-decoration: none; }
`, "utf8");

const manifestItems = book.tips.map((tip) =>
  `<item id="${escapeHtml(tip.id)}" href="chapters/${escapeHtml(tip.id)}.xhtml" media-type="application/xhtml+xml"/>`
).join("\n    ");
const spineItems = book.tips.map((tip) => `<itemref idref="${escapeHtml(tip.id)}"/>`).join("\n    ");
const modified = `${new Date().toISOString().slice(0, 19)}Z`;

fs.writeFileSync(path.join(oebpsDir, "content.opf"), `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="book-id" version="3.0" xml:lang="zh-CN">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="book-id">urn:uuid:9e5cd4e8-669f-48bc-a318-19ca7332eb42</dc:identifier>
    <dc:title>${escapeHtml(book.bookTitle)}</dc:title>
    <dc:creator>${escapeHtml(book.author)}</dc:creator>
    <dc:language>${escapeHtml(book.language)}</dc:language>
    <meta property="dcterms:modified">${modified}</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>
    <item id="style" href="style.css" media-type="text/css"/>
    ${manifestItems}
  </manifest>
  <spine>
    <itemref idref="cover"/>
    <itemref idref="nav"/>
    ${spineItems}
  </spine>
</package>`, "utf8");

const mottoText = book.tips
  .map((tip) => `${fullTipText(tip)}\n\n--------------------`)
  .join("\n\n");
fs.writeFileSync(mottoOutputPath, `${mottoText}\n`, "utf8");

if (fs.existsSync(temporaryOutput)) fs.unlinkSync(temporaryOutput);
execFileSync("/usr/bin/zip", ["-X0", temporaryOutput, "mimetype"], { cwd: buildDir, stdio: "ignore" });
execFileSync("/usr/bin/zip", ["-Xr9D", temporaryOutput, "META-INF", "OEBPS"], { cwd: buildDir, stdio: "ignore" });
fs.renameSync(temporaryOutput, outputPath);
console.log(outputPath);
console.log(mottoOutputPath);
