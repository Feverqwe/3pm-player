#!/bin/sh
rm  ./build.zip
rm -r ./build
mkdir ./build

cp -r ./scripts ./build/scripts
cp -r ./images ./build/images
cp -r ./styles ./build/styles
cp -r ./www ./build/www
cp -r ./_locales ./build/_locales
cp ./*.html ./build/.
cp ./*.json ./build/.
cp ./*.png ./build/.

#make www/main.js
java -jar compiler.jar --js ./www/js/main.js --js_output_file ./build/www/js/main.js
#make background.js
java -jar compiler.jar --js ./scripts/background.js --js_output_file ./build/scripts/background.js

#make engine.js
java -jar compiler.jar --js ./scripts/engine/minimize_mode.js \
 --js ./scripts/engine/e_cloud.js \
 --js ./scripts/engine/e_files.js \
 --js ./scripts/engine/e_lastfm.js \
 --js ./scripts/engine/e_notification.js \
 --js ./scripts/engine/e_player.js \
 --js ./scripts/engine/e_playlist.js \
 --js ./scripts/engine/e_tags.js \
 --js ./scripts/engine/e_webui.js \
 --js ./scripts/engine/e_wm.js \
 --js ./scripts/engine.js \
 --js_output_file ./build/scripts/engine.js
rm -r ./build/scripts/engine

#make id3-minimized.js
java -jar compiler.jar --js ./scripts/id3-minimized.js --js_output_file ./build/scripts/id3-minimized.js
#make player.js
java -jar compiler.jar --js ./scripts/player.js --js_output_file ./build/scripts/player.js
#make player.js
java -jar compiler.jar --js ./scripts/playlist.js --js_output_file ./build/scripts/playlist.js
#make dialog.js
java -jar compiler.jar --js ./scripts/dialog.js --js_output_file ./build/scripts/dialog.js
#make viz.js
java -jar compiler.jar --js ./scripts/viz.js --js_output_file ./build/scripts/viz.js
#make lang.js
java -jar compiler.jar --js ./scripts/lang.js --js_output_file ./build/scripts/lang.js
#make options.js
java -jar compiler.jar --js ./scripts/options.js --js_output_file ./build/scripts/options.js
#make video.js
java -jar compiler.jar --js ./scripts/video.js --js_output_file ./build/scripts/video.js

#make spark-md5.js
java -jar compiler.jar --js ./scripts/spark-md5.js --js_output_file ./build/scripts/spark-md5.js

#make dancer.js
java -jar compiler.jar --js ./scripts/dancer/dancer.js --js_output_file ./build/scripts/dancer/dancer.js
#make adapterWebkit.js
java -jar compiler.jar --js ./scripts/dancer/adapterWebkit.js --js_output_file ./build/scripts/dancer/adapterWebkit.js
#make kick.js
java -jar compiler.jar --js ./scripts/dancer/kick.js --js_output_file ./build/scripts/dancer/kick.js
#make support.js
java -jar compiler.jar --js ./scripts/dancer/support.js --js_output_file ./build/scripts/dancer/support.js
#make dancer.fft.js
java -jar compiler.jar --js ./scripts/dancer/plugins/dancer.fft.js --js_output_file ./build/scripts/dancer/plugins/dancer.fft.js
#make dancer.waveform.js
java -jar compiler.jar --js ./scripts/dancer/plugins/dancer.waveform.js --js_output_file ./build/scripts/dancer/plugins/dancer.waveform.js
#make fft.js
java -jar compiler.jar --js ./scripts/dancer/lib/fft.js --js_output_file ./build/scripts/dancer/lib/fft.js

#make www/style.css
java -jar yuicompressor-2.4.8.jar ./www/css/style.css -o ./build/www/css/style.css
#make main.css
#java -jar yuicompressor-2.4.8.jar ./styles/main.css -o ./build/styles/main.css
#make playlist.css
java -jar yuicompressor-2.4.8.jar ./styles/playlist.css -o ./build/styles/playlist.css
#make dialog.css
java -jar yuicompressor-2.4.8.jar ./styles/dialog.css -o ./build/styles/dialog.css
#make dialog.css
java -jar yuicompressor-2.4.8.jar ./styles/viz.css -o ./build/styles/viz.css
#make options.css
java -jar yuicompressor-2.4.8.jar ./styles/options.css -o ./build/styles/options.css
#make video.css
java -jar yuicompressor-2.4.8.jar ./styles/video.css -o ./build/styles/video.css

java -jar htmlcompressor-1.5.3.jar -t html ./www/index.html -o ./build/www/index.html
java -jar htmlcompressor-1.5.3.jar -t html ./playlist.html -o ./build/playlist.html
java -jar htmlcompressor-1.5.3.jar -t html ./index.html -o ./build/index.html
java -jar htmlcompressor-1.5.3.jar -t html ./dialog.html -o ./build/dialog.html
java -jar htmlcompressor-1.5.3.jar -t html ./viz.html -o ./build/viz.html
java -jar htmlcompressor-1.5.3.jar -t html ./options.html -o ./build/options.html
java -jar htmlcompressor-1.5.3.jar -t html ./video.html -o ./build/video.html

cd ./build/
zip -9 -r ../build.zip ./
cd ../