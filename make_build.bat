del .\build.zip
rd /S /Q .\build
mkdir .\build

xcopy .\js .\build\js\ /E
xcopy .\img .\build\img\ /E
xcopy .\css .\build\css\ /E
xcopy .\www .\build\www\ /E
xcopy .\_locales .\build\_locales\ /E
copy .\*.html .\build\.
copy .\*.json .\build\.

:: make www/main.js
java -jar compiler.jar --js .\www\js\main.js --js_output_file .\build\www\js\main.js
:: make launcher.js
java -jar compiler.jar --js .\js\launcher.js --js_output_file .\build\js\launcher.js

:: make engine.js
java -jar compiler.jar --language_in ECMASCRIPT5 --js .\js\engine.min.js^
 --js .\js\engine\e_player.js^
 --js .\js\engine\e_tags.js^
 --js .\js\engine\e_lastfm.js^
 --js .\js\engine\e_settings.js^
 --js .\js\engine\e_files.js^
 --js .\js\engine\e_context.js^
 --js .\js\engine\e_notification.js^
 --js .\js\engine\e_webui.js^
 --js .\js\engine\e_cloud.js^
 --js .\js\engine\e_playlist.js^
 --js .\js\engine\e_hotkeys.js^
 --js .\js\engine\e_wm.js^
 --js .\js\engine\e_ready.js^
 --js_output_file .\build\js\engine.js
rd /S /Q .\build\js\engine

:: make player.js
java -jar compiler.jar --js .\js\player.js --js_output_file .\build\js\player.js
:: make playlist.js
java -jar compiler.jar --js .\js\playlist.js --js_output_file .\build\js\playlist.js
:: make dialog.js
java -jar compiler.jar --language_in ECMASCRIPT5 --js .\js\dialog.js --js_output_file .\build\js\dialog.js
:: make viz.js
java -jar compiler.jar --js .\js\viz.js --js_output_file .\build\js\viz.js
:: make options.js
java -jar compiler.jar --js .\js\options.js --js_output_file .\build\js\options.js
:: make video.js
java -jar compiler.jar --js .\js\video.js --js_output_file .\build\js\video.js

:: make spark-md5.js
java -jar compiler.jar --js .\js\spark-md5.js --js_output_file .\build\js\spark-md5.js

:: make dancer.js
java -jar compiler.jar --js .\js\dancer\dancer.js --js_output_file .\build\js\dancer\dancer.js
:: make adapterWebAudio.js
java -jar compiler.jar --js .\js\dancer\adapterWebAudio.js --js_output_file .\build\js\dancer\adapterWebAudio.js
:: make kick.js
java -jar compiler.jar --js .\js\dancer\kick.js --js_output_file .\build\js\dancer\kick.js
:: make support.js
java -jar compiler.jar --js .\js\dancer\support.js --js_output_file .\build\js\dancer\support.js
:: make fft.js
java -jar compiler.jar --js .\js\dancer\lib\fft.js --js_output_file .\build\js\dancer\lib\fft.js
:: make dancer.fft.js
java -jar compiler.jar --js .\js\dancer\plugins\dancer.fft.js --js_output_file .\build\js\dancer\plugins\dancer.fft.js
:: make dancer.waveform.js
java -jar compiler.jar --js .\js\dancer\plugins\dancer.waveform.js --js_output_file .\build\js\dancer\plugins\dancer.waveform.js

7za a -tzip .\build.zip .\build\*

pause