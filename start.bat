@echo off
title 농산물 매입매출 관리 웹앱 실행기
echo ====================================================
echo  농산물 매입매출 관리 웹앱 로컬 서버를 가동합니다.
echo ====================================================
echo.
echo 1. 웹 브라우저를 엽니다: http://localhost:8000
start http://localhost:8000
echo.
echo 2. 로컬 웹 서버를 실행합니다... (종료하려면 Ctrl+C)
python -m http.server 8000
pause
