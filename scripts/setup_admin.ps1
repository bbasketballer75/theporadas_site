Param()
$script = Join-Path $PSScriptRoot 'setup.ps1'
$arguments = @(
    '-NoProfile',
    '-ExecutionPolicy','Bypass',
    '-File',"$script",
    '-Install','-WithGit','-WithGcloud','-WithNode','-WithPython','-WithPnpm','-WithUv'
)
Start-Process -FilePath pwsh -ArgumentList $arguments -Verb RunAs -Wait