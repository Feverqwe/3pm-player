del .\build.zip
rd /S /Q .\build
mkdir .\build

xcopy .\viz .\build\viz\ /E
xcopy .\images .\build\images\ /E
copy .\*.json .\build\.

java -jar ..\compiler.jar --js .\viz\storage.js --js_output_file .\build\viz\storage.js
java -jar ..\compiler.jar --js .\viz\adapterWebkit.js --js_output_file .\build\viz\adapterWebkit.js
java -jar ..\compiler.jar --js .\viz\boot.js --js_output_file .\build\viz\boot.js
java -jar ..\compiler.jar --js .\viz\dancer.js --js_output_file .\build\viz\dancer.js
java -jar ..\compiler.jar --js .\viz\kick.js --js_output_file .\build\viz\kick.js
java -jar ..\compiler.jar --js .\viz\support.js --js_output_file .\build\viz\support.js

..\7za a -tzip .\build.zip .\build\*

pause