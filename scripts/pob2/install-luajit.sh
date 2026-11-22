#!/usr/bin/env bash
# Session-only LuaJIT + lua-utf8 (Lua 5.1 ABI) + busted for running PoB2 headless (tools/pob2/snapshot.lua).
# Idempotent; makes no environment change (nothing is saved to the cloud environment or its setup script).
# If it fails, rely on CI: the pob2-oracle job runs the same tools in PoB's tests image (vendor/pob2/PIN.json).
#
# LuaJIT is built from source at the commit PoB's Dockerfile pins: PoB2 uses compound assignment (`x += 1`), which
# distro LuaJIT packages (2023 builds) cannot parse. luautf8 and busted match the versions in that image.
set -euo pipefail

LUAJIT_COMMIT=2460b3ff93a1c955de3d62cfc825de7d68dc272e # PoB Dockerfile (tests image)
LUAUTF8=0.1.6-1
BUSTED=2.2.0-1

ok() {
  command -v luajit >/dev/null 2>&1 &&
    luajit -e 'local a = 1; a += 1; assert(a == 2); require("lua-utf8")' >/dev/null 2>&1
}

if ok && command -v busted >/dev/null 2>&1; then
  echo "luajit + lua-utf8 + busted: already installed"; exit 0
fi

SUDO=""; [ "$(id -u)" -ne 0 ] && SUDO="sudo"
export DEBIAN_FRONTEND=noninteractive
if ! command -v luarocks >/dev/null 2>&1 || ! command -v make >/dev/null 2>&1 || ! command -v git >/dev/null 2>&1; then
  $SUDO apt-get update -qq
  $SUDO apt-get install -y -qq build-essential git luarocks >/dev/null
fi

if ! ok; then
  src="$(mktemp -d)"
  trap 'rm -rf "$src"' EXIT
  git clone -q --filter=blob:none https://github.com/LuaJIT/LuaJIT "$src/LuaJIT"
  git -C "$src/LuaJIT" checkout -q "$LUAJIT_COMMIT"
  make -C "$src/LuaJIT" -j"$(nproc)" >/dev/null
  $SUDO make -C "$src/LuaJIT" install PREFIX=/usr/local >/dev/null
  $SUDO ln -sf "$(ls /usr/local/bin/luajit-2.1.* | head -1)" /usr/local/bin/luajit
  hash -r
fi

INC=/usr/local/include/luajit-2.1
rock() { $SUDO luarocks --lua-version=5.1 --lua-dir=/usr/local LUA_INCDIR="$INC" install "$@" >/dev/null; }
luajit -e 'require("lua-utf8")' >/dev/null 2>&1 || rock luautf8 "$LUAUTF8"
command -v busted >/dev/null 2>&1 || rock busted "$BUSTED" || echo "busted: install failed (specs run in CI)"

if ok; then
  echo "luajit + lua-utf8: ok ($(luajit -v | cut -d' ' -f1-2))"
else
  echo "luajit + lua-utf8 not usable; rely on CI (pob2-oracle)"; exit 1
fi
