#!/usr/bin/env bash
# 模拟点击、拖拽滑块，在 preview-steps/ 生成 6 张步骤图（需 npm install 一次）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
PORT="${1:-8765}"
export PORT

if ! curl -sf -o /dev/null "http://127.0.0.1:${PORT}/"; then
  echo "在 http://127.0.0.1:${PORT}/ 未找到页面。正在后台启动: python3 -m http.server ${PORT} --bind 127.0.0.1" >&2
  cd "$ROOT" && python3 -m http.server "${PORT}" --bind 127.0.0.1 >/dev/null 2>&1 &
  sleep 1
fi

cd "$ROOT" && npm run preview:interactive
