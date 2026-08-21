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
      $bytes = [System.IO.File]::ReadAllBytes($file)
      $ext = [System.IO.Path]::GetExtension($file).ToLower()
      $ctx.Response.ContentType = $(if ($mime[$ext]) { $mime[$ext] } else { 'application/octet-stream' })
      $ctx.Response.StatusCode = 200
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
      Write-Host "200 $p"
    } else {
      $ctx.Response.StatusCode = 404
      $b = [Text.Encoding]::UTF8.GetBytes("404 $p")
      $ctx.Response.OutputStream.Write($b, 0, $b.Length)
      Write-Host "404 $p"
    }
    $ctx.Response.Close()
  } catch { Write-Host "err: $_" }
}
