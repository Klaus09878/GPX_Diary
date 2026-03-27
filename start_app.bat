@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "APP_DIR=%~dp0LiveMapApp"

if not exist "%APP_DIR%\" (
	echo.
	echo FEHLER: Der App-Ordner "LiveMapApp" wurde nicht gefunden.
	echo Bitte pruefe, ob der Ordner neben diesem Startscript liegt.
	echo.
	pause
	exit /b 1
)

cd /d "%APP_DIR%"

echo Starte GPX Map Diary Server...

set "NODE_EXE="
set "NPM_CMD="

if exist ".\runtime\node\node.exe" (
	set "NODE_EXE=.\runtime\node\node.exe"
	if exist ".\runtime\node\npm.cmd" (
		set "NPM_CMD=.\runtime\node\npm.cmd"
	) else (
		set "NPM_CMD=npm"
	)
	echo Verwende mitgeliefertes Node.js aus LiveMapApp\runtime\node
) else (
	where node >NUL 2>NUL
	if errorlevel 1 (
		echo.
		echo FEHLER: Node.js wurde nicht gefunden.
		echo.
		echo Option A ^(empfohlen^): Node.js LTS installieren und Script erneut starten.
		echo Option B ^(ohne Installation^): Portable Node nach LiveMapApp\runtime\node entpacken.
		echo Download: https://nodejs.org/en/download
		echo.
		pause
		exit /b 1
	)
	set "NODE_EXE=node"
	set "NPM_CMD=npm"
	echo Verwende global installiertes Node.js.
)

if not exist "package.json" (
	echo.
	echo FEHLER: package.json wurde in LiveMapApp nicht gefunden.
	pause
	exit /b 1
)

if not exist "node_modules" (
	echo.
	echo node_modules fehlt - installiere Abhaengigkeiten...
	call "%NPM_CMD%" install
	if errorlevel 1 (
		echo.
		echo FEHLER: npm install fehlgeschlagen.
		pause
		exit /b 1
	)
)

echo.
echo Oeffne Browser auf http://localhost:3000 ...
start "" http://localhost:3000

echo.
echo Server laeuft. Zum Beenden: Strg+C
if not exist "server.js" (
	echo FEHLER: server.js wurde in LiveMapApp nicht gefunden.
	pause
	exit /b 1
)

"%NODE_EXE%" server.js
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if not "%EXIT_CODE%"=="0" (
	echo Server wurde mit Fehlercode %EXIT_CODE% beendet.
) else (
	echo Server beendet.
)

pause
exit /b %EXIT_CODE%
