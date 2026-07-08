$ErrorActionPreference = "Stop"

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $here

$port = 5179
$localUrl = "http://localhost:$port"
$toolsDir = Join-Path $here "tools"
$cloudflaredPath = Join-Path $toolsDir "cloudflared.exe"
$cloudflaredUrl = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
$serverProcess = $null

function Test-CompassServer {
  try {
    $response = Invoke-WebRequest -Uri $localUrl -UseBasicParsing -TimeoutSec 3
    return $response.StatusCode -ge 200 -and $response.StatusCode -lt 500
  } catch {
    return $false
  }
}

function Get-NodePath {
  $node = Get-Command node -ErrorAction SilentlyContinue
  if ($node) {
    return $node.Source
  }

  $bundledNode = "C:\Users\HP\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
  if (Test-Path $bundledNode) {
    return $bundledNode
  }

  throw "Node.js was not found. Install Node.js first, or run this from Codex where the bundled runtime exists."
}

try {
  Write-Host ""
  Write-Host "Compass public sharing setup"
  Write-Host "Local app: $localUrl"
  Write-Host ""

  if (-not (Test-CompassServer)) {
    Write-Host "Compass is not running yet. Starting the local app server..."
    $nodePath = Get-NodePath
    $serverProcess = Start-Process -FilePath $nodePath -ArgumentList @("local-server.js") -WorkingDirectory $here -PassThru -WindowStyle Hidden

    $ready = $false
    for ($i = 0; $i -lt 15; $i++) {
      Start-Sleep -Seconds 1
      if (Test-CompassServer) {
        $ready = $true
        break
      }
    }

    if (-not $ready) {
      throw "Compass did not start on $localUrl. Run .\start-compass-ai.ps1 first, then try this script again."
    }
  } else {
    Write-Host "Compass is already running."
  }

  if (-not (Test-Path $toolsDir)) {
    New-Item -ItemType Directory -Path $toolsDir | Out-Null
  }

  if (-not (Test-Path $cloudflaredPath)) {
    Write-Host "Downloading Cloudflare tunnel helper..."
    Invoke-WebRequest -Uri $cloudflaredUrl -OutFile $cloudflaredPath
  }

  Write-Host ""
  Write-Host "Starting public tunnel..."
  Write-Host "Copy the https://...trycloudflare.com link shown below and send it to mobile users."
  Write-Host "Keep this PowerShell window open while others use the app."
  Write-Host "Press Ctrl+C to stop sharing."
  Write-Host ""

  $shownUrl = $false
  & $cloudflaredPath tunnel --url $localUrl 2>&1 | ForEach-Object {
    $line = $_.ToString()
    if ($line -match "https://[A-Za-z0-9-]+\.trycloudflare\.com") {
      $publicUrl = $Matches[0]
      if (-not $shownUrl) {
        $shownUrl = $true
        try {
          Set-Clipboard -Value $publicUrl
        } catch {
          # Clipboard access is optional. The printed link below is the important part.
        }

        Write-Host ""
        Write-Host "============================================================" -ForegroundColor Green
        Write-Host "PUBLIC MOBILE LINK" -ForegroundColor Green
        Write-Host $publicUrl -ForegroundColor Cyan
        Write-Host "The link has also been copied to your clipboard if Windows allows it." -ForegroundColor Yellow
        Write-Host "Send this link to other people. Keep this PowerShell window open." -ForegroundColor Yellow
        Write-Host "============================================================" -ForegroundColor Green
        Write-Host ""
      }
    }
    Write-Host $line
  }
} finally {
  if ($serverProcess -and -not $serverProcess.HasExited) {
    Stop-Process -Id $serverProcess.Id -Force
  }
}
