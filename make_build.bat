del .\build.zip
rd /S /Q .\build
mkdir .\build

xcopy .\scripts .\build\scripts\ /E
xcopy .\images .\build\images\ /E
xcopy .\styles .\build\styles\ /E
xcopy .\www .\build\www\ /E
copy .\*.html .\build\.
copy .\*.json .\build\.
copy .\*.png .\build\.

:: make www/main.js
java -jar compiler.jar --js .\www\js\main.js --js_output_file .\build\www\js\main.js
:: make background.js
java -jar compiler.jar --js .\scripts\background.js --js_output_file .\build\scripts\background.js
:: make engine.js
java -jar compiler.jar --js .\scripts\engine.js --js_output_file .\build\scripts\engine.js
:: make id3-minimized.js
java -jar compiler.jar --js .\scripts\id3-minimized.js --js_output_file .\build\scripts\id3-minimized.js
:: make player.js
java -jar compiler.jar --js .\scripts\player.js --js_output_file .\build\scripts\player.js
:: make player.js
java -jar compiler.jar --js .\scripts\playlist.js --js_output_file .\build\scripts\playlist.js
:: make www/style.css
java -jar yuicompressor-2.4.7.jar .\www\css\style.css -o .\build\www\css\style.css
:: make main.css
java -jar yuicompressor-2.4.7.jar .\styles\main.css -o .\build\styles\main.css
:: make playlist.css
java -jar yuicompressor-2.4.7.jar .\styles\playlist.css -o .\build\styles\playlist.css

java -jar htmlcompressor-1.5.3.jar -t html .\www\index.html -o .\build\www\index.html
java -jar htmlcompressor-1.5.3.jar -t html .\playlist.html -o .\build\playlist.html
java -jar htmlcompressor-1.5.3.jar -t html .\index.html -o .\build\index.html

7za a -tzip .\build.zip .\build\*

puse