@echo on
setlocal
set "VSINSTALLDIR=D:\222"
echo BEFORE_VSDEVCMD=%VCINSTALLDIR%
call "%VSINSTALLDIR%\Common7\Tools\VsDevCmd.bat" -no_logo -winsdk=10.0.26100.0 -arch=x64 -host_arch=x64 >nul 2>&1
echo AFTER_VSDEVCMD=%VCINSTALLDIR%
echo AFTER_VSCMD_VER=%VSCMD_VER%
