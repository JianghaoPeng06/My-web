# 极简静态服务器，行为对齐 VS Code Live Server（目录请求 -> index.html）。
# 日常预览用 Live Server 即可，这个脚本是给自动化验证用的。
# 用法： powershell -ExecutionPolicy Bypass -File 本地预览.ps1
$root = $PSScriptRoot
$port = 5599
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Host "serving $root on http://localhost:$port/"

$mime = @{
  '.html'='text/html; charset=utf-8'; '.css'='text/css; charset=utf-8'
  '.js'='application/javascript; charset=utf-8'; '.svg'='image/svg+xml'
  '.png'='image/png'; '.jpg'='image/jpeg'; '.jpeg'='image/jpeg'; '.webp'='image/webp'; '.avif'='image/avif'; '.gif'='image/gif'; '.json'='application/json'
}

while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
    $p = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath)
    if ($p -eq '/') { $p = '/index.html' }
    if ($p.EndsWith('/')) { $p += 'index.html' }
    $file = Join-Path $root ($p.TrimStart('/') -replace '/','\')

    # 目录请求 -> index.html（Live Server 的行为）
    if ((Test-Path $file) -and (Get-Item $file).PSIsContainer) { $file = Join-Path $file 'index.html' }

    if (Test-Path $file -PathType Leaf) {
      $b = [System.IO.File]::ReadAllBytes($file)
      $ext = [System.IO.Path]::GetExtension($file).ToLower()
      $ctx.Response.ContentType = $(if ($mime[$ext]) { $mime[$ext] } else { 'application/octet-stream' })
      $ctx.Response.StatusCode = 200
    } else {
      # 和 Cloudflare Pages 一样：找不到就回 404.html（状态码仍是 404）
      $ctx.Response.StatusCode = 404
      $nf = Join-Path $root '404.html'
      if (Test-Path $nf) { $ctx.Response.ContentType = 'text/html; charset=utf-8'; $b = [System.IO.File]::ReadAllBytes($nf) }
      else { $b = [Text.Encoding]::UTF8.GetBytes("404 $p") }
    }
    # HEAD 请求只要响应头、不能写正文 —— 以前照样写，HttpListener 抛
    # 「写入的字节超出 Content-Length」，响应没关掉，请求方一直挂着
    $ctx.Response.ContentLength64 = $b.Length
    if ($ctx.Request.HttpMethod -ne 'HEAD') { $ctx.Response.OutputStream.Write($b, 0, $b.Length) }
    Write-Host "$($ctx.Response.StatusCode) $p"
  } catch { Write-Host "err: $_" }
  finally { try { if ($ctx) { $ctx.Response.Close() } } catch {} }
}
