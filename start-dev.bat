@echo off
chcp 65001 >nul
title RadOncQA 開發伺服器
setlocal

REM ============================================
REM  RadOncQA 一鍵啟動（雙擊即可）
REM  1) 自動尋找 Node.js（含免安裝 ZIP 版）
REM  2) 第一次或 package.json 變動後自動 npm install
REM  3) 啟動 npm run dev 並自動開瀏覽器
REM ============================================

cd /d "%~dp0"

REM --- 尋找 Node.js ---
where node >nul 2>nul
if %errorlevel%==0 goto :node_ok

if exist "%USERPROFILE%\nodejs\node.exe" (
    set "PATH=%USERPROFILE%\nodejs;%PATH%"
    goto :node_ok
)
if exist "C:\nodejs\node.exe" (
    set "PATH=C:\nodejs;%PATH%"
    goto :node_ok
)

echo.
echo [X] 找不到 Node.js。
echo     請先安裝 Node.js LTS（https://nodejs.org/），
echo     或將免安裝版解壓到 %USERPROFILE%\nodejs
echo.
pause
exit /b 1

:node_ok
for /f "delims=" %%v in ('node -v') do echo [v] Node.js %%v

REM --- 相依安裝判斷：node_modules 缺、或 package.json 與上次安裝時的快照不同 ---
set NEED_INSTALL=0
if not exist "node_modules\" set NEED_INSTALL=1
if exist "node_modules\" (
    fc /b "package.json" "node_modules\.pkg-snapshot" >nul 2>nul
    if errorlevel 1 set NEED_INSTALL=1
)

if %NEED_INSTALL%==1 (
    echo [*] 安裝相依套件（第一次約 1-2 分鐘）...
    call npm install --no-audit --no-fund
    if errorlevel 1 (
        echo.
        echo [X] npm install 失敗，請截圖上方錯誤訊息。
        pause
        exit /b 1
    )
    copy /y "package.json" "node_modules\.pkg-snapshot" >nul
    if exist "node_modules\.vite" rd /s /q "node_modules\.vite"
)

echo [v] 相依就緒
echo.
echo ============================================
echo  啟動中... 瀏覽器將自動開啟
echo  http://localhost:5173
echo  結束測試：回到此視窗按 Ctrl + C
echo ============================================
echo.

start "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:5173"

call npm run dev

pause
