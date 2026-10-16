/* JasperPeng 后台 —— 角色（data.js 里的 CHARACTERS）
   GET /api/state 的 characters；保存 PUT/POST /api/characters；顺序 PUT /api/characters/order；立绘走 /api/images（kind: 'art'） */
(function () {
  'use strict';
  var J = window.JPA, $ = J.$, $$ = J.$$, esc = J.esc, zh = J.zh;
  var LANGS = J.LANGS;
  // 表格里的四语字段（名字的简体在最上面那个大输入框里）
  var ROWS = [['name', '名字'], ['region', '地图（区域）'], ['role', '身份'], ['age', '年龄'], ['sex', '性别'], ['quote', '台词']];
  var LANG_NAME = { 'zh-Hans': '简体', 'zh-Hant': '繁體', en: 'English', ja: '日本語' };
  var cur = null, origSlug = null, dirty = false;

  function S() { return J.state(); }
  function list() { return S().characters; }
  function blank() { var o = {}; LANGS.forEach(function (l) { o[l] = ''; }); return o; }
  function getPath(o, p) { return p.split('.').reduce(function (x, k) { return x == null ? x : x[k]; }, o); }
  function setPath(o, p, v) { var ks = p.split('.'), last = ks.pop(); var t = ks.reduce(function (x, k) { return x[k] = x[k] || {}; }, o); t[last] = v; }
  function T(o) { return (o && (o['zh-Hans'] || '')) || ''; }
  function about() { return S().sections.find(function (s) { return s.key === 'about'; }); }

  /* ---------------- 左边：列表 ---------------- */
  function renderList() {
    var all = list();
    $('[data-c-count]').textContent = '共 ' + all.length + ' 个角色';
    $('[data-c-list]').innerHTML = all.map(function (c, i) {
      return '<li class="item' + (origSlug === c.slug ? ' is-on' : '') + '" data-slug="' + esc(c.slug) + '">' +
        '<span class="item__thumb item__thumb--art" style="background-image:url(\'' + esc(J.img(c.art && c.art.src)) + '\')"></span>' +
        '<span><span class="item__title" style="display:block">' + esc(T(c.name) || c.slug) + '</span>' +
        '<span class="item__meta" style="display:block">' + esc([T(c.role), c.year, c.version].filter(Boolean).join(' · ')) + '</span></span>' +
        '<span class="item__tools item__tools--row"><button type="button" class="ib" data-move="-1" title="往前挪"' + (i === 0 ? ' disabled' : '') + '>↑</button>' +
        '<button type="button" class="ib" data-move="1" title="往后挪"' + (i === all.length - 1 ? ' disabled' : '') + '>↓</button></span></li>';
    }).join('');
  }
  $('[data-c-list]').addEventListener('click', function (e) {
    var li = e.target.closest('[data-slug]'); if (!li) return;
    var slug = li.getAttribute('data-slug');
    var mv = e.target.closest('[data-move]');
    if (mv) { e.stopPropagation(); return move(slug, +mv.getAttribute('data-move')); }
    if (origSlug === slug) return;
    if (dirty && !confirm('这个角色还有没保存的改动，确定要切换吗？（改动会丢掉）')) return;
    open(list().find(function (x) { return x.slug === slug; }));
  });
  function move(slug, d) {
    var arr = list().slice(), i = arr.findIndex(function (x) { return x.slug === slug; }), j = i + d;
    if (j < 0 || j >= arr.length) return;
    arr.splice(j, 0, arr.splice(i, 1)[0]);
    J.api('PUT', '/api/characters/order', { order: arr.map(function (x) { return x.slug; }) }).then(function () {
      S().characters = arr; renderList(); preview(); J.setNeedBuild(true);
    }).catch(function (e) { J.toast(e.message, true); });
  }

  /* ---------------- 打开 / 新建 ---------------- */
  function normalize(c) {
    ['name', 'region', 'role', 'age', 'sex', 'quote', 'bio'].forEach(function (k) { c[k] = Object.assign(blank(), c[k] || {}); });
    return c;
  }
  function open(c) {
    cur = normalize(J.clone(c)); origSlug = c.slug;
    show(); dirty = false; state();
    $('[data-c-main]').scrollTop = 0;
  }
  $('[data-c-new]').addEventListener('click', function () {
    if (dirty && !confirm('这个角色还有没保存的改动，确定要新建吗？（改动会丢掉）')) return;
    cur = normalize({ slug: '', year: String(new Date().getFullYear()), version: 'v1', res: (about().cats[0] || {}).slug, art: null });
    origSlug = null;
    show(); dirty = true; state();
    $('[data-c-main]').scrollTop = 0;
    $('[data-c-editor] .editor__title').focus();
  });

  function show() {
    $('[data-c-empty]').hidden = true; $('[data-c-editor]').hidden = false;
    $('[data-c-preview]').hidden = false; $('[data-pane="chars"]').classList.remove('no-preview');
    $('[data-c="res"]').innerHTML = about().cats.map(function (c) { return '<option value="' + esc(c.slug) + '">' + esc(zh(about().label)) + ' · ' + esc(zh(c.label)) + '</option>'; }).join('');
    $('[data-c-langs]').innerHTML = ROWS.map(function (r) {
      return '<tr><th>' + r[1] + '</th>' + LANGS.map(function (l) {
        if (r[0] === 'name' && l === 'zh-Hans') return '<td><span class="muted">在最上面填</span></td>';
        return '<td><input class="field" data-c="' + r[0] + '.' + l + '"' + (l !== 'zh-Hans' ? ' placeholder="空着＝简体"' : '') + '></td>';
      }).join('') + '</tr>';
    }).join('');
    $('[data-c-bio]').innerHTML = LANGS.map(function (l) {
      return '<label class="lbl">' + LANG_NAME[l] + '<textarea class="field field--serif" rows="4" data-c="bio.' + l + '"' + (l !== 'zh-Hans' ? ' placeholder="空着就显示简体"' : '') + '></textarea></label>';
    }).join('');
    $$('[data-c]').forEach(function (el) { var v = getPath(cur, el.getAttribute('data-c')); el.value = v == null ? '' : v; });
    $$('[data-c-bio] textarea').forEach(J.autosize);
    $('[data-c-delete]').hidden = !origSlug; $('[data-c-view]').hidden = !origSlug;
    renderArt(); renderList(); preview();
  }
  function state() {
    var el = $('[data-c-state]');
    el.textContent = dirty ? (origSlug ? '有改动没保存' : '新角色，还没保存') : '已保存';
    el.classList.toggle('is-dirty', dirty);
  }
  function mark() { dirty = true; state(); clearTimeout(pvT); pvT = setTimeout(preview, 250); }

  $('[data-c-editor]').addEventListener('input', function (e) {
    var f = e.target.getAttribute('data-c'); if (!f) return;
    setPath(cur, f, e.target.value);
    if (f === 'slug') e.target.classList.toggle('is-bad', !!e.target.value && !/^[a-z0-9][a-z0-9-]*$/.test(e.target.value));
    if (e.target.tagName === 'TEXTAREA') J.autosize(e.target);
    mark();
  });
  $('[data-c-editor]').addEventListener('change', function (e) { if (e.target.getAttribute('data-c') === 'res') { cur.res = e.target.value; mark(); } });

  /* ---------------- 立绘 ---------------- */
  function renderArt() {
    var box = $('[data-c-art]'), a = cur.art;
    box.style.backgroundImage = a ? 'url("' + J.img(a.src) + '")' : '';
    box.innerHTML = !a ? '<em>还没有立绘</em>' : (a.placeholder ? '<em>现在是占位图</em>' : '');
  }
  J.bindDrop($('[data-c-drop]'), function (file) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(cur.slug || '')) return J.toast('先在「基本信息」里填好角色地址，再放立绘', true);
    var d = $('[data-c-drop]'); d.classList.add('is-busy');
    J.prepImage(file, { raw: $('[data-c-raw]').checked }).then(function (p) {
      return J.api('POST', '/api/images', { dir: 'characters', slug: cur.slug, kind: 'art', ext: p.ext, data: p.data });
    }).then(function (r) {
      J.bump(); J.setNeedBuild(true);
      cur.art = { src: r.src, placeholder: false };
      var c = list().find(function (x) { return x.slug === origSlug; }); if (c && c.slug === cur.slug) c.art = cur.art;
      renderArt(); renderList(); preview();
      J.toast('立绘换好了' + (origSlug ? '' : '，记得保存角色'));
    }).catch(function (e) { J.toast(e.message, true); }).then(function () { d.classList.remove('is-busy'); });
  });

  /* ---------------- 预览（网站的 style.css，角色页固定深色） ---------------- */
  var pvT;
  function preview() {
    if (!cur) return;
    var others = list().map(function (c) { return c.slug === origSlug ? cur : c; });
    if (!origSlug) others.push(cur);
    var name = T(cur.name) || '（还没写名字）', resCat = about().cats.find(function (x) { return x.slug === cur.res; });
    var strip = others.map(function (c) {
      return '<span class="chars__thumb' + (c === cur ? '" aria-current="true' : '') + '">' +
        (c.art ? '<img src="' + esc(J.img(c.art.src)) + '" alt="" width="180" height="300">' : '') + '</span>';
    }).join('');
    var html = '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<link rel="stylesheet" href="/site/css/style.css"><style>body{margin:0}.chars__strip{margin-top:28px}</style></head>' +
      '<body class="chars" data-page="characters"><main id="main"><div class="wrap">' +
      '<div class="chars__strip">' + strip + '</div>' +
      '<section class="chars__stage">' +
        '<div class="chars__art">' + (cur.art ? '<img src="' + esc(J.img(cur.art.src)) + '" alt="" width="800" height="800">' : '') + '</div>' +
        '<div><h1 class="chars__name">' + esc(name) + '</h1>' +
        '<p class="chars__role">' + esc(T(cur.role)) + ' · ' + esc(T(cur.age)) + ' ' + esc(T(cur.sex)) + '</p>' +
        '<p class="chars__quote">' + esc(T(cur.quote)) + '</p>' +
        '<p class="chars__bio">' + esc(T(cur.bio)) + '</p>' +
        '<div class="chars__cta"><a class="btn btn--primary">查看资源<i class="arr"></i></a>' +
        '<p style="margin-top:10px;font-size:12px;color:#87867F">按钮跳到：' + esc(resCat ? zh(resCat.label) : '') + '</p></div></div>' +
      '</section></div></main></body></html>';
    $('[data-c-frame]').srcdoc = html;
  }
  $('[data-c-pv-size]').addEventListener('click', function (e) {
    var b = e.target.closest('[data-w]'); if (!b) return;
    $$('[data-c-pv-size] button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    $('[data-c-frame]').style.width = b.getAttribute('data-w');
  });

  /* ---------------- 保存、删除 ---------------- */
  function save() {
    if (!cur) return;
    if (!T(cur.name).trim()) { J.toast('先写名字', true); $('[data-c-editor] .editor__title').focus(); return; }
    if (!/^[a-z0-9][a-z0-9-]*$/.test(cur.slug || '')) { J.toast('角色地址只能用小写英文字母、数字和短横线', true); $('[data-c="slug"]').focus(); return; }
    var body = J.clone(cur); delete body.art; delete body.refs;
    var btn = $('[data-c-save]'); btn.disabled = true;
    var req = origSlug ? J.api('PUT', '/api/characters/' + origSlug, { character: body }) : J.api('POST', '/api/characters', { character: body });
    req.then(function (saved) {
      var arr = list(), i = arr.findIndex(function (x) { return x.slug === origSlug; });
      if (i >= 0) arr[i] = saved; else arr.push(saved);
      J.bump(); open(saved); J.setNeedBuild(true);
      J.toast('保存好了。全部改完后点右上角「生成页面」');
    }).catch(function (e) { J.toast(e.message, true); }).then(function () { btn.disabled = false; });
  }
  $('[data-c-editor]').addEventListener('submit', function (e) { e.preventDefault(); save(); });
  $('[data-c-delete]').addEventListener('click', function () {
    if (!origSlug) return;
    if (!confirm('确定删除角色「' + T(cur.name) + '」吗？\n\n角色会从网站上去掉。立绘也会一起删掉。')) return;
    J.api('DELETE', '/api/characters/' + origSlug).then(function () {
      S().characters = list().filter(function (x) { return x.slug !== origSlug; });
      cur = null; origSlug = null; dirty = false;
      $('[data-c-editor]').hidden = true; $('[data-c-empty]').hidden = false; $('[data-c-preview]').hidden = true;
      $('[data-pane="chars"]').classList.add('no-preview');
      renderList(); J.setNeedBuild(true); J.toast('删掉了');
    }).catch(function (e) { J.toast(e.message, true); });
  });
  $('[data-c-view]').addEventListener('click', function () {
    window.open('/site/characters/?c=' + encodeURIComponent(origSlug), '_blank');
  });

  J.save.chars = save;
  J.dirty['角色'] = function () { return dirty; };
  J.hooks.push(function () {
    renderList();
    if (cur && !dirty && origSlug) { var c = list().find(function (x) { return x.slug === origSlug; }); if (c) open(c); }
  });
  if (J.state()) renderList();
})();
