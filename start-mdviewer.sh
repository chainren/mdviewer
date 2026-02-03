#!/bin/bash

# AI 生成代码 - Markdown 文档查看器启动脚本
# 支持多系统（macOS、Linux、Windows Git Bash）
# 包含环境检查和自动安装功能

set -e  # 遇到错误立即退出

# 颜色定义
RED=$'\033[0;31m'
GREEN=$'\033[0;32m'
YELLOW=$'\033[1;33m'
BLUE=$'\033[0;34m'
NC=$'\033[0m' # No Color

# 项目配置
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_NAME="Markdown Viewer"
DEFAULT_PORT=3001
WS_OFFSET=5080
SERVER_FILE="mdviewer.js"
PACKAGE_FILE="package.json"

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 显示横幅
show_banner() {
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║         国际零售系统 - Markdown 文档查看器                ║"
    echo "║         International Retail - Markdown Viewer            ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# 检测操作系统
detect_os() {
    case "$(uname -s)" in
        Darwin*)
            OS_TYPE="macOS"
            PKG_MANAGER="brew"
            ;;
        Linux*)
            OS_TYPE="Linux"
            if command -v apt-get &> /dev/null; then
                PKG_MANAGER="apt"
            elif command -v yum &> /dev/null; then
                PKG_MANAGER="yum"
            elif command -v pacman &> /dev/null; then
                PKG_MANAGER="pacman"
            else
                PKG_MANAGER="unknown"
            fi
            ;;
        CYGWIN*|MINGW*|MSYS*)
            OS_TYPE="Windows"
            PKG_MANAGER="choco"
            ;;
        *)
            OS_TYPE="Unknown"
            PKG_MANAGER="unknown"
            ;;
    esac
    
    log_info "检测到操作系统: ${GREEN}${OS_TYPE}${NC}"
}

# 检查命令是否存在
command_exists() {
    command -v "$1" &> /dev/null
}

# 检查 Node.js 版本
check_node_version() {
    if ! command_exists node; then
        return 1
    fi
    
    local node_version=$(node -v | sed 's/v//' | cut -d. -f1)
    if [ "$node_version" -lt 14 ]; then
        log_warning "Node.js 版本过低 (当前: v$node_version), 建议使用 v14 或更高版本"
        return 1
    fi
    return 0
}

# 检查 npm 版本
check_npm_version() {
    if ! command_exists npm; then
        return 1
    fi
    
    local npm_version=$(npm -v | cut -d. -f1)
    if [ "$npm_version" -lt 6 ]; then
        log_warning "npm 版本过低 (当前: v$npm_version), 建议使用 v6 或更高版本"
        return 1
    fi
    return 0
}

# 安装 Node.js 和 npm
install_nodejs() {
    log_info "开始安装 Node.js 和 npm..."
    
    case "$PKG_MANAGER" in
        brew)
            log_info "使用 Homebrew 安装 Node.js..."
            if ! command_exists brew; then
                log_error "未检测到 Homebrew，请先安装 Homebrew:"
                echo "    /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
                exit 1
            fi
            brew install node
            ;;
        apt)
            log_info "使用 apt 安装 Node.js..."
            sudo apt-get update
            sudo apt-get install -y nodejs npm
            ;;
        yum)
            log_info "使用 yum 安装 Node.js..."
            sudo yum install -y nodejs npm
            ;;
        pacman)
            log_info "使用 pacman 安装 Node.js..."
            sudo pacman -S nodejs npm
            ;;
        choco)
            log_info "使用 Chocolatey 安装 Node.js..."
            if ! command_exists choco; then
                log_error "未检测到 Chocolatey，请先安装 Chocolatey:"
                echo "    https://chocolatey.org/install"
                exit 1
            fi
            choco install nodejs -y
            ;;
        *)
            log_error "无法自动安装 Node.js，请手动安装:"
            echo "    macOS:   brew install node"
            echo "    Ubuntu:  sudo apt-get install nodejs npm"
            echo "    CentOS:  sudo yum install nodejs npm"
            echo "    Windows: 访问 https://nodejs.org 下载安装"
            exit 1
            ;;
    esac
    
    # 验证安装
    if command_exists node && command_exists npm; then
        log_success "Node.js 和 npm 安装成功"
        log_info "Node.js 版本: $(node -v)"
        log_info "npm 版本: $(npm -v)"
    else
        log_error "Node.js 或 npm 安装失败，请手动安装"
        exit 1
    fi
}

# 检查 Java 环境（用于 PlantUML）
check_java() {
    if ! command_exists java; then
        log_warning "未检测到 Java 环境，PlantUML 图表功能可能无法正常工作"
        log_info "如需使用 PlantUML 功能，请安装 Java:"
        case "$PKG_MANAGER" in
            brew)
                echo "    brew install openjdk@11"
                ;;
            apt)
                echo "    sudo apt-get install openjdk-11-jdk"
                ;;
            yum)
                echo "    sudo yum install java-11-openjdk"
                ;;
            pacman)
                echo "    sudo pacman -S jdk11-openjdk"
                ;;
            choco)
                echo "    choco install openjdk11 -y"
                ;;
            *)
                echo "    访问 https://adoptium.net/ 下载安装"
                ;;
        esac
        return 1
    else
        local java_version=$(java -version 2>&1 | head -n 1)
        log_success "检测到 Java 环境: $java_version"
        return 0
    fi
}

# 检查 GraphViz（PlantUML 依赖）
check_graphviz() {
    if ! command_exists dot; then
        log_warning "未检测到 GraphViz，PlantUML 某些功能可能受限"
        log_info "建议安装 GraphViz:"
        case "$PKG_MANAGER" in
            brew)
                echo "    brew install graphviz"
                ;;
            apt)
                echo "    sudo apt-get install graphviz"
                ;;
            yum)
                echo "    sudo yum install graphviz"
                ;;
            pacman)
                echo "    sudo pacman -S graphviz"
                ;;
            choco)
                echo "    choco install graphviz -y"
                ;;
            *)
                echo "    访问 https://graphviz.org/download/ 下载安装"
                ;;
        esac
        return 1
    else
        log_success "检测到 GraphViz: $(dot -V 2>&1)"
        return 0
    fi
}

# 检查端口是否被占用
is_port_available() {
    local port=$1
    if command_exists lsof; then
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
            return 1
        fi
    elif command_exists netstat; then
        if netstat -an | grep ":$port " | grep LISTEN >/dev/null 2>&1; then
            return 1
        fi
    fi
    return 0
}

check_port() {
    local port=$1
    if ! is_port_available "$port"; then
        log_warning "端口 $port 已被占用"
        return 1
    fi
    return 0
}

find_available_port() {
    local start_port=$1
    local candidate=$start_port
    while true; do
        local ws_port=$((candidate + WS_OFFSET))
        if is_port_available "$candidate" && is_port_available "$ws_port"; then
            echo "$candidate"
            return 0
        fi
        candidate=$((candidate + 1))
    done
}

# 生成 package.json
generate_package_json() {
    log_info "生成 package.json 文件..."
    
    cat > "$PROJECT_DIR/$PACKAGE_FILE" << 'EOF'
{
  "name": "markdown-viewer",
  "version": "1.0.0",
  "description": "A TypeScript Markdown file previewer with live rendering and diagram support",
  "main": "dist/server.js",
  "bin": {
    "mdviewer": "dist/server.bundle.js"
  },
  "scripts": {
    "embed": "node scripts/embed-assets.js",
    "build": "npm run embed && tsc",
    "build:bundle": "esbuild dist/server.js --bundle --platform=node --target=node18 --banner:js=\"#!/usr/bin/env node\" --external:fsevents --outfile=dist/server.bundle.js",
    "start": "node dist/server.js",
    "start:bundle": "node dist/server.bundle.js",
    "dev": "concurrently \"tsc -w\" \"nodemon dist/server.js\"",
    "clean": "rm -rf dist",
    "release:local": "npm run build && npm run build:bundle && mkdir -p ~/.local/bin && cp dist/server.bundle.js ~/.local/bin/mdviewer && chmod +x ~/.local/bin/mdviewer",
    "install:local": "mkdir -p ~/.local/bin && cp dist/server.bundle.js ~/.local/bin/mdviewer && chmod +x ~/.local/bin/mdviewer"
  },
  "keywords": [
    "markdown",
    "viewer",
    "typescript",
    "mermaid",
    "plantuml"
  ],
  "author": "Mi Code",
  "license": "MIT",
  "dependencies": {
    "chokidar": "^3.6.0",
    "express": "^4.22.1",
    "marked": "^9.1.6",
    "marked-highlight": "^2.2.3",
    "mermaid": "^10.9.5",
    "plantuml-encoder": "^1.4.0",
    "prismjs": "^1.30.0",
    "ws": "^8.18.3"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.4",
    "@types/ws": "^8.5.10",
    "concurrently": "^8.2.2",
    "esbuild": "^0.27.0",
    "nodemon": "^3.0.2",
    "typescript": "^5.3.3"
  },
  "files": [
    "dist/server.bundle.js",
    "README.md",
    "LICENSE"
  ]
}
EOF
    
    log_success "package.json 文件已生成"
}

# 安装依赖
install_dependencies() {
    log_info "检查项目依赖..."
    
    cd "$PROJECT_DIR"
    
    # 如果 package.json 不存在，则生成它
    if [ ! -f "$PACKAGE_FILE" ]; then
        log_warning "未找到 package.json 文件，将自动生成"
        generate_package_json
    else
        log_success "检测到 package.json 文件"
    fi
    
    # 检查 node_modules 是否存在
    if [ ! -d "node_modules" ]; then
        log_info "未检测到 node_modules，开始安装依赖..."
        npm install
        log_success "依赖安装完成"
    else
        log_success "依赖已存在，跳过安装"
        
        # 可选：检查依赖是否需要更新
        log_info "提示: 如需更新依赖，请手动运行: npm update"
    fi
}

# 创建必要的目录
create_directories() {
    log_info "创建必要的目录..."
    
    local dirs=("data" ".plantuml-cache" "logs/intl-retail")
    
    for dir in "${dirs[@]}"; do
        local dir_path="$PROJECT_DIR/$dir"
        if [ ! -d "$dir_path" ]; then
            mkdir -p "$dir_path"
            log_success "创建目录: $dir"
        fi
    done
}

# 获取本机 IP 地址
get_local_ip() {
    # 允许手动指定（避免 VPN/多网卡环境取错）
    if [ -n "${LAN_IP:-}" ]; then
        LOCAL_IP="$LAN_IP"
        LOCAL_IPS=("manual:$LAN_IP")
        return 0
    fi

    LOCAL_IP=""
    LOCAL_IPS=()

    case "$OS_TYPE" in
        macOS)
            # 优先常见网卡（Wi-Fi / 有线网卡），避免误取 VPN (utun*) 地址
            if command_exists ipconfig; then
                for iface in en0 en1; do
                    local ip
                    ip=$(ipconfig getifaddr "$iface" 2>/dev/null || true)
                    if [ -n "$ip" ]; then
                        LOCAL_IPS+=("$iface:$ip")
                    fi
                done
            fi

            # 兜底：从系统硬件端口里找 Wi-Fi / Ethernet
            if [ ${#LOCAL_IPS[@]} -eq 0 ] && command_exists networksetup && command_exists ipconfig; then
                for port in "Wi-Fi" "Ethernet"; do
                    local iface
                    iface=$(networksetup -listallhardwareports 2>/dev/null | awk -v p="$port" '
                        $0 ~ ("Hardware Port: " p) {found=1}
                        found && $1=="Device:" {print $2; exit}
                    ' || true)
                    if [ -n "$iface" ]; then
                        local ip
                        ip=$(ipconfig getifaddr "$iface" 2>/dev/null || true)
                        if [ -n "$ip" ]; then
                            LOCAL_IPS+=("$iface:$ip")
                        fi
                    fi
                done
            fi

            # 再兜底：取默认路由网卡的地址
            if [ ${#LOCAL_IPS[@]} -eq 0 ] && command_exists route && command_exists ipconfig; then
                local iface
                iface=$(route get default 2>/dev/null | awk '/interface:/{print $2; exit}' || true)
                if [ -n "$iface" ]; then
                    local ip
                    ip=$(ipconfig getifaddr "$iface" 2>/dev/null || true)
                    if [ -n "$ip" ]; then
                        LOCAL_IPS+=("$iface:$ip")
                    fi
                fi
            fi

            # 最后兜底：从 ifconfig 抓取首个非 127.0.0.1 的 IPv4
            if [ ${#LOCAL_IPS[@]} -eq 0 ] && command_exists ifconfig; then
                local ip
                ip=$(ifconfig 2>/dev/null | awk '/inet / && $2 != "127.0.0.1" {print $2; exit}' || true)
                if [ -n "$ip" ]; then
                    LOCAL_IPS+=("auto:$ip")
                fi
            fi
            ;;
        Linux)
            if command_exists ip; then
                local iface
                iface=$(ip route 2>/dev/null | awk '/default/ {print $5; exit}' || true)
                if [ -n "$iface" ]; then
                    local ip
                    ip=$(ip -4 addr show dev "$iface" 2>/dev/null | awk '/inet /{print $2}' | cut -d/ -f1 | head -n 1 || true)
                    if [ -n "$ip" ]; then
                        LOCAL_IPS+=("$iface:$ip")
                    fi
                fi

                if [ ${#LOCAL_IPS[@]} -eq 0 ]; then
                    local ip
                    ip=$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for (i=1;i<=NF;i++) if ($i=="src") {print $(i+1); exit}}' || true)
                    if [ -n "$ip" ]; then
                        LOCAL_IPS+=("auto:$ip")
                    fi
                fi
            fi

            if [ ${#LOCAL_IPS[@]} -eq 0 ] && command_exists hostname; then
                local ip
                ip=$(hostname -I 2>/dev/null | awk '{print $1}' || true)
                if [ -n "$ip" ]; then
                    LOCAL_IPS+=("auto:$ip")
                fi
            fi
            ;;
        Windows)
            if command_exists ipconfig; then
                local ip
                ip=$(ipconfig 2>/dev/null | grep "IPv4" | awk '{print $NF}' | head -n 1 || true)
                if [ -n "$ip" ]; then
                    LOCAL_IPS+=("auto:$ip")
                fi
            fi
            ;;
        *)
            LOCAL_IPS=("auto:localhost")
            ;;
    esac

    if [ ${#LOCAL_IPS[@]} -gt 0 ]; then
        LOCAL_IP="${LOCAL_IPS[0]#*:}"
    else
        LOCAL_IP="localhost"
        LOCAL_IPS=("auto:localhost")
    fi
}

# 启动服务
start_service() {
    log_info "启动 $SERVICE_NAME 服务..."
    
    cd "$PROJECT_DIR"
    
    if [ ! -f "$SERVER_FILE" ]; then
        log_error "未找到 $SERVER_FILE 文件"
        exit 1
    fi
    
    local http_port
    http_port=$(find_available_port "$DEFAULT_PORT")
    if [ "$http_port" != "$DEFAULT_PORT" ]; then
        log_warning "端口 $DEFAULT_PORT 或 WebSocket 端口 $((DEFAULT_PORT + WS_OFFSET)) 已被占用，自动切换到 $http_port"
    fi
    
    # 获取本机 IP
    get_local_ip
    
    echo ""
    log_success "=========================================="
    log_success "$SERVICE_NAME 正在启动..."
    log_success "=========================================="
    echo ""
    log_info "本地访问地址:"
    echo -e "    ${GREEN}http://localhost:$http_port${NC}"
    echo ""
    log_info "局域网访问地址:"
    if [ ${#LOCAL_IPS[@]} -gt 0 ]; then
        for entry in "${LOCAL_IPS[@]}"; do
            local iface="${entry%%:*}"
            local ip="${entry#*:}"
            echo -e "    ${GREEN}${iface}: http://${ip}:${http_port}${NC}"
        done
    else
        echo -e "    ${YELLOW}未能获取局域网 IPv4 地址（可用 LAN_IP 手动指定）${NC}"
    fi
    echo ""
    log_info "按 Ctrl+C 停止服务"
    echo ""
    log_success "=========================================="
    echo ""
    
    # 启动服务
    node "$SERVER_FILE" --port "$http_port"
}

# 环境检查总览
check_environment() {
    log_info "开始环境检查..."
    echo ""
    
    local has_error=0
    
    # 必需的环境
    log_info "检查必需环境..."
    if ! check_node_version; then
        log_error "✗ Node.js 未安装或版本过低"
        has_error=1
    else
        log_success "✓ Node.js $(node -v)"
    fi
    
    if ! check_npm_version; then
        log_error "✗ npm 未安装或版本过低"
        has_error=1
    else
        log_success "✓ npm $(npm -v)"
    fi
    
    # 可选的环境
    echo ""
    log_info "检查可选环境 (PlantUML 图表支持)..."
    if check_java; then
        log_success "✓ Java 环境"
    else
        log_warning "✗ Java 环境 (可选)"
    fi
    
    if check_graphviz; then
        log_success "✓ GraphViz"
    else
        log_warning "✗ GraphViz (可选)"
    fi
    
    echo ""
    
    # 处理错误
    if [ $has_error -eq 1 ]; then
        log_error "环境检查失败！"
        echo ""
        read -p "是否自动安装缺失的环境? (y/n) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            install_nodejs
            echo ""
            log_info "重新检查环境..."
            if check_node_version && check_npm_version; then
                log_success "环境检查通过！"
            else
                log_error "环境安装失败，请手动安装后重试"
                exit 1
            fi
        else
            log_error "请手动安装缺失的环境后重试"
            exit 1
        fi
    else
        log_success "环境检查通过！"
    fi
    
    echo ""
}

# 显示帮助信息
show_help() {
    echo "使用方法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -h, --help              显示帮助信息"
    echo "  -c, --check             仅检查环境，不启动服务"
    echo "  -i, --install           安装/更新依赖"
    echo "  -p, --port PORT         指定端口（默认: 3001）"
    echo "  --skip-check            跳过环境检查，直接启动"
    echo ""
    echo "示例:"
    echo "  $0                      # 检查环境并启动服务"
    echo "  $0 -c                   # 仅检查环境"
    echo "  $0 -i                   # 安装依赖"
    echo "  $0 -p 3005              # 使用 3005 端口启动"
    echo "  PORT=3005 $0            # 使用环境变量指定端口"
    echo ""
}

# 主函数
main() {
    show_banner
    detect_os
    
    # 解析参数
    local skip_check=0
    local only_check=0
    local only_install=0
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -c|--check)
                only_check=1
                shift
                ;;
            -i|--install)
                only_install=1
                shift
                ;;
            -p|--port)
                DEFAULT_PORT="$2"
                shift 2
                ;;
            --skip-check)
                skip_check=1
                shift
                ;;
            *)
                log_error "未知参数: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # 从环境变量读取端口
    if [ -n "$PORT" ]; then
        DEFAULT_PORT=$PORT
    fi
    
    # 仅安装依赖
    if [ $only_install -eq 1 ]; then
        check_environment
        install_dependencies
        log_success "依赖安装完成！"
        exit 0
    fi
    
    # 仅检查环境
    if [ $only_check -eq 1 ]; then
        check_environment
        log_success "环境检查完成！"
        exit 0
    fi
    
    # 正常启动流程
    if [ $skip_check -eq 0 ]; then
        check_environment
    fi
    
    install_dependencies
    create_directories
    start_service
}

# 捕获 Ctrl+C 信号
trap 'echo ""; log_info "正在停止服务..."; exit 0' INT TERM

# 执行主函数
main "$@"
