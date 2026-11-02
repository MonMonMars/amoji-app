# Run EN SFX A/B gateway on 127.0.0.1:8765
$ErrorActionPreference = 'Stop'
if (-not $env:HF_HOME) { $env:HF_HOME = 'D:\LocalAI\cache\huggingface' }
$Py = 'D:\AI app development\silencio2-venv\Scripts\python.exe'
if (-not (Test-Path $Py)) {
  $Py = (Get-Command python -ErrorAction SilentlyContinue).Source
}
if (-not $Py) { throw 'No python for gateway' }
Write-Host "Gateway python=$Py"
& $Py (Join-Path $PSScriptRoot 'gateway.py')
