del .\build.zip
rd /S /Q .\build
mkdir .\build

xcopy .\js .\build\js\ /E
xcopy .\images .\build\images\ /E
copy .\*.json .\build\.

..\7za a -tzip .\build.zip .\build\*

pause