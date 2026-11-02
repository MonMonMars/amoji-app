# Create D: venv + install Vui Nano deps (CPU torch). Never use C: for cache.
$ErrorActionPreference = 'Stop'
$Venv = 'D:\AI app development\vui-nano-venv'
$Req = Join-Path $PSScriptRoot 'requirements.txt'

if (-not $env:HF_HOME) { $env:HF_HOME = 'D:\LocalAI\cache\huggingface' }
if (-not $env:HUGGINGFACE_HUB_CACHE) { $env:HUGGINGFACE_HUB_CACHE = Join-Path $env:HF_HOME 'hub' }
New-Item -ItemType Directory -Force -Path $env:HF_HOME | Out-Null
New-Item -ItemType Directory -Force -Path $env:HUGGINGFACE_HUB_CACHE | Out-Null

Write-Host "HF_HOME=$env:HF_HOME"
Write-Host "Venv=$Venv"

if (-not (Test-Path $Venv)) {
  py -3.12 -m venv $Venv
  if ($LASTEXITCODE -ne 0) { python -m venv $Venv }
}

$Py = Join-Path $Venv 'Scripts\python.exe'
& $Py -m pip install --upgrade pip
& $Py -m pip install --index-url https://download.pytorch.org/whl/cpu torch
try {
  & $Py -m pip install -r $Req
} catch {
  Write-Host "WARN: vui-tts install failed — smoke will SKIP. $_"
}
Write-Host 'OK: venv attempted. Run smoke_vui_nano.py (exit 2 = SKIP).'
