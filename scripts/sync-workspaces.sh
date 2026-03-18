#!/usr/bin/env bash
# sync-workspaces.sh — 模板 → OpenClaw workspace 同步 + Gateway 配置生成
#
# 用法：
#   pnpm sync:openclaw                          # 同步到默认目录
#   pnpm sync:openclaw --dry-run                # 仅输出差异，不写文件
#   pnpm sync:openclaw --workspace-root /path   # 指定 workspace 根目录

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# 参数解析
DRY_RUN=false
OPENCLAW_DIR="${OPENCLAW_DIR:-$HOME/.openclaw}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true; shift ;;
    --workspace-root) OPENCLAW_DIR="$2"; shift 2 ;;
    *) shift ;;
  esac
done

WORKSPACES_DIR="$OPENCLAW_DIR/workspaces"
PLUGINS_DIR="$OPENCLAW_DIR/plugins/kaiwu-tools"
GATEWAY_CONFIG="$OPENCLAW_DIR/gateway.yaml"

PRESETS_DIR="$PROJECT_ROOT/packages/templates/src/presets/kaiwu-factory/agents"
PLUGIN_SRC="$PROJECT_ROOT/packages/openclaw/src/plugin"
GATEWAY_TEMPLATE="$PROJECT_ROOT/packages/openclaw/gateway.template.yaml"

# 同步单个文件：sync_file <src> <dest> <label>
sync_file() {
  local src="$1" dest="$2" label="$3"
  [ -f "$src" ] || return 0

  if [ -f "$dest" ] && diff -q "$src" "$dest" >/dev/null 2>&1; then
    echo "  [skip] $label (unchanged)"
    return 0
  fi

  if $DRY_RUN; then
    echo "  [diff] $label → $dest"
  else
    mkdir -p "$(dirname "$dest")"
    cp "$src" "$dest"
    echo "  [sync] $label → $dest"
  fi
}

echo ""
echo "开物局 OpenClaw 同步"
echo "  目标目录: $OPENCLAW_DIR"
echo "  模式: $($DRY_RUN && echo 'dry-run（仅输出差异）' || echo 'sync（写入文件）')"
echo ""

# 1. 同步 Agent workspace
echo "1. 同步 Agent workspace..."
if [ -d "$PRESETS_DIR" ]; then
  for agent_dir in "$PRESETS_DIR"/*/; do
    agent_id="$(basename "$agent_dir")"
    for file in SOUL.md TOOLS.md; do
      sync_file "$agent_dir/$file" "$WORKSPACES_DIR/$agent_id/$file" "$agent_id/$file"
    done
  done
fi

# 2. 同步 Plugin
echo ""
echo "2. 同步 Plugin..."
for file in index.ts tool-defs.ts openclaw.plugin.json; do
  sync_file "$PLUGIN_SRC/$file" "$PLUGINS_DIR/$file" "plugin/$file"
done

# 3. 同步 Gateway 配置
echo ""
echo "3. 同步 Gateway 配置..."
sync_file "$GATEWAY_TEMPLATE" "$GATEWAY_CONFIG" "gateway.yaml"

if $DRY_RUN; then
  echo ""
  echo "[dry-run] 以上为预期变更，未写入任何文件。"
else
  echo ""
  echo "同步完成。"
fi
