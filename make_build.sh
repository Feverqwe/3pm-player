rm  ./build.zip
rm -r ./build
mkdir ./build

cp -r ./scripts ./build/scripts
cp -r ./images ./build/images
cp -r ./styles ./build/styles
cp -r ./www ./build/www
cp ./*.html ./build/.
cp ./*.json ./build/.
cp ./*.png ./build/.

#make www/main.js
java -jar compiler.jar --js ./www/js/main.js --js_output_file ./build/www/js/main.js
#make background.js
java -jar compiler.jar --js ./scripts/background.js --js_output_file ./build/scripts/background.js
#make engine.js
java -jar compiler.jar --js ./scripts/engine.js --js_output_file ./build/scripts/engine.js
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

java -jar htmlcompressor-1.5.3.jar -t html ./www/index.html -o ./build/www/index.html
java -jar htmlcompressor-1.5.3.jar -t html ./playlist.html -o ./build/playlist.html
java -jar htmlcompressor-1.5.3.jar -t html ./index.html -o ./build/index.html
java -jar htmlcompressor-1.5.3.jar -t html ./dialog.html -o ./build/dialog.html
java -jar htmlcompressor-1.5.3.jar -t html ./viz.html -o ./build/viz.html

cd ./build/
zip -9 -r ../build.zip ./
cd ../