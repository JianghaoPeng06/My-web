# =============================================================
#  JasperPeng — build.ps1
#  用法： powershell -ExecutionPolicy Bypass -File build.ps1
#        （换完图片也可以直接双击根目录的「刷新图片.cmd」）
#
#  依据 js/data.js，按顺序做四件事：
#  1. 占位图：某个 slug 一张真图都没有时，生成真实的 <slug>.png
#     （图源取自 my web figma.svg 里内嵌的照片）
#     已经有真图就跳过，绝不覆盖
#  2. 图片清单 js/assets.js：扫 assets/images/**，记下每个 slug 实际存在的文件
#     同一 slug 多种格式时 png > jpg > jpeg > webp > avif > gif > svg > placeholder
#  3. 分类页：从 category.html 生成；带 to: 的分类不生成，旧目录会被删掉
#  4. 注入页头 / 页脚到所有页面的标记之间，并且
#     · 补上 js/assets.js 的 script 标签（必须排在 data.js 之前）
#     · 按清单校正静态 HTML 里手写的图片路径
#
#  静态 HTML 写入简体文案（没有 JS 也能导航），同时带
#  data-t="s.works.label" 这样的路径，切换语言时由 main.js 换成对应语言。
#
#  改了 data.js 或 category.html 之后重跑一次即可。
#  ⚠ 本文件必须存为 UTF-8 with BOM，否则 PowerShell 5.1 读中文会报错。
# =============================================================

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$data = Get-Content -Raw -Encoding UTF8 (Join-Path $root 'js\data.js')
$U8   = New-Object System.Text.UTF8Encoding $false

# ---------- 解析 L(简,繁,英,日) / P(专有名词) ----------
# 手写取参，比正则可靠：字符串里出现括号也不会截断
function Get-Loc([string]$text, [int]$openParen) {
    $i = $openParen + 1
    $out = @(); $cur = $null; $inStr = $false; $esc = $false
    while ($i -lt $text.Length) {
        $ch = $text[$i]
        if ($inStr) {
            if ($esc)             { $cur += $ch; $esc = $false }
            elseif ($ch -eq '\')  { $esc = $true }
            elseif ($ch -eq "'")  { $inStr = $false; $out += $cur; $cur = $null }
            else                  { $cur += $ch }
        } else {
            if ($ch -eq "'")      { $inStr = $true; $cur = '' }
            elseif ($ch -eq ')')  { break }
        }
        $i++
    }
    if ($out.Count -eq 0) { return '' }
    return $out[0]                       # 简体作为静态默认值
}

# 在一段文本里找 `<name>: L(...)` 或 `<name>: P(...)`，返回简体值
function Field([string]$seg, [string]$name) {
    $m = [regex]::Match($seg, [regex]::Escape($name) + '\s*:\s*[LP]\s*\(')
    if (-not $m.Success) { return '' }
    return Get-Loc $seg ($m.Index + $m.Length - 1)
}

# ---------- 板块 ----------
$secs = @()
foreach ($m in [regex]::Matches($data, "key:\s*'([^']+)',\s*dir:\s*(?:'([^']+)'|null)")) {
    $secs += [pscustomobject]@{ Key = $m.Groups[1].Value; Dir = $m.Groups[2].Value; Start = $m.Index }
}
$charsAt = $data.IndexOf('var CHARACTERS')
for ($i = 0; $i -lt $secs.Count; $i++) {
    $s   = $secs[$i]
    $end = if ($i + 1 -lt $secs.Count) { $secs[$i + 1].Start } else { $charsAt }
    if ($end -le $s.Start) { $end = $data.Length }
    $seg = $data.Substring($s.Start, $end - $s.Start)
    $s | Add-Member Seg        $seg
    $s | Add-Member Label      (Field $seg 'label')
    $s | Add-Member Kicker     (Field $seg 'kicker')
    $s | Add-Member FeatKicker (Field $seg 'featKicker')

    # cats
    # 分类可以带 to:'<路径>' —— 表示这一项不生成自己的分类页，
    # 导航里直接指向那个路径（角色板块的「原创角色」就指向深色的选角色页）。
    $cats = @()
    $catEnd = $seg.IndexOf('feature:'); if ($catEnd -lt 0) { $catEnd = $seg.Length }
    $catMatches = @([regex]::Matches($seg, "slug:\s*'([^']+)',\s*label:\s*[LP]\s*\("))
    for ($ci = 0; $ci -lt $catMatches.Count; $ci++) {
        $c = $catMatches[$ci]
        if ($c.Index -ge $catEnd) { continue }
        $slug  = $c.Groups[1].Value
        $label = Get-Loc $seg ($c.Index + $c.Length - 1)
        # 这一条分类的文本范围：到下一条分类为止，且不越过 feature:
        $stop = if ($ci + 1 -lt $catMatches.Count) { [Math]::Min($catMatches[$ci + 1].Index, $catEnd) } else { $catEnd }
        $one  = $seg.Substring($c.Index, $stop - $c.Index)
        $dm   = [regex]::Match($one, 'desc:\s*[LP]\s*\(')
        $desc = if ($dm.Success) { Get-Loc $seg ($c.Index + $dm.Index + $dm.Length - 1) } else { '' }
        $tm2  = [regex]::Match($one, "to:\s*'([^']+)'")
        $to   = if ($tm2.Success) { $tm2.Groups[1].Value } else { '' }
        $cats += [pscustomobject]@{ Slug = $slug; Label = $label; Desc = $desc; To = $to }
    }
    $s | Add-Member Cats $cats

    # feature
    $feat = @()
    $fm = [regex]::Match($seg, 'feature:\s*\[')
    if ($fm.Success) {
        $close = $seg.IndexOf(']', $fm.Index)
        $fseg  = $seg.Substring($fm.Index, $close - $fm.Index)
        foreach ($x in [regex]::Matches($fseg, "to:\s*'([^']+)'\s*,\s*label:\s*[LP]\s*\(")) {
            $feat += [pscustomobject]@{ To = $x.Groups[1].Value
                                        Label = (Get-Loc $fseg ($x.Index + $x.Length - 1)) }
        }
    }
    $s | Add-Member Feature $feat

    # tags（Works 板块的 Photos 胶囊）
    $tags = @(); $tagKicker = ''
    $tm = [regex]::Match($seg, 'tags:\s*\{')
    if ($tm.Success) {
        $tseg = $seg.Substring($tm.Index, [Math]::Min(900, $seg.Length - $tm.Index))
        $tagKicker = Field $tseg 'kicker'
        foreach ($x in [regex]::Matches($tseg, "to:\s*'([^']+)'\s*,\s*label:\s*[LP]\s*\(")) {
            $tags += [pscustomobject]@{ To = $x.Groups[1].Value
                                        Label = (Get-Loc $tseg ($x.Index + $x.Length - 1)) }
        }
    }
    $s | Add-Member TagKicker $tagKicker
    $s | Add-Member Tags $tags

    # links / notes（Contact）
    $links = @(); $notes = @()
    $lm = [regex]::Match($seg, 'links:\s*\[')
    if ($lm.Success) {
        $close = $seg.IndexOf("\n      ],", $lm.Index)
        if ($close -lt 0) { $close = $seg.IndexOf('],', $lm.Index) }
        $lseg = $seg.Substring($lm.Index, $close - $lm.Index)
        foreach ($ln in ($lseg -split "`n")) {
            $lb = [regex]::Match($ln, 'label:\s*[LP]\s*\(')
            if (-not $lb.Success) { continue }
            $links += [pscustomobject]@{
                Label = (Get-Loc $ln ($lb.Index + $lb.Length - 1))
                Soon  = ($ln -match 'soon:\s*true')
                Mail  = ($ln -match "href:\s*'mailto:'")
            }
        }
    }
    $nm = [regex]::Match($seg, 'notes:\s*\[')
    if ($nm.Success) {
        $nseg = $seg.Substring($nm.Index)
        foreach ($x in [regex]::Matches($nseg, 'kicker:\s*[LP]\s*\(')) {
            $k = Get-Loc $nseg ($x.Index + $x.Length - 1)
            $tx = [regex]::Match($nseg.Substring($x.Index), 'text:\s*[LP]\s*\(')
            $v = if ($tx.Success) { Get-Loc $nseg ($x.Index + $tx.Index + $tx.Length - 1) } else { '' }
            $dim = ($nseg.Substring($x.Index, [Math]::Min(400, $nseg.Length - $x.Index)) -match 'dim:\s*true')
            $notes += [pscustomobject]@{ Kicker = $k; Text = $v; Dim = $dim }
        }
    }
    $s | Add-Member Links $links
    $s | Add-Member Notes $notes
}
$mail = ([regex]::Match($data, "var MAIL\s*=\s*'([^']+)'")).Groups[1].Value
$dirSecs = $secs | Where-Object { $_.Dir }

function Esc([string]$s) { $s -replace '&','&amp;' -replace '<','&lt;' -replace '>','&gt;' -replace '"','&quot;' }

function LinkFor($to, $sec, $base) {
    if ($to -like 'article:*') { return $base + 'article.html?a=' + $to.Substring(8) }
    if ($to -like 'cat:*')     { return $base + $sec.Dir + '/' + $to.Substring(4) + '/' }
    if ($to -like 'char:*')    { return $base + 'characters/?c=' + $to.Substring(5) }
    return $to
}

# 分类的链接：带 to: 的走 to（不生成自己的页面），否则走 <目录>/<slug>/
function CatHref($sec, $cat, $base) {
    if ($cat.To) { return $base + $cat.To }
    return $base + $sec.Dir + '/' + $cat.Slug + '/'
}

# ---------- 页头 ----------
function Build-Header($base) {
    $nav = ''; $panels = ''
    foreach ($s in $secs) {
        $id = 'menu-' + $s.Key
        $nav += "`n          <button class=""nav__link"" type=""button"" data-menu data-t=""s.$($s.Key).label"" aria-expanded=""false"" aria-controls=""$id"">$(Esc $s.Label)</button>"

        # 左栏
        $left = "<p class=""menu__kicker"" data-t=""s.$($s.Key).kicker"">$(Esc $s.Kicker)</p><ul class=""menu__list"">"
        if ($s.Cats.Count) {
            foreach ($c in $s.Cats) {
                $left += "<li><a href=""$(CatHref $s $c $base)"" data-t=""c.$($s.Key).$($c.Slug).label"">$(Esc $c.Label)<i class=""arr"" aria-hidden=""true""></i></a></li>"
            }
        } else {
            $li = 0
            foreach ($l in $s.Links) {
                if ($l.Soon) {
                    $left += "<li><span class=""menu__soon"" data-t=""l.$($s.Key).$li.label"">$(Esc $l.Label)<em data-i18n=""soon"">暂未开放</em></span></li>"
                } else {
                    $h = if ($l.Mail) { "mailto:$mail" } else { '#' }
                    $left += "<li><a href=""$h"" data-t=""l.$($s.Key).$li.label"">$(Esc $l.Label)<i class=""arr"" aria-hidden=""true""></i></a></li>"
                }
                $li++
            }
        }
        $left += '</ul>'

        # 右栏
        $right = ''
        if ($s.Feature.Count) {
            $right += "<p class=""menu__kicker"" data-t=""s.$($s.Key).featKicker"">$(Esc $s.FeatKicker)</p><ul class=""menu__list"">"
            $fi = 0
            foreach ($f in $s.Feature) {
                $right += "<li><a href=""$(LinkFor $f.To $s $base)"" data-t=""f.$($s.Key).$fi.label"">$(Esc $f.Label)<i class=""arr"" aria-hidden=""true""></i></a></li>"
                $fi++
            }
            $right += '</ul>'
        }
        if ($s.Tags.Count) {
            $right += "<p class=""menu__kicker menu__kicker--sp"" data-t=""gk.$($s.Key)"">$(Esc $s.TagKicker)</p><div class=""menu__tags"">"
            $gi = 0
            foreach ($x in $s.Tags) {
                $right += "<a href=""$(LinkFor $x.To $s $base)"" data-t=""g.$($s.Key).$gi.label"">$(Esc $x.Label)</a>"
                $gi++
            }
            $right += '</div>'
        }
        if ($s.Notes.Count) {
            $ni = 0
            foreach ($n in $s.Notes) {
                $sp = if ($ni -gt 0) { ' menu__kicker--sp' } else { '' }
                $right += "<p class=""menu__kicker$sp"" data-t=""n.$($s.Key).$ni.kicker"">$(Esc $n.Kicker)</p>"
                $dim = if ($n.Dim) { ' menu__note--dim' } else { '' }
                $right += "<p class=""menu__note$dim"" data-t=""n.$($s.Key).$ni.text"">$(Esc $n.Text)</p>"
                $ni++
            }
        }
        $cols = if ($right) { 2 } else { 1 }
        $panels += @"

      <div class="menu" id="$id" role="region" aria-label="$(Esc $s.Label)" aria-hidden="true">
        <div class="menu__grid" style="--cols:$cols">
          <div>$left</div>
          <div>$right</div>
        </div>
      </div>
"@
    }

    # 移动端抽屉
    $m = ''
    foreach ($s in $secs) {
        $inner = ''
        if ($s.Cats.Count) {
            foreach ($c in $s.Cats) { $inner += "<a href=""$(CatHref $s $c $base)"" data-t=""c.$($s.Key).$($c.Slug).label"">$(Esc $c.Label)</a>" }
        } else {
            $li = 0
            foreach ($l in $s.Links) {
                if ($l.Soon) { $inner += "<span class=""menu__soon"" data-t=""l.$($s.Key).$li.label"">$(Esc $l.Label)<em data-i18n=""soon"">暂未开放</em></span>" }
                else { $inner += "<a href=""mailto:$mail"" data-t=""l.$($s.Key).$li.label"">$(Esc $l.Label)</a>" }
                $li++
            }
        }
        $m += @"

        <li class="mnav__item">
          <button class="mnav__head" type="button" data-acc data-t="s.$($s.Key).label" aria-expanded="false">$(Esc $s.Label)<i class="chev" aria-hidden="true"></i></button>
          <div class="mnav__panel">$inner</div>
        </li>
"@
    }

    @"
<header class="hdr" data-header>
  <div class="hdr__inner">
    <a class="brand" href="${base}home.html" aria-label="JasperPeng">
      <span class="brand__mark" aria-hidden="true">J</span>
      <span class="brand__name">JasperPeng</span>
    </a>
    <nav class="nav" aria-label="Primary">$nav
    </nav>
    <div class="hdr__tools">
      <button class="icon-btn" type="button" data-search-open aria-label="Search" title="⌘K">
        <svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16 21 21"/></svg>
      </button>
      <button class="icon-btn burger" type="button" data-burger aria-label="Menu" aria-expanded="false" aria-controls="mnav">
        <span class="burger__icon" aria-hidden="true"><span></span><span></span></span>
      </button>
    </div>
  </div>
  <!-- 六块面板装在同一个舞台里：舞台就是那块白底，横移时它只把高度补间到
       新面板的高度，不收起再展开（openai / apple 的顶栏就是这么干的，
       见 css 的 .menu-stage 与 main.js 的 dropdowns） -->
  <div class="menu-stage" data-menu-stage>$panels
  </div>
</header>
<div class="scrim" data-scrim aria-hidden="true"></div>

<div class="mnav" id="mnav" data-mnav hidden>
  <nav aria-label="Mobile">
    <ul>$m
    </ul>
  </nav>
</div>

<div class="search" data-search hidden>
  <div class="search__panel" role="dialog" aria-modal="true" aria-label="Search">
    <div class="search__bar">
      <svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16 21 21"/></svg>
      <input type="search" data-search-input data-i18n="search" placeholder="搜索文章、作品、角色…" autocomplete="off" spellcheck="false" aria-label="Search">
      <kbd>Esc</kbd>
    </div>
    <div class="search__results" data-search-results aria-live="polite"></div>
  </div>
</div>
"@
}

# ---------- 页脚 ----------
function Build-Footer($base) {
    $cols = ''
    foreach ($s in $dirSecs) {
        $c = "<h3 data-t=""s.$($s.Key).kicker"">$(Esc $s.Kicker)</h3>"
        foreach ($x in $s.Cats) {
            $c += "<a href=""$(CatHref $s $x $base)"" data-t=""c.$($s.Key).$($x.Slug).label"">$(Esc $x.Label)</a>"
        }
        $cols += "      <div class=""ftr__col"">$c</div>`n"
    }
    $contact = $secs | Where-Object { $_.Key -eq 'contact' } | Select-Object -First 1
    $cc = "<h3 data-t=""s.contact.kicker"">$(Esc $contact.Kicker)</h3>"
    $li = 0
    foreach ($l in $contact.Links) {
        if ($l.Soon) { $cc += "<span class=""ftr__soon"" data-t=""l.contact.$li.label"">$(Esc $l.Label)<em data-i18n=""soon"">暂未开放</em></span>" }
        else { $cc += "<a href=""mailto:$mail"" data-t=""l.contact.$li.label"">$(Esc $l.Label)</a>" }
        $li++
    }
    $ni = 0
    foreach ($n in $contact.Notes) {
        $cc += "<h3 data-t=""n.contact.$ni.kicker"">$(Esc $n.Kicker)</h3>"
        $cc += "<p class=""ftr__note"" data-t=""n.contact.$ni.text"">$(Esc $n.Text)</p>"
        $ni++
    }
    $cols += "      <div class=""ftr__col"">$cc</div>`n"

    @"
<footer class="ftr">
  <div class="wrap">
    <nav class="crumb" aria-label="Breadcrumb" data-crumb>
      <a href="${base}home.html">JasperPeng</a>
    </nav>
    <div class="ftr__grid">
$cols    </div>
    <div class="ftr__bar">
      <p class="ftr__copy">JasperPeng©2026</p>
      <div class="lang" data-lang>
        <button class="lang__btn" type="button" data-lang-btn aria-expanded="false" aria-haspopup="listbox">
          <svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.75"/><path d="M3.25 12h17.5M12 3.25c4.8 5.5 4.8 12.1 0 17.5-4.8-5.4-4.8-12 0-17.5Z"/></svg>
          <span data-lang-label>简体中文 中国大陆</span><i class="chev" aria-hidden="true"></i>
        </button>
        <ul class="lang__menu" role="listbox" data-lang-menu></ul>
      </div>
    </div>
  </div>
</footer>
"@
}

# ---------- 占位图 ----------
# 占位图就是真实的 <slug>.png —— 换图 = 用自己的图盖掉同名文件，
# 不用先删占位图，也不用记什么特殊后缀。
#
# 图源是 my web figma.svg 里内嵌的三张照片：构建时解出来落地成真实 PNG 文件，
# 代码里不留 base64。万一取不到（svg 被挪走了）就退回一张纯色 PNG，构建不中断。
#
# 麻烦在于「png 占位图」和「png 真图」同名，光看文件名分不出来。
# 所以生成时把 SHA256 记进 assets/images/.placeholders.txt：
#   哈希还对得上 → 还是占位图，清单里排到最后，任何真图都压得过它
#   哈希对不上   → 用户已经把这张图换掉了，当真图处理
Add-Type -AssemblyName System.Drawing

$IMG_EXT   = @('.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.svg')   # 靠前的优先
$LEGACY_PH = '.placeholder.svg'                                            # 上一版的占位图，遇到就清掉

# --- 占位图登记表 ---
$PH_REG = Join-Path $root 'assets\images\.placeholders.txt'
$phOld  = @{}
if (Test-Path $PH_REG) {
    foreach ($ln in [System.IO.File]::ReadAllLines($PH_REG)) {
        $p = $ln.Split("`t")
        if ($p.Count -eq 2 -and $p[1]) { $phOld[$p[0]] = $p[1].ToUpper() }
    }
}
$phNew     = [ordered]@{}
$hashCache = @{}
function Hash-Of([string]$full) {
    if (-not $hashCache.ContainsKey($full)) {
        $hashCache[$full] = (Get-FileHash -Algorithm SHA256 -LiteralPath $full).Hash.ToUpper()
    }
    return $hashCache[$full]
}
# 顺带把「确认还是占位图」的条目续写进新登记表，过期条目自然被丢掉
function Is-Placeholder([string]$key, [string]$full) {
    if (-not $phOld.ContainsKey($key)) { return $false }
    if ($phOld[$key] -ne (Hash-Of $full)) { return $false }
    $phNew[$key] = $phOld[$key]
    return $true
}

# --- 从 Figma 稿里取图源 ---
$seedImgs = @(); $seedsLoaded = $false
function Get-Seeds {
    if ($script:seedsLoaded) { return $script:seedImgs }
    $script:seedsLoaded = $true
    $svg = Join-Path $root 'my web figma.svg'
    if (Test-Path $svg) {
        try {
            $txt = [System.IO.File]::ReadAllText($svg)
            $mk  = 'data:image/jpeg;base64,'
            $i   = $txt.IndexOf($mk)
            while ($i -ge 0) {
                $s = $i + $mk.Length
                $e = $txt.IndexOf('"', $s)
                if ($e -lt 0) { break }
                try {
                    $b  = [Convert]::FromBase64String($txt.Substring($s, $e - $s))
                    $ms = New-Object System.IO.MemoryStream(,$b)
                    $script:seedImgs += [System.Drawing.Image]::FromStream($ms)
                } catch { }
                $i = $txt.IndexOf($mk, $e)
            }
            $txt = $null
        } catch { }
    }
    if ($script:seedImgs.Count -eq 0) { Write-Host "  （没能从 my web figma.svg 取到图源，占位图退回纯色）" }
    return $script:seedImgs
}

# 哪个板块用第几张图源；取不到图源时用哪个底色
$phSeed = @{ 'works' = 0; 'research' = 1; 'universe' = 0; 'characters' = 2; 'resources' = 1 }
$phBg   = @{ 'works' = '#EFEDE9'; 'research' = '#ECEEF2'; 'universe' = '#EBEFEC'
             'characters' = '#F0ECEE'; 'resources' = '#EDEEEF' }

# mode: cover = 居中裁切铺满（卡片是 1:1）；contain = 完整放进去（立绘不许裁）
function Save-Png($src, [int]$w, [int]$h, [string]$mode, [string]$out, [string]$bg) {
    $bmp = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $g   = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode   = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.ColorTranslator]::FromHtml($bg))
    if ($src) {
        if ($mode -eq 'cover') {
            $dr = $w / $h
            if (($src.Width / $src.Height) -gt $dr) { $sh = $src.Height; $sw = [int]($sh * $dr) }
            else                                    { $sw = $src.Width;  $sh = [int]($sw / $dr) }
            $sx = [int](($src.Width - $sw) / 2); $sy = [int](($src.Height - $sh) / 2)
            $g.DrawImage($src, (New-Object System.Drawing.Rectangle(0, 0, $w, $h)),
                               (New-Object System.Drawing.Rectangle($sx, $sy, $sw, $sh)),
                               [System.Drawing.GraphicsUnit]::Pixel)
        } else {
            $k  = [Math]::Min($w / $src.Width, $h / $src.Height)
            $dw = [int]($src.Width * $k); $dh = [int]($src.Height * $k)
            $g.DrawImage($src, [int](($w - $dw) / 2), [int](($h - $dh) / 2), $dw, $dh)
        }
    }
    $g.Dispose()
    $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}

# ---------- 1. 占位图 ----------
$made = 0; $kept = 0; $real = 0; $swept = 0

# kind: card = 400×400 方图（卡片全是 1:1）；portrait = 600×800 立绘
function Ensure-Cover([string]$dirName, [string]$slug, [string]$kind) {
    $dirFull = Join-Path $root ('assets\images\' + $dirName)
    New-Item -ItemType Directory -Force -Path $dirFull | Out-Null

    # 上一版的 <slug>.placeholder.svg：现在占位图是 png，遇到就清掉，别留孤儿文件
    $legacy = Join-Path $dirFull ($slug + $LEGACY_PH)
    if (Test-Path $legacy) { [System.IO.File]::Delete($legacy); $script:swept++ }

    # 有真图就什么都不做（登记在册、哈希还对得上的那张 png 不算真图）
    foreach ($e in $IMG_EXT) {
        $f = Join-Path $dirFull ($slug + $e)
        if (-not (Test-Path $f)) { continue }
        if (Is-Placeholder ($dirName + '/' + $slug + $e) $f) { continue }
        return 'real'
    }
    $png = Join-Path $dirFull ($slug + '.png')
    if (Test-Path $png) { return 'kept' }      # 走到这儿说明它就是占位图

    $seeds = Get-Seeds
    $src   = $null
    if ($seeds.Count) {
        $si = 0; if ($phSeed.ContainsKey($dirName)) { $si = $phSeed[$dirName] }
        $src = $seeds[[Math]::Min($si, $seeds.Count - 1)]
    }
    if ($kind -eq 'portrait') { Save-Png $src 600 800 'cover' $png '#FFFFFF' }
    else {
        $bg = '#EDEDED'; if ($phBg.ContainsKey($dirName)) { $bg = $phBg[$dirName] }
        Save-Png $src 400 400 'cover' $png $bg
    }
    $hashCache.Remove($png)
    $phNew[$dirName + '/' + $slug + '.png'] = (Hash-Of $png)
    return 'made'
}

foreach ($m in [regex]::Matches($data, "slug:\s*'([^']+)',\s*section:\s*'([^']+)',\s*cat:\s*'([^']+)'")) {
    $sec = $secs | Where-Object { $_.Key -eq $m.Groups[2].Value } | Select-Object -First 1
    if (-not $sec) { continue }
    switch (Ensure-Cover $sec.Dir $m.Groups[1].Value 'card') {
        'made' { $made++ } 'kept' { $kept++ } 'real' { $real++ }
    }
}
# 角色立绘：不裁切，尺寸也不一样
foreach ($m in [regex]::Matches($data, "slug:\s*'([^']+)',\s*name:\s*[LP]\s*\(")) {
    switch (Ensure-Cover 'characters' $m.Groups[1].Value 'portrait') {
        'made' { $made++ } 'kept' { $kept++ } 'real' { $real++ }
    }
}

# 首页那张 16:9 海报不在 slug 体系里，单独走一遍同样的规矩。
# 扩展名不写死：按 $IMG_EXT 的顺序找 poster.<ext>，占位图排到最后
# （和分类封面同一套规则），所以 poster.jpg 换掉 poster.png 也认得。
# 一张都没有才现生成一张 poster.png。
$posterRel  = ''
$posterRank = [int]::MaxValue
foreach ($e in $IMG_EXT) {
    $p = Join-Path $root ('assets\images\poster' + $e)
    if (-not (Test-Path $p)) { continue }
    $r = [array]::IndexOf($IMG_EXT, $e)
    if (Is-Placeholder ('poster' + $e) $p) { $r = $IMG_EXT.Count }
    if ($r -lt $posterRank) { $posterRank = $r; $posterRel = 'assets/images/poster' + $e }
}
if ($posterRel) {
    if ($posterRank -ge $IMG_EXT.Count) { $kept++ } else { $real++ }
} else {
    $posterPng = Join-Path $root 'assets\images\poster.png'
    $seeds = Get-Seeds
    $src = $null; if ($seeds.Count) { $src = $seeds[[Math]::Min(1, $seeds.Count - 1)] }
    Save-Png $src 1280 720 'cover' $posterPng '#EDEDED'
    $hashCache.Remove($posterPng)
    $phNew['poster.png'] = (Hash-Of $posterPng)
    $posterRel = 'assets/images/poster.png'
    $made++
}
# 上一版的 poster.svg：只有在它不是当前这张海报时才清掉
$posterSvg = Join-Path $root 'assets\images\poster.svg'
if ((Test-Path $posterSvg) -and $posterRel -ne 'assets/images/poster.svg') {
    [System.IO.File]::Delete($posterSvg); $swept++
}

$sweptMsg = if ($swept) { "；清掉旧的 .placeholder.svg $swept 个" } else { '' }
Write-Host "占位图：新建 $made，保留 $kept；已换成真图 $real$sweptMsg"

# ---------- 2. 图片清单 ----------
# 扫出 assets/images 下每个 slug 真实存在的文件，写成 js/assets.js。
# data.js 只写 slug，扩展名由这份清单决定 —— 换图不用改任何代码。
# 同一个 slug 有多种格式时按 $IMG_EXT 的顺序取，占位图（哈希对得上的那些）
# 一律排到最后：所以「丢一张 <slug>.jpg 进来」和「直接盖掉 <slug>.png」都管用。
$phRank   = $IMG_EXT.Count
$manifest = [ordered]@{}
foreach ($d in (Get-ChildItem (Join-Path $root 'assets\images') -Directory)) {
    foreach ($f in (Get-ChildItem $d.FullName -File)) {
        $i = [array]::IndexOf($IMG_EXT, $f.Extension.ToLower())
        if ($i -lt 0) { continue }
        if (Is-Placeholder ($d.Name + '/' + $f.Name) $f.FullName) { $i = $phRank }
        $key = $d.Name + '/' + [System.IO.Path]::GetFileNameWithoutExtension($f.Name)
        if ($manifest.Contains($key) -and $manifest[$key].Rank -le $i) { continue }
        $manifest[$key] = [pscustomobject]@{ Rank = $i; Path = 'assets/images/' + $d.Name + '/' + $f.Name }
    }
}
$rows = @()
foreach ($k in $manifest.Keys) { $rows += ('  "' + $k + '": "' + $manifest[$k].Path + '"') }
$assetsJs = @"
/* 由 build.ps1 自动生成 —— 不要手改。
   换图：把你的图存成同名文件盖掉 assets/images/<板块目录>/<slug>.*，
   刷新页面就生效，连构建都不用跑。
   要换成别的扩展名（png/jpg/webp…）才需要双击根目录的「刷新图片.cmd」
   （或重跑 build.ps1），让这份清单重排一次序。 */
window.JP_ASSETS = {
$($rows -join ",`n")
};
"@
[System.IO.File]::WriteAllText((Join-Path $root 'js\assets.js'), $assetsJs, $U8)

# 登记表：只留下这一轮确认过、或这一轮新建的占位图
$regLines = @()
foreach ($k in $phNew.Keys) { $regLines += ($k + "`t" + $phNew[$k]) }
[System.IO.File]::WriteAllLines($PH_REG, [string[]]$regLines, $U8)
Write-Host "图片清单：$($manifest.Count) 条 → js/assets.js（占位图 $($phNew.Count) 张在册）"

# ---------- 3. 分类页 ----------
$tpl = Get-Content -Raw -Encoding UTF8 (Join-Path $root 'category.html')
$pages = 0
foreach ($s in $dirSecs) {
    foreach ($c in $s.Cats) {
        # 带 to: 的分类不生成自己的页面 —— 导航直接指向别处。
        # 如果之前生成过，顺手删掉，免得留下一个没人链接的孤儿页。
        if ($c.To) {
            $stale = Join-Path $root (Join-Path $s.Dir $c.Slug)
            if (Test-Path $stale) { Remove-Item $stale -Recurse -Force; Write-Host "  清理孤儿页：$($s.Dir)/$($c.Slug)/" }
            continue
        }
        # 注意 DIR 与 SECTION 不同：about 板块的目录名是 resources
        $out = $tpl -replace '\{\{BASE\}\}','../../' -replace '\{\{SECTION\}\}',$s.Key `
                    -replace '\{\{DIR\}\}',$s.Dir `
                    -replace '\{\{SECTION_LABEL\}\}',(Esc $s.Kicker) -replace '\{\{CAT\}\}',$c.Slug `
                    -replace '\{\{TITLE\}\}',(Esc $c.Label) -replace '\{\{DESC\}\}',(Esc $c.Desc)
        $d = Join-Path $root (Join-Path $s.Dir $c.Slug)
        New-Item -ItemType Directory -Force -Path $d | Out-Null
        [System.IO.File]::WriteAllText((Join-Path $d 'index.html'), $out, $U8); $pages++
    }
}
Write-Host "分类页：$pages 个"

# ---------- 4. 注入页头 / 页脚 ----------
$hdrCache = @{}; $ftrCache = @{}; $injected = 0
Get-ChildItem $root -Recurse -Filter *.html |
  Where-Object { $_.Name -ne 'category.html' -and $_.Name -notlike '_*' } | ForEach-Object {
    $html = Get-Content -Raw -Encoding UTF8 $_.FullName
    if ($html -notmatch '#chrome:header:start') { return }
    $depth = ($_.FullName.Substring($root.Length).TrimStart('\').Split('\').Count) - 1
    $base  = '../' * $depth
    if (-not $hdrCache.ContainsKey($base)) { $hdrCache[$base] = Build-Header $base; $ftrCache[$base] = Build-Footer $base }
    $html = [regex]::Replace($html, '(?s)(<!-- #chrome:header:start -->).*?(<!-- #chrome:header:end -->)',
      { param($m) $m.Groups[1].Value + "`n" + $hdrCache[$base] + $m.Groups[2].Value })
    $html = [regex]::Replace($html, '(?s)(<!-- #chrome:footer:start -->).*?(<!-- #chrome:footer:end -->)',
      { param($m) $m.Groups[1].Value + "`n" + $ftrCache[$base] + $m.Groups[2].Value })
    # 静态 HTML 里手写的图片路径（首页那几张卡）也按清单校正一遍，
    # 免得换了图 / 改了扩展名之后这些硬编码的 src 变成断链。
    $html = [regex]::Replace($html, '((?:\.\./)*)assets/images/([^"/]+)/([^"]+?)"', {
        param($mm)
        $pfx = $mm.Groups[1].Value; $dir = $mm.Groups[2].Value; $file = $mm.Groups[3].Value
        # 上一版写的是 <slug>.placeholder.svg，这里一并认出来，迁移到新占位图
        if ($file.ToLower().EndsWith($LEGACY_PH)) { $stem = $file.Substring(0, $file.Length - $LEGACY_PH.Length) }
        else { $stem = [System.IO.Path]::GetFileNameWithoutExtension($file) }
        $key = $dir + '/' + $stem
        if ($manifest.Contains($key)) { return $pfx + $manifest[$key].Path + '"' }
        return $mm.Value
    })
    # 首页海报不在 slug 体系里（assets/images/poster.*），单独换一次。
    # 静态 HTML 里写的是哪个扩展名都行，一律对齐到上面挑出来的那张。
    if ($posterRel) { $html = [regex]::Replace($html, 'assets/images/poster\.[A-Za-z0-9]+', $posterRel) }
    # 图片清单必须排在 data.js 之前 —— data.js 生成 cover 路径时要读它
    if ($html -notmatch 'js/assets\.js') {
        $html = [regex]::Replace($html, '<script src="([^"]*)js/data\.js"></script>',
          { param($m) '<script src="' + $m.Groups[1].Value + 'js/assets.js"></script>' + "`n" + $m.Value })
    }
    [System.IO.File]::WriteAllText($_.FullName, $html, $U8); $injected++
}
Write-Host "注入页头页脚：$injected 个页面"
Write-Host "完成。"
