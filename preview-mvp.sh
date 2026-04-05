#!/usr/bin/env bash
# 用本机 Chrome 无头模式截取首页静态图 → mvp-preview.png
# 多步交互（滑块/选词）请用: ./preview-interactive.sh  （输出 preview-steps/*.png）
# 页面入口: index.html
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
PORT="${1:-8765}"
OUT="${ROOT}/mvp-preview.png"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

if [[ ! -x "$CHROME" ]]; then
  echo "未找到 Google Chrome，请安装或修改脚本中的 CHROME 路径。" >&2
  exit 1
fi

if ! curl -sf -o /dev/null "http://127.0.0.1:${PORT}/"; then
  echo "在 http://127.0.0.1:${PORT}/ 未找到页面。正在后台启动: python3 -m http.server ${PORT} --bind 127.0.0.1" >&2
  cd "$ROOT" && python3 -m http.server "${PORT}" --bind 127.0.0.1 >/dev/null 2>&1 &
  sleep 1
fi

"$CHROME" --headless=new --disable-gpu --no-sandbox \
  --window-size=390,844 --hide-scrollbars \
  --screenshot="$OUT" \
  "http://127.0.0.1:${PORT}/"
echo "已保存: $OUT"
