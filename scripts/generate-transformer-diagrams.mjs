// Regenerate this post's original diagrams: node scripts/generate-transformer-diagrams.mjs
// Requires a local Chinese font, such as PingFang SC or Microsoft YaHei.
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { Buffer } from "node:buffer";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = path.join(
  root,
  "src/assets/images/posts/attention-is-all-you-need-explained"
);
const review = process.env.TRANSFORMER_DIAGRAM_REVIEW_DIR;
const W = 800;
const c = {
  ink: "#172c45",
  muted: "#52647a",
  blue: "#2763b5",
  blueBg: "#eaf2ff",
  teal: "#137b70",
  tealBg: "#e3f5ef",
  amber: "#9b5d12",
  amberBg: "#fff2d9",
  line: "#c7d3e1",
  bg: "#f8fafc",
};
let parts = [];
const esc = s =>
  String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

function rect(x, y, w, h, fill = "white", stroke = c.line, r = 14) {
  parts.push(
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`
  );
}
function text(
  x,
  y,
  s,
  size = 23,
  color = c.ink,
  anchor = "start",
  weight = 400
) {
  parts.push(
    `<text x="${x}" y="${y}" font-size="${size}" fill="${color}" text-anchor="${anchor}" font-weight="${weight}">${s
      .split("\n")
      .map(
        (line, i) =>
          `<tspan x="${x}" dy="${i ? size * 1.45 : 0}">${esc(line)}</tspan>`
      )
      .join("")}</text>`
  );
}
function box(x, y, w, h, s, fill = c.blueBg, color = c.blue, size = 23) {
  rect(x, y, w, h, fill, color);
  text(
    x + w / 2,
    y + h / 2 + size * 0.34 - (s.split("\n").length - 1) * size * 0.725,
    s,
    size,
    color,
    "middle",
    500
  );
}
function route(d, color = c.muted, width = 2.5) {
  parts.push(
    `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" marker-end="url(#arrow)"/>`
  );
}
function arrow(x1, y1, x2, y2, color = c.muted, width = 2.5) {
  route(`M ${x1} ${y1} L ${x2} ${y2}`, color, width);
}
function start(n, title, subtitle, h) {
  parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${h}" viewBox="0 0 ${W} ${h}"><title>${esc(title)}</title><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto-start-reverse"><path d="M1 1 L7 4 L1 7" fill="none" stroke="context-stroke" stroke-width="1.4"/></marker></defs><style>text{font-family:'PingFang SC','Microsoft YaHei',sans-serif}</style>`,
  ];
  rect(1, 1, W - 2, h - 2, c.bg, c.line, 20);
  rect(28, 26, 46, 38, c.ink, c.ink, 12);
  text(51, 52, String(n).padStart(2, "0"), 20, "white", "middle", 600);
  text(90, 55, title, 28, c.ink, "start", 600);
  text(32, 99, subtitle, 19, c.muted);
}
async function save(name, h, footer) {
  // All bottom captions share the canvas centre, including multiline captions.
  text(
    W / 2,
    h - 30 - (footer.split("\n").length - 1) * 26,
    footer,
    18,
    c.muted,
    "middle"
  );
  parts.push("</svg>");
  const svg = parts.join("\n");
  if (review) await fs.writeFile(path.join(review, `${name}.svg`), svg);
  await sharp(Buffer.from(svg), { density: 144 })
    .png()
    .toFile(path.join(output, `${name}.png`));
}

await fs.mkdir(output, { recursive: true });
if (review) await fs.mkdir(review, { recursive: true });

start(1, "同一个“它”，为什么指向变了", "小猫趴在垫子上，因为它……", 620);
rect(36, 134, 728, 173, "white", c.blue);
text(62, 177, "句尾是“累了”", 24, c.blue, "start", 600);
box(64, 211, 180, 62, "累了", c.blueBg, c.blue, 28);
arrow(250, 242, 329, 242, c.blue);
box(337, 211, 390, 62, "“它”更可能指小猫", c.tealBg, c.teal, 26);
rect(36, 334, 728, 173, "white", c.amber);
text(62, 377, "句尾换成“太软了”", 24, c.amber, "start", 600);
box(64, 411, 180, 62, "太软了", c.amberBg, c.amber, 28);
arrow(250, 442, 329, 442, c.amber);
box(337, 411, 390, 62, "“它”更可能指垫子", c.tealBg, c.teal, 26);
text(400, 552, "理解“它”，要结合前后文。", 25, c.ink, "middle", 500);
await save(
  "01_context",
  620,
  "图中展示人的阅读判断，用来引出上下文为什么重要。"
);

start(
  2,
  "自注意力：在同一句话里找线索",
  "处理哪个词，就为哪个词汇集这句话里的信息。",
  650
);
rect(24, 130, 752, 102, "white", c.line);
["小猫", "趴在", "垫子上", "因为", "它", "累了"].forEach((s, i) =>
  box(34 + i * 123, 151, 112, 58, s, c.blueBg, c.blue, 24)
);
box(38, 284, 203, 83, "理解“它”", c.blueBg, c.blue, 25);
arrow(246, 325, 314, 325);
box(325, 284, 202, 83, "小猫\n可能的指代对象", c.tealBg, c.teal, 21);
box(554, 284, 202, 83, "累了\n帮助判断的线索", c.tealBg, c.teal, 21);
route("M 275 325 L 275 265 L 655 265 L 655 279", c.muted, 2);
box(38, 433, 203, 83, "理解“趴在”", c.blueBg, c.blue, 25);
arrow(246, 474, 314, 474);
box(325, 433, 202, 83, "小猫\n谁在趴着", c.amberBg, c.amber, 21);
box(554, 433, 202, 83, "垫子上\n趴在哪里", c.amberBg, c.amber, 21);
route("M 275 474 L 275 414 L 655 414 L 655 428", c.muted, 2);
text(
  400,
  567,
  "线索来自输入自身的内容，所以叫“自”注意力。",
  23,
  c.ink,
  "middle",
  500
);
await save(
  "02_self_attention",
  650,
  "只画几条容易理解的关系；实际参考比例由模型计算。"
);

start(
  3,
  "给词一张数字卡片，再加上位置",
  "卡片上的一排数叫向量；数字和分词均为教学示意。",
  620
);
const positions = [160, 400, 640];
["我", "喜欢", "小猫"].forEach((s, i) => {
  box(positions[i] - 90, 132, 180, 54, s, c.blueBg, c.blue, 26);
  arrow(positions[i], 188, positions[i], 214, c.blue);
  box(
    positions[i] - 105,
    219,
    210,
    62,
    ["[0.2, 0.8, …]", "[0.6, 0.1, …]", "[0.3, 0.5, …]"][i],
    "white",
    c.blue,
    22
  );
  text(positions[i], 314, "＋", 26, c.muted, "middle");
  box(
    positions[i] - 105,
    335,
    210,
    62,
    `第 ${i + 1} 位对应的数字`,
    c.amberBg,
    c.amber,
    20
  );
  arrow(positions[i], 399, positions[i], 432, c.teal);
  box(
    positions[i] - 105,
    438,
    210,
    62,
    "带有位置信息的卡片",
    c.tealBg,
    c.teal,
    20
  );
});
text(400, 549, "“我喜欢小猫” ≠ “小猫喜欢我”", 25, c.ink, "middle", 500);
await save(
  "03_embedding_position",
  620,
  "词语相同，顺序不同，意思也可能不同。"
);

start(
  4,
  "Q、K、V：用查书来记住分工",
  "先判断哪些书相关，再从书的正文中获取内容。",
  750
);
box(70, 134, 660, 72, "Q：我想查“猫为什么爱睡觉”", c.blueBg, c.blue, 26);
const cols = [35, 290, 545];
cols.forEach((x, i) => {
  arrow(400, 208, x + 110, 280, c.muted);
  box(
    x,
    286,
    220,
    91,
    ["K：目录线索\n猫的睡眠", "K：目录线索\n宠物护理", "K：目录线索\n家具选购"][
      i
    ],
    [c.tealBg, c.blueBg, c.amberBg][i],
    [c.teal, c.blue, c.amber][i],
    23
  );
  arrow(x + 110, 380, x + 110, 428, c.muted);
  box(x, 434, 220, 80, "V：这本书里\n实际可取用的正文", "white", c.muted, 21);
  arrow(x + 110, 517, [270, 400, 530][i], 611, c.muted);
});
rect(148, 553, 504, 35, c.bg, c.bg, 5);
text(400, 578, "按匹配后得到的比例汇集内容", 23, c.ink, "middle", 500);
box(174, 618, 452, 58, "汇集到的资料", c.tealBg, c.teal, 26);
await save("04_qkv", 750, "这是查书的类比；模型里的 Q、K、V 都是一排数字。");

start(
  5,
  "把三份信息按比例加起来",
  "正在处理“它”：以下比例与数字全部是假设值。",
  650
);
const refs = ["小猫", "累了", "垫子"];
cols.forEach((x, i) => {
  box(x, 139, 220, 56, refs[i], c.blueBg, c.blue, 27);
  box(
    x,
    216,
    220,
    70,
    ["V：[2, 0]", "V：[0, 2]", "V：[1, 1]"][i],
    "white",
    c.muted,
    27
  );
  text(x + 110, 332, ["× 60%", "× 30%", "× 10%"][i], 29, c.teal, "middle", 600);
  arrow(x + 110, 349, [270, 400, 530][i], 397, c.teal);
});
box(145, 405, 510, 67, "逐格相加 → [1.3, 0.7]", c.tealBg, c.teal, 28);
text(400, 522, "第一格：2×0.6 + 0×0.3 + 1×0.1 = 1.3", 23, c.ink, "middle");
text(400, 564, "第二格：0×0.6 + 2×0.3 + 1×0.1 = 0.7", 23, c.ink, "middle");
await save(
  "05_weighted_sum",
  650,
  "注意力权重控制信息混合的比例，不是指代判断的概率。"
);

start(
  6,
  "多头：一轮里，几组计算同时做",
  "各组有自己的匹配方法，算完后再合并结果。",
  650
);
box(220, 134, 360, 58, "同一份输入数字卡片", c.blueBg, c.blue, 25);
cols.forEach((x, i) => {
  arrow(400, 194, x + 110, 244);
  box(
    x,
    250,
    220,
    95,
    `头 ${i + 1}\n各自匹配、汇集信息`,
    [c.blueBg, c.tealBg, c.amberBg][i],
    [c.blue, c.teal, c.amber][i],
    21
  );
  arrow(x + 110, 348, x + 110, 384);
  box(x, 390, 220, 50, `第 ${i + 1} 份结果`, "white", c.muted, 22);
  arrow(x + 110, 442, [280, 400, 520][i], 487);
});
box(145, 495, 510, 60, "拼接，再加工 → 这一轮的结果", c.tealBg, c.teal, 24);
text(400, 589, "下一层，再用这一轮的结果继续处理。", 22, c.ink, "middle");
await save(
  "06_multihead",
  650,
  "图中只画 3 个头；论文基础模型使用 8 个头，分工由训练形成。"
);

start(
  7,
  "翻译时，一边参考原文，一边续写",
  "示例：小猫睡了 → The cat slept。",
  680
);
box(40, 138, 300, 62, "中文原文：小猫睡了", c.blueBg, c.blue, 23);
arrow(190, 202, 190, 239, c.blue);
box(40, 246, 300, 102, "编码器\n为原文补充上下文", c.blueBg, c.blue, 24);
arrow(190, 350, 190, 394, c.blue);
box(
  40,
  402,
  300,
  92,
  "原文信息\n每个 token 一张数字卡片",
  c.tealBg,
  c.teal,
  21
);
box(450, 138, 300, 82, "已有译文\n起始 + The", c.amberBg, c.amber, 24);
arrow(600, 222, 600, 293, c.amber);
box(450, 300, 300, 106, "解码器\n参考原文 + 已有译文", c.amberBg, c.amber, 23);
route("M 342 447 L 393 447 L 393 353 L 445 353", c.teal, 3);
arrow(600, 408, 600, 469, c.amber);
box(450, 476, 300, 64, "预测下一个词：cat", c.tealBg, c.teal, 23);
route("M 752 508 L 776 508 L 776 180 L 752 180", c.amber);
text(
  400,
  593,
  "把 cat 接到已有译文后面，再继续预测 slept。",
  23,
  c.ink,
  "middle",
  500
);
await save(
  "07_translation",
  680,
  "这里只画主要流程；原版编码器和解码器内部各有 6 层。"
);

start(
  8,
  "预测下一词时，挡住后面的答案",
  "每一行是一道练习题；列出的是能参考的输入。",
  685
);
const gx = 235,
  gy = 180,
  cell = 88;
["起始", "The", "cat", "slept"].forEach((s, i) => {
  text(gx + i * cell + cell / 2, 158, s, 23, c.ink, "middle", 500);
  text(
    200,
    gy + i * cell + 55,
    ["起始 → The", "The → cat", "cat → slept", "slept → 结束"][i],
    21,
    c.ink,
    "end",
    500
  );
  for (let j = 0; j < 4; j++) {
    rect(
      gx + j * cell + 2,
      gy + i * cell + 2,
      cell - 5,
      cell - 5,
      j <= i ? c.tealBg : "#e9edf2",
      j <= i ? c.teal : c.line,
      9
    );
    text(
      gx + j * cell + cell / 2,
      gy + i * cell + 53,
      j <= i ? "可看" : "遮住",
      20,
      j <= i ? c.teal : c.muted,
      "middle",
      500
    );
  }
});
text(660, 253, "右上角\n是未来\n不能看", 23, c.muted, "middle");
text(410, 575, "列：能参考的输入", 22, c.ink, "middle", 600);
text(
  400,
  615,
  "预测 cat 时，只能看见“起始”和 The。",
  23,
  c.teal,
  "middle",
  500
);
await save(
  "08_causal_mask",
  685,
  "遮罩把未来输入挡住；完整的中文原文仍然可以参考。"
);

start(
  9,
  "训练能一起练，生成要接着往后写",
  "同一句译文，在训练和实际使用时有不同的计算安排。",
  755
);
rect(30, 128, 740, 251, "white", c.blue, 16);
text(54, 170, "训练：正确译文已知，可以一起出题", 24, c.blue, "start", 600);
text(80, 234, "输入", 22, c.muted, "middle");
text(80, 319, "答案", 22, c.muted, "middle");
["起始", "The", "cat", "slept"].forEach((s, i) => {
  const x = 155 + i * 150;
  box(x, 201, 125, 48, s, c.blueBg, c.blue, 23);
  arrow(x + 62, 251, x + 62, 278, c.blue);
  box(
    x,
    284,
    125,
    48,
    ["The", "cat", "slept", "结束"][i],
    c.tealBg,
    c.teal,
    23
  );
});
text(
  400,
  361,
  "遮罩保证每道题只看到自己那部分已知内容。",
  20,
  c.muted,
  "middle"
);
rect(30, 405, 740, 295, "white", c.amber, 16);
text(
  54,
  448,
  "生成：接着刚生成的词，继续预测下一个",
  24,
  c.amber,
  "start",
  600
);
[
  ["第 1 步", "起始", "The"],
  ["第 2 步", "起始 + The", "cat"],
  ["第 3 步", "起始 + The + cat", "slept"],
].forEach((s, i) => {
  const y = 472 + i * 65;
  text(64, y + 32, s[0], 21, c.muted);
  box(175, y, 365, 48, s[1], c.amberBg, c.amber, 22);
  arrow(542, y + 24, 593, y + 24, c.amber);
  box(603, y, 132, 48, s[2], c.tealBg, c.teal, 23);
});
text(400, 679, "继续生成，直到输出结束标记。", 20, c.muted, "middle");
await save(
  "09_train_generate",
  755,
  "上面用正确译文出题；下面用模型自己已经生成的词续写。"
);

start(
  10,
  "论文改进了什么：少一些按词等待",
  "比较同一层内的计算；模型的层与层之间仍有先后。",
  660
);
text(36, 151, "RNN：前一步的中间记录，传给后一步", 23, c.ink, "start", 600);
const words = ["小猫", "趴在", "垫子上", "它"];
words.forEach((s, i) => {
  box(40 + i * 190, 183, 145, 62, s, c.amberBg, c.amber, 24);
  if (i < 3) arrow(187 + i * 190, 214, 226 + i * 190, 214, c.amber);
  text(112 + i * 190, 279, `第 ${i + 1} 步`, 19, c.muted, "middle");
});
text(36, 355, "自注意力：各词一起参考已有的数字卡片", 23, c.ink, "start", 600);
box(40, 385, 715, 57, "上一轮已经算好的全部数字卡片", c.blueBg, c.blue, 23);
words.forEach((s, i) => {
  arrow(112 + i * 190, 444, 112 + i * 190, 481, c.teal);
  box(40 + i * 190, 487, 145, 62, s, c.tealBg, c.teal, 24);
});
text(400, 590, "同一轮完成各词的注意力计算。", 23, c.teal, "middle", 500);
await save(
  "10_parallel",
  660,
  "同一层内可以并行计算，不代表生成译文时能一次写完。"
);
