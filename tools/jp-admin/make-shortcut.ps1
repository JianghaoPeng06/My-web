#  在桌面放一个「JasperPeng 后台」图标（双击 创建桌面图标.cmd 会运行这个）。不想要了，直接删掉桌面上的图标就行。
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$desk = [Environment]::GetFolderPath('Desktop')
$sh   = New-Object -ComObject WScript.Shell
$lnk  = $sh.CreateShortcut((Join-Path $desk 'JasperPeng 后台.lnk'))
$lnk.TargetPath       = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
$lnk.Arguments        = '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + (Join-Path $here 'start.ps1') + '"'
$lnk.WorkingDirectory = $here
$lnk.IconLocation     = (Join-Path $here 'icon.ico') + ',0'
$lnk.Description      = '管理 JasperPeng 网站：写文章、排版、换图片、置顶和推荐权重'
$lnk.WindowStyle      = 7
$lnk.Save()
Write-Host ('桌面图标已经放好：' + (Join-Path $desk 'JasperPeng 后台.lnk'))
