@echo off
chcp 65001 >nul
title VISOLIS - build
set DIR=%USERPROFILE%\VISOLIS-build
set BRANCH=ccr-dfd32f45-eiv9jo

where git >nul 2>nul || winget install -e --id Git.Git --accept-source-agreements --accept-package-agreements
where node >nul 2>nul || winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
set "PATH=%PATH%;C:\Program Files\Git\cmd;C:\Program Files\nodejs"

echo.
echo === Recuperation du code ===
if exist "%DIR%\.git" (
  git -C "%DIR%" fetch origin %BRANCH% && git -C "%DIR%" reset --hard origin/%BRANCH%
) else (
  git clone --branch %BRANCH% --depth 1 https://github.com/maketo8338-code/App-primal.git "%DIR%"
)
if errorlevel 1 goto erreur

cd /d "%DIR%\primal-app"
echo.
echo === Installation ===
call npm install || goto erreur

call npx --yes eas-cli whoami >nul 2>nul || call npx --yes eas-cli login

echo.
echo === APK de test (15-20 min) ===
call npx --yes eas-cli build -p android --profile preview --non-interactive || goto erreur

echo.
set /p OK="APK OK sur ton telephone ? Tape O pour faire l'AAB Google Play : "
if /i "%OK%"=="O" call npx --yes eas-cli build -p android --profile production --non-interactive || goto erreur

echo.
echo Termine. Les liens de telechargement sont au-dessus.
pause
exit /b

:erreur
echo.
echo ERREUR : fais une capture de cette fenetre et envoie-la a Claude.
pause
