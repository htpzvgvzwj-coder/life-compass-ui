$ErrorActionPreference = "Stop"

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $here

$npmCache = Join-Path $here ".npm-cache"
$vercelAuth = Join-Path $here ".vercel-auth"
$envPath = Join-Path $here ".env"

$env:npm_config_cache = $npmCache
$env:NO_UPDATE_NOTIFIER = "1"
$env:VERCEL_DISABLE_UPDATE_CHECK = "1"

function Read-EnvFile($path) {
  $values = @{}
  if (-not (Test-Path $path)) {
    return $values
  }

  Get-Content $path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) {
      return
    }

    $parts = $line.Split("=", 2)
    $key = $parts[0].Trim()
    $value = $parts[1].Trim().Trim("'").Trim('"')
    if ($key) {
      $values[$key] = $value
    }
  }

  return $values
}

function Get-RequiredEnv($values, $key) {
  if (-not $values.ContainsKey($key) -or [string]::IsNullOrWhiteSpace($values[$key])) {
    throw "$key is missing from .env"
  }
  return $values[$key]
}

function Invoke-VercelCapture($arguments) {
  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    $output = & npx.cmd @arguments 2>&1
    $exitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }

  return [pscustomobject]@{
    Output = $output
    ExitCode = $exitCode
  }
}

function Invoke-VercelLive($arguments) {
  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    & npx.cmd @arguments
    $exitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }

  return $exitCode
}

$envValues = Read-EnvFile $envPath
$provider = if ($envValues.ContainsKey("COMPASS_AI_PROVIDER")) { $envValues["COMPASS_AI_PROVIDER"] } else { "groq" }
$groqModel = if ($envValues.ContainsKey("GROQ_MODEL")) { $envValues["GROQ_MODEL"] } else { "llama-3.1-8b-instant" }
$groqApiKey = Get-RequiredEnv $envValues "GROQ_API_KEY"

if ($groqApiKey -match "your_groq_api_key_here|your_|_here") {
  throw "GROQ_API_KEY still looks like a placeholder. Put your real Groq key in .env first."
}

Write-Host ""
Write-Host "Preparing Compass deployment to Vercel..."
Write-Host "Project: Vercel will create or reuse the project in your current account"
Write-Host "AI provider: $provider"
Write-Host "AI model: $groqModel"
Write-Host "Your .env file will not be uploaded."
Write-Host ""

if (-not (Test-Path $npmCache)) {
  New-Item -ItemType Directory -Path $npmCache | Out-Null
}
if (-not (Test-Path $vercelAuth)) {
  New-Item -ItemType Directory -Path $vercelAuth | Out-Null
}

$whoamiResult = Invoke-VercelCapture @("vercel@latest", "whoami", "--global-config", $vercelAuth)
if ($whoamiResult.ExitCode -ne 0) {
  Write-Host ""
  Write-Host "Vercel login is required."
  Write-Host "Follow the login link/code that appears below, then return to this PowerShell window."
  Write-Host ""
  $loginExitCode = Invoke-VercelLive @("vercel@latest", "login", "--global-config", $vercelAuth)
  if ($loginExitCode -ne 0) {
    throw "Vercel login did not complete."
  }
} else {
  Write-Host ($whoamiResult.Output -join "`n")
}

Write-Host ""
Write-Host "Deploying Compass to Vercel..."
Write-Host ""

$deployResult = Invoke-VercelCapture @(
  "vercel@latest",
  "deploy",
  "--prod",
  "--yes",
  "--global-config",
  $vercelAuth,
  "--env",
  "COMPASS_AI_PROVIDER=$provider",
  "--env",
  "GROQ_MODEL=$groqModel",
  "--env",
  "GROQ_API_KEY=$groqApiKey"
)

$deployResult.Output | ForEach-Object { Write-Host $_ }

if ($deployResult.ExitCode -ne 0) {
  throw "Vercel deployment failed."
}

$deploymentUrl = ($deployResult.Output | Select-String -Pattern "https://[^\s]+\.vercel\.app" | Select-Object -Last 1).Matches.Value

if ($deploymentUrl) {
  Write-Host ""
  Write-Host "============================================================" -ForegroundColor Green
  Write-Host "COMPASS PUBLIC URL" -ForegroundColor Green
  Write-Host $deploymentUrl -ForegroundColor Cyan
  Write-Host "Anyone can open this URL on mobile or desktop." -ForegroundColor Yellow
  Write-Host "============================================================" -ForegroundColor Green
  Write-Host ""
  try {
    Set-Clipboard -Value $deploymentUrl
    Write-Host "The URL was copied to your clipboard."
  } catch {
    Write-Host "Copy the URL above."
  }
} else {
  Write-Host ""
  Write-Host "Deployment finished, but I could not detect the final URL automatically. Look for the https://...vercel.app link above."
}
