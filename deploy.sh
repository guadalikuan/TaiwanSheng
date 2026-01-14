#!/usr/bin/env bash
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

sudo apt-get update -y
sudo apt-get install -y \
  curl \
  git \
  build-essential \
  pkg-config \
  libssl-dev \
  libudev-dev \
  ca-certificates

# Rust (for Anchor/avm)
if ! command -v cargo >/dev/null 2>&1; then
  curl -sSf https://sh.rustup.rs | sh -s -- -y
fi
# shellcheck disable=SC1090
source "${HOME}/.cargo/env"

# Solana CLI (stable)
if ! command -v solana >/dev/null 2>&1; then
  sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
fi
SOLANA_BIN="${HOME}/.local/share/solana/install/active_release/bin"
if ! echo ":$PATH:" | grep -q ":${SOLANA_BIN}:"; then
  export PATH="${SOLANA_BIN}:${PATH}"
  if ! grep -qsF "${SOLANA_BIN}" "${HOME}/.profile"; then
    printf '\nexport PATH="%s:$PATH"\n' "${SOLANA_BIN}" >> "${HOME}/.profile"
  fi
fi

# Anchor via avm (pin to 0.29.0)
if ! command -v avm >/dev/null 2>&1; then
  cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
fi

avm install 0.29.0
avm use 0.29.0

# Verify
solana --version
anchor --version