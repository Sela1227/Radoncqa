@echo off
chcp 65001 >nul
title RadOncQA 建置檢查
setlocal
cd /d "%~dp0"

REM 與雲端 Railway 相同的建置流程：tsc 型別檢查 + vite build
where node >nul 2>nul
if not %errorlevel%==0 (
    if exist "%USERPROFILE%\nodejs\node.exe" set "PATH=%USERPROFILE%\nodejs;%PATH%"
)

echo [*] 執行 npm run build（tsc + vite）...
call npm run build
if errorlevel 1 (
    echo.
    echo [X] 建置失敗 —— 若在 Railway 也會失敗，請截圖回報。
) else (
    echo.
    echo [v] 建置成功 —— 可安心推上 Railway。
)
pause
