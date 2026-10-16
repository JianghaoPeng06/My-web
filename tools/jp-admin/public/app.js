/* JasperPeng 后台 —— 界面逻辑（不依赖任何框架）
   数据都从本地服务器来：GET /api/state 拿全部文章；保存 PUT/POST /api/articles；图片 POST /api/images；生成页面 POST /api/build */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var LANGS = ['zh-Hans', 'zh-Hant', 'en', 'ja'];
  var BLOCKS = [
    ['p', '段落'], ['h2', '小标题'], ['h3', '更小的标题'], ['quote', '引用'], ['ul', '列表'], ['ol', '编号列表'],
    ['img', '图片'], ['figure', '封面图'], ['hr', '分隔线'], ['html', 'HTML（自己排版）']
  ];
  var S = null;                 // 服务器给的全部数据
  var cur = null;               // 正在编辑的文章（一份拷贝）
  var origSlug = null;          // 正在编辑的文章原来的地址；新文章是 null
  var dirty = false, needBuild = false, autoSlug = '', stamp = Date.now();   // autoSlug：上一次自动生成的地址
  var filter = { sec: 'all', q: '' };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function zh(o) { return (o && (o['zh-Hans'] || o.en)) || ''; }
  function api(method, url, body) {
    return fetch(url, { method: method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || ('出错了（' + r.status + '）')); return j; }); });
  }
  var toastT;
  function toast(msg, err) {
    var t = $('[data-toast]'); t.textContent = msg; t.hidden = false; t.classList.toggle('is-err', !!err);
    clearTimeout(toastT); toastT = setTimeout(function () { t.hidden = true; }, err ? 6000 : 3200);
  }
  function secOf(key) { return S.sections.find(function (s) { return s.key === key; }); }
  function img(path) { return path ? '/site/' + path + '?v=' + stamp : ''; }
  function today() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  // 英文标题 → 文章地址：去掉重音（é → e）、撇号，其余非字母数字换成短横线
  function slugify(t) {
    return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      .replace(/[’']/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48).replace(/-+$/, '');
  }
  function setNeedBuild(v) { needBuild = v; $('[data-build-hint]').hidden = !v; }

  /* ---------------- 读取 ---------------- */
  function load(keepSlug) {
    return api('GET', '/api/state').then(function (st) {
      S = st;
      renderFilters(); renderList();
      fillTagPick(); fillAuthors();
      if (keepSlug && !dirty) { var a = S.articles.find(function (x) { return x.slug === keepSlug; }); if (a) openArticle(a, true); }
      JPA.hooks.forEach(function (f) { f(S); });
    }).catch(function (e) { toast('读不到网站数据：' + e.message, true); });
  }

  /* ---------------- 左边：筛选和列表 ---------------- */
  function renderFilters() {
    var box = $('[data-sec-filter]');
    var items = [['all', '全部']].concat(S.sections.map(function (s) { return [s.key, zh(s.label)]; })).concat([['pin', '★ 置顶']]);
    box.innerHTML = items.map(function (x) { return '<button type="button" class="chip" data-k="' + x[0] + '" aria-pressed="' + (filter.sec === x[0]) + '">' + esc(x[1]) + '</button>'; }).join('');
  }
  $('[data-sec-filter]').addEventListener('click', function (e) {
    var b = e.target.closest('[data-k]'); if (!b) return;
    filter.sec = b.getAttribute('data-k'); renderFilters(); renderList();
  });
  $('[data-search]').addEventListener('input', function (e) { filter.q = e.target.value.trim().toLowerCase(); renderList(); });

  function catLabel(a) {
    var s = secOf(a.section); if (!s) return a.section;
    var c = s.cats.find(function (x) { return x.slug === a.cat; });
    return zh(s.label) + ' · ' + (c ? zh(c.label) : a.cat);
  }
  function matches(a) {
    if (filter.sec === 'pin' && !a.pin) return false;
    if (filter.sec !== 'all' && filter.sec !== 'pin' && a.section !== filter.sec) return false;
    if (!filter.q) return true;
    var hay = [a.slug, zh(a.title), zh(a.lede)].concat(LANGS.map(function (l) { return (a.title || {})[l]; }))
      .concat((a.tags || []).map(zh)).concat((a.body || []).map(function (b) { return Array.isArray(b.v) ? b.v.join(' ') : (b.v || b.cap || ''); })).join(' ').toLowerCase();
    return hay.indexOf(filter.q) >= 0;
  }
  function renderList() {
    var list = S.articles.filter(matches).slice().sort(function (x, y) { return y.date < x.date ? -1 : y.date > x.date ? 1 : 0; });
    $('[data-count]').textContent = '共 ' + list.length + ' 篇' + (list.length !== S.articles.length ? '（全部 ' + S.articles.length + ' 篇）' : '');
    $('[data-list]').innerHTML = list.map(function (a) {
      var on = cur && (origSlug === a.slug);
      var dots = [1, 2, 3, 4, 5].map(function (n) { return '<button type="button" data-w="' + n + '" class="' + (n <= a.weight ? 'is-on' : '') + '" title="推荐权重 ' + n + '"></button>'; }).join('');
      return '<li class="item' + (on ? ' is-on' : '') + '" data-slug="' + esc(a.slug) + '">' +
        '<span class="item__thumb" style="background-image:url(\'' + esc(img(a.images && a.images.cover)) + '\')"></span>' +
        '<span><span class="item__title" style="display:block">' + esc(zh(a.title) || a.slug) + '</span>' +
        '<span class="item__meta" style="display:block">' + esc(catLabel(a)) + ' · ' + esc(a.date) + '</span></span>' +
        '<span class="item__tools"><button type="button" class="star' + (a.pin ? ' is-on' : '') + '" data-pin title="' + (a.pin ? '取消置顶' : '置顶') + '">' + (a.pin ? '★' : '☆') + '</button>' +
        '<span class="dots">' + dots + '</span></span></li>';
    }).join('') || '<li class="empty" style="margin:40px auto">没有找到</li>';
  }
  $('[data-list]').addEventListener('click', function (e) {
    var li = e.target.closest('[data-slug]'); if (!li) return;
    var a = S.articles.find(function (x) { return x.slug === li.getAttribute('data-slug'); }); if (!a) return;
    if (e.target.closest('[data-pin]')) { e.stopPropagation(); return quick(a, { pin: !a.pin }); }
    var w = e.target.closest('[data-w]');
    if (w) { e.stopPropagation(); return quick(a, { weight: +w.getAttribute('data-w') }); }
    if (origSlug === a.slug) return;
    if (dirty && !confirm('这篇还有没保存的改动，确定要切换吗？（改动会丢掉）')) return;
    openArticle(a);
  });

  // 列表里直接点置顶、权重：马上保存
  function quick(a, patch) {
    if (cur && origSlug === a.slug) {             // 正好在编辑这篇：改到编辑器里，一起保存
      Object.keys(patch).forEach(function (k) { cur[k] = patch[k]; });
      fillMeta(); markDirty(); return save();
    }
    var b = clone(a); delete b.images; delete b.refs;
    Object.keys(patch).forEach(function (k) { b[k] = patch[k]; });
    api('PUT', '/api/articles/' + a.slug, { article: b }).then(function (saved) {
      replaceInState(a.slug, saved); renderList(); setNeedBuild(true);
      toast(patch.pin !== undefined ? (patch.pin ? '已置顶' : '已取消置顶') : '推荐权重改成 ' + patch.weight);
    }).catch(function (e) { toast(e.message, true); });
  }
  function replaceInState(oldSlug, saved) {
    var i = S.articles.findIndex(function (x) { return x.slug === oldSlug; });
    if (i >= 0) S.articles[i] = saved; else S.articles.unshift(saved);
  }

  /* ---------------- 打开 / 新建 ---------------- */
  function openArticle(a, quiet) {
    cur = clone(a); origSlug = a.slug; autoSlug = ''; menuKeep = null;
    cur.author = cur.author || 'JasperPeng';
    ['title', 'lede'].forEach(function (k) { cur[k] = cur[k] || {}; });
    cur.tags = cur.tags || []; cur.body = cur.body || [];
    showEditor(); dirty = false; updateState();
    if (!quiet) $('[data-main]').scrollTop = 0;
  }
  $('[data-new]').addEventListener('click', function () {
    if (dirty && !confirm('这篇还有没保存的改动，确定要新建吗？（改动会丢掉）')) return;
    var sec = filter.sec !== 'all' && filter.sec !== 'pin' ? secOf(filter.sec) : S.sections[0];
    cur = { slug: '', section: sec.key, cat: sec.cats[0].slug, date: today(), read: 1, weight: 3, pin: false, author: 'JasperPeng',
      title: {}, lede: {}, tags: [{ 'zh-Hans': zh(sec.label), 'zh-Hant': sec.label['zh-Hant'], en: sec.label.en, ja: sec.label.ja }],
      body: [{ t: 'p', v: '' }], images: { cover: null, extra: [] } };
    origSlug = null; autoSlug = ''; menuKeep = null;
    showEditor(); dirty = true; updateState();
    $('[data-main]').scrollTop = 0;
    $('.editor__title').focus();
  });

  function showEditor() {
    $('[data-empty]').hidden = true; $('[data-editor]').hidden = false;
    $('[data-preview]').hidden = false; document.querySelector('.layout').classList.remove('no-preview');
    // 板块
    $('[data-f="section"]').innerHTML = S.sections.map(function (s) { return '<option value="' + s.key + '">' + esc(zh(s.label)) + '</option>'; }).join('');
    fillCats();
    $$('[data-f]').forEach(function (el) {
      var v = getPath(cur, el.getAttribute('data-f'));
      if (el.type === 'checkbox') el.checked = !!v; else el.value = v == null ? '' : v;
    });
    fillMeta(); renderTags(); renderCover(); renderBlocks(); renderList(); preview();
    $('[data-delete]').hidden = !origSlug; $('[data-view]').hidden = !origSlug;
  }
  function fillCats() {
    var s = secOf(cur.section);
    $('[data-f="cat"]').innerHTML = s.cats.map(function (c) { return '<option value="' + c.slug + '">' + esc(zh(c.label)) + (c.link ? '（没有单独的分类页）' : '') + '</option>'; }).join('');
    if (!s.cats.some(function (c) { return c.slug === cur.cat; })) cur.cat = s.cats[0].slug;
    $('[data-f="cat"]').value = cur.cat;
  }
  /* 精选到顶部栏：cur.menu 是 true（用标题）、四语短名，或者没有（不精选）。
     关掉再打开时，刚才填的短名还在（menuKeep） */
  var menuKeep = null, MENU_MAX = 5;
  /* 同一板块里除了这篇以外已经占了几项（连同板块里手写的精选，比如角色板块的角色）。最多 5 项，服务器也会再卡一次 */
  function menuUsed() {
    var sec = secOf(cur.section);
    return (sec.feat || 0) + S.articles.filter(function (a) { return a.menu && a.section === cur.section && a.slug !== origSlug; }).length;
  }
  function fillMenu() {
    var on = !!cur.menu, m = cur.menu && cur.menu !== true ? cur.menu : (menuKeep || {});
    $('[data-menu-on]').checked = on;
    $('[data-menu-names]').hidden = !on;
    $('[data-menu-where]').textContent = '出现在顶栏「' + zh(secOf(cur.section).label) + '」下拉面板右边那一列（精选栏）· 这个板块已精选 ' + (menuUsed() + (on ? 1 : 0)) + ' / ' + MENU_MAX;
    $$('[data-menu-l]').forEach(function (el) {
      var k = el.getAttribute('data-menu-l');
      el.value = m[k] || '';
      el.placeholder = (k === 'zh-Hans' ? '顶栏里的名字，空着用标题：' : '') + ((cur.title || {})[k] || (cur.title || {})['zh-Hans'] || '');
    });
  }
  function readMenu() {
    var m = {}, any = false;
    $$('[data-menu-l]').forEach(function (el) { var v = el.value.trim(); if (v) { m[el.getAttribute('data-menu-l')] = v; any = true; } });
    return any ? m : true;
  }
  $('[data-menu-on]').addEventListener('change', function (e) {
    if (e.target.checked && menuUsed() >= MENU_MAX) {
      e.target.checked = false;
      return toast('「' + zh(secOf(cur.section).label) + '」的顶栏精选已经有 ' + MENU_MAX + ' 项了，先在别的文章上关掉一个', true);
    }
    if (e.target.checked) cur.menu = menuKeep || true;
    else { menuKeep = cur.menu && cur.menu !== true ? cur.menu : null; delete cur.menu; }
    fillMenu(); markDirty();
  });
  $('[data-menu-names]').addEventListener('input', function () { cur.menu = readMenu(); markDirty(); });

  function fillMeta() {
    fillMenu();
    $('[data-f="pin"]').checked = !!cur.pin;
    $('[data-weight]').innerHTML = [1, 2, 3, 4, 5].map(function (n) { return '<button type="button" data-n="' + n + '" aria-pressed="' + (cur.weight === n) + '">' + n + '</button>'; }).join('');
  }
  function getPath(o, p) { return p.split('.').reduce(function (x, k) { return x == null ? x : x[k]; }, o); }
  function setPath(o, p, v) { var ks = p.split('.'), last = ks.pop(); var t = ks.reduce(function (x, k) { return x[k] = x[k] || {}; }, o); t[last] = v; }

  function markDirty() { dirty = true; updateState(); schedulePreview(); }
  function updateState() {
    var el = $('[data-state]');
    el.textContent = dirty ? (origSlug ? '有改动没保存' : '新文章，还没保存') : '已保存';
    el.classList.toggle('is-dirty', dirty);
  }

  // 普通字段：输入就写进 cur
  $('[data-editor]').addEventListener('input', function (e) {
    var el = e.target, f = el.getAttribute('data-f');
    if (!f) return;
    var v = el.type === 'checkbox' ? el.checked : el.type === 'number' ? +el.value : el.value;
    setPath(cur, f, v);
    if (f === 'slug') el.classList.toggle('is-bad', !!el.value && !/^[a-z0-9][a-z0-9-]*$/.test(el.value));
    // 新文章：地址框空着、或者还是上次自动生成的那个，就跟着英文标题走；自己改过就不动它
    if (f === 'title.en' && !origSlug && (!cur.slug || cur.slug === autoSlug)) {
      cur.slug = autoSlug = slugify(el.value);
      $('[data-f="slug"]').value = cur.slug; $('[data-f="slug"]').classList.remove('is-bad');
    }
    markDirty();
  });
  $('[data-editor]').addEventListener('change', function (e) {
    var f = e.target.getAttribute('data-f');
    if (f === 'section') { cur.section = e.target.value; fillCats(); fillMenu(); markDirty(); }
    if (f === 'cat') { cur.cat = e.target.value; markDirty(); }
    if (f === 'pin') { cur.pin = e.target.checked; markDirty(); }
  });
  $('[data-slug-gen]').addEventListener('click', function () {
    var en = (cur.title || {}).en || '';
    if (!en.trim()) { toast('先在「标题和导语」里填英文标题，再点生成', true); $('[data-f="title.en"]').focus(); return; }
    var s = slugify(en);
    if (!s) { toast('英文标题里没有英文字母或数字，生成不了，请手动填地址', true); return; }
    if (s === cur.slug) return toast('地址已经是 ' + s + ' 了');
    if (origSlug && !confirm('把文章地址从 ' + origSlug + ' 改成 ' + s + '？\n\n保存后旧链接会失效（别人收藏或分享过的旧地址会打不开），图片会跟着改名。')) return;
    cur.slug = autoSlug = s; $('[data-f="slug"]').value = s; $('[data-f="slug"]').classList.remove('is-bad');
    markDirty(); toast('地址生成好了：' + s + (origSlug ? '，记得保存' : ''));
  });
  $('[data-weight]').addEventListener('click', function (e) {
    var b = e.target.closest('[data-n]'); if (!b) return;
    cur.weight = +b.getAttribute('data-n'); fillMeta(); markDirty();
  });
  $('[data-estimate]').addEventListener('click', function () {
    var text = cur.body.map(function (b) { return Array.isArray(b.v) ? b.v.join('') : (b.t === 'html' ? String(b.v || '').replace(/<[^>]+>/g, '') : (b.v || '')); }).join('');
    var cjk = (text.match(/[㐀-鿿぀-ヿ]/g) || []).length;
    var words = (text.replace(/[㐀-鿿぀-ヿ]/g, ' ').match(/[A-Za-z0-9]+/g) || []).length;
    var n = Math.max(1, Math.round(cjk / 400 + words / 200 + cur.body.filter(function (b) { return b.t === 'img' || b.t === 'figure'; }).length * 0.2));
    cur.read = n; $('[data-f="read"]').value = n; markDirty();
    toast('按正文估算：大约 ' + n + ' 分钟');
  });

  /* ---------------- 标签 ---------------- */
  function renderTags() {
    $('[data-tags]').innerHTML = cur.tags.map(function (t, i) { return '<button type="button" class="tag" data-i="' + i + '">' + esc(zh(t)) + '</button>'; }).join('') ||
      '<span class="muted">还没有标签</span>';
  }
  function fillAuthors() {
    var seen = {}; S.articles.forEach(function (a) { seen[a.author || 'JasperPeng'] = 1; }); seen.JasperPeng = 1;
    $('[data-author-list]').innerHTML = Object.keys(seen).map(function (n) { return '<option value="' + esc(n) + '">'; }).join('');
  }
  function fillTagPick() {
    $('[data-tag-pick]').innerHTML = '<option value="">从用过的标签里加…</option>' +
      S.tags.map(function (t, i) { return '<option value="' + i + '">' + esc(zh(t)) + '</option>'; }).join('');
  }
  $('[data-tag-pick]').addEventListener('change', function (e) {
    var t = S.tags[+e.target.value]; e.target.value = '';
    if (!t || !cur) return;
    if (cur.tags.some(function (x) { return zh(x) === zh(t); })) return toast('已经有这个标签了');
    cur.tags.push(clone(t)); renderTags(); markDirty();
  });
  var tagIdx = -1;
  function editTag(i) {
    tagIdx = i; var t = i >= 0 ? cur.tags[i] : {};
    $$('[data-tag-dlg] [data-t]').forEach(function (el) { el.value = t[el.getAttribute('data-t')] || ''; });
    $('[data-tag-remove]').hidden = i < 0;
    $('[data-tag-dlg]').showModal(); $('[data-tag-dlg] [data-t="zh-Hans"]').focus();
  }
  $('[data-tags]').addEventListener('click', function (e) { var b = e.target.closest('[data-i]'); if (b) editTag(+b.getAttribute('data-i')); });
  $('[data-tag-new]').addEventListener('click', function () { editTag(-1); });
  $('[data-tag-ok]').addEventListener('click', function () {
    var t = {}; $$('[data-tag-dlg] [data-t]').forEach(function (el) { var v = el.value.trim(); if (v) t[el.getAttribute('data-t')] = v; });
    if (!t['zh-Hans']) return toast('简体不能空着', true);
    if (tagIdx >= 0) cur.tags[tagIdx] = t; else cur.tags.push(t);
    $('[data-tag-dlg]').close(); renderTags(); markDirty();
  });
  $('[data-tag-remove]').addEventListener('click', function () { cur.tags.splice(tagIdx, 1); $('[data-tag-dlg]').close(); renderTags(); markDirty(); });

  /* ---------------- 图片 ---------------- */
  function readAsDataURL(blob) { return new Promise(function (ok, no) { var r = new FileReader(); r.onload = function () { ok(r.result); }; r.onerror = no; r.readAsDataURL(blob); }); }
  // 长边缩到 2000 以内；带透明的存 PNG（透明保留），不带的存 JPG；GIF（可能是动图）和勾了「保持原图」的原样
  function prepImage(file, opts) {
    opts = opts || {};
    var raw = !!opts.raw, max = opts.max || 2000;
    var extOf = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };
    if (!extOf[file.type]) return Promise.reject(new Error('只支持 PNG / JPG / WebP / GIF 图片'));
    if (raw || file.type === 'image/gif') return readAsDataURL(file).then(function (d) { return { ext: extOf[file.type], data: d }; });
    return createImageBitmap(file).then(function (bm) {
      var k = Math.min(1, max / Math.max(bm.width, bm.height));
      var w = Math.round(bm.width * k), h = Math.round(bm.height * k);
      var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      var cx = cv.getContext('2d'); cx.drawImage(bm, 0, 0, w, h);
      var alpha = false;
      if (file.type !== 'image/jpeg') {
        var px = cx.getImageData(0, 0, w, h).data;
        for (var i = 3; i < px.length; i += 4) if (px[i] < 250) { alpha = true; break; }
      }
      // 没缩放的 JPG 就不重新压一遍了，免得越存越糊
      if (k === 1 && file.type === 'image/jpeg' && file.size < 1.5 * 1024 * 1024) return readAsDataURL(file).then(function (d) { return { ext: 'jpg', data: d }; });
      if (!alpha) { var fill = document.createElement('canvas'); fill.width = w; fill.height = h; var fx = fill.getContext('2d'); fx.fillStyle = '#fff'; fx.fillRect(0, 0, w, h); fx.drawImage(cv, 0, 0); cv = fill; }
      return { ext: alpha ? 'png' : 'jpg', data: cv.toDataURL(alpha ? 'image/png' : 'image/jpeg', 0.86) };
    });
  }
  function upload(file, kind) {
    if (!cur.slug || !/^[a-z0-9][a-z0-9-]*$/.test(cur.slug)) return Promise.reject(new Error('先在「基本信息」里填好文章地址，再加图片'));
    var dir = secOf(cur.section).dir;
    return prepImage(file, { raw: $('[data-raw]').checked }).then(function (p) {
      return api('POST', '/api/images', { dir: dir, slug: cur.slug, kind: kind, ext: p.ext, data: p.data });
    }).then(function (r) { stamp = Date.now(); setNeedBuild(true); return r.src; });
  }
  function bindDrop(el, onFile) {
    var input = $('input[type=file]', el);
    input.addEventListener('change', function () { if (input.files[0]) onFile(input.files[0]); input.value = ''; });
    el.addEventListener('dragover', function (e) { e.preventDefault(); el.classList.add('is-over'); });
    el.addEventListener('dragleave', function () { el.classList.remove('is-over'); });
    el.addEventListener('drop', function (e) { e.preventDefault(); el.classList.remove('is-over'); var f = e.dataTransfer.files[0]; if (f) onFile(f); });
  }
  function renderCover() {
    var c = cur.images && cur.images.cover, box = $('[data-cover]');
    box.style.backgroundImage = c ? 'url("' + img(c) + '")' : '';
    box.innerHTML = !c ? '<em>还没有封面</em>' : (cur.images.coverIsPlaceholder ? '<em>现在是占位图</em>' : '');
  }
  bindDrop($('[data-drop="cover"]'), function (file) {
    var d = $('[data-drop="cover"]'); d.classList.add('is-busy');
    upload(file, 'cover').then(function (src) {
      cur.images = cur.images || { extra: [] }; cur.images.cover = src; cur.images.coverIsPlaceholder = false;
      renderCover(); preview();
      var a = S.articles.find(function (x) { return x.slug === origSlug; }); if (a) { a.images.cover = src; a.images.coverIsPlaceholder = false; renderList(); }
      toast('封面换好了' + (origSlug ? '' : '，记得保存文章'));
    }).catch(function (e) { toast(e.message, true); }).then(function () { d.classList.remove('is-busy'); });
  });

  /* ---------------- 正文块 ---------------- */
  function blockTypeSelect(t) {
    return '<select class="field blk__type" data-act="type">' + BLOCKS.map(function (b) { return '<option value="' + b[0] + '"' + (b[0] === t ? ' selected' : '') + '>' + b[1] + '</option>'; }).join('') + '</select>';
  }
  // 文字块的颜色、字体：只给设计规范里的几种（网站 main.js 的 blockCls、style.css 的 .tc-* / .tf-* 认这些值）
  var TEXT_T = ['p', 'h2', 'h3', 'quote', 'ul', 'ol'];
  var COLORS = [['', '默认颜色'], ['ink', '墨色（标题色）'], ['body', '正文灰'], ['muted', '说明灰'], ['tea', '茶芽（主题色）'], ['dusk', '暮蓝'],
    ['wisteria', '藤紫（大字）'], ['jam', '莓红（大字）']];
  var FONTS = [['', '默认字体'], ['sans', '无衬线 Google Sans'], ['serif', '衬线 Georgia'], ['mono', '等宽（数字、代码）'], ['deco', '装饰 Kawoszeh（大字）']];
  var BIG_ONLY = ['wisteria', 'jam'];         // 对比度只够大字：只给小标题和装饰大字
  function decoOK(t) { return t === 'p' || t === 'quote'; }
  function isBig(b) { return b.t === 'h2' || b.t === 'h3' || (b.f === 'deco' && decoOK(b.t)); }
  function styleSelects(b) {
    if (TEXT_T.indexOf(b.t) < 0) return '';
    var opt = function (list, val) {
      return list.filter(function (x) { return (x[0] !== 'deco' || decoOK(b.t)) && (BIG_ONLY.indexOf(x[0]) < 0 || isBig(b)); })
        .map(function (x) { return '<option value="' + x[0] + '"' + ((val || '') === x[0] ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('');
    };
    return '<select class="field blk__type blk__sty" data-act="c" title="文字颜色">' + opt(COLORS, b.c) + '</select>' +
           '<select class="field blk__type blk__sty" data-act="f" title="字体">' + opt(FONTS, b.f) + '</select>';
  }
  function blockBody(b) {
    switch (b.t) {
      case 'hr': return '<div class="blk__hr"></div>';
      case 'ul': case 'ol':
        return '<textarea class="field" data-k="v" rows="3" placeholder="一行一项">' + esc((b.v || []).join('\n')) + '</textarea>';
      case 'figure':
        return '<input class="field" data-k="cap" placeholder="图注（可以不写）" value="' + esc(b.cap || '') + '"><p class="blk__help">这里显示文章的封面图。想放别的图，把类型换成「图片」。</p>';
      case 'img':
        return '<div class="blk__img"><div class="thumb" style="background-image:url(\'' + esc(img(b.src)) + '\')"></div><div class="col">' +
          '<label class="drop"><input type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden><strong>' + (b.src ? '换一张' : '选图片') + '</strong><span>点这里，或者把图片拖进来</span></label>' +
          '<input class="field" data-k="cap" placeholder="图注（显示在图片下面，可以不写）" value="' + esc(b.cap || '') + '"></div></div>';
      case 'html':
        return '<textarea class="field" data-k="v" rows="4" placeholder="<div class=&quot;…&quot;>原样输出的 HTML</div>">' + esc(b.v || '') + '</textarea><p class="blk__help">原样放进页面，不转义，可以写任何标签和 class。</p>';
      default:
        var ph = { p: '写一段话…', h2: '小标题', h3: '更小的标题', quote: '引用的一句话' }[b.t] || '';
        return '<textarea class="field" data-k="v" rows="' + (b.t === 'p' ? 3 : 1) + '" placeholder="' + ph + '">' + esc(b.v || '') + '</textarea>';
    }
  }
  function renderBlocks() {
    $('[data-blocks]').innerHTML = cur.body.map(function (b, i) {
      return '<div class="blk" data-i="' + i + '" data-t="' + b.t + '"' + (b.c ? ' data-color="' + b.c + '"' : '') + (b.f ? ' data-font="' + b.f + '"' : '') + '><span class="blk__grip" title="按住拖动">⋮⋮</span><div>' +
        '<div class="blk__head">' + blockTypeSelect(b.t) + styleSelects(b) + '<span class="spacer"></span>' +
        '<button type="button" class="ib" data-act="up" title="上移">↑</button><button type="button" class="ib" data-act="down" title="下移">↓</button>' +
        '<button type="button" class="ib" data-act="add" title="在下面加一段">＋</button><button type="button" class="ib ib--del" data-act="del" title="删掉这一块">✕</button></div>' +
        blockBody(b) +
        (b.f === 'deco' ? '<p class="blk__help">装饰字体：会放大到宣言字号（32–64px）。它只有英文字形，中文会显示成大号黑体 —— 规范里只用于英文的谚语、哲理、宣言句子。</p>' : '') +
        '</div></div>';
    }).join('') || '<p class="muted">正文是空的，用下面的按钮加内容。</p>';
    $$('[data-blocks] .blk').forEach(function (el) {
      var i = +el.getAttribute('data-i');
      var drop = $('.drop', el);
      if (drop) bindDrop(drop, function (file) {
        drop.classList.add('is-busy');
        upload(file, 'extra').then(function (src) { cur.body[i].src = src; renderBlocks(); markDirty(); toast('图片放好了'); })
          .catch(function (e) { toast(e.message, true); drop.classList.remove('is-busy'); });
      });
      $$('textarea', el).forEach(autosize);
    });
  }
  function autosize(t) { t.style.height = 'auto'; t.style.height = Math.max(t.scrollHeight + 2, 38) + 'px'; }
  function newBlock(t) {
    return t === 'hr' ? { t: 'hr' } : t === 'ul' || t === 'ol' ? { t: t, v: [] } : t === 'figure' ? { t: 'figure', cap: '' } : t === 'img' ? { t: 'img', src: '', cap: '' } : { t: t, v: '' };
  }
  $('[data-adder]').innerHTML = '<span>加一块：</span>' + BLOCKS.map(function (b) { return '<button type="button" class="btn btn--ghost btn--sm" data-add="' + b[0] + '">' + b[1] + '</button>'; }).join('');
  $('[data-adder]').addEventListener('click', function (e) {
    var b = e.target.closest('[data-add]'); if (!b) return;
    cur.body.push(newBlock(b.getAttribute('data-add'))); renderBlocks(); markDirty();
    var last = $('[data-blocks] .blk:last-child textarea, [data-blocks] .blk:last-child input'); if (last) last.focus();
  });
  var blocksBox = $('[data-blocks]');
  blocksBox.addEventListener('input', function (e) {
    var blk = e.target.closest('.blk'), k = e.target.getAttribute('data-k'); if (!blk || !k) return;
    var b = cur.body[+blk.getAttribute('data-i')];
    b[k] = (b.t === 'ul' || b.t === 'ol') && k === 'v' ? e.target.value.split('\n') : e.target.value;
    if (e.target.tagName === 'TEXTAREA') autosize(e.target);
    markDirty();
  });
  blocksBox.addEventListener('change', function (e) {
    var act = e.target.getAttribute('data-act');
    if (act === 'c' || act === 'f') {
      var bb = cur.body[+e.target.closest('.blk').getAttribute('data-i')];
      if (e.target.value) bb[act] = e.target.value; else delete bb[act];
      if (BIG_ONLY.indexOf(bb.c) >= 0 && !isBig(bb)) { delete bb.c; toast('藤紫、莓红只给小标题和装饰大字，这一块的颜色改回默认了'); }
      renderBlocks(); markDirty(); return;
    }
    if (act !== 'type') return;
    var i = +e.target.closest('.blk').getAttribute('data-i'), old = cur.body[i], t = e.target.value;
    var text = Array.isArray(old.v) ? old.v.join('\n') : (old.v || old.cap || '');
    var nb = newBlock(t);
    if (t === 'ul' || t === 'ol') nb.v = text ? text.split('\n') : [];
    else if (t === 'figure' || t === 'img') { nb.cap = old.cap || ''; if (old.src) nb.src = old.src; }
    else if (t !== 'hr') nb.v = text;
    // 换成别的文字块时颜色、字体跟着走（装饰字体只留在段落、引用上）
    if (TEXT_T.indexOf(t) >= 0) {
      if (old.f && (old.f !== 'deco' || decoOK(t))) nb.f = old.f;
      if (old.c && (BIG_ONLY.indexOf(old.c) < 0 || isBig(nb))) nb.c = old.c;
    }
    cur.body[i] = nb; renderBlocks(); markDirty();
  });
  blocksBox.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b || b.tagName === 'SELECT') return;
    var i = +b.closest('.blk').getAttribute('data-i'), act = b.getAttribute('data-act'), arr = cur.body;
    if (act === 'up' && i > 0) arr.splice(i - 1, 0, arr.splice(i, 1)[0]);
    else if (act === 'down' && i < arr.length - 1) arr.splice(i + 1, 0, arr.splice(i, 1)[0]);
    else if (act === 'add') arr.splice(i + 1, 0, newBlock('p'));
    else if (act === 'del') {
      var v = arr[i]; var has = Array.isArray(v.v) ? v.v.join('').trim() : String(v.v || v.cap || v.src || '').trim();
      if (has && !confirm('删掉这一块？')) return;
      arr.splice(i, 1);
    } else return;
    renderBlocks(); markDirty();
    if (act === 'add') { var t = $('[data-blocks] .blk[data-i="' + (i + 1) + '"] textarea'); if (t) t.focus(); }
  });
  // 粘贴一大段带空行的文字：自动拆成几段
  blocksBox.addEventListener('paste', function (e) {
    var ta = e.target; if (ta.tagName !== 'TEXTAREA') return;
    var blk = ta.closest('.blk'), i = +blk.getAttribute('data-i'), b = cur.body[i];
    if (b.t !== 'p') return;
    var text = (e.clipboardData || window.clipboardData).getData('text');
    var parts = text.replace(/\r/g, '').split(/\n\s*\n+/).map(function (s) { return s.replace(/\n/g, '').trim(); }).filter(Boolean);
    if (parts.length < 2) return;
    e.preventDefault();
    var before = ta.value.slice(0, ta.selectionStart), after = ta.value.slice(ta.selectionEnd);
    b.v = before + parts[0];
    var adds = parts.slice(1).map(function (p) { return { t: 'p', v: p }; });
    adds[adds.length - 1].v += after;
    Array.prototype.splice.apply(cur.body, [i + 1, 0].concat(adds));
    renderBlocks(); markDirty(); toast('拆成了 ' + parts.length + ' 段');
  });
  // 拖动换顺序：只有按住左边的点点时才能拖，免得选字的时候拖走
  var dragFrom = -1;
  blocksBox.addEventListener('mousedown', function (e) { var g = e.target.closest('.blk__grip'); if (g) g.parentNode.draggable = true; });
  blocksBox.addEventListener('dragstart', function (e) { var blk = e.target.closest('.blk'); if (!blk) return; dragFrom = +blk.getAttribute('data-i'); blk.classList.add('is-drag'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', ''); });
  blocksBox.addEventListener('dragover', function (e) { if (dragFrom < 0) return; e.preventDefault(); var blk = e.target.closest('.blk'); $$('.blk.is-over').forEach(function (x) { x.classList.remove('is-over'); }); if (blk) blk.classList.add('is-over'); });
  blocksBox.addEventListener('drop', function (e) {
    if (dragFrom < 0) return; e.preventDefault();
    var blk = e.target.closest('.blk'); var to = blk ? +blk.getAttribute('data-i') : cur.body.length - 1;
    if (to !== dragFrom) { var it = cur.body.splice(dragFrom, 1)[0]; cur.body.splice(to, 0, it); markDirty(); }
    dragFrom = -1; renderBlocks();
  });
  blocksBox.addEventListener('dragend', function () { dragFrom = -1; $$('.blk').forEach(function (x) { x.classList.remove('is-drag', 'is-over'); x.draggable = false; }); });

  /* ---------------- 预览（用网站自己的 style.css） ---------------- */
  var pvT;
  function schedulePreview() { clearTimeout(pvT); pvT = setTimeout(preview, 250); }
  function fmtDate(d) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || ''); return m ? (+m[1]) + '年' + (+m[2]) + '月' + (+m[3]) + '日' : d; }
  function bodyHTML() {
    var title = zh(cur.title);
    return cur.body.map(function (b) {
      // 和网站 main.js 的 blockCls 一样
      var cl = [];
      if (b.c && (BIG_ONLY.indexOf(b.c) < 0 || isBig(b))) cl.push('tc-' + b.c);
      if (b.f && (b.f !== 'deco' || decoOK(b.t))) cl.push('tf-' + b.f);
      var k = cl.length ? ' class="' + cl.join(' ') + '"' : '';
      switch (b.t) {
        case 'p': return '<p' + k + '>' + esc(b.v) + '</p>';
        case 'h2': return '<h2' + k + '>' + esc(b.v) + '</h2>';
        case 'h3': return '<h3' + k + '>' + esc(b.v) + '</h3>';
        case 'quote': return '<blockquote' + k + '>' + esc(b.v) + '</blockquote>';
        case 'hr': return '<hr>';
        case 'html': return b.v || '';
        case 'ul': case 'ol': return '<' + b.t + k + '>' + (b.v || []).filter(function (x) { return String(x).trim(); }).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</' + b.t + '>';
        case 'img': case 'figure':
          var src = b.t === 'img' ? b.src : (cur.images && cur.images.cover);
          if (!src) return '<figure class="fig"><span class="fig__media" style="aspect-ratio:4/3;display:grid;place-items:center;color:#87867F;font-size:14px">' + (b.t === 'img' ? '还没选图片' : '还没有封面') + '</span></figure>';
          return '<figure class="fig"><span class="fig__media"><img src="' + esc(img(src)) + '" alt="' + esc(b.cap || title) + '"></span>' + (b.cap ? '<figcaption>' + esc(b.cap) + '</figcaption>' : '') + '</figure>';
      }
      return '';
    }).join('');
  }
  function preview() {
    if (!cur) return;
    var s = secOf(cur.section), c = s && s.cats.find(function (x) { return x.slug === cur.cat; });
    var html = '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<link rel="stylesheet" href="/site/css/style.css"><style>body{margin:0}.article__head{padding-top:40px}</style></head>' +
      '<body data-page="article"><main id="main"><article>' +
      '<header class="article__head read"><p class="article__kicker"><time>' + esc(fmtDate(cur.date)) + '</time><a>' + esc(c ? zh(c.label) : '') + '</a></p>' +
      '<h1 class="article__title">' + esc(zh(cur.title) || '（还没写标题）') + '</h1>' +
      (zh(cur.lede) ? '<p class="article__lede">' + esc(zh(cur.lede)) + '</p>' : '') +
      '<p class="article__meta"><span>' + esc(cur.read) + ' 分钟阅读</span></p></header>' +
      '<div class="article__body read">' + bodyHTML() + '</div>' +
      '<aside class="article__foot wrap"><div class="read">' +
      (cur.tags.length ? '<div class="article__tags">' + cur.tags.map(function (t) { return '<span class="article__tag">' + esc(zh(t)) + '</span>'; }).join('') + '</div>' : '') +
      '<p class="article__foot-label">作者</p><p class="article__author">' + esc((cur.author || '').trim() || 'JasperPeng') + '</p></div></aside>' +
      '</article></main></body></html>';
    var f = $('[data-frame]'), y = 0;
    try { y = f.contentWindow.scrollY; } catch (e) {}
    f.onload = function () { try { f.contentWindow.scrollTo(0, y); } catch (e) {} };
    f.srcdoc = html;
  }
  $('[data-pv-size]').addEventListener('click', function (e) {
    var b = e.target.closest('[data-w]'); if (!b) return;
    $$('[data-pv-size] button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    $('[data-frame]').style.width = b.getAttribute('data-w');
  });

  /* ---------------- 保存、删除 ---------------- */
  function save() {
    if (!cur) return Promise.resolve();
    if (!zh(cur.title).trim()) { toast('先写个标题', true); $('.editor__title').focus(); return Promise.resolve(); }
    if (!/^[a-z0-9][a-z0-9-]*$/.test(cur.slug || '')) { toast('文章地址只能用小写英文字母、数字和短横线', true); $('[data-f="slug"]').focus(); return Promise.resolve(); }
    var bad = cur.body.findIndex(function (b) { return b.t === 'img' && !b.src; });
    if (bad >= 0) { toast('第 ' + (bad + 1) + ' 块是图片但还没选图，选一张或者删掉这一块', true); return Promise.resolve(); }
    var body = clone(cur); delete body.images; delete body.refs;
    body.body = body.body.map(function (b) { if (b.t === 'ul' || b.t === 'ol') b.v = (b.v || []).filter(function (x) { return String(x).trim(); }); return b; });
    var btn = $('[data-save]'); btn.disabled = true;
    var req = origSlug ? api('PUT', '/api/articles/' + origSlug, { article: body }) : api('POST', '/api/articles', { article: body });
    return req.then(function (saved) {
      replaceInState(origSlug || saved.slug, saved);
      if (!origSlug) S.articles.sort(function () { return 0; });
      cur = clone(saved); origSlug = saved.slug; autoSlug = '';
      cur.author = cur.author || 'JasperPeng';
      dirty = false; updateState(); setNeedBuild(true);
      $('[data-delete]').hidden = false; $('[data-view]').hidden = false;
      renderList(); renderCover(); renderBlocks(); preview();
      toast('保存好了。全部改完后点右上角「生成页面」');
    }).catch(function (e) { toast(e.message, true); }).then(function () { btn.disabled = false; });
  }
  $('[data-editor]').addEventListener('submit', function (e) { e.preventDefault(); save(); });
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      if (JPA.tab === 'articles') { if (cur) save(); } else if (JPA.save[JPA.tab]) JPA.save[JPA.tab]();
    }
  });
  $('[data-delete]').addEventListener('click', function () {
    if (!origSlug) return;
    if (!confirm('确定删除「' + zh(cur.title) + '」吗？\n\n文章会从网站上去掉。它的封面和插图也会一起删掉。')) return;
    api('DELETE', '/api/articles/' + origSlug).then(function () {
      S.articles = S.articles.filter(function (x) { return x.slug !== origSlug; });
      cur = null; origSlug = null; dirty = false;
      $('[data-editor]').hidden = true; $('[data-empty]').hidden = false; $('[data-preview]').hidden = true;
      document.querySelector('.layout').classList.add('no-preview');
      renderList(); setNeedBuild(true); toast('删掉了');
    }).catch(function (e) { toast(e.message, true); });
  });
  $('[data-view]').addEventListener('click', function () {
    if (needBuild) toast('提醒：还没「生成页面」，网站预览里可能还是旧的');
    window.open('/site/articles/' + origSlug + '/', '_blank');
  });
  window.addEventListener('beforeunload', function (e) { if (anyDirty()) { e.preventDefault(); e.returnValue = ''; } });

  /* ---------------- 生成页面 ---------------- */
  $$('[data-open-site]').forEach(function (b) { b.addEventListener('click', function () { window.open('/site/home.html', '_blank'); }); });
  $('[data-build]').addEventListener('click', function () {
    if (anyDirty() && !confirm('还有没保存的改动（' + anyDirty() + '）。先不管它，直接生成页面吗？')) return;
    var dlg = $('[data-build-dlg]');
    $('[data-build-title]').textContent = '正在生成页面…（十几秒）';
    $('[data-build-log]').textContent = ''; $('[data-build-next]').hidden = true;
    dlg.showModal();
    var btn = $('[data-build]'); btn.disabled = true;
    api('POST', '/api/build').then(function (r) {
      $('[data-build-title]').textContent = r.ok ? '页面生成好了' : '生成的时候出错了';
      $('[data-build-log]').textContent = r.log || '';
      $('[data-build-next]').hidden = !r.ok;
      if (r.ok) { setNeedBuild(false); stamp = Date.now(); load(origSlug); }
    }).catch(function (e) { $('[data-build-title]').textContent = '生成的时候出错了'; $('[data-build-log]').textContent = e.message; })
      .then(function () { btn.disabled = false; });
  });
  $$('[data-close]').forEach(function (b) { b.addEventListener('click', function () { b.closest('dialog').close(); }); });

  // 告诉服务器「窗口还开着」；关掉窗口两分钟后服务器自己退出
  /* 打招呼。后台程序更新过会自动重启（服务器那边），这里发现程序换了就把界面也刷新成新的；有没保存的改动就先提醒，不自动刷 */
  var codeSeen = null, missed = 0;
  function ping() {
    fetch('/api/ping').then(function (r) { return r.json(); }).then(function (d) {
      missed = 0;
      if (!d.code) return;                                   // 正在重启（503），下一次再看
      if (codeSeen && d.code !== codeSeen) {
        if (anyDirty()) return toast('后台更新过了：先保存手上的改动，然后按 F5 刷新一下', true);
        location.reload(); return;
      }
      codeSeen = d.code;
    }).catch(function () { if (++missed >= 2) toast('后台服务停了。关掉这个窗口，再双击桌面上的「JasperPeng 后台」重新打开', true); });
  }
  ping(); setInterval(ping, 15000);

  /* ---------------- 顶上的「文章 / 角色 / 首页海报」 ---------------- */
  function anyDirty() {
    var out = [];
    if (dirty) out.push('文章');
    Object.keys(JPA.dirty).forEach(function (k) { if (JPA.dirty[k]()) out.push(k); });
    return out.join('、');
  }
  $$('[data-tab]').forEach(function (b) {
    b.addEventListener('click', function () {
      var t = b.getAttribute('data-tab'); JPA.tab = t;
      $$('[data-tab]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      $$('[data-pane]').forEach(function (p) { p.hidden = p.getAttribute('data-pane') !== t; });
    });
  });

  // 给 chars.js、poster.js 用的公共工具
  window.JPA = {
    $: $, $$: $$, esc: esc, clone: clone, zh: zh, api: api, toast: toast, img: img, LANGS: LANGS,
    prepImage: prepImage, bindDrop: bindDrop, readAsDataURL: readAsDataURL, autosize: autosize,
    setNeedBuild: setNeedBuild, bump: function () { stamp = Date.now(); },
    state: function () { return S; },
    tab: 'articles', hooks: [], save: {}, dirty: {}
  };
  var JPA = window.JPA;

  load();
})();
