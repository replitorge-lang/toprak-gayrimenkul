@echo on
echo BEFORE=%VCINSTALLDIR%
call "D:\222\Common7\Tools\VsDevCmd.bat" -no_logo -winsdk=10.0.26100.0 -arch=x64 -host_arch=x64 >nul 2>&1
echo AFTER=%VCINSTALLDIR%
