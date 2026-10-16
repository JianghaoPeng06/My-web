// JasperPeng 后台 —— 本地服务器（只在自己电脑上运行，只监听 127.0.0.1）
// 读写网站的 js/data.js（文章）、assets/images/（图片），调用 build.ps1 生成页面。
// 不依赖任何第三方包：Node 自带的模块就够了。
//
// 设计要点：
//   · data.js 是手写的 JS，里面有大量注释。保存一篇文章时，只把「这一篇」那段 add({...}) 换掉，
//     文件里其他内容（注释、板块、角色、漫画）一个字都不动。
//   · 写出来的格式和手写的一样，并且满足 build.ps1 的读法：
//       add({ slug: '…', section: '…', cat: '…', date: 'YYYY-MM-DD', read: N, weight: N[, pin: true],
//         title: L('简', '繁', 'En', '日'), lede: L(…), [author: '…',] [menu: true | L(…),] tags: [ … ], body: [ … ]});
//   · 每次写 data.js 之前先备份到 backups/（保留最近 50 份）；换掉或删掉的图片直接删除。

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CONF = JSON.parse(fs.readFileSync(process.env.JP_ADMIN_CONFIG || path.join(HERE, 'config.json'), 'utf8'));
const SITE = CONF.site;                       // 网站文件夹，例如 E:\GitHub\My-web
const PORT = CONF.port || 5620;
const DATA = path.join(SITE, 'js', 'data.js');
const BACKUP = CONF.backups || path.join(HERE, 'backups');   // 测试时在 config 里写 backups 指到别处，免得把真正的备份挤掉（只留最近 50 份）
const PUBLIC = path.join(HERE, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.avif': 'image/avif', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.mp4': 'video/mp4',
  '.webm': 'video/webm', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8'
};
const IMG_EXT = ['.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.svg'];

/* ---------------------------------------------------------------
   读 data.js
   --------------------------------------------------------------- */
function readData() { return fs.readFileSync(DATA, 'utf8'); }

// 在沙箱里跑一遍 data.js，拿到板块和文章（文章只取手写的那几个字段）
function evalData(src) {
  const w = {};
  vm.runInNewContext(src, { window: w }, { timeout: 2000 });
  return w.JP;
}

// 跳过字符串和注释的括号配对：从 openIdx（'('、'[' 或 '{' 的位置）找到配对的收尾括号
function matchParen(src, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < src.length; i++) {
    const ch = src[i];
    if (ch === "'" || ch === '"' || ch === '`') {
      const q = ch; i++;
      while (i < src.length && src[i] !== q) { if (src[i] === '\\') i++; i++; }
      continue;
    }
    if (ch === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (ch === '/' && src[i + 1] === '*') { i = src.indexOf('*/', i + 2); if (i < 0) return -1; i++; continue; }
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') { depth--; if (depth === 0) return i; }
  }
  return -1;
}

// 找出每篇文章那段源码的位置：[行首, 结束（含 ); 和换行）)
function locateArticles(src) {
  const listAt = src.indexOf('var A = []');
  if (listAt < 0) throw new Error('data.js 里找不到 var A = []');
  const re = /add\(\{\s*slug:\s*'([^']+)'/g;
  re.lastIndex = listAt;
  const out = [];
  let m;
  while ((m = re.exec(src))) {
    const open = m.index + 3;                         // 'add(' 里的 '('
    const close = matchParen(src, open);
    if (close < 0) throw new Error('文章 ' + m[1] + ' 的括号没配上');
    let end = close + 1;
    if (src[end] === ';') end++;
    if (src[end] === '\r') end++;
    if (src[end] === '\n') end++;
    const lineStart = src.lastIndexOf('\n', m.index) + 1;
    out.push({ slug: m[1], start: lineStart, end });
    re.lastIndex = end;
  }
  return out;
}

const SRC_KEYS = ['slug', 'section', 'cat', 'date', 'read', 'weight', 'pin', 'author', 'menu', 'title', 'lede', 'tags', 'body'];
const MENU_MAX = 5;                              // 顶栏每个板块的精选栏最多几项（网站 build.ps1 同样卡 5）
const DEFAULT_AUTHOR = 'JasperPeng';             // data.js 里没写 author 的文章都算这个人（见 data.js「统一补全默认字段」）

function loadState() {
  const src = readData();
  const JP = evalData(src);
  const located = locateArticles(src);
  const order = located.map(x => x.slug);
  const bySlug = {};
  JP.ARTICLES.forEach(a => { bySlug[a.slug] = a; });
  const sections = JP.SECTIONS.map(s => ({
    key: s.key, dir: s.dir, label: s.label,
    // 带 to: 的分类（比如「原创角色」直接指向角色页）没有自己的分类页，但文章照样可以属于它
    cats: (s.cats || []).map(c => ({ slug: c.slug, label: c.label, link: !!c.to })),
    feat: (s.feature || []).length                  // 板块里手写的精选（比如角色板块的角色），和文章的精选一起算 5 项上限

  }));
  const dirOf = {}; sections.forEach(s => { dirOf[s.key] = s.dir; });
  const articles = order.filter(sl => bySlug[sl]).map(sl => {
    const a = bySlug[sl], o = {};
    SRC_KEYS.forEach(k => { if (a[k] !== undefined) o[k] = a[k]; });
    o.pin = a.pin === true;
    o.images = listImages(dirOf[a.section] || 'works', a.slug);
    o.refs = countRefs(src, a.slug);
    return o;
  });
  // 用过的标签（按简体去重），方便新文章直接挑
  const tagMap = new Map();
  articles.forEach(a => (a.tags || []).forEach(t => { const k = t['zh-Hans']; if (k && !tagMap.has(k)) tagMap.set(k, t); }));
  const characters = (JP.CHARACTERS || []).map(c => {
    const o = {};
    CHAR_KEYS.forEach(k => { if (c[k] !== undefined) o[k] = c[k]; });
    o.art = findImage('characters', c.slug);
    o.refs = countRefs(src, c.slug, 'char');
    return o;
  });
  return { site: SITE, version: JP.VERSION, sections, articles, tags: [...tagMap.values()], characters, poster: posterState() };
}

// 别处（板块的精选、导航）用 'article:<slug>'（角色是 'char:<slug>'）引用它的次数
function countRefs(src, slug, kind = 'article') {
  return src.split("'" + kind + ':' + slug + "'").length - 1;
}

// assets/images/<dir>/<name>.<ext> 里按 png > jpg > … 挑一张（和 build.ps1 同一个顺序），没有返回 null
function findImage(dir, name) {
  const d = path.join(SITE, 'assets', 'images', dir);
  let files = [];
  try { files = fs.readdirSync(d); } catch { return null; }
  const f = files.filter(x => path.parse(x).name === name && IMG_EXT.includes(path.extname(x).toLowerCase()))
    .sort((a, b) => IMG_EXT.indexOf(path.extname(a).toLowerCase()) - IMG_EXT.indexOf(path.extname(b).toLowerCase()))[0];
  if (!f) return null;
  const rel = (dir ? dir + '/' : '') + f;
  return { src: 'assets/images/' + rel, placeholder: readPlaceholders().has(rel) };
}

function listImages(dir, slug) {
  const d = path.join(SITE, 'assets', 'images', dir);
  let files = [];
  try { files = fs.readdirSync(d); } catch { return { cover: null, extra: [] }; }
  const mine = files.filter(f => IMG_EXT.includes(path.extname(f).toLowerCase()) &&
    (path.parse(f).name === slug || path.parse(f).name.startsWith(slug + '-')));
  const cover = mine.filter(f => path.parse(f).name === slug)
    .sort((a, b) => IMG_EXT.indexOf(path.extname(a).toLowerCase()) - IMG_EXT.indexOf(path.extname(b).toLowerCase()))[0] || null;
  const placeholders = readPlaceholders();
  return {
    cover: cover ? 'assets/images/' + dir + '/' + cover : null,
    coverIsPlaceholder: !!(cover && placeholders.has(dir + '/' + cover)),
    extra: mine.filter(f => path.parse(f).name !== slug).map(f => 'assets/images/' + dir + '/' + f)
  };
}
function readPlaceholders() {
  try {
    return new Set(fs.readFileSync(path.join(SITE, 'assets', 'images', '.placeholders.txt'), 'utf8')
      .split(/\r?\n/).map(l => l.split('\t')[0]).filter(Boolean));
  } catch { return new Set(); }
}

/* ---------------------------------------------------------------
   写 data.js：把一篇文章写回成手写的样子
   --------------------------------------------------------------- */
function q(s) {
  return "'" + String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")
    .replace(/\r?\n/g, '\\n') + "'";
}
function oneLine(s) { return String(s == null ? '' : s).replace(/\s*\r?\n\s*/g, ' ').trim(); }
const LANGS = ['zh-Hans', 'zh-Hant', 'en', 'ja'];
// 四语字段：四种一样就写 P('…')（专有名词），否则 L('简', '繁', 'En', '日')；空的语言用简体补上。
// 排法照手写的习惯（这样保存一篇没改过的文章，GitHub Desktop 里看不到任何改动）：
//   pair  标题：简、繁一行，英、日一行        each  导语：一种语言一行        tight  标签：一行、逗号后不空格
//   line  角色的短字段：一行、逗号后空一格
function loc(o, indent, style) {
  const v = LANGS.map(k => oneLine(o && o[k]));
  for (let i = 1; i < 4; i++) if (!v[i]) v[i] = v[0];
  if (v.every(x => x === v[0])) return 'P(' + q(v[0]) + ')';
  if (style === 'tight') return 'L(' + v.map(q).join(',') + ')';
  if (style === 'line') return 'L(' + v.map(q).join(', ') + ')';
  if (style === 'pair') return 'L(' + q(v[0]) + ', ' + q(v[1]) + ',\n' + indent + q(v[2]) + ', ' + q(v[3]) + ')';
  return 'L(' + q(v[0]) + ',\n' + indent + q(v[1]) + ',\n' + indent + q(v[2]) + ',\n' + indent + q(v[3]) + ')';
}
// 文字块可选的颜色 c、字体 f（网站 main.js 的 blockCls 认这几个值）。装饰字体只给段落和引用
const TEXT_BLOCKS = ['p', 'h2', 'h3', 'quote', 'ul', 'ol'];
// 藤紫、莓红对比度只够大字：只给小标题和装饰大字（和网站 main.js 的 blockCls 同一个规则）
const BLOCK_C = ['ink', 'body', 'muted', 'tea', 'dusk', 'wisteria', 'jam'], BLOCK_F = ['sans', 'serif', 'mono', 'deco'];
const BIG_ONLY = ['wisteria', 'jam'];
const isBig = b => b.t === 'h2' || b.t === 'h3' || (b.f === 'deco' && (b.t === 'p' || b.t === 'quote'));
function styleOf(b) {
  if (!TEXT_BLOCKS.includes(b.t)) return '';
  let s = '';
  if (BLOCK_C.includes(b.c) && (!BIG_ONLY.includes(b.c) || isBig(b))) s += ', c: ' + q(b.c);
  if (BLOCK_F.includes(b.f) && (b.f !== 'deco' || b.t === 'p' || b.t === 'quote')) s += ', f: ' + q(b.f);
  return s;
}
function block(b) {
  const t = b.t;
  if (t === 'hr') return "{ t: 'hr' }";
  if (t === 'ul' || t === 'ol') return '{ t: ' + q(t) + ', v: [' + (b.v || []).filter(x => String(x).trim()).map(q).join(', ') + ']' + styleOf(b) + ' }';
  if (t === 'img') {
    let s = "{ t: 'img', src: " + q(b.src);
    if (b.cap) s += ', cap: ' + q(b.cap);
    if (b.alt) s += ', alt: ' + q(b.alt);
    return s + ' }';
  }
  if (t === 'figure') return "{ t: 'figure'" + (b.cap ? ', cap: ' + q(b.cap) : '') + ' }';
  if (['p', 'h2', 'h3', 'quote', 'html'].includes(t)) return '{ t: ' + q(t) + ', v: ' + q(b.v) + styleOf(b) + ' }';
  throw new Error('不认识的正文块：' + t);
}
// 从一段 add({...}) 源码里取出某个字段的原文（比如 title: L(...) 的 L(...) 那一截），取不到返回 null
function fieldSource(blockSrc, name) {
  const m = new RegExp('\\n\\s*' + name + ':\\s*').exec(blockSrc);
  if (!m) return null;
  const at = m.index + m[0].length;
  const ch = blockSrc[at];
  if (ch === 'L' || ch === 'P') { const close = matchParen(blockSrc, at + 1); return close < 0 ? null : blockSrc.slice(at, close + 1); }
  if (ch === '[') {
    // 找配对的 ]（跳过字符串）
    let depth = 0;
    for (let i = at; i < blockSrc.length; i++) {
      const c = blockSrc[i];
      if (c === "'" || c === '"' || c === '`') { const qq = c; i++; while (i < blockSrc.length && blockSrc[i] !== qq) { if (blockSrc[i] === '\\') i++; i++; } continue; }
      if (c === '[') depth++; else if (c === ']') { depth--; if (depth === 0) return blockSrc.slice(at, i + 1); }
    }
  }
  return null;
}
const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);

// old = { src, value }：这篇文章原来的源码和读出来的值。没改动的字段原样照抄，改过的才按统一格式重写 ——
// 这样只改了置顶，GitHub Desktop 里就只看到第一行变了
function serialize(a, old) {
  const keep = (name, val, make) => {
    if (old && same(old.value[name], val)) { const s = fieldSource(old.src, name); if (s) return s; }
    return make();
  };
  let s = '  add({ slug: ' + q(a.slug) + ', section: ' + q(a.section) + ', cat: ' + q(a.cat) +
    ', date: ' + q(a.date) + ', read: ' + a.read + ', weight: ' + a.weight + (a.pin ? ', pin: true' : '') + ',\n';
  s += '    title: ' + keep('title', a.title, () => loc(a.title, '             ', 'pair')) + ',\n';
  s += '    lede:  ' + keep('lede', a.lede, () => loc(a.lede, '             ', 'each')) + ',\n';
  // 作者是默认的 JasperPeng 就不写这一行（和以前手写的一样）；别人写的才单独占一行
  if (a.author !== DEFAULT_AUTHOR) s += '    author: ' + q(a.author) + ',\n';
  // 精选到顶部栏（顶栏下拉面板右边那一列）：true = 用标题；四语短名 = 顶栏里显示这个短名。不精选就不写这一行
  if (a.menu) s += '    menu: ' + (a.menu === true ? 'true' : keep('menu', a.menu, () => loc(a.menu, '', 'line'))) + ',\n';
  s += '    tags: ' + keep('tags', a.tags, () => '[' + (a.tags || []).map(t => loc(t, '', 'tight')).join(', ') + ']') + ',\n';
  const body = (a.body || []).filter(b => b && b.t);
  s += '    body: ' + keep('body', body, () => body.length
    ? '[\n' + body.map(b => '      ' + block(b)).join(',\n') + '\n    ]'
    : '[]') + '});\n';
  return s;
}

function validate(a, state, oldSlug) {
  const err = m => { throw Object.assign(new Error(m), { status: 400 }); };
  if (!/^[a-z0-9][a-z0-9-]{0,60}$/.test(a.slug || '')) err('文章地址（slug）只能用小写英文字母、数字和短横线，比如 kyoto-trip');
  const sec = state.sections.find(s => s.key === a.section); if (!sec) err('板块不对');
  if (!sec.cats.some(c => c.slug === a.cat)) err('分类不对');
  // 角色立绘和角色板块的文章图片放在同一个文件夹（assets/images/characters/），名字不能撞
  if (sec.dir === 'characters') {
    const hit = state.characters.find(c => c.slug === a.slug || c.slug.startsWith(a.slug + '-'));
    if (hit) err('文章地址 ' + a.slug + ' 和角色「' + hit.name['zh-Hans'] + '」的立绘文件名撞了，换一个地址');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(a.date || '')) err('日期格式要像 2026-10-16');
  a.read = Math.max(1, Math.min(99, Math.round(+a.read) || 1));
  a.weight = Math.max(1, Math.min(5, Math.round(+a.weight) || 3));
  a.pin = a.pin === true;
  if (!a.title || !oneLine(a.title['zh-Hans'])) err('至少要有简体标题');
  a.author = oneLine(a.author) || DEFAULT_AUTHOR;
  if (a.author.length > 60) err('作者名字太长了（60 个字以内）');
  // 顶栏精选：短名一个都没填就当 true（用标题）；关掉就整个去掉
  if (a.menu && typeof a.menu === 'object') {
    const m = {}; LANGS.forEach(k => { const v = oneLine(a.menu[k]); if (v) m[k] = v; });
    if (!m['zh-Hans'] && Object.keys(m).length) err('顶栏精选的短名要先填简体');
    if (Object.values(m).some(v => v.length > 40)) err('顶栏精选的短名太长了（40 个字以内）');
    a.menu = m['zh-Hans'] ? m : true;
  } else if (a.menu !== true) delete a.menu;
  // 每个板块的精选栏最多 5 项（2026-10-17 用户定的），连同板块里手写的 feature
  if (a.menu) {
    const others = state.articles.filter(x => x.menu && x.section === a.section && x.slug !== oldSlug);
    if (others.length + sec.feat >= MENU_MAX) err('「' + sec.label['zh-Hans'] + '」的顶栏精选已经有 ' + MENU_MAX + ' 项了（最多 ' + MENU_MAX + ' 项），先在别的文章上关掉一个再打开这篇');
  }
  a.lede = a.lede || {}; a.tags = (a.tags || []).filter(t => t && oneLine(t['zh-Hans']));
  a.body = Array.isArray(a.body) ? a.body : [];
  a.body.forEach(b => {
    // 不认识的颜色 / 字体、不该有的地方（比如图片块上）直接去掉，免得和原文比较时以为改过
    if (!TEXT_BLOCKS.includes(b.t) || !BLOCK_F.includes(b.f) || (b.f === 'deco' && b.t !== 'p' && b.t !== 'quote')) delete b.f;
    if (!TEXT_BLOCKS.includes(b.t) || !BLOCK_C.includes(b.c) || (BIG_ONLY.includes(b.c) && !isBig(b))) delete b.c;
    if (b.t === 'img' && !/^assets\/images\/[a-z0-9-]+\/[a-z0-9-]+\.(png|jpe?g|webp|gif|avif|svg)$/i.test(b.src || '')) err('有一张插图的地址不对：' + b.src);
  });
  return sec;
}

function backupData() {
  fs.mkdirSync(BACKUP, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.copyFileSync(DATA, path.join(BACKUP, 'data-' + stamp + '.js'));
  const all = fs.readdirSync(BACKUP).filter(f => /^data-.*\.js$/.test(f)).sort();
  all.slice(0, Math.max(0, all.length - 50)).forEach(f => fs.unlinkSync(path.join(BACKUP, f)));
}
function writeData(src) {
  // 写之前在沙箱里跑一遍新内容，跑不通就不写（防止把网站写坏）
  evalData(src);
  backupData();
  fs.writeFileSync(DATA, src, 'utf8');
}
// 删掉、换掉的图片和视频直接删除，不再挪进 backups（2026-10-17 用户：删了就删了，一张图而已）。
// data.js 照旧每次保存前备份一份 —— 那个才是要紧的。
function removeFile(file) {
  try { fs.unlinkSync(file); } catch (e) { if (e.code !== 'ENOENT') throw e; }
}

function saveArticle(oldSlug, a) {
  const state = loadState();
  const sec = validate(a, state, oldSlug);
  let src = readData();
  const located = locateArticles(src);
  const isNew = !oldSlug;
  if (isNew && located.some(x => x.slug === a.slug)) throw Object.assign(new Error('已经有一篇叫 ' + a.slug + ' 的文章了，换一个地址'), { status: 400 });
  if (!isNew && a.slug !== oldSlug && located.some(x => x.slug === a.slug)) throw Object.assign(new Error('已经有一篇叫 ' + a.slug + ' 的文章了'), { status: 400 });

  // 改了地址（slug）或板块：图片跟着改名 / 搬家，正文里的插图地址、别处的 article: 引用一起改
  if (!isNew) {
    const old = state.articles.find(x => x.slug === oldSlug);
    if (!old) throw Object.assign(new Error('找不到这篇文章：' + oldSlug), { status: 404 });
    const oldDir = state.sections.find(s => s.key === old.section).dir;
    if (oldSlug !== a.slug || oldDir !== sec.dir) {
      const files = [old.images.cover, ...old.images.extra].filter(Boolean);
      files.forEach(rel => {
        const from = path.join(SITE, rel);
        const name = path.basename(rel).replace(new RegExp('^' + oldSlug), a.slug);
        const to = path.join(SITE, 'assets', 'images', sec.dir, name);
        if (fs.existsSync(to)) removeFile(to);
        fs.renameSync(from, to);
        a.body.forEach(b => { if (b.t === 'img' && b.src === rel) b.src = 'assets/images/' + sec.dir + '/' + name; });
      });
      if (oldSlug !== a.slug) src = src.split("'article:" + oldSlug + "'").join("'article:" + a.slug + "'");
    }
  }

  const loc2 = locateArticles(src);
  let old = null;
  if (!isNew) {
    const hit0 = loc2.find(x => x.slug === oldSlug);
    old = { src: src.slice(hit0.start, hit0.end), value: state.articles.find(x => x.slug === oldSlug) };
  }
  let text = serialize(a, old);
  if (src.includes('\r\n')) text = text.replace(/\r?\n/g, '\r\n');   // 跟着文件原来的换行方式走，不混用
  if (isNew) {
    // 新文章放在列表最前面
    const first = loc2[0];
    const at = first ? first.start : src.indexOf('\n', src.indexOf('function add(o)')) + 1;
    src = src.slice(0, at) + text + '\n' + src.slice(at);
  } else {
    const hit = loc2.find(x => x.slug === oldSlug);
    src = src.slice(0, hit.start) + text + src.slice(hit.end);
  }
  writeData(src);
  return loadState().articles.find(x => x.slug === a.slug);
}

function deleteArticle(slug) {
  const state = loadState();
  const a = state.articles.find(x => x.slug === slug);
  if (!a) throw Object.assign(new Error('找不到这篇文章'), { status: 404 });
  if (a.refs) throw Object.assign(new Error('这篇文章被板块的「精选」或导航引用了 ' + a.refs + ' 次，先去掉那些引用再删（在 data.js 里搜 article:' + slug + '）'), { status: 400 });
  let src = readData();
  const hit = locateArticles(src).find(x => x.slug === slug);
  let end = hit.end;
  if (src[end] === '\r') end++;
  if (src[end] === '\n') end++;            // 顺带吃掉后面那一行空行
  src = src.slice(0, hit.start) + src.slice(end);
  evalData(src);                           // 先确认删完以后 data.js 还能跑
  // 先挪图片、再改 data.js：挪图片出错的话文章还在，不会只删一半
  [a.images.cover, ...a.images.extra].filter(Boolean).forEach(rel => removeFile(path.join(SITE, rel)));
  writeData(src);
}

/* ---------------------------------------------------------------
   角色：data.js 里的 var CHARACTERS = [ {…}, {…} ]
   和文章一样，只换动过的那一个 {…}；没改的字段照抄原文。数组的顺序就是角色页上缩略图的顺序。
   手写的样子：
     { slug: 'la', name: P('拉'), year: '2024', version: 'v2', res: 'resources',
       region: L(…),
       role:   L(…),
       age:    L(…), sex: P('♂'),
       quote:  P(…),
       bio:    L('简',
                 '繁',
                 'En',
                 '日') }
   --------------------------------------------------------------- */
const CHAR_KEYS = ['slug', 'name', 'year', 'version', 'res', 'region', 'role', 'age', 'sex', 'quote', 'bio'];
const CHAR_LOCS = ['name', 'region', 'role', 'age', 'sex', 'quote', 'bio'];
const CI = '                ';                      // 续行缩进：对齐到 bio:    L( 后面那个引号

function skipGap(s, i, end) {                   // 跳过空白、逗号和注释
  while (i < end) {
    if (/[\s,]/.test(s[i])) { i++; continue; }
    if (s[i] === '/' && s[i + 1] === '/') { while (i < end && s[i] !== '\n') i++; continue; }
    if (s[i] === '/' && s[i + 1] === '*') { const e = s.indexOf('*/', i + 2); i = e < 0 ? end : e + 2; continue; }
    break;
  }
  return i;
}
function locateChars(src) {
  const at = src.indexOf('var CHARACTERS = [');
  if (at < 0) throw new Error('data.js 里找不到 var CHARACTERS = [');
  const open = src.indexOf('[', at), close = matchParen(src, open);
  if (close < 0) throw new Error('角色列表的括号没配上');
  const items = [];
  let i = skipGap(src, open + 1, close);
  while (i < close) {
    if (src[i] !== '{') throw new Error('角色列表里有看不懂的内容（第 ' + src.slice(0, i).split('\n').length + ' 行）');
    const e = matchParen(src, i);
    const m = /^\{\s*slug:\s*'([^']+)'/.exec(src.slice(i, i + 200));
    if (e < 0 || !m) throw new Error('角色列表的格式变了（第 ' + src.slice(0, i).split('\n').length + ' 行）');
    items.push({ slug: m[1], start: i, end: e + 1 });
    i = skipGap(src, e + 1, close);
  }
  return { open, close, items };
}
// 一个 {…} 的各个字段原文：{ name: "P('拉')", … }
function objFields(s) {
  const out = {}, n = s.length - 1;
  let i = 1;
  while (true) {
    i = skipGap(s, i, n);
    const m = /^([A-Za-z_$][\w$]*)\s*:\s*/.exec(s.slice(i, i + 80));
    if (!m) break;
    const vs = i + m[0].length;
    let j = vs, depth = 0;
    for (; j < n; j++) {
      const ch = s[j];
      if (ch === "'" || ch === '"' || ch === '`') { j++; while (j < n && s[j] !== ch) { if (s[j] === '\\') j++; j++; } continue; }
      if (ch === '(' || ch === '[' || ch === '{') depth++;
      else if (ch === ')' || ch === ']' || ch === '}') depth--;
      else if (ch === ',' && depth === 0) break;
    }
    out[m[1]] = s.slice(vs, j).trimEnd();
    i = j + 1;
  }
  return out;
}
const normLoc = o => (o && typeof o === 'object') ? LANGS.map(k => oneLine(o[k])) : o;
function serializeChar(c, old) {
  const f = old ? objFields(old.src) : {};
  const keep = (name, make) => {
    if (old && f[name] != null && same(normLoc(old.value[name]), normLoc(c[name]))) return f[name];
    return make();
  };
  const line = k => keep(k, () => loc(c[k], '', 'line'));
  const quote = keep('quote', () => { const s = loc(c.quote, '', 'line'); return s.length > 96 ? loc(c.quote, CI, 'pair') : s; });
  return '{ slug: ' + q(c.slug) + ', name: ' + line('name') + ', year: ' + keep('year', () => q(c.year)) +
    ', version: ' + keep('version', () => q(c.version)) + ', res: ' + keep('res', () => q(c.res)) + ',\n' +
    '      region: ' + line('region') + ',\n' +
    '      role:   ' + line('role') + ',\n' +
    '      age:    ' + line('age') + ', sex: ' + line('sex') + ',\n' +
    '      quote:  ' + quote + ',\n' +
    '      bio:    ' + keep('bio', () => loc(c.bio, CI, 'each')) + ' }';
}
function validateChar(c, state, oldSlug) {
  const err = m => { throw Object.assign(new Error(m), { status: 400 }); };
  if (!/^[a-z0-9][a-z0-9-]{0,40}$/.test(c.slug || '')) err('角色地址（slug）只能用小写英文字母、数字和短横线，比如 caomeijiang');
  if (c.slug !== oldSlug && state.characters.some(x => x.slug === c.slug)) err('已经有一个角色叫 ' + c.slug + ' 了');
  const clash = state.articles.find(a => a.section === 'characters' && (a.slug === c.slug || c.slug.startsWith(a.slug + '-')));
  if (clash) err('角色地址 ' + c.slug + ' 和文章「' + clash.title['zh-Hans'] + '」的图片文件名撞了，换一个');
  if (!c.name || !oneLine(c.name['zh-Hans'])) err('至少要有名字（简体那一格）');
  const about = state.sections.find(s => s.key === 'about');
  if (!about || !about.cats.some(x => x.slug === c.res)) err('「查看资源」按钮要跳到的分类不对');
  c.year = oneLine(c.year); c.version = oneLine(c.version);
  CHAR_LOCS.forEach(k => { c[k] = c[k] && typeof c[k] === 'object' ? c[k] : {}; });
}
function nl(src, text) { return src.includes('\r\n') ? text.replace(/\r?\n/g, '\r\n') : text; }

function saveChar(oldSlug, c) {
  const state = loadState();
  validateChar(c, state, oldSlug);
  let src = readData();
  const isNew = !oldSlug;
  const old = isNew ? null : state.characters.find(x => x.slug === oldSlug);
  if (!isNew && !old) throw Object.assign(new Error('找不到这个角色：' + oldSlug), { status: 404 });
  // 改了地址：立绘跟着改名，导航里的 'char:<slug>' 一起改
  if (!isNew && c.slug !== oldSlug) {
    if (old.art) {
      const from = path.join(SITE, old.art.src);
      const to = path.join(path.dirname(from), c.slug + path.extname(from));
      if (fs.existsSync(to)) removeFile(to);
      fs.renameSync(from, to);
    }
    src = src.split("'char:" + oldSlug + "'").join("'char:" + c.slug + "'");
  }
  const L0 = locateChars(src);
  let oldInfo = null;
  if (!isNew) {
    const hit = L0.items.find(x => x.slug === oldSlug);
    oldInfo = { src: src.slice(hit.start, hit.end), value: old };
  }
  const text = nl(src, serializeChar(c, oldInfo));
  if (isNew) {
    const last = L0.items[L0.items.length - 1];
    src = last ? src.slice(0, last.end) + nl(src, ',\n\n    ') + text + src.slice(last.end)
               : src.slice(0, L0.open + 1) + nl(src, '\n    ') + text + src.slice(L0.open + 1);
  } else {
    const hit = L0.items.find(x => x.slug === oldSlug);
    src = src.slice(0, hit.start) + text + src.slice(hit.end);
  }
  writeData(src);
  return loadState().characters.find(x => x.slug === c.slug);
}
function deleteChar(slug) {
  const state = loadState();
  const c = state.characters.find(x => x.slug === slug);
  if (!c) throw Object.assign(new Error('找不到这个角色'), { status: 404 });
  if (c.refs) throw Object.assign(new Error('这个角色被导航里的「原创角色」引用了 ' + c.refs + ' 次，先去掉引用再删（在 data.js 里搜 char:' + slug + '）'), { status: 400 });
  if (state.characters.length === 1) throw Object.assign(new Error('至少要留一个角色，角色页才能显示'), { status: 400 });
  let src = readData();
  const { items } = locateChars(src);
  const i = items.findIndex(x => x.slug === slug);
  // 连同它和相邻角色之间的「,\n\n    」一起去掉
  src = i > 0 ? src.slice(0, items[i - 1].end) + src.slice(items[i].end)
              : src.slice(0, items[0].start) + src.slice(items[1].start);
  evalData(src);
  if (c.art) removeFile(path.join(SITE, c.art.src));
  writeData(src);
}
function orderChars(order) {
  let src = readData();
  const { items } = locateChars(src);
  const slugs = items.map(x => x.slug);
  if (!Array.isArray(order) || order.length !== slugs.length || [...order].sort().join() !== [...slugs].sort().join())
    throw Object.assign(new Error('角色顺序不对，刷新一下再试'), { status: 400 });
  // 角色之间只有逗号和空行才能直接换位置（有注释的话，搬动会把注释搬错地方）
  const gaps = items.slice(1).map((x, i) => src.slice(items[i].end, x.start));
  if (gaps.some(g => !/^[\s,]*$/.test(g))) throw Object.assign(new Error('角色之间有注释，没法自动换顺序，请在 data.js 里手动调'), { status: 400 });
  const gap = gaps[0] || nl(src, ',\n\n    ');
  const text = order.map(s => { const x = items.find(y => y.slug === s); return src.slice(x.start, x.end); }).join(gap);
  src = src.slice(0, items[0].start) + text + src.slice(items[items.length - 1].end);
  writeData(src);
}

/* ---------------------------------------------------------------
   首页海报：assets/images/poster.<图片扩展名>（静止画面），有 poster.mp4 / poster.webm 就播视频（build.ps1 负责改 home.html）
   图注是 main.js 里四种语言的 posterCap
   --------------------------------------------------------------- */
const MAIN = path.join(SITE, 'js', 'main.js');
const VID_EXT = ['.mp4', '.webm'];
const CAP_RE = /posterCap:'((?:[^'\\]|\\.)*)'/g;
const CAP_LINE = ["'zh-Hans':", "'zh-Hant':", 'en:', 'ja:'];
function posterState() {
  const d = path.join(SITE, 'assets', 'images');
  let video = null;
  for (const e of VID_EXT) {
    const f = path.join(d, 'poster' + e);
    if (fs.existsSync(f)) { video = { src: 'assets/images/poster' + e, size: fs.statSync(f).size }; break; }
  }
  return { image: findImage('', 'poster'), video, cap: readCaption() };
}
function captionHits(src) {
  const hits = [...src.matchAll(CAP_RE)];
  const ok = hits.length === 4 && hits.every((m, i) => src.slice(src.lastIndexOf('\n', m.index) + 1, m.index).trimStart().startsWith(CAP_LINE[i]));
  if (!ok) throw new Error('main.js 里 posterCap 的写法变了，图注没法在后台改');
  return hits;
}
function readCaption() {
  try {
    const hits = captionHits(fs.readFileSync(MAIN, 'utf8')), o = {};
    hits.forEach((m, i) => { o[LANGS[i]] = m[1].replace(/\\(.)/g, '$1'); });
    return o;
  } catch { return null; }
}
function saveCaption(cap) {
  const v = LANGS.map(k => oneLine(cap && cap[k]));
  if (!v[0]) throw Object.assign(new Error('简体图注不能空着'), { status: 400 });
  for (let i = 1; i < 4; i++) if (!v[i]) v[i] = v[0];
  let src = fs.readFileSync(MAIN, 'utf8');
  const hits = captionHits(src);
  for (let i = 3; i >= 0; i--) {             // 从后往前换，前面的位置不会跟着变
    const m = hits[i];
    src = src.slice(0, m.index) + 'posterCap:' + q(v[i]) + src.slice(m.index + m[0].length);
  }
  new vm.Script(src);                         // 语法检查：写坏了就不写
  fs.mkdirSync(BACKUP, { recursive: true });
  fs.copyFileSync(MAIN, path.join(BACKUP, 'main-' + new Date().toISOString().replace(/[:.]/g, '-') + '.js'));
  fs.writeFileSync(MAIN, src, 'utf8');
  return readCaption();
}
function savePoster({ kind, ext, data }) {
  const d = path.join(SITE, 'assets', 'images');
  ext = String(ext || '').toLowerCase().replace(/^\./, '');
  const isVid = kind === 'video';
  if (isVid ? !['mp4', 'webm'].includes(ext) : !['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext))
    throw Object.assign(new Error(isVid ? '视频只支持 MP4 / WebM' : '图片只支持 png / jpg / webp / gif'), { status: 400 });
  const buf = Buffer.from(String(data).replace(/^data:[^,]*,/, ''), 'base64');
  // Cloudflare Pages 单个文件最大 25MB，超过了整个网站都推不上去
  if (buf.length > 25 * 1024 * 1024) throw Object.assign(new Error('文件超过 25MB 了，Cloudflare 放不下。视频压小一点再传'), { status: 400 });
  const exts = isVid ? VID_EXT : IMG_EXT;
  fs.readdirSync(d).filter(f => path.parse(f).name === 'poster' && exts.includes(path.extname(f).toLowerCase()))
    .forEach(f => removeFile(path.join(d, f)));
  fs.writeFileSync(path.join(d, 'poster.' + ext), buf);
  return posterState();
}
function removePosterVideo() {
  const d = path.join(SITE, 'assets', 'images');
  VID_EXT.forEach(e => { const f = path.join(d, 'poster' + e); if (fs.existsSync(f)) removeFile(f); });
  return posterState();
}

/* ---------------------------------------------------------------
   图片：浏览器那边已经压缩好、转好格式，这里只负责放到对的位置
   --------------------------------------------------------------- */
function saveImage({ dir, slug, kind, ext, data }) {
  const state = loadState();
  if (!state.sections.some(s => s.dir === dir)) throw Object.assign(new Error('图片目录不对'), { status: 400 });
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug || '')) throw Object.assign(new Error('文章地址不对'), { status: 400 });
  ext = String(ext || '').toLowerCase().replace(/^\./, '');
  if (!['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) throw Object.assign(new Error('只支持 png / jpg / webp / gif'), { status: 400 });
  const buf = Buffer.from(String(data).replace(/^data:[^,]*,/, ''), 'base64');
  if (buf.length > 30 * 1024 * 1024) throw Object.assign(new Error('图片太大了（超过 30MB）'), { status: 400 });
  // 角色立绘（art）和角色板块的文章图片在同一个文件夹：先确认不会盖掉别人的图
  if (dir === 'characters') {
    const art = kind === 'art';
    const clash = art ? state.articles.find(a => a.section === 'characters' && (a.slug === slug || slug.startsWith(a.slug + '-')))
                      : state.characters.find(c => c.slug === slug || c.slug.startsWith(slug + '-'));
    if (clash) throw Object.assign(new Error(art ? '这个地址和文章「' + clash.title['zh-Hans'] + '」的图片重名了，先换一个角色地址'
                                                 : '这个地址和角色「' + clash.name['zh-Hans'] + '」的立绘重名了，先换一个文章地址'), { status: 400 });
  }
  const d = path.join(SITE, 'assets', 'images', dir);
  fs.mkdirSync(d, { recursive: true });
  let name;
  if (kind === 'cover' || kind === 'art') {
    // 封面 = <slug>.<ext>。同名不同扩展名的旧图（包括占位图）挪进备份 —— 否则 build.ps1 会按 png > jpg 的顺序挑到旧的
    fs.readdirSync(d).filter(f => path.parse(f).name === slug && IMG_EXT.includes(path.extname(f).toLowerCase()))
      .forEach(f => removeFile(path.join(d, f)));
    name = slug + '.' + ext;
  } else {
    let n = 2;
    while (fs.readdirSync(d).some(f => path.parse(f).name === slug + '-' + n)) n++;
    name = slug + '-' + n + '.' + ext;
  }
  fs.writeFileSync(path.join(d, name), buf);
  return 'assets/images/' + dir + '/' + name;
}

/* ---------------------------------------------------------------
   生成页面：跑 build.ps1
   --------------------------------------------------------------- */
let building = null;
// 程序指纹：server.mjs 和界面文件的修改时间。启动时记下来，之后一变就说明后台更新过了
function codeStamp() {
  try {
    const files = [fileURLToPath(import.meta.url), ...fs.readdirSync(PUBLIC).map(f => path.join(PUBLIC, f))];
    return String(Math.max(...files.map(f => fs.statSync(f).mtimeMs)));
  } catch { return BORN; }
}
const BORN = codeStamp();
let lastSeen = Date.now();          // 界面最后一次打招呼的时间（见文件末尾）
function runBuild() {
  if (building) return building;
  building = new Promise(resolve => {
    // 先把控制台输出改成 UTF-8，否则中文日志按 GBK 出来是乱码
    const script = "[Console]::OutputEncoding = [Text.Encoding]::UTF8; $OutputEncoding = [Text.Encoding]::UTF8; & '" +
      path.join(SITE, 'build.ps1').replace(/'/g, "''") + "'; exit $LASTEXITCODE";
    const ps = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script],
      { cwd: SITE, windowsHide: true });
    let out = '';
    ps.stdout.on('data', d => { out += d.toString('utf8'); });
    ps.stderr.on('data', d => { out += d.toString('utf8'); });
    ps.on('close', code => { building = null; resolve({ ok: code === 0, code, log: out.trim() }); });
    ps.on('error', e => { building = null; resolve({ ok: false, code: -1, log: String(e) }); });
  });
  return building;
}

/* ---------------------------------------------------------------
   HTTP
   --------------------------------------------------------------- */
function send(res, code, body, type) {
  const isObj = typeof body === 'object' && !Buffer.isBuffer(body);
  res.writeHead(code, { 'Content-Type': type || (isObj ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8'), 'Cache-Control': 'no-store' });
  res.end(isObj ? JSON.stringify(body) : body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', c => { size += c.length; if (size > 50 * 1024 * 1024) { reject(new Error('太大了')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); } catch (e) { reject(e); } });
  });
}
function serveFile(res, root, rel) {
  const file = path.normalize(path.join(root, rel));
  if (!file.startsWith(path.normalize(root))) return send(res, 403, '不允许');
  let f = file;
  try { if (fs.statSync(f).isDirectory()) f = path.join(f, 'index.html'); } catch { return send(res, 404, '没有这个文件'); }
  if (!fs.existsSync(f)) return send(res, 404, '没有这个文件');
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(f).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://localhost');
    const p = decodeURIComponent(u.pathname);
    // 只接受本机来的请求（服务器本来也只监听 127.0.0.1，这里再挡一道跨站请求）
    const origin = req.headers.origin;
    if (origin && !/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) return send(res, 403, '不允许');

    // 后台程序（server.mjs 或界面文件）改过了：先换成新的自己再说，旧程序不认识新字段，保存会把它们弄丢（2026-10-17 精选被抹掉过一次）
    if (p.startsWith('/api/') && codeStamp() !== BORN) { send(res, 503, { error: '后台刚更新过，正在自动重启，几秒后再试一次', restarting: true }); return restartSelf(); }
    if (p === '/api/ping') { lastSeen = Date.now(); return send(res, 200, { ok: true, code: BORN }); }
    if (p === '/api/state' && req.method === 'GET') return send(res, 200, loadState());
    if (p === '/api/articles' && req.method === 'POST') return send(res, 200, saveArticle(null, (await readBody(req)).article));
    let m = p.match(/^\/api\/articles\/([a-z0-9-]+)$/);
    if (m && req.method === 'PUT') return send(res, 200, saveArticle(m[1], (await readBody(req)).article));
    if (m && req.method === 'DELETE') { deleteArticle(m[1]); return send(res, 200, { ok: true }); }
    if (p === '/api/images' && req.method === 'POST') return send(res, 200, { src: saveImage(await readBody(req)) });
    if (p === '/api/characters' && req.method === 'POST') return send(res, 200, saveChar(null, (await readBody(req)).character));
    if (p === '/api/characters/order' && req.method === 'PUT') { orderChars((await readBody(req)).order); return send(res, 200, { ok: true }); }
    m = p.match(/^\/api\/characters\/([a-z0-9-]+)$/);
    if (m && req.method === 'PUT') return send(res, 200, saveChar(m[1], (await readBody(req)).character));
    if (m && req.method === 'DELETE') { deleteChar(m[1]); return send(res, 200, { ok: true }); }
    if (p === '/api/poster' && req.method === 'POST') return send(res, 200, savePoster(await readBody(req)));
    if (p === '/api/poster/video' && req.method === 'DELETE') return send(res, 200, removePosterVideo());
    if (p === '/api/poster/caption' && req.method === 'PUT') return send(res, 200, { cap: saveCaption((await readBody(req)).cap) });
    if (p === '/api/build' && req.method === 'POST') return send(res, 200, await runBuild());

    if (p.startsWith('/site/')) return serveFile(res, SITE, p.slice(6) || 'index.html');
    if (p === '/site') { res.writeHead(302, { Location: '/site/' }); return res.end(); }
    return serveFile(res, PUBLIC, p === '/' ? 'index.html' : p.slice(1));
  } catch (e) {
    console.error(e);
    send(res, e.status || 500, { error: e.message || String(e) });
  }
});

// 后台窗口开着的时候，界面每 15 秒打一次招呼（/api/ping）。超过 2 分钟没人打招呼（窗口关了），服务器自己退出，
// 不会一直挂在后台。正在生成页面的时候不退。
setInterval(() => { if (!building && Date.now() - lastSeen > 120000) process.exit(0); }, 15000).unref();

// 换成新程序：起一个新的自己（同样的参数和环境），这个旧的退出。新的那个等端口空出来再开（见 listen 的重试）
let restarting = false;
function restartSelf() {
  if (restarting) return; restarting = true;
  const out = fs.openSync(path.join(HERE, 'server.log'), 'a'), err = fs.openSync(path.join(HERE, 'server-error.log'), 'a');
  spawn(process.execPath, [fileURLToPath(import.meta.url)], { cwd: HERE, detached: true, stdio: ['ignore', out, err], windowsHide: true }).unref();
  server.close(); setTimeout(() => process.exit(0), 200);
}
let tries = 0;
server.on('error', e => {
  if (e.code === 'EADDRINUSE' && tries++ < 40) return setTimeout(() => server.listen(PORT, '127.0.0.1'), 250);   // 旧的还没退干净，等一会儿
  throw e;
});
server.listen(PORT, '127.0.0.1', () => {
  console.log('JasperPeng 后台已启动： http://127.0.0.1:' + PORT + '/');
  console.log('网站文件夹：' + SITE);
  console.log('关掉这个窗口，后台就停止了。');
});
