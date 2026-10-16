#  JasperPeng 后台 —— 启动器
#  后台没开就先在后台（看不见的窗口）开好服务器，再用 Edge 的「应用模式」打开一个独立窗口（没有地址栏和标签页）。
#  关掉那个窗口两分钟后，服务器自己退出。
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
# 刚解压到新电脑（还没有 config.json），或者网站文件夹挪了地方：先走一遍安装，选好网站文件夹
$confPath = Join-Path $here 'config.json'
$conf = $null
if (Test-Path $confPath) { try { $conf = Get-Content -Raw -Encoding UTF8 $confPath | ConvertFrom-Json } catch {} }
# 后台在网站仓库的 tools\jp-admin 里（2026-10-17 起）：config.json 不上传，新电脑克隆下来就没有它。
# 往上两层就是网站文件夹，悄悄写好 config.json 接着打开，不用先装
if (-not $conf -or -not (Test-Path (Join-Path $conf.site 'js\data.js'))) {
    $repo = Split-Path -Parent (Split-Path -Parent $here)
    if ((Test-Path (Join-Path $repo 'js\data.js')) -and (Test-Path (Join-Path $repo 'build.ps1'))) {
        $port = if ($conf -and $conf.port) { $conf.port } else { 5620 }
        $conf = [pscustomobject]@{ site = $repo; port = $port }
        [IO.File]::WriteAllText($confPath, ($conf | ConvertTo-Json), (New-Object Text.UTF8Encoding($false)))   # 不带 BOM：Node 读 JSON 遇到 BOM 会报错
    }
}
if (-not $conf -or -not (Test-Path (Join-Path $conf.site 'js\data.js'))) { & (Join-Path $here 'install.ps1'); exit }
$url  = "http://127.0.0.1:$($conf.port)/"   # 不用 localhost：Windows 上 localhost 先试 IPv6，要白等一两秒

function Test-Up {
    try { Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 ($url + 'api/ping') | Out-Null; return $true } catch { return $false }
}
function Show-Error([string]$msg) {
    Add-Type -AssemblyName PresentationFramework
    [System.Windows.MessageBox]::Show($msg, 'JasperPeng 后台') | Out-Null
}

if (-not (Test-Up)) {
    $node = $null
    $cmd = Get-Command node -ErrorAction SilentlyContinue
    if ($cmd) { $node = $cmd.Source }
    if (-not $node -and (Test-Path 'C:\Program Files\nodejs\node.exe')) { $node = 'C:\Program Files\nodejs\node.exe' }
    if (-not $node) { Show-Error '没找到 Node.js。后台要用它运行，请先安装 Node.js（nodejs.org）。'; exit 1 }
    Start-Process -FilePath $node -ArgumentList ('"' + (Join-Path $here 'server.mjs') + '"') -WorkingDirectory $here -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $here 'server.log') -RedirectStandardError (Join-Path $here 'server-error.log')
    for ($i = 0; $i -lt 40 -and -not (Test-Up); $i++) { Start-Sleep -Milliseconds 250 }
    if (-not (Test-Up)) { Show-Error ("后台没能启动。原因写在这个文件里：`n" + (Join-Path $here 'server-error.log')); exit 1 }
}

$edge = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") |
    Where-Object { Test-Path $_ } | Select-Object -First 1
if ($edge) { Start-Process -FilePath $edge -ArgumentList "--app=$url", '--window-size=1500,960' }
else { Start-Process $url }
