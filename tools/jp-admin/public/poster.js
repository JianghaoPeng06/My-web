/* JasperPeng 后台 —— 首页海报（assets/images/poster.*）和它的图注（main.js 的 posterCap）
   换图 / 换视频 POST /api/poster；去掉视频 DELETE /api/poster/video；图注 PUT /api/poster/caption */
(function () {
  'use strict';
  var J = window.JPA, $ = J.$, $$ = J.$$, esc = J.esc;
  var LANG_NAME = { 'zh-Hans': '简体', 'zh-Hant': '繁體', en: 'English', ja: '日本語' };
  var MAX = 25 * 1024 * 1024;            // Cloudflare Pages 单个文件的上限
  var capDirty = false;

  function P() { return J.state().poster; }
  function mb(n) { return (n / 1024 / 1024).toFixed(n < 10 * 1024 * 1024 ? 1 : 0) + ' MB'; }
  function base(s) { return s ? s.split('/').pop() : ''; }

  function render() {
    var p = P(), box = $('[data-p-frame]');
    var still = p.image ? J.img(p.image.src) : '';
    if (p.video) {
      box.innerHTML = '<video src="' + esc(J.img(p.video.src)) + '"' + (still ? ' poster="' + esc(still) + '"' : '') + ' muted playsinline autoplay></video>';
    } else {
      box.innerHTML = still ? '<img src="' + esc(still) + '" alt="">' : '<em>还没有海报</em>';
    }
    $('[data-p-status]').textContent = p.video
      ? '现在是视频 ' + base(p.video.src) + '（' + mb(p.video.size) + '）＋ 静止画面 ' + (p.image ? base(p.image.src) : '（还没有）')
      : '现在是图片 ' + (p.image ? base(p.image.src) + (p.image.placeholder ? '（占位图）' : '') : '（还没有）');
    $('[data-p-replay]').hidden = !p.video;
    $('[data-p-novideo]').hidden = !p.video;
    $('[data-p-drop="image"] strong').textContent = p.video ? '换静止画面' : '选一张图片';
    $('[data-p-image-help]').textContent = p.video
      ? '有视频的时候，这张图是视频没播之前、不能播的时候显示的静止画面，最好就是视频的最后一帧。'
      : '建议 16:9、宽 2560 像素左右。会自动缩到长边 2800 以内；带透明的存 PNG，其他存 JPG。';
    if (!capDirty) renderCap();
  }
  function renderCap() {
    var cap = P().cap, box = $('[data-p-cap]');
    if (!cap) { box.innerHTML = '<p class="muted">main.js 里图注的写法变了，后台没法改，请直接改 main.js 里的 posterCap。</p>'; $('[data-p-cap-save]').disabled = true; return; }
    box.innerHTML = J.LANGS.map(function (l) {
      return '<label class="lbl">' + LANG_NAME[l] + '<input class="field" data-cap="' + l + '" value="' + esc(cap[l] || '') + '"' + (l !== 'zh-Hans' ? ' placeholder="空着就显示简体"' : '') + '></label>';
    }).join('');
    capState();
  }
  function capState() {
    var el = $('[data-p-cap-state]'); el.textContent = capDirty ? '有改动没保存' : ''; el.classList.toggle('is-dirty', capDirty);
  }
  $('[data-p-cap]').addEventListener('input', function () { capDirty = true; capState(); });
  function saveCap() {
    var cap = {}; $$('[data-cap]').forEach(function (el) { cap[el.getAttribute('data-cap')] = el.value.trim(); });
    if (!cap['zh-Hans']) return J.toast('简体图注不能空着', true);
    J.api('PUT', '/api/poster/caption', { cap: cap }).then(function (r) {
      P().cap = r.cap; capDirty = false; renderCap(); J.setNeedBuild(true); J.toast('图注保存好了');
    }).catch(function (e) { J.toast(e.message, true); });
  }
  $('[data-p-cap-save]').addEventListener('click', saveCap);

  $('[data-p-ratio]').addEventListener('click', function (e) {
    var b = e.target.closest('[data-r]'); if (!b) return;
    $$('[data-p-ratio] button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    $('[data-p-frame]').style.aspectRatio = b.getAttribute('data-r');
  });
  $('[data-p-replay]').addEventListener('click', function () { var v = $('[data-p-frame] video'); if (v) { v.currentTime = 0; v.play(); } });

  function done(p, msg) { J.state().poster = p; J.bump(); J.setNeedBuild(true); render(); J.toast(msg); }
  function busy(el, on) { el.classList.toggle('is-busy', on); }

  // 换图片 / 静止画面
  J.bindDrop($('[data-p-drop="image"]'), function (file) {
    var d = $('[data-p-drop="image"]'); busy(d, true);
    J.prepImage(file, { max: 2800 }).then(function (p) {
      return J.api('POST', '/api/poster', { kind: 'image', ext: p.ext, data: p.data });
    }).then(function (p) { done(p, P().video ? '静止画面换好了' : '海报换好了'); })
      .catch(function (e) { J.toast(e.message, true); }).then(function () { busy(d, false); });
  });

  // 视频的最后一帧 → 图片（PNG 和 JPG 哪个小用哪个；插画类 PNG 往往更小也更清楚）
  function lastFrame(file) {
    return new Promise(function (ok, no) {
      var v = document.createElement('video'), url = URL.createObjectURL(file);
      v.muted = true; v.preload = 'auto'; v.src = url;
      v.onloadedmetadata = function () { v.currentTime = Math.max(0, v.duration - 0.04); };
      v.onseeked = function () {
        var k = Math.min(1, 2800 / Math.max(v.videoWidth, v.videoHeight));
        var cv = document.createElement('canvas'); cv.width = Math.round(v.videoWidth * k); cv.height = Math.round(v.videoHeight * k);
        cv.getContext('2d').drawImage(v, 0, 0, cv.width, cv.height);
        var png = cv.toDataURL('image/png'), jpg = cv.toDataURL('image/jpeg', 0.9);
        URL.revokeObjectURL(url);
        ok(png.length <= jpg.length * 1.2 ? { ext: 'png', data: png } : { ext: 'jpg', data: jpg });
      };
      v.onerror = function () { URL.revokeObjectURL(url); no(new Error('这个视频读不出来（可能编码不对），换成 H.264 的 MP4 试试')); };
    });
  }
  J.bindDrop($('[data-p-drop="video"]'), function (file) {
    var ext = file.type === 'video/webm' ? 'webm' : file.type === 'video/mp4' ? 'mp4' : '';
    if (!ext) return J.toast('只支持 MP4 / WebM 视频', true);
    if (file.size > MAX) return J.toast('视频有 ' + mb(file.size) + '，超过 25MB 了，Cloudflare 放不下。压小一点再传', true);
    var d = $('[data-p-drop="video"]'); busy(d, true);
    var wantStill = $('[data-p-still]').checked;
    (wantStill ? lastFrame(file) : Promise.resolve(null)).then(function (still) {
      return J.readAsDataURL(file).then(function (data) {
        return J.api('POST', '/api/poster', { kind: 'video', ext: ext, data: data });
      }).then(function (p) {
        return still ? J.api('POST', '/api/poster', { kind: 'image', ext: still.ext, data: still.data }) : p;
      });
    }).then(function (p) { done(p, wantStill ? '视频换好了，静止画面也换成了最后一帧' : '视频换好了'); })
      .catch(function (e) { J.toast(e.message, true); }).then(function () { busy(d, false); });
  });

  $('[data-p-novideo]').addEventListener('click', function () {
    if (!confirm('去掉视频，首页只显示静止画面那张图？\n\n视频文件会删掉。')) return;
    J.api('DELETE', '/api/poster/video').then(function (p) { done(p, '视频去掉了，现在是图片'); })
      .catch(function (e) { J.toast(e.message, true); });
  });

  J.save.poster = saveCap;
  J.dirty['海报图注'] = function () { return capDirty; };
  J.hooks.push(render);
  if (J.state()) render();
})();
