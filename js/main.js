/* =============================================================
   JasperPeng — main.js

   页头页脚现在是静态 HTML（由 build.ps1 从 partials/ 同步），
   所以这里只负责「行为」，不负责「结构」。
   即使这个文件加载失败，页面依然是可导航的完整站点。

   01 工具    02 页头滚动   03 下拉面板   04 移动导航
   05 搜索    06 入场动画   07 星体（史莱姆）  08 文章页（08b 插图放大）
   09 分类页  10 角色页     11 语言       12 跳转过渡
   ============================================================= */
(function () {
  'use strict';

  var D = window.JP || { SECTIONS: [], ARTICLES: [], CHARACTERS: [] };
  var SECTIONS = D.SECTIONS, ARTICLES = D.ARTICLES, CHARACTERS = D.CHARACTERS || [];

  /* ---------- 01 工具 ---------- */
  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isDesktop = function () { return matchMedia('(min-width: 901px)').matches; };
  var BODY = document.body;
  var BASE = BODY.getAttribute('data-base') || '';
  var PAGE = BODY.getAttribute('data-page') || 'home';
  var FILE = location.protocol === 'file:';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function url(p) { return BASE + p; }

  /* ---------- 图片格式 ----------
     data.js 里只写 slug，真实扩展名来自 build.ps1 生成的 js/assets.js。
     占位图就是真实的 <slug>.png —— 换图 = 用自己的图盖掉同名文件，
     什么都不用删、连构建都不用跑，刷新页面就是新图。

     想换成别的格式（.jpg / .webp）也行：丢进同一个目录，
     再双击根目录的「刷新图片.cmd」让清单重排一次序。

     兜底：图片加载失败时按 IMG_EXT 顺序换扩展名重试 ——
     清单过期（换了格式还没刷新）时救场。
     以前那套「主动探测同名真图」（AUTO_FIND_IMAGES）连同它的一堆 404 一起删了：
     占位图现在就叫 <slug>.png，盖掉就生效，没有可探的东西了。 */
  var IMG_EXT = ['.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.svg'];

  function baseOf(src) {
    return String(src).replace(/[?#].*$/, '').replace(/\.[a-z0-9]+$/i, '');
  }
  /* 换扩展名重试 */
  function fixImg(img) {
    var src = img.getAttribute('src') || '';
    if (src.indexOf('assets/images/') < 0) return;
    var base = baseOf(src), n = +(img.getAttribute('data-ext') || 0);
    while (n < IMG_EXT.length && base + IMG_EXT[n] === src) n++;   /* 跳过当前这个 */
    if (n >= IMG_EXT.length) { img.removeAttribute('data-ext'); return; }
    img.setAttribute('data-ext', n + 1);
    img.setAttribute('src', base + IMG_EXT[n]);
  }
  /* img 的 error 不冒泡，只能在捕获阶段接 */
  document.addEventListener('error', function (e) {
    if (e.target && e.target.tagName === 'IMG') fixImg(e.target);
  }, true);

  /* 每篇文章有自己的页面 articles/<slug>/（build.ps1 生成）。
     旧的 article.html?a=<slug> 还在，但只是个跳转页。 */
  function artUrl(slug) { return url('articles/' + encodeURIComponent(slug) + '/' + (FILE ? 'index.html' : '')); }
  /* 分类链接。带 to: 的分类不生成自己的页面，直接指向别处
     —— 角色板块的「原创角色」就指向那个固定深色的选角色页。 */
  function catUrl(sec, slug) {
    var c = catOf(sec, slug);
    var p = (c && c.to) ? c.to : (sec.dir + '/' + slug + '/');
    if (FILE) {
      if (/\/$/.test(p))       p += 'index.html';
      else if (/\/\?/.test(p)) p = p.replace('/?', '/index.html?');
    }
    return url(p);
  }
  function secOf(k) { for (var i = 0; i < SECTIONS.length; i++) if (SECTIONS[i].key === k) return SECTIONS[i]; return null; }
  function catOf(sec, s) { if (!sec || !sec.cats) return null;
    for (var i = 0; i < sec.cats.length; i++) if (sec.cats[i].slug === s) return sec.cats[i]; return null; }
  function artOf(s) { for (var i = 0; i < ARTICLES.length; i++) if (ARTICLES[i].slug === s) return ARTICLES[i]; return null; }
  function newestFirst(a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; }
  /* 分类里的文章，新的在前。pinFirst 为真时，data.js 里标了 pin: true 的
     排到最前（置顶的几篇之间也按新旧排）—— 只有分类页这么用。 */
  function byCat(k, c, pinFirst) {
    return ARTICLES.filter(function (a) { return a.section === k && a.cat === c; })
                   .sort(function (a, b) {
                     if (pinFirst && a.pin !== b.pin) return a.pin ? -1 : 1;
                     return newestFirst(a, b);
                   });
  }

  /* ---------- 继续阅读的推荐 ----------
     每篇文章在 data.js 里有一个 weight（1–5，读者看不到）。
     候选是同一板块的其他文章，得分 = 权重 × 相关度：
       同分类 ×3，同板块不同分类 ×1；每多一个相同标签再 ×1.25
     然后按得分做「加权随机抽样」挑 n 篇 —— 分高的更常出现，
     但分低的也有机会，每次打开推荐会有些变化，不会永远是同样三篇。
     同板块凑不够 n 篇时，才从其他板块按权重补。 */
  function tagKeys(a) {
    return (a.tags || []).map(function (x) { return typeof x === 'string' ? x : (x['zh-Hans'] || ''); });
  }
  function recommend(a, n) {
    var mine = tagKeys(a);
    function score(x) {
      var s = x.weight || 3;
      if (x.cat === a.cat) s *= 3;
      tagKeys(x).forEach(function (k) { if (mine.indexOf(k) > -1) s *= 1.25; });
      return s;
    }
    /* Efraimidis–Spirakis：key = rand^(1/score)，取 key 最大的 n 个 */
    function pick(list, k) {
      return list.map(function (x) { return { x: x, k: Math.pow(Math.random(), 1 / score(x)) }; })
                 .sort(function (p, q) { return q.k - p.k; })
                 .slice(0, k).map(function (p) { return p.x; });
    }
    var same = ARTICLES.filter(function (x) { return x.slug !== a.slug && x.section === a.section; });
    var out = pick(same, n);
    if (out.length < n) {
      var rest = ARTICLES.filter(function (x) { return x.slug !== a.slug && x.section !== a.section; });
      out = out.concat(pick(rest, n - out.length));
    }
    return out;
  }

  /* 本地 file:// 打开时补全目录索引名（服务器上保持整洁地址） */
  function patchDirLinks() {
    if (!FILE) return;
    /* file:// 下浏览器不会把目录地址解析成 index.html，要自己补。
       带查询串的目录链接（characters/?c=xxx）同样得补，否则一样打不开。 */
    $$('a[href]').forEach(function (a) {
      var h = a.getAttribute('href');
      if (!h || /^(https?:|mailto:|tel:|data:|#)/.test(h)) return;
      if (/\/$/.test(h))        a.setAttribute('href', h + 'index.html');
      else if (/\/\?/.test(h))  a.setAttribute('href', h.replace('/?', '/index.html?'));
    });
  }

  /* ---------- 11 语言（简 / 繁 / 英 / 日）----------
     只翻译界面文案，文章正文保持原语言 */
  var LANGS = [
    { code: 'zh-Hans', label: '简体中文 中国大陆',     html: 'zh-CN' },
    { code: 'zh-Hant', label: '繁體中文 台灣',         html: 'zh-TW' },
    { code: 'en',      label: 'English United States', html: 'en' },
    { code: 'ja',      label: '日本語 日本',            html: 'ja' }
  ];
  var I18N = {
    'zh-Hans': { skip:'跳到主要内容', archive:'档案', archiveTitle:'最近更新', posterCap:'新的网页上线！', home:'主页', toHome:'回到首页', more:'查看更多', reading:'继续阅读', otherIn:' 的其他文章',
      count:' 篇内容', soon:'暂未开放', search:'搜索文章、作品、角色…', noResult:'没有找到相关内容',
      bodyOriginal:'正文保持写作时的原文，未作翻译。', notFound:'没有找到这篇文章', notFoundDesc:'链接可能已经失效，或者这篇内容还没有发布。',
      charsReading:'角色相关文章', emptyTitle:'这个分类还没有内容', emptyDesc:'先去看看其他板块，或者回到首页。',
      category:'分类', viewRes:'查看资源', all:'全部', year:'年份', version:'版本', region:'地图', explore:'Explore',
      pinned:'置顶', tagLabel:'标签', inTitle:'标题', inBody:'正文', zoomClose:'关闭', zoomHint:'双击或滚轮放大 · 拖动查看细节', searchTip:'可搜标题、标签、分类、正文；空格分隔多个关键词',
      nfTitle:'这个页面不存在', nfDesc:'链接可能已经失效，或者地址输错了。', nfSearch:'搜索', share:'分享', copied:'链接已复制', author:'作者' },
    'zh-Hant': { skip:'跳到主要內容', archive:'檔案', archiveTitle:'最近更新', posterCap:'新的網站上線！', home:'首頁', toHome:'回到首頁', more:'查看更多', reading:'繼續閱讀', otherIn:' 的其他文章',
      count:' 篇內容', soon:'尚未開放', search:'搜尋文章、作品、角色…', noResult:'找不到相關內容',
      bodyOriginal:'正文保持寫作時的原文，未作翻譯。', notFound:'找不到這篇文章', notFoundDesc:'連結可能已失效，或這篇內容尚未發布。',
      charsReading:'角色相關文章', emptyTitle:'這個分類還沒有內容', emptyDesc:'先看看其他版塊，或回到首頁。',
      category:'分類', viewRes:'檢視資源', all:'全部', year:'年份', version:'版本', region:'地圖', explore:'Explore',
      pinned:'置頂', tagLabel:'標籤', inTitle:'標題', inBody:'正文', zoomClose:'關閉', zoomHint:'雙擊或滾輪放大 · 拖動查看細節', searchTip:'可搜尋標題、標籤、分類、正文；以空格分隔多個關鍵字',
      nfTitle:'這個頁面不存在', nfDesc:'連結可能已經失效，或者網址輸入錯誤。', nfSearch:'搜尋', share:'分享', copied:'連結已複製', author:'作者' },
    en: { skip:'Skip to content', archive:'Archive', archiveTitle:'Recently published', posterCap:'New website launched!', home:'Home', toHome:'Back to home', more:'View more', reading:'Keep reading', otherIn:' — more',
      count:' items', soon:'Coming soon', search:'Search articles, works, characters…', noResult:'No results found',
      bodyOriginal:'The article text is kept in the language it was written in, untranslated.', notFound:'Article not found', notFoundDesc:'The link may have expired, or this piece is not published yet.',
      charsReading:'Reading on the characters', emptyTitle:'Nothing here yet', emptyDesc:'Try another section, or head back home.',
      category:'Category', viewRes:'View resources', all:'All', year:'Year', version:'Version', region:'Region', explore:'Explore',
      pinned:'Pinned', tagLabel:'Tag', inTitle:'Title', inBody:'Text', zoomClose:'Close', zoomHint:'Double-click or scroll to zoom · drag to pan', searchTip:'Search titles, tags, categories and text; separate keywords with spaces',
      nfTitle:'This page doesn’t exist', nfDesc:'The link may have expired, or the address was mistyped.', nfSearch:'Search', share:'Share', copied:'Link copied', author:'Author' },
    ja: { skip:'本文へスキップ', archive:'アーカイブ', archiveTitle:'最近の更新', posterCap:'新サイトが公開されました！', home:'ホーム', toHome:'ホームへ戻る', more:'もっと見る', reading:'続けて読む', otherIn:' の他の記事',
      count:' 件', soon:'準備中', search:'記事・作品・キャラクターを検索…', noResult:'該当する内容が見つかりません',
      bodyOriginal:'本文は執筆時の言語のまま、翻訳していません。', notFound:'記事が見つかりません', notFoundDesc:'リンクが無効か、まだ公開されていない可能性があります。',
      charsReading:'キャラクター関連の記事', emptyTitle:'まだコンテンツがありません', emptyDesc:'他のセクションを見るか、ホームへ戻ってください。',
      category:'カテゴリ', viewRes:'リソースを見る', all:'すべて', year:'年', version:'版', region:'地域', explore:'Explore',
      pinned:'固定', tagLabel:'タグ', inTitle:'タイトル', inBody:'本文', zoomClose:'閉じる', zoomHint:'ダブルクリック・ホイールで拡大 · ドラッグで移動', searchTip:'タイトル・タグ・カテゴリ・本文を検索。スペースで複数キーワード',
      nfTitle:'このページは存在しません', nfDesc:'リンクが無効になったか、アドレスが間違っている可能性があります。', nfSearch:'検索', share:'共有', copied:'リンクをコピーしました', author:'著者' }
  };
  var LANG = 'zh-Hans';
  try { LANG = localStorage.getItem('jp-lang') || 'zh-Hans'; } catch (e) {}
  if (!I18N[LANG]) LANG = 'zh-Hans';
  function t(k) { return (I18N[LANG] && I18N[LANG][k]) || I18N['zh-Hans'][k] || k; }

  /* ---------- 多语言字段取值 ----------
     data.js 里的四语字段：{ 'zh-Hans':…, 'zh-Hant':…, en:…, ja:… }
     专有名词用 P() 生成，四语同形，天然不翻译。 */
  function T(field) {
    if (field == null) return '';
    if (typeof field === 'string') return field;      /* 兼容纯字符串 */
    return field[LANG] || field['zh-Hans'] || '';
  }

  /* 日期按语言本地化，不在数据里写死 */
  var DATE_LOCALE = { 'zh-Hans': 'zh-CN', 'zh-Hant': 'zh-TW', en: 'en-US', ja: 'ja-JP' };
  function fmtDate(iso) {
    try {
      return new Intl.DateTimeFormat(DATE_LOCALE[LANG] || 'zh-CN',
        { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(iso + 'T00:00:00'));
    } catch (e) { return iso; }
  }
  /* 阅读时长：数字 + 各语言量词 */
  var READ_FMT = { 'zh-Hans': '# 分钟阅读', 'zh-Hant': '# 分鐘閱讀', en: '# min read', ja: '約 # 分' };
  function fmtRead(min) {
    if (!min) return '';
    return (READ_FMT[LANG] || READ_FMT['zh-Hans']).replace('#', min);
  }

  /* ---------- 解析静态 HTML 上的 data-t 路径 ----------
     页头页脚是 build.ps1 生成的静态标签（没有 JS 也能导航），
     但标签上带 data-t="s.works.label" 这样的路径，
     切换语言时由这里把文案换掉。 */
  function resolvePath(path) {
    var p = path.split('.');
    var kind = p[0];
    if (kind === 'ui') return t(p[1]);
    var sec = secOf(p[1]);
    if (!sec) return null;
    if (kind === 's') return T(sec[p[2]]);
    if (kind === 'c') {
      var c = catOf(sec, p[2]);
      return c ? T(c[p[3]]) : null;
    }
    var idx = parseInt(p[2], 10);
    if (kind === 'f') return sec.feature && sec.feature[idx] ? T(sec.feature[idx].label) : null;
    if (kind === 'g') return sec.tags && sec.tags.items[idx] ? T(sec.tags.items[idx].label) : null;
    if (kind === 'gk') return sec.tags ? T(sec.tags.kicker) : null;
    if (kind === 'l') return sec.links && sec.links[idx] ? T(sec.links[idx].label) : null;
    if (kind === 'n') return sec.notes && sec.notes[idx] ? T(sec.notes[idx][p[3]]) : null;
    return null;
  }

  /* ---------- 02 页头滚动状态（单一 rAF 节流）---------- */
  (function headerScroll() {
    var hdr = $('[data-header]'), toTop = $('[data-totop]'), bar = $('[data-progress] span');
    var ticking = false;
    function update() {
      var y = scrollY;
      if (hdr) hdr.classList.toggle('is-scrolled', y > 8);
      if (toTop) toTop.classList.toggle('is-on', y > 640);
      if (bar) {
        var max = document.documentElement.scrollHeight - innerHeight;
        bar.style.width = (max > 0 ? Math.min(100, y / max * 100) : 0) + '%';
      }
      ticking = false;
    }
    addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
    if (toTop) toTop.addEventListener('click', function () {
      scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    });
  })();

  /* 展开面板的内容左边缘对齐顶栏第一个导航项（Figma 的排布）。
     不写死 761px —— 中英日文标签宽度不同，量出来才对得上。
     换语言、改窗宽都要重量一次。 */
  /* 面板换了语言 / 换了窗宽，内容高度也会变，共用背景要跟着重量一次。
     真正的实现挂在下面的 dropdowns 里，这里先留个空壳，免得调用顺序出错。 */
  var remeasureMenu = function () {};
  function alignMenus() {
    var hdr = $('[data-header]'), first = $('.nav .nav__link');
    if (!hdr || !first) return;
    if (!isDesktop()) { hdr.style.removeProperty('--menu-left'); return; }
    var l = first.getBoundingClientRect().left;
    hdr.style.setProperty('--menu-left', Math.max(0, Math.round(l)) + 'px');
    remeasureMenu();
  }
  addEventListener('resize', alignMenus);

  /* ---------- 03 下拉面板 ----------
     六块面板装在同一个舞台 .menu-stage 里，舞台自己就是那块白底。三种情形：

       从无到有   舞台高度 0 → h（这就是帘幕），内容自上而下淡入
       面板横移   高度 h₁ → h₂ 连续补间，两块内容按指针方向横向交接；
                  帘幕一步都不播 —— 指针没离开顶栏，这块白底就一直在
       彻底收起   高度 → 0

     之前是「先 hide 再 show」，横移时先收起又展开，中间必然塌一下。
     现在 show() 里不再调 hide()，让位的那块走 leave()，两件事同时发生。 */
  (function dropdowns() {
    var triggers = $$('[data-menu]');
    var scrim = $('[data-scrim]'), hdr = $('[data-header]'), bg = $('[data-menu-stage]');
    if (!triggers.length) return;
    /* pinned 记的是「点过哪一项」，不是一个笼统的开关。
       以前是布尔值：点 A 固定住之后，碰一下 B（触屏上 mouseenter / focus
       会先把 B 展开），紧接着的那次 click 看到「已展开 + 已固定」就把舞台收了 ——
       用户得再点一次 B 才能打开。现在只有「再点同一项」才收起。 */
    var open = null, closeT = null, pinned = null;

    function panelOf(trg) { return $('#' + trg.getAttribute('aria-controls')); }
    /* 面板本身没有内外边距，高度就是内容块的高度 */
    function heightOf(p) { return Math.ceil(p.getBoundingClientRect().height); }

    function setBg(h, swap) {
      if (!bg) return;
      bg.classList.toggle('is-swap', !!swap);
      bg.style.setProperty('--menu-h', h + 'px');
      bg.classList.add('is-on');
    }
    /* 让位：留在原地把内容淡出，动画放完再摘类。
       计时器挂在元素上 —— 连着扫过三四个面板时，各自的清理互不干扰。 */
    function leave(p, dx) {
      p.classList.remove('is-open', 'is-swap-in');
      p.style.setProperty('--dx', dx + 'px');
      p.classList.add('is-leaving');
      p.setAttribute('aria-hidden', 'true');
      clearTimeout(p._leaveT);
      p._leaveT = setTimeout(function () { p.classList.remove('is-leaving'); }, 240);
    }

    function show(trg) {
      if (open === trg) return;
      var p = panelOf(trg);
      if (!p) return;
      var prev = open, swap = !!prev, dx = 0;

      if (prev) {
        dx = triggers.indexOf(trg) > triggers.indexOf(prev) ? 18 : -18;
        prev.setAttribute('aria-expanded', 'false');
        var pp = panelOf(prev);
        if (pp) leave(pp, dx);
      }
      /* 可能正巧是刚让出去、还在淡出的那一块，先把它救回来 */
      clearTimeout(p._leaveT);
      p.classList.remove('is-leaving');

      if (swap) { p.style.setProperty('--dx', dx + 'px'); p.classList.add('is-swap-in'); }
      else       { p.classList.remove('is-swap-in'); }
      p.classList.add('is-open');
      p.setAttribute('aria-hidden', 'false');
      trg.setAttribute('aria-expanded', 'true');
      setBg(heightOf(p), swap);
      if (scrim) scrim.classList.add('is-on');
      if (hdr) hdr.classList.add('is-menu-open');
      open = trg;
      /* 横移动画放完就把 is-swap-in 摘掉，恢复常态（收起时才有帘幕可播） */
      if (swap) {
        clearTimeout(p._swapT);
        p._swapT = setTimeout(function () { p.classList.remove('is-swap-in'); }, 360);
      }
    }

    function close() {
      if (!open) return;
      var p = panelOf(open);
      if (p) {
        clearTimeout(p._swapT);
        /* 横移动画还没放完就收起：先摘 is-swap-in（它关掉了 transition、
           而且 animation-fill-mode 会把内容按住在终态），强制回流让状态落定，
           再摘 is-open，淡出才有得播。 */
        if (p.classList.contains('is-swap-in')) { p.classList.remove('is-swap-in'); void p.offsetWidth; }
        p.classList.remove('is-open');
        p.setAttribute('aria-hidden', 'true');
      }
      open.setAttribute('aria-expanded', 'false');
      if (bg) { bg.classList.remove('is-on', 'is-swap'); bg.style.removeProperty('--menu-h'); }
      if (scrim) scrim.classList.remove('is-on');
      if (hdr) hdr.classList.remove('is-menu-open');
      open = null; pinned = null;
    }

    /* 换语言 / 改窗宽之后内容高度变了，背景要重新贴合（alignMenus 里调） */
    remeasureMenu = function () {
      if (!open || !bg) return;
      var p = panelOf(open);
      if (p) bg.style.setProperty('--menu-h', heightOf(p) + 'px');
    };

    /* 悬停预览只给真鼠标。触屏上点一下也会补发 mouseenter，
       那一下不能算「悬停」，交给下面的 click 处理。 */
    var isMouse = function (e) { return !e.pointerType || e.pointerType === 'mouse'; };

    triggers.forEach(function (trg) {
      trg.addEventListener('pointerenter', function (e) {
        if (isDesktop() && isMouse(e)) { clearTimeout(closeT); show(trg); }
      });
      /* 只有键盘 Tab 过来才算「聚焦即展开」；点击带来的聚焦交给 click */
      trg.addEventListener('focus', function () {
        var kb = true;
        try { kb = trg.matches(':focus-visible'); } catch (e) {}
        if (isDesktop() && kb) show(trg);
      });
      /* hover 已经展开时，点击是「固定住」而不是关闭 ——
         否则鼠标移上去自动展开、再一点就收起，用户会以为点了没反应。
         固定的就是这一项时再点才收起；点别的项是直接切过去。 */
      trg.addEventListener('click', function (e) {
        e.preventDefault();
        clearTimeout(closeT);
        if (open !== trg)        { show(trg); pinned = trg; }
        else if (pinned !== trg) { pinned = trg; }
        else                     { close(); }
      });
    });

    /* 收起只看「指针有没有离开顶栏」。面板是 <header> 的子节点，
       所以导航项之间、导航项和面板之间怎么走都不会触发 mouseleave ——
       用户要的「没离开导航栏就别收起」由 DOM 结构本身保证，不靠计时器赌。
       留 120ms 宽限，是给擦着边缘走位留的余量。 */
    if (hdr) {
      hdr.addEventListener('pointerleave', function (e) { if (isMouse(e) && !pinned) closeT = setTimeout(close, 120); });
      hdr.addEventListener('pointerenter', function () { clearTimeout(closeT); });
    }
    /* 点到或划到舞台以外的任何地方就收起 —— 触屏上用户点了 / 划了空白处，
       就是要离开这个选择界面。按下的那一刻就判，所以「划一下」也算，
       不用等抬手（划动不会产生 click，以前只靠 scrim 的 click 收不起来）。
       导航项本身除外：点导航项是切换，交给上面的 click。 */
    document.addEventListener('pointerdown', function (e) {
      if (!open) return;
      var el = e.target;
      if (el && el.closest && (el.closest('[data-menu-stage]') || el.closest('[data-menu]'))) return;
      close();
    }, true);
    if (scrim) scrim.addEventListener('click', close);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    addEventListener('resize', function () { if (!isDesktop()) close(); });
  })();

  /* ---------- 04 移动导航 ---------- */
  (function mobileNav() {
    var burger = $('[data-burger]'), drawer = $('[data-mnav]');
    if (!burger || !drawer) return;

    function setOpen(on) {
      burger.setAttribute('aria-expanded', String(on));
      burger.setAttribute('aria-label', on ? '关闭菜单' : '打开菜单');
      BODY.classList.toggle('is-locked', on);
      if (on) { drawer.hidden = false; requestAnimationFrame(function () { drawer.classList.add('is-on'); }); }
      else {
        drawer.classList.remove('is-on');
        setTimeout(function () { if (burger.getAttribute('aria-expanded') === 'false') drawer.hidden = true; }, 320);
      }
    }
    burger.addEventListener('click', function () { setOpen(burger.getAttribute('aria-expanded') !== 'true'); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') setOpen(false);
    });
    addEventListener('resize', function () { if (isDesktop() && burger.getAttribute('aria-expanded') === 'true') setOpen(false); });
    $$('a', drawer).forEach(function (a) { a.addEventListener('click', function () { setOpen(false); }); });

    $$('[data-acc]', drawer).forEach(function (h) {
      var panel = h.nextElementSibling;
      h.addEventListener('click', function () {
        var on = h.getAttribute('aria-expanded') === 'true';
        $$('[data-acc]', drawer).forEach(function (o) {
          if (o !== h) { o.setAttribute('aria-expanded', 'false'); o.nextElementSibling.style.height = '0px'; }
        });
        h.setAttribute('aria-expanded', String(!on));
        panel.style.height = on ? '0px' : panel.scrollHeight + 'px';
      });
    });
  })();

  /* ---------- 04b 页脚折叠（手机竖屏）----------
     ≤640 时页脚每一栏只露出标题（浏览研究 / 浏览作品 / … / 联系），点一下展开那一栏的链接，
     再点收起；几栏可以同时展开（apple.com 的页脚就是这样）。
     更宽的屏幕上 CSS 让标题不可点、链接一直展开，这里只把 aria-expanded 标成 true 给读屏软件看。
     从手机宽度拉到宽屏再拉回来，各栏回到收起状态。 */
  (function footerAccordion() {
    var toggles = $$('[data-ftr-acc]');
    if (!toggles.length) return;
    var phone = matchMedia('(max-width: 640px)');
    function set(btn, on) {
      btn.setAttribute('aria-expanded', String(on));
      btn.closest('.ftr__col').classList.toggle('is-open', on);
    }
    function sync() { toggles.forEach(function (b) { set(b, !phone.matches); }); }
    toggles.forEach(function (b) {
      b.addEventListener('click', function () {
        if (!phone.matches) return;
        set(b, b.getAttribute('aria-expanded') !== 'true');
      });
    });
    if (phone.addEventListener) phone.addEventListener('change', sync); else phone.addListener(sync);
    sync();
  })();

  /* ---------- 05 搜索（⌘K / Ctrl+K）---------- */
  (function search() {
    var overlay = $('[data-search]'), input = $('[data-search-input]'), out = $('[data-search-results]');
    if (!overlay || !input || !out) return;

    /* 搜索范围：文章的标题、标签、分类 / 板块名、导语、正文，外加分类页和角色。
       · 标题、标签、分类名四种语言都收进索引 —— 用哪种语言搜都找得到
       · 空格分隔多个关键词，每个词都要在某处命中（「京都 摄影」= 两个都要有）
       · 命中位置决定排名：标题 > 标签 > 分类 > 导语 > 正文，同分时 weight 高的在前
       · 命中的标签以小胶囊列在结果里；只在正文里命中的，附一句上下文
       打开搜索时先给一排常用标签，点一下就按那个标签搜。 */
    var INDEX = [], TAGS = [];
    function allLangs(field) {
      if (!field) return '';
      if (typeof field === 'string') return field;
      return LANGS.map(function (l) { return field[l.code] || ''; }).join(' ');
    }
    function stripTags(s) { return String(s || '').replace(/<[^>]*>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' '); }
    function bodyText(a) {
      var b = a.body;
      if (typeof b === 'string') return stripTags(b);
      return (b || []).map(function (x) {
        if (typeof x === 'string') return x;
        var v = x.v;
        if (Array.isArray(v)) v = v.join(' ');
        return stripTags(v) + ' ' + (x.cap || '');
      }).join(' ').replace(/\s+/g, ' ');
    }
    function buildIndex() {
      var tagSeen = {};
      TAGS = [];
      INDEX = ARTICLES.map(function (a) {
        var s = secOf(a.section), c = catOf(s, a.cat);
        (a.tags || []).forEach(function (g) {
          var k = typeof g === 'string' ? g : g['zh-Hans'];
          if (!tagSeen[k]) { tagSeen[k] = { label: T(g), n: 0 }; TAGS.push(tagSeen[k]); }
          tagSeen[k].n++;
        });
        return { t: T(a.title), c: T(s ? s.label : '') + ' · ' + T(c ? c.label : ''), u: artUrl(a.slug),
                 img: url(a.cover), w: a.weight || 3, date: a.date,
                 title: allLangs(a.title).toLowerCase(),
                 tags: (a.tags || []).map(function (g) { return { show: T(g), k: allLangs(g).toLowerCase() }; }),
                 cat: (allLangs(c ? c.label : '') + ' ' + allLangs(s ? s.label : '')).toLowerCase(),
                 lede: allLangs(a.lede).toLowerCase(),
                 body: bodyText(a) };
      });
      SECTIONS.forEach(function (s) {
        (s.cats || []).forEach(function (c) {
          INDEX.push({ t: T(c.label), c: T(s.label) + ' · ' + t('category'), u: catUrl(s, c.slug), img: '', w: 2,
                       title: allLangs(c.label).toLowerCase(), tags: [], cat: allLangs(s.label).toLowerCase(),
                       lede: allLangs(c.desc).toLowerCase(), body: '' });
        });
      });
      CHARACTERS.forEach(function (c) {
        INDEX.push({ t: T(c.name), c: T(secOf('characters').label) + ' · ' + T(c.role),
                     u: url('characters/' + (FILE ? 'index.html' : '') + '?c=' + c.slug),
                     img: charArt(c), w: 3,
                     title: allLangs(c.name).toLowerCase(), tags: [],
                     cat: (allLangs(secOf('characters').label) + ' ' + allLangs(c.region)).toLowerCase(),
                     lede: allLangs(c.role).toLowerCase(), body: T(c.bio) + ' ' + allLangs(c.quote) });
      });
      TAGS.sort(function (a, b) { return b.n - a.n; });
    }
    buildIndex();
    window.__rebuildSearch = buildIndex;

    function terms(q) {
      return q.toLowerCase().split(/[\s,，、]+/).filter(Boolean);
    }
    /* 每个词单独打分，一个词哪儿都没命中，整条就不要 */
    function match(i, words) {
      var score = 0, tags = [], inBody = false;
      for (var n = 0; n < words.length; n++) {
        var w = words[n], best = 0;
        if (i.title.indexOf(w) > -1) best = 10;
        i.tags.forEach(function (g) {
          if (g.k.indexOf(w) < 0) return;
          if (tags.indexOf(g.show) < 0) tags.push(g.show);
          var exact = (' ' + g.k + ' ').indexOf(' ' + w + ' ') > -1;
          best = Math.max(best, exact ? 9 : 7);
        });
        if (!best && i.cat.indexOf(w) > -1)  best = 5;
        if (!best && i.lede.indexOf(w) > -1) best = 3;
        if (!best && i.body.toLowerCase().indexOf(w) > -1) { best = 1; inBody = true; }
        if (!best) return null;
        score += best;
      }
      return { i: i, score: score + i.w * 0.1, tags: tags, inBody: inBody };
    }

    function reEsc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
    /* 高亮：先切再转义，<mark> 不会被转义掉，原文里的 < > 也不会漏成标签 */
    function mark(text, words) {
      if (!words.length) return esc(text);
      var re = new RegExp('(' + words.map(reEsc).join('|') + ')', 'ig');
      return String(text).split(re).map(function (part, n) {
        return n % 2 ? '<mark>' + esc(part) + '</mark>' : esc(part);
      }).join('');
    }
    function snippet(body, words) {
      var low = body.toLowerCase(), at = -1;
      for (var n = 0; n < words.length && at < 0; n++) at = low.indexOf(words[n]);
      if (at < 0) return '';
      var from = Math.max(0, at - 18), to = Math.min(body.length, at + 42);
      return (from > 0 ? '…' : '') + body.slice(from, to).trim() + (to < body.length ? '…' : '');
    }

    var sel = 0;
    function itemHTML(r, n, words) {
      var i = r.i;
      return '<a class="sr' + (n === 0 ? ' is-sel' : '') + '" href="' + i.u + '">' +
        (i.img ? '<img class="sr__thumb" src="' + i.img + '" alt="" loading="lazy">'
               : '<span class="sr__thumb"></span>') +
        '<span class="sr__text"><span class="sr__t">' + mark(i.t, words) + '</span>' +
        '<span class="sr__c">' + esc(i.c) +
          r.tags.map(function (g) { return '<span class="sr__tag">#' + mark(g, words) + '</span>'; }).join('') +
        '</span>' +
        (r.inBody ? '<span class="sr__snip">' + mark(snippet(i.body, words), words) + '</span>' : '') +
        '</span></a>';
    }
    function render(q) {
      sel = 0;
      var words = terms(q);
      if (!words.length) {
        /* 还没输入：提示 + 常用标签 + 最近的文章 */
        var recent = INDEX.filter(function (i) { return i.date; })
                          .sort(function (a, b) { return a.date < b.date ? 1 : -1; }).slice(0, 5);
        out.innerHTML =
          '<p class="sr__tip">' + esc(t('searchTip')) + '</p>' +
          '<div class="sr__tags">' + TAGS.slice(0, 18).map(function (g) {
            return '<button type="button" class="sr__chip" data-q="' + esc(g.label) + '">#' + esc(g.label) + '</button>';
          }).join('') + '</div>' +
          recent.map(function (i, n) { return itemHTML({ i: i, tags: [], inBody: false }, n, []); }).join('');
        return;
      }
      var list = INDEX.map(function (i) { return match(i, words); }).filter(Boolean)
                      .sort(function (a, b) { return b.score - a.score; });
      if (!list.length) { out.innerHTML = '<p class="sr__empty">' + t('noResult') + ' — “' + esc(q) + '”</p>'; return; }
      out.innerHTML = list.slice(0, 12).map(function (r, n) { return itemHTML(r, n, words); }).join('');
    }
    out.addEventListener('click', function (e) {
      var chip = e.target.closest('[data-q]');
      if (!chip) return;
      input.value = chip.getAttribute('data-q');
      render(input.value);
      input.focus();
    });
    function setOpen(on, q) {
      if (on) {
        overlay.hidden = false; input.value = q || ''; render(input.value.trim());
        requestAnimationFrame(function () { overlay.classList.add('is-on'); input.focus(); });
        BODY.classList.add('is-locked');
      } else {
        overlay.classList.remove('is-on'); BODY.classList.remove('is-locked'); input.value = '';
        setTimeout(function () { overlay.hidden = true; }, 320);
      }
    }
    /* 文章页的标签胶囊点了直接按这个标签搜 */
    window.__openSearch = function (q) { setOpen(true, q); };
    $$('[data-search-open]').forEach(function (b) { b.addEventListener('click', function () { setOpen(true); }); });
    overlay.addEventListener('click', function (e) { if (e.target === overlay) setOpen(false); });
    input.addEventListener('input', function () { render(input.value.trim()); });
    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen(overlay.hidden); return; }
      if (overlay.hidden) return;
      if (e.key === 'Escape') { setOpen(false); return; }
      var items = $$('.sr', out);
      if (!items.length) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        items.forEach(function (it, n) { it.classList.toggle('is-sel', n === sel); });
        items[sel].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter') { e.preventDefault(); items[sel].click(); }
    });
  })();

  /* ---------- 06 入场动画 ---------- */
  var io = null;
  function reveal(root) {
    var els = $$('.reveal:not(.is-in)', root || document);
    if (!els.length) return;
    if (reduce || !('IntersectionObserver' in window)) {
      els.forEach(function (e) { e.classList.add('is-in'); }); return;
    }
    $$('.grid, .list', root || document).forEach(function (g) {
      $$('.reveal', g).forEach(function (e, i) { e.style.setProperty('--delay', Math.min(i * 70, 350) + 'ms'); });
    });
    /* 首屏之内的直接就位，既不交给 IntersectionObserver，也不做入场动画。
       两件事分开说：
       · 不交给 IO —— 它的回调要等第一帧画完之后才跑，等它来加 is-in，
         用户先看到的是一片空白再淡进来，观感就是「闪一下」。
       · 不做动画 —— 首屏内容每次换页都淡上来一次（.9s），在手机上就是
         「跳一下」。所以这里先把 transition 关掉再加 is-in，等画过一帧
         再把 transition 还回去；往下滚出现的那些照旧有入场动画。 */
    var vh = window.innerHeight || document.documentElement.clientHeight;
    var boot = [];
    els = els.filter(function (e) {
      if (e.getBoundingClientRect().top >= vh) return true;
      e.style.setProperty('--delay', '0ms');
      e.style.transition = 'none';
      e.classList.add('is-in');
      boot.push(e);
      return false;
    });
    if (boot.length) {
      /* 两层 rAF：确保「transition:none + is-in」这一版样式真的被画出去过一帧，
         再解开 transition，否则解开的瞬间又会从 opacity 0 补一次过渡。 */
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          boot.forEach(function (e) { e.style.transition = ''; });
        });
      });
    }
    if (!els.length) return;
    if (!io) io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { threshold: .12, rootMargin: '0px 0px -60px 0px' });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ---------- 07 星体：史莱姆 ----------
     球是一团有弹性的果冻，用一个很小的弹簧模型驱动（每帧积分，不用库）：
       位置   弹簧拉回原点，阻尼偏小 → 松手后会冲过头再回来
       形变   沿某个方向「拉长 / 压扁」，同样是弹簧 → 松手后会抖几下才停
     交互：
       · 按下   按到哪儿，就从哪个方向往里凹一下
       · 拖动   球跟着走，但越拖越沉（有拉力上限），拉不动的那部分变成朝指针方向的拉长
       · 松手   弹回原位、过冲、抖动几下停住
       · 悬停   （仅鼠标）轻微被指针牵引，移动快时顺着速度方向拉长一点
     形变写成 rotate(a) scale(1+s, 1−0.75s) rotate(−a)：s>0 沿 a 拉长、s<0 沿 a 压扁，
     垂直方向反着补一点，看起来体积守恒，才像软的东西而不是在缩放。
     变换挂在 .star（外层）上，呼吸浮动在 .star__body / .star__glow 上，互不顶掉
     （CSS 动画优先级高于内联 style，写在同一个元素上牵引会被吃掉）。
     高光 .star__gloss 用独立的 translate 属性反向错开一点 —— 内部有惯性，更像一团液体。 */
  (function star() {
    var host = $('[data-star]');
    if (!host || reduce) return;
    var orb = $('.star', host), gloss = $('.star__gloss', host);
    if (!orb) return;
    var finePtr = matchMedia('(hover: hover) and (pointer: fine)').matches;
    orb.classList.add('is-slime');

    var x = 0, y = 0, vx = 0, vy = 0;       /* 位置 / 速度（px, px/帧） */
    var st = 0, sv = 0, ax = 0;             /* 形变量 / 形变速度 / 形变方向（弧度） */
    var hx = 0, hy = 0;                     /* 悬停牵引目标 */
    var drag = null, raf = 0, last = 0;
    /* 2026-10-04 用户觉得「有点卡、效果减弱一点点」：
       · 所有幅度收一档：拉出去最远 0.55R → 0.42R，拉长上限 0.32 → 0.22，按下 / 戳一下的回弹也小一点
       · 阻尼加大一点，松手后抖的次数少、停得更快
       · 半径不再每帧读 offsetWidth（每帧读布局会逼浏览器同步重排），按下时和窗口变化时量一次
       · 拖动 / 回弹期间加 is-active（css 里把层级提到最上面），停稳后摘掉
       · 球滚出屏幕就给 .star 加 is-paused，暂停那些一直在跑的 CSS 循环动画 */
    var R = 200;
    function measure() { R = orb.offsetWidth / 2 || 200; }
    measure();
    addEventListener('resize', measure);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        orb.classList.toggle('is-paused', !es[0].isIntersecting);
      }).observe(host);
    }
    function center() {
      var r = orb.getBoundingClientRect();     /* 含当前位移，减掉它拿到「原位」中心 */
      return { x: r.left + r.width / 2 - x, y: r.top + r.height / 2 - y };
    }

    function frame(now) {
      var dt = Math.min(2.5, (now - (last || now)) / 16.667 || 1);
      last = now;
      var tx = hx, ty = hy, sTarget = 0;

      if (drag) {
        /* 拉力：球最多跟出去 0.42R，再往外拖就拖不动了（tanh 渐近），
           拖不动的那段距离变成朝指针方向的拉长 */
        var dx = drag.px - drag.sx, dy = drag.py - drag.sy, dist = Math.hypot(dx, dy);
        if (dist > 0.5) {
          var reach = R * 0.42 * Math.tanh(dist / (R * 0.9));
          tx = dx / dist * reach; ty = dy / dist * reach;
          sTarget = Math.min(0.22, (dist - reach) / R * 0.32);
          ax = Math.atan2(dy, dx);
        }
      }
      /* 位置弹簧：拖动时更紧（跟手），松开后更软（过冲） */
      var k = drag ? 0.22 : 0.08, damp = drag ? 0.62 : 0.86;
      vx = (vx + (tx - x) * k * dt) * Math.pow(damp, dt);
      vy = (vy + (ty - y) * k * dt) * Math.pow(damp, dt);
      x += vx * dt; y += vy * dt;

      /* 没在拖的时候，速度本身会把球甩长：顺着速度方向 */
      var speed = Math.hypot(vx, vy);
      if (!drag && speed > 0.4) {
        sTarget = Math.min(0.14, speed * 0.014);
        ax = Math.atan2(vy, vx);
      }
      /* 形变弹簧：阻尼小，松手后会在拉长和压扁之间来回抖几下 */
      sv = (sv + (sTarget - st) * 0.2 * dt) * Math.pow(0.88, dt);
      st += sv * dt;
      st = Math.max(-0.2, Math.min(0.3, st));

      var deg = ax * 180 / Math.PI;
      orb.style.transform = 'translate3d(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px,0) rotate(' + deg.toFixed(2) +
        'deg) scale(' + (1 + st).toFixed(4) + ',' + (1 - st * 0.75).toFixed(4) + ') rotate(' + (-deg).toFixed(2) + 'deg)';
      if (gloss) gloss.style.translate = (-vx * 1.6).toFixed(2) + 'px ' + (-vy * 1.6).toFixed(2) + 'px';

      var settled = !drag && Math.abs(x - hx) < 0.05 && Math.abs(y - hy) < 0.05 &&
                    Math.abs(vx) + Math.abs(vy) < 0.02 && Math.abs(st) < 0.001 && Math.abs(sv) < 0.001;
      if (settled) { raf = 0; last = 0; orb.classList.remove('is-active'); return; }
      raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } }

    /* 只有球本身（圆形区域）接指针 —— 见 css 的 .star.is-slime。
       触屏上在球上按下就是在玩球，不会顺带滚动页面；球外面照常滚。 */
    orb.addEventListener('pointerdown', function (e) {
      if (e.button > 0) return;
      e.preventDefault();
      /* 捕获挂在被按到的那层圆上（.star 自己 pointer-events:none），事件照样冒泡到这里 */
      try { e.target.setPointerCapture(e.pointerId); } catch (err) {}
      measure();
      var c = center();
      /* 按下：从按的那一侧往里凹 */
      ax = Math.atan2(e.clientY - c.y, e.clientX - c.x);
      sv -= 0.05;
      drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, px: e.clientX, py: e.clientY, moved: 0 };
      orb.classList.add('is-grabbing', 'is-active');
      kick();
    });
    orb.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      drag.px = e.clientX; drag.py = e.clientY;
      drag.moved = Math.max(drag.moved, Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy));
      kick();
    });
    function release(e) {
      if (!drag || e.pointerId !== drag.id) return;
      /* 点一下没怎么拖：额外弹一下，像戳了一下果冻 */
      if (drag.moved < 6) sv += 0.08;
      drag = null;
      orb.classList.remove('is-grabbing');
      kick();
    }
    orb.addEventListener('pointerup', release);
    orb.addEventListener('pointercancel', release);
    orb.addEventListener('lostpointercapture', release);

    if (finePtr) {
      /* 宿主的位置在指针进来时量一次，不在每次 mousemove 里读布局 */
      var hostRect = null;
      host.addEventListener('pointerenter', function () { hostRect = host.getBoundingClientRect(); });
      addEventListener('scroll', function () { hostRect = null; }, { passive: true });
      host.addEventListener('pointermove', function (e) {
        if (drag || e.pointerType !== 'mouse') return;
        var r = hostRect || (hostRect = host.getBoundingClientRect());
        hx = ((e.clientX - r.left) / r.width - .5) * 18;
        hy = ((e.clientY - r.top) / r.height - .5) * 18;
        kick();
      });
      host.addEventListener('pointerleave', function () { hx = 0; hy = 0; kick(); });
    }
  })();

  /* ---------- 07b 首页海报：滚动放大铺满 ----------
     照 anthropic.com 首页那张大图实测的节奏（1280×800 下）：
       区块顶部在视口约 30% 处开始，滚到接近顶栏时铺满，前快后慢（ease-out）；圆角比宽度先收完。
     这里：进度按海报区块（.poster）的顶部算 —— 它在页面里的位置不会因为海报变大而变，算出来稳定。
       结束点 = 顶栏高度 + 往上长的那段（铺满时海报顶边正好贴着顶栏底边），开始点再往下 27% 屏高。
     样式在 css 第 11 节；每次滚动只在 rAF 里读一次位置、写几个变量。往回滚按原路收回成卡片。
     「减少动态效果」打开时不启用（一直是卡片）。 */
  (function posterBleed() {
    var sec = $('.poster'), frame = $('.poster__frame'), hdr = $('[data-header]');
    if (!sec || !frame || reduce) return;
<<<<<<< HEAD
    var ticking = false, up = 0, headH = 72, padTop = 0;
    var SAFE = 56;   /* 往上长时和上方内容至少隔这么多（原 40，用户要求加大，给不同浏览器的渲染差异留余量） */
    function update() {
      ticking = false;
      var t = sec.getBoundingClientRect().top;
      /* 区块顶部有一段 padding，海报本身在它下面：铺满时让海报（不是区块）的顶边贴着顶栏底边 */
      var end = headH + up - padTop, start = end + innerHeight * 0.27;
=======
    var ticking = false, up = 0, headH = 72;
    function update() {
      ticking = false;
      var t = sec.getBoundingClientRect().top;
      var end = headH + up, start = end + innerHeight * 0.27;
>>>>>>> 689b4cbc3492576f7787caa465e1566cb0b027cc
      var x = Math.max(0, Math.min(1, (start - t) / (start - end)));
      var p = 1 - Math.pow(1 - x, 1.6);                         /* 前快后慢 */
      var pr = 1 - Math.pow(1 - Math.min(1, x / 0.75), 1.6);    /* 圆角在 3/4 处就收完 */
      sec.style.setProperty('--p', p.toFixed(4));
      sec.style.setProperty('--pr', pr.toFixed(4));
    }
    function measure() {
      var vw = document.documentElement.clientWidth;          /* 不含滚动条，铺满时不会多出横向滚动 */
      var w = sec.getBoundingClientRect().width;
      var r = frame.getBoundingClientRect();
      var ratio = (r.width && r.height) ? r.height / r.width : 9 / 16;   /* 框当前的高宽比（16:9 / 手机 4:3） */
      headH = hdr ? hdr.getBoundingClientRect().height : 72;
<<<<<<< HEAD
      padTop = parseFloat(getComputedStyle(sec).paddingTop) || 0;
      /* 框的比例不变 → 铺满后多出来的高度 = 多出来的宽度 × 高宽比；理想是其中 45% 往上长 */
      up = Math.round(Math.max(0, vw - w) * ratio * 0.45);
      /* 但往上不能碰到上面的内容：量出海报顶边到上一块内容底边（hero 的文字、按钮、史莱姆球，
         不算它的底部留白）的距离，最多往上长到「这段距离 − SAFE 安全距离」，剩下的全往下长。
=======
<<<<<<< HEAD
      /* 框的比例不变 → 铺满后多出来的高度 = 多出来的宽度 × 高宽比；理想是其中 45% 往上长 */
      up = Math.round(Math.max(0, vw - w) * ratio * 0.45);
      /* 但往上不能碰到上面的内容：量出海报顶边到上一块内容底边（hero 的文字、按钮、史莱姆球，
         不算它的底部留白）的距离，最多往上长到「这段距离 − 40px 安全距离」，剩下的全往下长。
>>>>>>> 689b4cbc3492576f7787caa465e1566cb0b027cc
         以前没有这一步，宽屏上（1920 宽理想值约 170px，而留白只有约 96px）海报会盖住上面的内容（用户反馈）。 */
      var prev = sec.previousElementSibling;
      if (prev) {
        var pr = prev.getBoundingClientRect();
        var contentBottom = pr.bottom - (parseFloat(getComputedStyle(prev).paddingBottom) || 0);
        var vis = $('.hero__visual', prev);              /* 史莱姆球那一格，算进上方内容里 */
        if (vis) contentBottom = Math.max(contentBottom, vis.getBoundingClientRect().bottom);
<<<<<<< HEAD
        var room = sec.getBoundingClientRect().top + padTop - contentBottom - SAFE;   /* 海报顶边 = 区块顶 + padding */
        up = Math.max(0, Math.min(up, Math.floor(room)));
      }
=======
        var room = sec.getBoundingClientRect().top - contentBottom - 40;
        up = Math.max(0, Math.min(up, Math.floor(room)));
      }
=======
      /* 框的比例不变 → 铺满后多出来的高度 = 多出来的宽度 × 高宽比；其中 45% 往上长 */
      up = Math.round(Math.max(0, vw - w) * ratio * 0.45);
>>>>>>> c6eab5bf14277f1d474e95af228eb1f36b63b1ee
>>>>>>> 689b4cbc3492576f7787caa465e1566cb0b027cc
      sec.style.setProperty('--bleed', Math.max(0, (vw - w) / 2) + 'px');
      sec.style.setProperty('--up', up + 'px');
      update();
    }
    addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    addEventListener('resize', measure);
    measure();
    sec.classList.add('is-bleed');
  })();

  /* ---------- 卡片与面包屑构件 ---------- */
  /* showPin：只有分类页传 true —— 置顶是「在自己分类里」的事，
     首页、继续阅读里出现时不带这个小标。 */
  function pinHTML(a, showPin) {
    return (showPin && a.pin) ? '<span class="pin-badge">' + esc(t('pinned')) + '</span>' : '';
  }
  function cardHTML(a, showPin) {
    var s = secOf(a.section), c = catOf(s, a.cat), title = T(a.title);
    return '<article class="card reveal"><a class="card__link" href="' + artUrl(a.slug) + '">' +
      '<span class="card__media"><img src="' + url(a.cover) + '" alt="' + esc(title) + '" loading="lazy" width="800" height="800"></span>' +
      '<div class="card__body"><h3 class="card__title" title="' + esc(title) + '">' + esc(title) + '</h3>' +
      '<p class="card__meta">' + pinHTML(a, showPin) + '<span>' + esc(T(c ? c.label : (s ? s.label : ''))) + '</span>' +
      '<span>' + esc(fmtDate(a.date)) + '</span><span>' + esc(fmtRead(a.read)) + '</span></p>' +
      '</div></a></article>';
  }
  function listHTML(a, showPin) {
    var s = secOf(a.section), c = catOf(s, a.cat), title = T(a.title);
    return '<article class="list__item reveal"><a class="list__link" href="' + artUrl(a.slug) + '">' +
      '<span class="list__media"><img src="' + url(a.cover) + '" alt="' + esc(title) + '" loading="lazy" width="360" height="360"></span>' +
      '<div><h3 class="list__title" title="' + esc(title) + '">' + esc(title) + '</h3>' +
      '<p class="list__meta">' + pinHTML(a, showPin) + '<span>' + esc(T(c ? c.label : '')) + '</span><span>' + esc(fmtRead(a.read)) + '</span></p>' +
      '</div></a></article>';
  }
  function charArt(c) { return url(c.art || 'assets/images/characters/' + c.slug + '.png'); }
  function crumbHTML(parts) {
    var s = '<a href="' + url('home.html') + '">JasperPeng</a>';
    parts.forEach(function (p, i) {
      var last = i === parts.length - 1;
      s += '<i class="crumb__sep" aria-hidden="true"></i>';
      s += (p.href && !last) ? '<a href="' + p.href + '">' + esc(p.label) + '</a>'
                             : '<span' + (last ? ' aria-current="page"' : '') + '>' + esc(p.label) + '</span>';
    });
    return s;
  }
  function paintCrumbs(html) { $$('[data-crumb]').forEach(function (n) { n.innerHTML = html; }); }

  /* ---------- 08b 正文插图放大查看 ----------
     只给文章正文里的图用（封面、卡片、立绘都不接）。
     点开后图片完整显示（正文里是 3:2 裁切，这里不裁），然后：
       · 滚轮 / 触控板捏合 / 双指捏合  放大缩小，以指针所在处为中心
       · 双击 / 双击屏幕               在 1× 和 2.5× 之间切换
       · 放大后拖动                   平移看细节
       · Esc / 点空白处 / 右上角 ×     关闭；没放大时在手机上往下一划也能关
     放大倍数 1–6×。图片平移不让完全拖出视口。 */
  var zoomer = (function () {
    var box = null, img, cap, hint, closeBtn, lastFocus = null;
    var s = 1, tx = 0, ty = 0;              /* 当前缩放与平移 */
    var ptrs = {}, gesture = null, moved = false, lastTap = 0;
    var MIN = 1, MAX = 6;

    function build() {
      box = document.createElement('div');
      box.className = 'zoom';
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-modal', 'true');
      box.hidden = true;
      box.innerHTML =
        '<button class="zoom__close icon-btn" type="button" data-zoom-close>' +
          '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>' +
        '<div class="zoom__stage" data-zoom-stage><img class="zoom__img" alt="" draggable="false"></div>' +
        '<div class="zoom__foot"><p class="zoom__cap"></p><p class="zoom__hint"></p></div>';
      BODY.appendChild(box);
      img = $('.zoom__img', box); cap = $('.zoom__cap', box); hint = $('.zoom__hint', box);
      closeBtn = $('[data-zoom-close]', box);
      closeBtn.addEventListener('click', close);
      var stage = $('[data-zoom-stage]', box);
      stage.addEventListener('pointerdown', down);
      stage.addEventListener('pointermove', move);
      stage.addEventListener('pointerup', up);
      stage.addEventListener('pointercancel', up);
      stage.addEventListener('wheel', wheel, { passive: false });
      document.addEventListener('keydown', function (e) {
        if (box.hidden) return;
        if (e.key === 'Escape') close();
        else if (e.key === '+' || e.key === '=') zoomAt(s * 1.4, innerWidth / 2, innerHeight / 2, true);
        else if (e.key === '-') zoomAt(s / 1.4, innerWidth / 2, innerHeight / 2, true);
      });
    }

    function apply(animate) {
      img.style.transition = animate ? 'transform .32s cubic-bezier(.16,1,.3,1)' : 'none';
      img.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + s + ')';
      box.classList.toggle('is-zoomed', s > 1.01);
    }
    /* 平移边界：放大后图片边缘最多拖到视口边缘，不留大片空白 */
    function clampPan() {
      var w = img.offsetWidth * s, h = img.offsetHeight * s;
      var mx = Math.max(0, (w - innerWidth) / 2 + 24), my = Math.max(0, (h - innerHeight) / 2 + 24);
      tx = Math.max(-mx, Math.min(mx, tx));
      ty = Math.max(-my, Math.min(my, ty));
    }
    /* 以屏幕上 (px,py) 为不动点缩放到 ns。
       图片以自身中心为 transform-origin：屏幕点 = 中心 + t + s·u，
       u 不变 → t' = P − 中心 − s'·u */
    function zoomAt(ns, px, py, animate) {
      ns = Math.max(MIN, Math.min(MAX, ns));
      var cx = innerWidth / 2, cy = innerHeight / 2;
      var ux = (px - cx - tx) / s, uy = (py - cy - ty) / s;
      s = ns; tx = px - cx - s * ux; ty = py - cy - s * uy;
      if (s <= 1.001) { s = 1; tx = 0; ty = 0; }
      clampPan(); apply(animate);
    }

    function wheel(e) {
      e.preventDefault();
      /* 触控板捏合在浏览器里是 ctrl + wheel，幅度小，系数放大一点 */
      var k = e.ctrlKey ? 0.01 : 0.0018;
      zoomAt(s * Math.exp(-e.deltaY * k), e.clientX, e.clientY, false);
    }

    function down(e) {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
      var ids = Object.keys(ptrs);
      moved = false;
      if (ids.length === 2) {
        var a = ptrs[ids[0]], b = ptrs[ids[1]];
        gesture = { kind: 'pinch', d: Math.hypot(a.x - b.x, a.y - b.y) || 1, s: s,
                    mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, tx: tx, ty: ty };
      } else {
        gesture = { kind: 'pan', x: e.clientX, y: e.clientY, tx: tx, ty: ty, onImg: e.target === img };
      }
    }
    function move(e) {
      if (!ptrs[e.pointerId] || !gesture) return;
      ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
      var ids = Object.keys(ptrs);
      if (gesture.kind === 'pinch' && ids.length >= 2) {
        var a = ptrs[ids[0]], b = ptrs[ids[1]];
        var d = Math.hypot(a.x - b.x, a.y - b.y);
        var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        /* 先回到捏合开始时的状态，再按比例缩放，再跟着两指中点平移 */
        s = gesture.s; tx = gesture.tx; ty = gesture.ty;
        zoomAt(gesture.s * d / gesture.d, gesture.mx, gesture.my, false);
        tx += mx - gesture.mx; ty += my - gesture.my;
        clampPan(); apply(false);
        moved = true;
      } else if (gesture.kind === 'pan') {
        var dx = e.clientX - gesture.x, dy = e.clientY - gesture.y;
        if (Math.abs(dx) + Math.abs(dy) > 6) moved = true;
        if (s > 1) {
          tx = gesture.tx + dx; ty = gesture.ty + dy;
          apply(false);
        } else if (e.pointerType !== 'mouse') {
          /* 没放大时手指往下拖：图跟着走、背景变淡，松手超过阈值就关 */
          ty = Math.max(0, dy);
          img.style.transition = 'none';
          img.style.transform = 'translate(0,' + ty + 'px) scale(' + (1 - Math.min(ty, 300) / 1500) + ')';
          box.style.setProperty('--fade', String(1 - Math.min(ty, 300) / 400));
        }
      }
    }
    function up(e) {
      if (!ptrs[e.pointerId]) return;
      delete ptrs[e.pointerId];
      var left = Object.keys(ptrs).length;
      if (gesture && gesture.kind === 'pinch') {
        if (left === 1) {               /* 两指松开一指：剩下那根接着拖 */
          var id = Object.keys(ptrs)[0];
          gesture = { kind: 'pan', x: ptrs[id].x, y: ptrs[id].y, tx: tx, ty: ty };
          return;
        }
        gesture = null; clampPan(); apply(true); return;
      }
      if (left) return;
      var g = gesture; gesture = null;
      if (!g) return;
      if (s <= 1 && ty > 110) { close(); return; }
      if (s <= 1 && ty) { ty = 0; box.style.removeProperty('--fade'); apply(true); return; }
      if (moved) { clampPan(); apply(true); return; }
      /* 没拖动 = 一次点击：双击切换缩放；单击空白处关闭 */
      var now = Date.now();
      if (now - lastTap < 300) {
        lastTap = 0;
        zoomAt(s > 1.01 ? 1 : 2.5, e.clientX, e.clientY, true);
        return;
      }
      lastTap = now;
      if (!g.onImg && s <= 1.01) {
        setTimeout(function () { if (lastTap === now) close(); }, 300);
      }
    }

    function open(src, alt, caption) {
      if (!box) build();
      lastFocus = document.activeElement;
      s = 1; tx = 0; ty = 0; ptrs = {}; gesture = null;
      box.style.removeProperty('--fade');
      img.src = src; img.alt = alt || '';
      cap.textContent = caption || '';
      cap.hidden = !caption;
      hint.textContent = t('zoomHint');
      closeBtn.setAttribute('aria-label', t('zoomClose'));
      box.setAttribute('aria-label', alt || caption || t('zoomClose'));
      apply(false);
      box.hidden = false;
      BODY.classList.add('is-locked');
      requestAnimationFrame(function () { box.classList.add('is-on'); closeBtn.focus(); });
    }
    function close() {
      if (!box || box.hidden) return;
      box.classList.remove('is-on', 'is-zoomed');
      BODY.classList.remove('is-locked');
      setTimeout(function () { box.hidden = true; img.removeAttribute('src'); }, 260);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    return { open: open };
  })();

  /* 让 root 里的图片都能点开放大。包在链接里的图不接（点它应该跟链接走）。 */
  function zoomable(root) {
    if (!root) return;
    $$('img', root).forEach(function (im) {
      if (im.closest('a')) return;
      var fig = im.closest('figure');
      var capEl = fig ? $('figcaption', fig) : null;
      im.classList.add('is-zoomable');
      im.setAttribute('tabindex', '0');
      im.setAttribute('role', 'button');
      function go() { zoomer.open(im.currentSrc || im.src, im.alt, capEl ? capEl.textContent : ''); }
      im.addEventListener('click', go);
      im.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
      });
    });
  }

  /* ---------- 08 文章页 ----------
     正文块。data.js 里 body 可以写成两种：
       1) 直接一段 HTML 字符串   body: '<p>…</p><h2>…</h2>'
       2) 块数组（下面这些 t 值）
            { t:'p',      v:'段落' }
            { t:'h2',     v:'小标题' }   { t:'h3', v:'更小的标题' }
            { t:'quote',  v:'引用' }
            { t:'ul',     v:['一','二'] }  { t:'ol', v:[…] }
            { t:'hr' }
            { t:'img',    src:'assets/images/works/foo.png', cap:'图注', alt:'…' }
            { t:'figure', cap:'图注' }                 // 不给 src 就用封面
            { t:'html',   v:'<div class="…">随便写</div>' }   // 原样输出，不转义
     除了 html / 字符串两种，其余都会转义，写中文标点和 < > 都不会出事。
     排版想自己控就用 html 块 —— 那一段可以写任何标签和 class。 */
  function bodyHTML(a, title) {
    var body = a.body;
    if (typeof body === 'string') return body;          /* 整篇直接写 HTML */
    if (!body || !body.length) return '';
    return body.map(function (b) {
      if (typeof b === 'string') return '<p>' + esc(b) + '</p>';
      switch (b.t) {
        case 'p':     return '<p>' + esc(b.v) + '</p>';
        case 'h2':    return '<h2>' + esc(b.v) + '</h2>';
        case 'h3':    return '<h3>' + esc(b.v) + '</h3>';
        case 'quote': return '<blockquote>' + esc(b.v) + '</blockquote>';
        case 'hr':    return '<hr>';
        case 'html':  return b.v || '';                 /* 原样，不转义 */
        case 'ul': case 'ol': {
          var tag = b.t;
          return '<' + tag + '>' + (b.v || []).map(function (x) {
            return '<li>' + esc(x) + '</li>';
          }).join('') + '</' + tag + '>';
        }
        case 'img': case 'figure': {
          var src = b.src ? url(b.src) : url(a.cover);
          var alt = b.alt || b.cap || title;
          return '<figure class="fig"><span class="fig__media"><img src="' + src +
                 '" alt="' + esc(alt) + '" loading="lazy"></span>' +
                 (b.cap ? '<figcaption>' + esc(b.cap) + '</figcaption>' : '') + '</figure>';
        }
      }
      return '';
    }).join('');
  }

  /* ---------- 08 文章页 ---------- */
  function renderArticle() {
    var host = $('[data-article]');
    if (!host) return;
    /* 生成的文章页在 <body data-slug> 上写着自己是哪篇；?a= 是兼容旧写法 */
    var slug = BODY.getAttribute('data-slug') || new URLSearchParams(location.search).get('a');
    var a = slug ? artOf(slug) : null;

    if (!a) {
      document.title = t('notFound') + ' — JasperPeng';
      host.innerHTML = '<div class="wrap empty" style="margin-top:48px">' +
        '<p class="h3">' + t('notFound') + '</p><p class="lede">' + t('notFoundDesc') + '</p>' +
        '<a class="btn btn--soft" href="' + url('home.html') + '">' + t('toHome') + '<i class="arr"></i></a></div>';
      paintCrumbs(crumbHTML([{ label: t('notFound') }]));
      return;
    }
    var s = secOf(a.section), c = catOf(s, a.cat);
    var title = T(a.title), lede = T(a.lede);
    document.title = title + ' — JasperPeng';
    var m = $('meta[name="description"]'); if (m) m.setAttribute('content', lede || title);

    /* 正文保持写作时的原文，不做翻译 —— openai.com 同样如此。
       界面（导航/分类/标题/导语/日期）才随语言切换。
       界面语言和正文语言对不上时，先说明一句，免得读者以为翻译坏了。
       繁体读者能直接读简体正文，所以不提示。 */
    var note = (a.bodyLang && a.bodyLang !== LANG && !(a.bodyLang === 'zh-Hans' && LANG === 'zh-Hant'))
      ? '<p class="note-lang">' + esc(t('bodyOriginal')) + '</p>' : '';
    host.innerHTML =
      /* 版式对标 openai.com 的文章页（2026-10-04 用户确认）：
           标题上方   日期 + 分类（分类可点，回到分类页）
           导语下方   阅读时长 + 分享
           正文之后   一块圆角底板：标签胶囊（点了按标签搜索）+「作者」
         以前标签和作者在标题上方的深色标签栏里（Figma 批注的写法），用户改成了这样。 */
      '<header class="article__head read">' +
        '<p class="article__kicker"><time datetime="' + esc(a.date) + '">' + esc(fmtDate(a.date)) + '</time>' +
          (c ? '<a href="' + catUrl(s, c.slug) + '">' + esc(T(c.label)) + '</a>' : '') + '</p>' +
        '<h1 class="article__title">' + esc(title) + '</h1>' +
        (lede ? '<p class="article__lede">' + esc(lede) + '</p>' : '') +
        '<p class="article__meta"><span>' + esc(fmtRead(a.read)) + '</span>' +
          '<button class="article__share" type="button" data-share>' +
            '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M5 12v6.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V12"/></svg>' +
            '<span data-share-label>' + esc(t('share')) + '</span></button></p>' +
      '</header>' +
      /* 标题下面不放封面大图 —— openai.com 的文章页就没有（2026-10-04 实测 4 篇）。
         封面只用在卡片、列表和分享卡片（og:image）上；正文想放图就在 body 里写 figure / img。 */
      '<div class="article__body read">' + note + bodyHTML(a, title) + '</div>' +
      '<aside class="article__foot wrap"><div class="read">' +
        ((a.tags || []).length ? '<div class="article__tags">' + a.tags.map(function (x) {
          return '<button type="button" class="article__tag" data-tag="' + esc(T(x)) + '">' + esc(T(x)) + '</button>';
        }).join('') + '</div>' : '') +
        '<p class="article__foot-label">' + esc(t('author')) + '</p>' +
        '<p class="article__author">' + esc(a.author) + '</p>' +
      '</div></aside>';

    /* 分享：手机（触屏）上调系统分享面板（微信、信息…）；电脑上直接复制链接并提示一下。
       链接用 canonical 里的正式地址（https://jasperpeng.uk/articles/<slug>/），没有就用当前地址。
       不接任何第三方分享服务。 */
    var shareBtn = $('[data-share]', host);
    if (shareBtn) shareBtn.addEventListener('click', function () {
      var canon = $('link[rel="canonical"]');
      var link = (canon && /^https?:/.test(canon.getAttribute('href'))) ? canon.getAttribute('href') : location.href;
      var label = $('[data-share-label]', shareBtn);
      function done() {
        label.textContent = t('copied');
        shareBtn.classList.add('is-done');
        clearTimeout(shareBtn._t);
        shareBtn._t = setTimeout(function () { label.textContent = t('share'); shareBtn.classList.remove('is-done'); }, 2000);
      }
      function copy() {
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(link).then(done, legacy);
        } else legacy();
      }
      function legacy() {            /* http:// 或老浏览器：用隐藏文本框复制 */
        var ta = document.createElement('textarea');
        ta.value = link; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); done(); } catch (e) {}
        ta.remove();
      }
      if (navigator.share && matchMedia('(pointer: coarse)').matches) {
        navigator.share({ title: document.title, url: link }).catch(function () {});
      } else copy();
    });

    $$('[data-tag]', host).forEach(function (b) {
      b.addEventListener('click', function () {
        if (window.__openSearch) window.__openSearch(b.getAttribute('data-tag'));
      });
    });
    /* 正文里的插图都能点开放大（顶部那张封面不算，它不在 .article__body 里） */
    zoomable($('.article__body', host));

    paintCrumbs(crumbHTML([
      { label: T(s.label), href: c ? catUrl(s, c.slug) : url('home.html') },
      { label: T(c ? c.label : ''), href: c ? catUrl(s, c.slug) : url('home.html') },
      { label: title }
    ]));

    /* 继续阅读：按 weight 加权推荐，同分类优先（见上面的 recommend） */
    var pool = recommend(a, 3);
    var wrap = $('[data-related]');
    if (pool.length && wrap) {
      $('[data-related-grid]').innerHTML = pool.map(function (x) { return cardHTML(x); }).join('');
      var rt = $('[data-related-title]');
      rt.setAttribute('data-name-key', s.key + (c ? '.' + c.slug : ''));
      rt.textContent = T(c ? c.label : s.label) + t('otherIn');
      $('[data-related-more]').setAttribute('href', c ? catUrl(s, c.slug) : url('home.html'));
      wrap.hidden = false;
    }
    i18n(); reveal(document); patchDirLinks();
  }

  /* ---------- 09 分类页 ---------- */
  function renderCategory() {
    var grid = $('[data-cat-grid]');
    if (!grid) return;
    var s = secOf(BODY.getAttribute('data-section')), slug = BODY.getAttribute('data-cat');
    var c = catOf(s, slug);
    if (!s || !c) return;

    document.title = T(c.label) + ' — ' + T(s.label) + ' — JasperPeng';
    /* 分类页的标题 / 描述 / eyebrow 也随语言变 */
    var el;
    if ((el = $('[data-cat-title]'))) el.textContent = T(c.label);
    if ((el = $('[data-cat-desc]')))  el.textContent = T(c.desc);
    if ((el = $('[data-cat-eyebrow]'))) el.textContent = T(s.kicker);
    if ((el = $('meta[name="description"]'))) el.setAttribute('content', T(c.desc));
    var list = byCat(s.key, slug, true);          /* 置顶的排最前 */
    var n = $('[data-cat-count]');
    if (n && list.length) { n.setAttribute('data-n', list.length); n.textContent = list.length + t('count'); }

    var lw = $('[data-cat-list-wrap]');
    if (list.length) {
      /* Figma 通用版式：前 3 篇走 3 列大卡，其余走 2 列小块。
         置顶的文章在这里带一个「置顶」小标（只在它自己的分类页里显示） */
      grid.innerHTML = list.slice(0, 3).map(function (a) { return cardHTML(a, true); }).join('');
      var rest = list.slice(3);
      if (rest.length && lw) { $('[data-cat-list]').innerHTML = rest.map(function (a) { return listHTML(a, true); }).join(''); lw.hidden = false; }
    } else {
      grid.hidden = true;
      var e = $('[data-cat-empty]'); if (e) e.hidden = false;
    }

    /* 同级分类：可在 Artifacts / Design / … 之间横跳，当前项高亮 */
    var sib = $('[data-siblings]');
    if (sib) {
      sib.innerHTML = s.cats.map(function (x) {
        return '<a class="cats__link" href="' + catUrl(s, x.slug) + '"' +
               (x.slug === slug ? ' aria-current="page"' : '') + '>' + esc(T(x.label)) + '</a>';
      }).join('');
      var act = $('[aria-current="page"]', sib);
      if (act) sib.scrollLeft = Math.max(0, act.offsetLeft - 20);
    }
    paintCrumbs(crumbHTML([{ label: T(s.label), href: url('home.html#' + s.key) }, { label: T(c.label) }]));
    i18n(); reveal(document); patchDirLinks();
  }

  /* ---------- 10 角色页 ----------
     原地切换 + 地址同步：单个角色的链接能直接分享；
     切角色不产生浏览器历史，返回键一次就离开角色页（见 select）。 */
  /* 筛选状态和「事件已经绑过了」的标记放在函数外面：
     换语言时 rerender() 会再调一次 renderCharacters()，
     状态留在函数里的话，筛选会被重置，监听器还会一层层叠上去
     —— 叠两层之后点取值胶囊等于点了两下，选中立刻被自己取消，看起来就是筛选失灵。 */
  var charMode = 'all', charPick = null, charsBound = false;

  function renderCharacters() {
    var strip = $('[data-char-strip]');
    if (!strip || !CHARACTERS.length) return;
    var stage = $('[data-char-stage]');
    var filters = $$('[data-char-filter]');
    var values = $('[data-char-values]');

    /* 两级筛选：先选维度（年份 / 版本 / 地图），再选具体值。
       只做排序的话，数据本来就按年份排列，点了看起来毫无反应。 */
    /* 取值不一定是字符串：year / version 是字符串，region 是四语对象。
       所以显示走 T()，比较走一个跟语言无关的稳定键（四语对象取简体那一支）。
       以前直接把取值当字符串用，「地图」这一维就渲染成了 [object Object]，
       而且所有角色都并成了同一个键，筛出来永远只剩一个。 */
    function valKey(v) { return (v && typeof v === 'object') ? (v['zh-Hans'] || '') : String(v); }
    function distinct(key) {
      var seen = {}, out = [];
      CHARACTERS.forEach(function (c) {
        var v = c[key];
        if (!v) return;
        var k = valKey(v);
        if (k && !seen[k]) { seen[k] = 1; out.push({ k: k, v: v }); }
      });
      return out.sort(function (a, b) { return T(a.v).localeCompare(T(b.v), 'zh'); });
    }
    function paintValues() {
      if (!values) return;
      filters.forEach(function (o) {
        o.setAttribute('aria-pressed', String(o.getAttribute('data-char-filter') === charMode));
      });
      if (charMode === 'all') { values.innerHTML = ''; values.hidden = true; return; }
      values.hidden = false;
      values.innerHTML = distinct(charMode).map(function (o) {
        var n = CHARACTERS.filter(function (c) { return valKey(c[charMode]) === o.k; }).length;
        return '<button class="chars__value" type="button" data-char-value="' + esc(o.k) + '"' +
               (o.k === charPick ? ' aria-pressed="true"' : ' aria-pressed="false"') +
               '>' + esc(T(o.v)) + '<em>' + n + '</em></button>';
      }).join('');
    }
    function pool() {
      if (charMode === 'all' || !charPick) return CHARACTERS.slice();
      return CHARACTERS.filter(function (c) { return valKey(c[charMode]) === charPick; });
    }
    function charOf(s) {
      for (var i = 0; i < CHARACTERS.length; i++) if (CHARACTERS[i].slug === s) return CHARACTERS[i];
      return CHARACTERS[0];
    }
    function paintStrip(cur) {
      var list = pool();
      strip.innerHTML = list.length ? list.map(function (c) {
        return '<button class="chars__thumb" type="button" data-char="' + c.slug + '"' +
               (c.slug === cur ? ' aria-current="true"' : '') + ' aria-label="' + esc(T(c.name)) + '">' +
               '<img src="' + charArt(c) + '" alt="" loading="lazy" width="180" height="300"></button>';
      }).join('') : '<p class="chars__none">' + t('noResult') + '</p>';
      /* 筛选之后当前角色可能被推到可视区外，把它带回来 */
      var act = $('[data-char][aria-current="true"]', strip);
      if (act && act.scrollIntoView) act.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
    function paintStage(c) {
      var name = T(c.name);
      stage.innerHTML =
        '<div class="chars__art"><img src="' + charArt(c) +
          '" alt="' + esc(name) + '" width="800" height="800"></div>' +
        '<div><h1 class="chars__name">' + esc(name) + '</h1>' +
        '<p class="chars__role">' + esc(T(c.role)) + ' · ' + esc(T(c.age)) + ' ' + esc(T(c.sex)) + '</p>' +
        '<p class="chars__quote">' + esc(T(c.quote)) + '</p>' +
        '<p class="chars__bio">' + esc(T(c.bio)) + '</p>' +
        '<div class="chars__cta"><a class="btn btn--primary" href="' +
          catUrl(secOf('about'), c.res) + '">' + esc(t('viewRes')) + '<i class="arr"></i></a></div></div>';
      document.title = name + ' — ' + T(secOf('characters').label) + ' — JasperPeng';
    }
    function select(slug, push) {
      var c = charOf(slug);
      paintStrip(c.slug); paintStage(c); i18n(); patchDirLinks();
      paintCrumbs(crumbHTML([
        { label: T(secOf('characters').label), href: url('home.html#characters') },
        { label: T(c.name) }
      ]));
      /* 地址栏跟着换成 ?c=<slug>（链接可以直接分享到某个角色），
         但用 replaceState 而不是 pushState —— 切角色不往浏览器历史里堆记录。
         以前每点一个缩略图都 push 一条，切了 5 个角色就得按 5 次返回才能离开角色页（用户反馈）。
         现在按一次返回就回到进角色页之前的那一页。 */
      if (push) history.replaceState({ c: c.slug }, '', '?c=' + c.slug);
    }

    function currentSlug() {
      var el = $('[data-char][aria-current="true"]', strip);
      return el ? el.getAttribute('data-char') : (new URLSearchParams(location.search).get('c') || CHARACTERS[0].slug);
    }

    /* 事件只绑一次 —— 换语言会再进这个函数，再绑一遍就是叠加 */
    if (!charsBound) {
      charsBound = true;
      strip.addEventListener('click', function (e) {
        var b = e.target.closest('[data-char]');
        if (b) select(b.getAttribute('data-char'), true);
      });
      filters.forEach(function (f) {
        f.addEventListener('click', function () {
          charMode = f.getAttribute('data-char-filter');
          charPick = null;                 /* 换维度时清掉旧的取值 */
          paintValues();
          paintStrip(currentSlug());
        });
      });
      if (values) values.addEventListener('click', function (e) {
        var b = e.target.closest('[data-char-value]');
        if (!b) return;
        var v = b.getAttribute('data-char-value');
        charPick = (charPick === v) ? null : v;   /* 再点一次取消 */
        paintValues();
        paintStrip(currentSlug());
      });
    }

    /* 角色板块下的文章。「原创角色」分类已经改成跳到本页，
       它那两篇文章原本的列表页没了 —— 收在这里，保证站内走得到。 */
    (function reading() {
      var wrap = $('[data-char-reading]'), host = $('[data-char-reading-list]');
      if (!wrap || !host) return;
      var list = ARTICLES.filter(function (a) { return a.section === 'characters'; });
      if (!list.length) return;
      host.innerHTML = list.map(function (a) { return listHTML(a); }).join('');
      wrap.hidden = false;
    })();

    paintValues();                 /* 换语言时地图名要跟着翻译，筛选状态保持不变 */
    select(new URLSearchParams(location.search).get('c') || CHARACTERS[0].slug, false);
  }



  function i18n() {
    /* 纯 UI 词 */
    $$('[data-i18n]').forEach(function (el) {
      var v = t(el.getAttribute('data-i18n'));
      if (el.tagName === 'INPUT') el.setAttribute('placeholder', v); else el.textContent = v;
    });
    /* 静态页头页脚里的板块 / 分类名 */
    $$('[data-t]').forEach(function (el) {
      var v = resolvePath(el.getAttribute('data-t'));
      if (v == null) return;
      /* 只换文本节点，保留同级的箭头等图标元素 */
      var done = false;
      for (var i = 0; i < el.childNodes.length; i++) {
        if (el.childNodes[i].nodeType === 3) { el.childNodes[i].nodeValue = v; done = true; break; }
      }
      if (!done) el.insertBefore(document.createTextNode(v), el.firstChild);
    });
    var meta = LANGS.filter(function (l) { return l.code === LANG; })[0];
    document.documentElement.lang = meta ? meta.html : 'zh-CN';
    alignMenus();                 /* 标签换了语言，宽度就变了，重新对齐一次 */

    /* 重刷由 JS 拼出、不带标记的动态文案 */
    var n = $('[data-cat-count]');
    if (n && n.getAttribute('data-n')) n.textContent = n.getAttribute('data-n') + t('count');
    var rt = $('[data-related-title]');
    if (rt && rt.getAttribute('data-name-key')) {
      var parts = rt.getAttribute('data-name-key').split('.');
      var sec = secOf(parts[0]), c = parts[1] ? catOf(sec, parts[1]) : null;
      rt.textContent = T(c ? c.label : (sec ? sec.label : '')) + t('otherIn');
    }
  }

  /* 语言变更后，重新渲染当前页由数据生成的内容 */
  function rerender() {
    if (PAGE === 'article')          renderArticle();
    else if (PAGE === 'category')    renderCategory();
    else if (PAGE === 'characters')  renderCharacters();
    else                             rerenderStaticCards();
    i18n();
  }

  /* ---------- 首页「最近更新」 ----------
     规则和 build.ps1 的 3d 一样：date 新的在前，同一天 weight 高的在前，再相同按 data.js 书写顺序。
     build.ps1 已经把这 9 篇写进了 home.html（首屏就是对的、没有 JS 也看得到）；
     这里打开页面时再按 data.js 核对一遍顺序 —— 改了日期忘了跑构建，首页照样是对的。
     顺序一致就什么都不动（不重画，图片也不会闪）。 */
  function recentArticles(n) {
    return ARTICLES.map(function (a, i) { return { a: a, i: i }; })
      .sort(function (p, q) {
        if (p.a.date !== q.a.date) return p.a.date < q.a.date ? 1 : -1;
        if (p.a.weight !== q.a.weight) return q.a.weight - p.a.weight;
        return p.i - q.i;
      }).slice(0, n).map(function (x) { return x.a; });
  }
  function renderRecent() {
    var grid = $('[data-recent-grid]'), list = $('[data-recent-list]');
    if (!grid || !list) return;
    var want = recentArticles(9);
    var have = $$('[data-slug]', grid).concat($$('[data-slug]', list)).map(function (el) { return el.getAttribute('data-slug'); });
    if (want.map(function (a) { return a.slug; }).join() === have.join()) return;
    /* data-slug 留着，后面 rerenderStaticCards 按语言重写文案时认得出来 */
    function tag(html, slug) { return html.replace(/^<article class="([^"]+)"/, '<article class="$1" data-slug="' + slug + '"'); }
    grid.innerHTML = want.slice(0, 3).map(function (a) { return tag(cardHTML(a), a.slug); }).join('');
    list.innerHTML = want.slice(3).map(function (a) { return tag(listHTML(a), a.slug); }).join('');
  }

  /* 首页的卡片是静态 HTML，用 data-slug 认领对应文章后重写文案 */
  function rerenderStaticCards() {
    $$('[data-slug]').forEach(function (el) {
      var a = artOf(el.getAttribute('data-slug'));
      if (!a) return;
      var sec = secOf(a.section), c = catOf(sec, a.cat);
      var ttl = $('.card__title, .list__title', el);
      if (ttl) ttl.textContent = T(a.title);
      var meta = $('.card__meta, .list__meta', el);
      if (meta) {
        var bits = [T(c ? c.label : sec.label)];
        if (meta.classList.contains('card__meta')) bits.push(fmtDate(a.date));
        bits.push(fmtRead(a.read));
        meta.innerHTML = bits.map(function (b) { return '<span>' + esc(b) + '</span>'; }).join('');
      }
      var img = $('img', el);
      if (img) img.setAttribute('alt', T(a.title));
    });
  }

  (function langPicker() {
    var box = $('[data-lang]');
    if (!box) return;
    var btn = $('[data-lang-btn]', box), label = $('[data-lang-label]', box), menu = $('[data-lang-menu]', box);
    menu.innerHTML = LANGS.map(function (l) {
      return '<li><button type="button" role="option" data-code="' + l.code + '" aria-selected="' +
             (l.code === LANG) + '">' + esc(l.label) + '</button></li>';
    }).join('');
    function paint() {
      var m = LANGS.filter(function (l) { return l.code === LANG; })[0] || LANGS[0];
      if (label) label.textContent = m.label;
      $$('[data-code]', menu).forEach(function (o) { o.setAttribute('aria-selected', String(o.getAttribute('data-code') === LANG)); });
    }
    paint();
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      btn.setAttribute('aria-expanded', String(box.classList.toggle('is-open')));
    });
    $$('[data-code]', menu).forEach(function (o) {
      o.addEventListener('click', function () {
        var code = o.getAttribute('data-code');
        box.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false');
        if (code === LANG) return;
        /* 换语言后整页重载（用户要求）。
           就地重画曾经会漏：各页的渲染函数被第二次调用时，有些块（相关阅读、角色筛选器）
           会消失，非得手动刷新才回来 —— 根子在「渲染函数不是幂等的」，
           一处一处补容易再漏。重载最省事也最可靠：语言存在 localStorage 里，
           查询串（?a= / ?c=）由 reload 原样保留，滚动位置浏览器自己恢复。 */
        var saved = false;
        try { localStorage.setItem('jp-lang', code); saved = true; } catch (e) {}
        if (saved) { location.reload(); return; }
        /* localStorage 被禁（无痕模式等）：存不住就不能重载，退回就地重画 */
        LANG = code;
        paint();
        if (window.__rebuildSearch) window.__rebuildSearch();  /* 搜索索引跟着换语言 */
        rerender();                                            /* 重画本页由数据生成的内容 */
      });
    });
    document.addEventListener('click', function () { box.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); });
    box.addEventListener('click', function (e) { e.stopPropagation(); });
  })();

  /* ---------- 12 跳转过渡 ----------
     整套删掉了。以前这里会先给 body 加 is-exiting 淡出，等 240ms 再真正跳转 ——
     不支持 View Transitions 的浏览器（比如用户的手机）每点一次链接就白等四分之一秒，
     观感就是「卡」；支持的那一半走 CSS 的 @view-transition，又会在新页面 JS 还没渲染完
     的那一帧被换上去，闪一下空白再跳成有内容。两条路都不划算，现在点了立刻走。
     css/style.css 第 20 节那段同源注释里记了要加回来该改哪两处。 */

  /* ---------- 启动 ---------- */
  if (PAGE === 'article')          renderArticle();
  else if (PAGE === 'category')    renderCategory();
  else if (PAGE === 'characters')  renderCharacters();
  else                             { renderRecent(); rerenderStaticCards(); }
  /* 首页那几张卡是手写在 home.html 里的静态 HTML，元信息（分类名 / 阅读时长）
     以前只在「换语言」时才由 rerenderStaticCards() 重写 —— 于是首次打开
     简体首页会看到「News · 2026年8月18日 · 8 min read」这种中英混排。
     启动时也走一遍，静态文案就永远跟当前语言一致了。 */

  i18n();
  alignMenus();
  reveal(document);
  patchDirLinks();
  /* main.js 是 defer，静态 HTML 里的图可能在它跑起来之前就已经失败过一次，
     那时捕获监听还没挂上 —— 这里补一遍。 */
  $$('img').forEach(function (im) { if (im.complete && im.naturalWidth === 0) fixImg(im); });
  document.documentElement.classList.add('js-on');
})();
