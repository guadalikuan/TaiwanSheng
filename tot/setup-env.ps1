# TOT Project Environment Setup Script (PowerShell)

Write-Host "Setting up TOT project test environment..." -ForegroundColor Cyan

# 1. Set Anchor environment variables
$env:ANCHOR_PROVIDER_URL = "https://api.devnet.solana.com"
Write-Host "ANCHOR_PROVIDER_URL = $env:ANCHOR_PROVIDER_URL" -ForegroundColor Green

# 2. Check and set wallet path
$walletPath = "$env:USERPROFILE\.config\solana\id.json"
if (Test-Path $walletPath) {
    $env:ANCHOR_WALLET = $walletPath
    Write-Host "Found wallet file: $walletPath" -ForegroundColor Green
} else {
    Write-Host "Wallet file not found: $walletPath" -ForegroundColor Yellow
    Write-Host "Please run: solana-keygen new" -ForegroundColor Yellow
}

# 3. Check Anchor CLI
try {
    $anchorVersion = anchor --version 2>&1
    Write-Host "Anchor CLI installed: $anchorVersion" -ForegroundColor Green
} catch {
    Write-Host "Anchor CLI not installed" -ForegroundColor Red
    Write-Host "Please run:" -ForegroundColor Yellow
    Write-Host "  cargo install --git https://github.com/coral-xyz/anchor avm --locked --force" -ForegroundColor Yellow
    Write-Host "  avm install latest" -ForegroundColor Yellow
    Write-Host "  avm use latest" -ForegroundColor Yellow
}

# 4. Check Solana CLI
try {
    $solanaVersion = solana --version 2>&1
    Write-Host "Solana CLI installed: $solanaVersion" -ForegroundColor Green
} catch {
    Write-Host "Solana CLI not installed" -ForegroundColor Red
    Write-Host "Please visit: https://docs.solana.com/cli/install-solana-cli-tools" -ForegroundColor Yellow
}

# 5. Check Rust/Cargo
try {
    $cargoVersion = cargo --version 2>&1
    Write-Host "Cargo installed: $cargoVersion" -ForegroundColor Green
} catch {
    Write-Host "Cargo not installed" -ForegroundColor Red
    Write-Host "Please visit: https://rustup.rs/ to install Rust" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Environment setup complete!" -ForegroundColor Cyan
Write-Host "To persist environment variables, add them to system environment variables." -ForegroundColor Yellow
