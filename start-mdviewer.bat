@echo off
REM AI 生成代码 - Markdown 文档查看器启动脚本 (Windows 版本)
REM 支持 Windows 系统
REM 包含环境检查和自动安装提示

setlocal enabledelayedexpansion

REM 项目配置
set "PROJECT_DIR=%~dp0"
set "SERVICE_NAME=Markdown Viewer"
set "DEFAULT_PORT=3001"
set "WS_OFFSET=5080"
set "SERVER_FILE=mdviewer.js"
set "PACKAGE_FILE=package.json"

REM 颜色代码（Windows 10+）
set "COLOR_GREEN=[92m"
set "COLOR_RED=[91m"
set "COLOR_YELLOW=[93m"
set "COLOR_BLUE=[94m"
set "COLOR_RESET=[0m"

REM 显示横幅
echo %COLOR_BLUE%
echo ================================================================
echo          国际零售系统 - Markdown 文档查看器
echo          International Retail - Markdown Viewer
echo ================================================================
echo %COLOR_RESET%
echo.

REM 检查 Node.js
echo %COLOR_BLUE%[INFO]%COLOR_RESET% 检查 Node.js 环境...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo %COLOR_RED%[ERROR]%COLOR_RESET% 未检测到 Node.js
    echo.
    echo 请安装 Node.js:
    echo 1. 访问 https://nodejs.org
    echo 2. 下载并安装 LTS 版本
    echo.
    echo 或使用 Chocolatey 安装:
    echo    choco install nodejs -y
    echo.
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
    echo %COLOR_GREEN%[SUCCESS]%COLOR_RESET% Node.js !NODE_VERSION!
)

REM 检查 npm
echo %COLOR_BLUE%[INFO]%COLOR_RESET% 检查 npm 环境...
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo %COLOR_RED%[ERROR]%COLOR_RESET% 未检测到 npm
    echo.
    echo npm 通常随 Node.js 一起安装，请重新安装 Node.js
    echo.
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('npm -v') do set NPM_VERSION=%%i
    echo %COLOR_GREEN%[SUCCESS]%COLOR_RESET% npm !NPM_VERSION!
)

REM 检查 Java（可选）
echo %COLOR_BLUE%[INFO]%COLOR_RESET% 检查 Java 环境（可选）...
where java >nul 2>&1
if %errorlevel% neq 0 (
    echo %COLOR_YELLOW%[WARNING]%COLOR_RESET% 未检测到 Java 环境
    echo PlantUML 图表功能可能无法正常工作
    echo.
    echo 如需使用 PlantUML 功能，请安装 Java:
    echo 1. 访问 https://adoptium.net/
    echo 2. 下载并安装 JDK 11+
    echo.
    echo 或使用 Chocolatey 安装:
    echo    choco install openjdk11 -y
    echo.
) else (
    for /f "tokens=*" %%i in ('java -version 2^>^&1 ^| findstr /i "version"') do set JAVA_VERSION=%%i
    echo %COLOR_GREEN%[SUCCESS]%COLOR_RESET% Java 已安装
)

echo.
echo %COLOR_GREEN%[SUCCESS]%COLOR_RESET% 环境检查通过！
echo.

REM 检查项目文件
echo %COLOR_BLUE%[INFO]%COLOR_RESET% 检查项目文件...
if not exist "%PROJECT_DIR%%SERVER_FILE%" (
    echo %COLOR_RED%[ERROR]%COLOR_RESET% 未找到 %SERVER_FILE% 文件
    pause
    exit /b 1
)

if not exist "%PROJECT_DIR%%PACKAGE_FILE%" (
    echo %COLOR_YELLOW%[WARNING]%COLOR_RESET% 未找到 %PACKAGE_FILE% 文件，将自动生成
    call :generate_package_json
) else (
    echo %COLOR_GREEN%[SUCCESS]%COLOR_RESET% 检测到 package.json 文件
)

REM 检查并安装依赖
echo %COLOR_BLUE%[INFO]%COLOR_RESET% 检查项目依赖...
if not exist "%PROJECT_DIR%node_modules" (
    echo %COLOR_YELLOW%[WARNING]%COLOR_RESET% 未检测到 node_modules，开始安装依赖...
    cd /d "%PROJECT_DIR%"
    call npm install
    if %errorlevel% neq 0 (
        echo %COLOR_RED%[ERROR]%COLOR_RESET% 依赖安装失败
        pause
        exit /b 1
    )
    echo %COLOR_GREEN%[SUCCESS]%COLOR_RESET% 依赖安装完成
) else (
    echo %COLOR_GREEN%[SUCCESS]%COLOR_RESET% 依赖已存在
)

REM 创建必要的目录
echo %COLOR_BLUE%[INFO]%COLOR_RESET% 创建必要的目录...
if not exist "%PROJECT_DIR%data" mkdir "%PROJECT_DIR%data"
if not exist "%PROJECT_DIR%.plantuml-cache" mkdir "%PROJECT_DIR%.plantuml-cache"
if not exist "%PROJECT_DIR%logs\intl-retail" mkdir "%PROJECT_DIR%logs\intl-retail"

REM 获取本机 IP
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set "LOCAL_IP=%%a"
    set "LOCAL_IP=!LOCAL_IP:~1!"
    goto :ip_found
)
:ip_found

if "!LOCAL_IP!"=="" set "LOCAL_IP=localhost"

REM 从环境变量读取端口
if not "%PORT%"=="" set "DEFAULT_PORT=%PORT%"

REM 选择可用端口（同时检查对应的 WebSocket 端口）
call :find_available_port %DEFAULT_PORT%
set "HTTP_PORT=%AVAILABLE_PORT%"
set /a WS_PORT_DEFAULT=DEFAULT_PORT+WS_OFFSET
if not "%HTTP_PORT%"=="%DEFAULT_PORT%" (
    echo %COLOR_YELLOW%[WARNING]%COLOR_RESET% 端口 %DEFAULT_PORT% 或 WebSocket 端口 %WS_PORT_DEFAULT% 已被占用，自动切换到 %HTTP_PORT%
)

REM 启动服务
echo.
echo %COLOR_GREEN%==========================================
echo %SERVICE_NAME% 正在启动...
echo ==========================================%COLOR_RESET%
echo.
echo %COLOR_BLUE%[INFO]%COLOR_RESET% 本地访问地址:
echo     %COLOR_GREEN%http://localhost:%HTTP_PORT%%COLOR_RESET%
echo.
echo %COLOR_BLUE%[INFO]%COLOR_RESET% 局域网访问地址:
echo     %COLOR_GREEN%http://!LOCAL_IP!:%HTTP_PORT%%COLOR_RESET%
echo.
echo %COLOR_BLUE%[INFO]%COLOR_RESET% 按 Ctrl+C 停止服务
echo.
echo %COLOR_GREEN%==========================================%COLOR_RESET%
echo.

cd /d "%PROJECT_DIR%"
node "%SERVER_FILE%" --port %HTTP_PORT%

REM 如果服务意外停止
echo.
echo %COLOR_YELLOW%[WARNING]%COLOR_RESET% 服务已停止
pause
goto :eof

:generate_package_json
echo %COLOR_BLUE%[INFO]%COLOR_RESET% 生成 package.json 文件...
(
echo {
 echo   "name": "markdown-viewer",
 echo   "version": "1.0.0",
 echo   "description": "A TypeScript Markdown file previewer with live rendering and diagram support",
 echo   "main": "dist/server.js",
 echo   "bin": {
 echo     "mdviewer": "dist/server.bundle.js"
 echo   },
 echo   "scripts": {
 echo     "embed": "node scripts/embed-assets.js",
 echo     "build": "npm run embed ^&^& tsc",
 echo     "build:bundle": "esbuild dist/server.js --bundle --platform=node --target=node18 --banner:js=\"#!/usr/bin/env node\" --external:fsevents --outfile=dist/server.bundle.js",
 echo     "start": "node dist/server.js",
 echo     "start:bundle": "node dist/server.bundle.js",
 echo     "dev": "concurrently \"tsc -w\" \"nodemon dist/server.js\"",
 echo     "clean": "rm -rf dist",
 echo     "release:local": "npm run build ^&^& npm run build:bundle ^&^& mkdir -p ~/.local/bin ^&^& cp dist/server.bundle.js ~/.local/bin/mdviewer ^&^& chmod +x ~/.local/bin/mdviewer",
 echo     "install:local": "mkdir -p ~/.local/bin ^&^& cp dist/server.bundle.js ~/.local/bin/mdviewer ^&^& chmod +x ~/.local/bin/mdviewer"
 echo   },
 echo   "keywords": [
 echo     "markdown",
 echo     "viewer",
 echo     "typescript",
 echo     "mermaid",
 echo     "plantuml"
 echo   ],
 echo   "author": "Mi Code",
 echo   "license": "MIT",
 echo   "dependencies": {
 echo     "chokidar": "^3.6.0",
 echo     "express": "^4.22.1",
 echo     "marked": "^9.1.6",
 echo     "marked-highlight": "^2.2.3",
 echo     "mermaid": "^10.9.5",
 echo     "plantuml-encoder": "^1.4.0",
 echo     "prismjs": "^1.30.0",
 echo     "ws": "^8.18.3"
 echo   },
 echo   "devDependencies": {
 echo     "@types/express": "^4.17.21",
 echo     "@types/node": "^20.10.4",
 echo     "@types/ws": "^8.5.10",
 echo     "concurrently": "^8.2.2",
 echo     "esbuild": "^0.27.0",
 echo     "nodemon": "^3.0.2",
 echo     "typescript": "^5.3.3"
 echo   },
 echo   "files": [
 echo     "dist/server.bundle.js",
 echo     "README.md",
 echo     "LICENSE"
 echo   ]
 echo }
) > "%PROJECT_DIR%%PACKAGE_FILE%"
echo %COLOR_GREEN%[SUCCESS]%COLOR_RESET% package.json 文件已生成
exit /b

:is_port_available
set "port=%~1"
netstat -ano | findstr /r /c:":%port% .*LISTENING" >nul
if %errorlevel%==0 (
    exit /b 1
) else (
    exit /b 0
)

:find_available_port
set "start_port=%~1"
set /a candidate=start_port
:find_port_loop
set /a ws_port=candidate+WS_OFFSET
call :is_port_available %candidate%
if errorlevel 1 (
    set /a candidate=candidate+1
    goto :find_port_loop
)
call :is_port_available %ws_port%
if errorlevel 1 (
    set /a candidate=candidate+1
    goto :find_port_loop
)
set "AVAILABLE_PORT=%candidate%"
exit /b
