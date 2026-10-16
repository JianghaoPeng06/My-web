#  JasperPeng 后台 —— 安装 / 换网站位置（双击「安装.cmd」会运行这个）
#  1. 确认电脑上有 Node.js    2. 选网站文件夹，写进 config.json    3. 桌面放图标    4. 问要不要马上打开
#  换了电脑、或者网站文件夹挪了地方，再双击一次「安装.cmd」就行。
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Add-Type -AssemblyName System.Windows.Forms
function Say([string]$msg, [string]$buttons = 'OK', [string]$icon = 'Information') {
    [System.Windows.Forms.MessageBox]::Show($msg, 'JasperPeng 后台 · 安装', $buttons, $icon)
}

# 从网盘、聊天软件收到的文件会被 Windows 标记成「来自网络」，去掉这个标记，免得每次都弹警告
Get-ChildItem -Recurse -File $here | Unblock-File -ErrorAction SilentlyContinue

# 1. Node.js
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node -and -not (Test-Path 'C:\Program Files\nodejs\node.exe')) {
    $r = Say ("这台电脑还没装 Node.js，后台要用它运行。`n`n点「确定」打开 Node.js 官网，下载 LTS（长期支持版）安装，一路下一步就行。装好以后再双击一次「安装.cmd」。") 'OKCancel'
    if ($r -eq 'OK') { Start-Process 'https://nodejs.org/zh-cn/download' }
    exit 1
}

# 2. 网站文件夹
$confPath = Join-Path $here 'config.json'
$conf = [ordered]@{ site = ''; port = 5620 }
if (Test-Path $confPath) {
    try { $old = Get-Content -Raw -Encoding UTF8 $confPath | ConvertFrom-Json; $conf.site = $old.site; if ($old.port) { $conf.port = $old.port } } catch {}
}
# 后台放在网站仓库的 tools\jp-admin 里（2026-10-17 起）：往上两层就是网站文件夹，直接用它，不用选。
# 只有把后台单独拷到别处时，才弹出来让你选
$site = $null
$repo = Split-Path -Parent (Split-Path -Parent $here)
if ((Test-Path (Join-Path $repo 'js\data.js')) -and (Test-Path (Join-Path $repo 'build.ps1'))) { $site = $repo }
while (-not $site) {
    $dlg = New-Object System.Windows.Forms.FolderBrowserDialog
    $dlg.Description = '选网站文件夹：GitHub Desktop 里 My-web 存放的那个（里面有 build.ps1 和 js 文件夹），比如 E:\GitHub\My-web'
    $dlg.ShowNewFolderButton = $false
    if ($conf.site -and (Test-Path $conf.site)) { $dlg.SelectedPath = $conf.site }
    if ($dlg.ShowDialog() -ne 'OK') { exit 1 }
    $site = $dlg.SelectedPath
    if ((Test-Path (Join-Path $site 'js\data.js')) -and (Test-Path (Join-Path $site 'build.ps1'))) { break }
    $r = Say ("这个文件夹好像不是网站文件夹：`n$site`n`n网站文件夹里应该有 build.ps1 和 js\data.js。再选一次？") 'RetryCancel' 'Warning'
    if ($r -ne 'Retry') { exit 1 }
    $site = $null
}
$conf.site = $site
# 不带 BOM 的 UTF-8：Node 读 JSON 时遇到 BOM 会报错
[IO.File]::WriteAllText($confPath, ($conf | ConvertTo-Json), (New-Object Text.UTF8Encoding($false)))

# 3. 桌面图标
& (Join-Path $here 'make-shortcut.ps1') | Out-Null

# 4. 打开
$r = Say ("装好了！`n`n网站文件夹：$site`n桌面上放了「JasperPeng 后台」图标，以后双击它就能打开。`n`n现在就打开吗？") 'YesNo'
if ($r -eq 'Yes') { & (Join-Path $here 'start.ps1') }
