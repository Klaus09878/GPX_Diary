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
set "RUNTIME_NODE_DIR=.\runtime\node"

if exist "%RUNTIME_NODE_DIR%\node.exe" (
	set "NODE_EXE=%RUNTIME_NODE_DIR%\node.exe"
	if exist "%RUNTIME_NODE_DIR%\npm.cmd" (
		set "NPM_CMD=%RUNTIME_NODE_DIR%\npm.cmd"
	)
	echo Verwende portable Node.js aus LiveMapApp\runtime\node
) else (
	if /I "%USE_GLOBAL_NODE_FALLBACK%"=="1" (
		where node >NUL 2>NUL
		where npm >NUL 2>NUL
		if errorlevel 1 (
			echo.
			echo FEHLER: Weder portable Runtime noch globale Node/npm-Installation gefunden.
			echo.
			echo Erwartet wird: LiveMapApp\runtime\node\node.exe und LiveMapApp\runtime\node\npm.cmd
			echo.
			pause
			exit /b 1
		)
		set "NODE_EXE=node"
		set "NPM_CMD=npm"
		echo WARNUNG: Verwende globales Node.js, weil USE_GLOBAL_NODE_FALLBACK=1 gesetzt ist.
	) else (
		echo.
		echo FEHLER: Portable Node-Runtime fehlt.
		echo.
		echo Erwartet wird: LiveMapApp\runtime\node\node.exe und LiveMapApp\runtime\node\npm.cmd
		echo Diese Distribution soll ohne lokale Node-Installation laufen.
		echo Bitte Runtime im Repository bereitstellen und Script erneut starten.
		echo.
		echo Hinweis fuer Entwickler: Fuer einen temporaeren Fallback setze USE_GLOBAL_NODE_FALLBACK=1
		echo.
		pause
		exit /b 1
	)
)

if "%NPM_CMD%"=="" (
	echo.
	echo FEHLER: npm wurde nicht gefunden.
	echo Erwartet wird: LiveMapApp\runtime\node\npm.cmd
	echo Bitte die portable Runtime mit npm vollstaendig bereitstellen.
	pause
	exit /b 1
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
