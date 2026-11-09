@echo off
chcp 65001 >nul
title MyToDoList 伺服器啟動中
echo 正在啟動 MyToDoList 本地網頁伺服器...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1"
pause
