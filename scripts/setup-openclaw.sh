#!/usr/bin/env bash
# 开物局 OpenClaw 初始化脚本
# 用法: ./scripts/setup-openclaw.sh
#
# 前置条件:
#   - OpenClaw 已安装 (brew install openclaw 或 npm i -g openclaw)
#   - openclaw onboard 已完成
#
# 此脚本会:
#   1. 创建 8 个局中人的 workspace 目录并部署文件
#   2. 通过 openclaw agents add 注册到 Gateway
#   3. 创建结构化记忆目录
#   4. 注册 3 个 Cron Job
#   5. 配置 memory_search 混合搜索
#   6. 创建产出目录

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TEMPLATE_DIR="$PROJECT_ROOT/packages/templates/src/presets/kaiwu-factory"
OPENCLAW_DIR="${OPENCLAW_DIR:-$HOME/.openclaw}"

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}✓${NC} $1"; }
warn()  { echo -e "${YELLOW}⚠${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1" >&2; }

# ── 前置检查 ──────────────────────────────────────────────

if ! command -v openclaw &>/dev/null; then
  error "openclaw 未安装。请先执行: brew install openclaw"
  exit 1
fi

if [ ! -f "$OPENCLAW_DIR/openclaw.json" ]; then
  error "openclaw 未初始化。请先执行: openclaw onboard"
  exit 1
fi

if [ ! -d "$TEMPLATE_DIR/agents" ]; then
  error "模板目录不存在: $TEMPLATE_DIR/agents"
  exit 1
fi

echo "🦞 开物局 OpenClaw 初始化"
echo "   模板目录: $TEMPLATE_DIR"
echo "   OpenClaw: $OPENCLAW_DIR"
echo ""

# ── Agent 定义 ────────────────────────────────────────────
# id:name:emoji:stats(用/分隔)

AGENTS=(
  "youshang:游商:🎒:嗅觉/脚力/见闻/慧眼"
  "shuike:说客:🗣:口才/博引/韧性/信誉"
  "zhengchen:诤臣:⚔️:洞察/一击/公心/先见"
  "zhangcheng:掌秤:⚖️:公正/果断/权衡/远见"
  "huashi:画师:🖌:精微/全局/化繁/效率"
  "jiangren:匠人:🔨:手艺/耐力/巧思/返工率"
  "shijian:试剑:🗡:眼力/精准/严苛/公道"
  "mingluo:鸣锣:🔔:稳妥/利落/周全/兜底"
)

# ── Step 1: 创建 workspace 并注册 Agent ───────────────────

echo "📦 Step 1: 部署 workspace 并注册 Agent"

for entry in "${AGENTS[@]}"; do
  IFS=':' read -r id name emoji stats <<< "$entry"
  WORKSPACE="$OPENCLAW_DIR/workspace-$id"

  # 跳过已存在的 agent
  if openclaw agents list --json 2>/dev/null | grep -q "\"id\": \"$id\""; then
    warn "$name ($id) 已存在，跳过"
    continue
  fi

  # 创建 workspace 目录
  mkdir -p "$WORKSPACE"

  # 复制模板文件
  cp "$TEMPLATE_DIR/agents/$id/SOUL.md"      "$WORKSPACE/"
  cp "$TEMPLATE_DIR/agents/$id/IDENTITY.md"  "$WORKSPACE/"
  cp "$TEMPLATE_DIR/agents/$id/TOOLS.md"     "$WORKSPACE/"
  cp "$TEMPLATE_DIR/agents/$id/HEARTBEAT.md" "$WORKSPACE/"

  # 写入共享工作协议（从设计文档提取 markdown 代码块内容）
  AGENTS_SRC="$PROJECT_ROOT/design/Agent工作区设计/AGENTS.md"
  if [ -f "$AGENTS_SRC" ]; then
    sed -n '/^```markdown$/,/^```$/p' "$AGENTS_SRC" | sed '1d;$d' > "$WORKSPACE/AGENTS.md"
  fi

  # 通过 CLI 注册
  openclaw agents add "$id" \
    --workspace "$WORKSPACE" \
    --non-interactive \
    --json >/dev/null 2>&1

  # 设置身份
  openclaw agents set-identity \
    --agent "$id" \
    --name "$name" \
    --emoji "$emoji" \
    --json >/dev/null 2>&1

  info "$name ($id) → workspace-$id"
done

echo ""

# ── Step 2: 创建记忆目录和 MEMORY.md ─────────────────────

echo "🧠 Step 2: 创建记忆目录"

for entry in "${AGENTS[@]}"; do
  IFS=':' read -r id name emoji stats <<< "$entry"
  WORKSPACE="$OPENCLAW_DIR/workspace-$id"

  mkdir -p "$WORKSPACE/memory/domain"
  touch "$WORKSPACE/memory/lessons.md"
  touch "$WORKSPACE/memory/patterns.md"
  touch "$WORKSPACE/memory/relationships.md"

  # 生成 MEMORY.md（如果不存在）
  if [ ! -f "$WORKSPACE/MEMORY.md" ]; then
    IFS='/' read -r s1 s2 s3 s4 <<< "$stats"
    cat > "$WORKSPACE/MEMORY.md" << EOF
# ${name} · 成长档案

## 等级

Lv.1 初出茅庐（经手 0 个造物令）

## 属性快照

（由编排层根据实战数据更新）

| 属性 | 星级 | 原始值 | 样本数 |
|---|---|---|---|
| ${s1} | ★☆☆☆☆ | — | 0 |
| ${s2} | ★☆☆☆☆ | — | 0 |
| ${s3} | ★☆☆☆☆ | — | 0 |
| ${s4} | ★☆☆☆☆ | — | 0 |

## 核心教训（刻骨铭心，永远不忘）

（尚无——随造物令积累，编排层会在此写入最重要的教训）

## 核心模式（屡试不爽）

（尚无——随造物令积累，编排层会在此写入验证过的成功模式）

## 领域专长

（尚无——随采风经验积累）

## 里程碑

（尚无——重要的转折点会被记录在此）
EOF
    info "$name 记忆目录已创建"
  fi
done

echo ""

# ── Step 3: 注册 Cron Job ────────────────────────────────

echo "⏰ Step 3: 注册 Cron Job"

register_cron() {
  local name="$1" cron="$2" message="$3" extra="${4:-}"

  if openclaw cron list --json 2>/dev/null | grep -q "\"name\": \"$name\""; then
    warn "Cron \"$name\" 已存在，跳过"
    return
  fi

  # shellcheck disable=SC2086
  openclaw cron add \
    --name "$name" \
    --cron "$cron" \
    --tz "Asia/Shanghai" \
    --session isolated \
    --message "$message" \
    --no-deliver \
    $extra \
    --json >/dev/null 2>&1

  info "Cron \"$name\" ($cron)"
}

register_cron "造物流更鼓" "*/20 * * * *" \
  "执行造物流 tick：检查当前造物令状态，推进一步。"

register_cron "游商巡视" "0 */2 * * *" \
  "自由活动：检查物帖池预采风、扫描行业趋势、回访已上线器物。" \
  "--agent youshang"

register_cron "每日总结" "0 23 * * *" \
  "回顾今天所有局中人的工作，提炼经验写入记忆文件。"

echo ""

# ── Step 4: Gateway 配置 ─────────────────────────────────

echo "⚙️  Step 4: Gateway 配置"

# memory_search 混合搜索
openclaw config set agents.defaults.memorySearch.query.hybrid.enabled true 2>/dev/null && \
  info "memory_search hybrid 已启用" || warn "memory_search 配置跳过（可能已配置）"

# 产出目录
mkdir -p "$OPENCLAW_DIR/products"
info "产出目录 $OPENCLAW_DIR/products/"

echo ""

# ── 完成 ──────────────────────────────────────────────��───

echo "🎉 开物局 OpenClaw 初始化完成！"
echo ""
echo "   验证: openclaw doctor"
echo "   查看: openclaw agents list"
echo "   Cron: openclaw cron list"
