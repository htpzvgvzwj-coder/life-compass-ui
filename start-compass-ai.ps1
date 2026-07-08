$ErrorActionPreference = "Stop"

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $here

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  $bundledNode = "C:\Users\HP\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
  if (Test-Path $bundledNode) {
    $nodePath = $bundledNode
  } else {
    Write-Host "Node.js was not found. Install Node.js or run this from Codex where the bundled runtime exists."
    exit 1
  }
} else {
  $nodePath = $node.Source
}

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "Created .env from .env.example."
  Write-Host "Open .env and replace your_groq_api_key_here with your real Groq API key, then run this script again."
  exit 0
}

$envText = Get-Content ".env" -Raw
if ($envText -notmatch "(?m)^COMPASS_AI_PROVIDER\s*=\s*groq\s*$") {
  Write-Host "Compass AI is not set to Groq yet."
  Write-Host "Open .env and set: COMPASS_AI_PROVIDER=groq"
}
if ($envText -notmatch "(?m)^GROQ_API_KEY\s*=" -or $envText -match "your_groq_api_key_here") {
  Write-Host "Groq API key is missing or still using the placeholder."
  Write-Host "Open .env and set: GROQ_API_KEY=your_real_groq_api_key"
}

Write-Host "Starting Compass app at http://localhost:5179/"
Write-Host "Press Ctrl+C to stop the server."
& $nodePath "local-server.js"
