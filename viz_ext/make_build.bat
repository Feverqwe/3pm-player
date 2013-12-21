del .\build.zip
rd /S /Q .\build
mkdir .\build

xcopy .\viz .\build\viz\ /E
xcopy .\images .\build\images\ /E
copy .\*.json .\build\.

java -jar ..\compiler.jar --js .\viz\storage.js --js_output_file .\build\viz\storage.js
java -jar ..\compiler.jar --js .\viz\boot.js --js_output_file .\build\viz\boot.js

..\7za a -tzip .\build.zip .\build\*

pause