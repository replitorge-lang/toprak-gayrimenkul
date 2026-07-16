@echo off
setlocal
set "VSDEVCMD=D:\222\Common7\Tools\VsDevCmd.bat"
if not exist "%VSDEVCMD%" goto :skip
call "%VSDEVCMD%" -no_logo -winsdk=10.0.26100.0 -arch=x64 -host_arch=x64 >nul 2>&1
cd /d "%~dp0node_modules\better-sqlite3"
node "%~dp0node_modules\node-gyp\bin\node-gyp.js" rebuild --release --runtime=electron --target=43.0.0 --dist-url=https://electronjs.org/headers --arch=x64
exit /b %ERRORLEVEL%
:skip
echo Visual Studio not found at %VSDEVCMD%, skipping rebuild.
exit /b 0
