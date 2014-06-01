engine.files = function() {
    var var_cache = {
        waitList: [],
        workers: 0,
        dirCache: {}
    };
    var osxCharFix = (function() {
        // only for cirilic filenames
        if (window.navigator.platform.indexOf('Mac') === -1) {
            return;
        }
        var checkChar = [
            [String.fromCharCode(1080) + String.fromCharCode(774), String.fromCharCode(1081)],
            [String.fromCharCode(1048) + String.fromCharCode(774), String.fromCharCode(1049)],
            [String.fromCharCode(1045) + String.fromCharCode(776), String.fromCharCode(1025)],
            [String.fromCharCode(1077) + String.fromCharCode(776), String.fromCharCode(1105)]
        ];
        return function (text) {
            checkChar.forEach(function(item) {
                var word = item[0];
                var repl = item[1];
                while (text.indexOf(word) !== -1) {
                    text = text.replace(word, repl);
                }
            });
            return text;
        }
    })();
    var getEntryFromDir = function (entry, cb) {
        /**
         * @namespace entry.isDirectory
         * @namespace entry.createReader
         * @namespace dir.readEntries
         */
        /*
         * Получает массив файлов - Entry из Entry дирректории.
         */
        var dirName = entry.name;
        var dir = entry.createReader();
        dir.readEntries(function (entryList) {
            cb(entryList, dirName);
        });
    };
    var fineFilesInDirectory = function(entryList, fileList, cb) {
        var indexArr = [];
        var i = -1;
        entryList.forEach(function(entry){
            i++;
            var filename = entry.name;
            if (osxCharFix !== undefined) {
                filename = osxCharFix(filename);
            }
            var index = fileList.indexOf(filename);
            if ( index === -1 ) {
                return 1;
            }
            indexArr.push([index, i]);
        });
        indexArr.sort(function(a,b){
            if (a[0] < b[0]) {
                return -1;
            }
            if (a[0] > b[0]) {
                return 1;
            }
            return 0;
        });
        var orderEntryList = [];
        indexArr.forEach(function(item) {
            var entry = entryList[item[1]];
            var ext = '.'+entry.name.substr(entry.name.lastIndexOf('.') + 1).toLowerCase();
            var type = ext;
            if (!engine.player.canPlay(type)) {
                return 1;
            }
            orderEntryList.push( {fileEntry: entry, type: type} );
        });
        if (orderEntryList.length === 0) {
            return cb();
        }
        cb(orderEntryList);
    };

    var findFolderInDirectory = function(name, entryList, cb) {
        var found = 0;
        Array.prototype.forEach.call(entryList, function(entry){
            if (entry.name !== name || !entry.isDirectory) {
                return 1;
            }
            found = 1;
            getEntryFromDir(entry, function(entryList) {
                cb(entryList);
            });
        });
        if (found === 0) {
            cb();
        }
    };

    var workerReady = function() {
        var_cache.workers--;
        if (var_cache.waitList.length > 0) {
            var item = var_cache.waitList.shift();
            return getFilesFromPath(item[0], item[1], item[2], item[3]);
        }
    };

    var getFilesFromPath = function(path, fileList, entryList, cb) {
        if (var_cache.workers > 3) {
            var_cache.waitList.push([path, fileList, entryList, cb]);
            return;
        }
        var_cache.workers++;
        if (var_cache.dirCache[path] !== undefined) {
            workerReady();
            return fineFilesInDirectory(var_cache.dirCache[path], fileList, cb);
        }
        var path_arr = path.split('/');
        var path_len = path_arr.length;
        var findIn = function(index, entryList) {
            var folderName = path_arr[index];
            if (folderName === undefined) {
                cb();
                workerReady();
                return;
            }
            var fullPath = path_arr.slice(0, index+1).join('/');
            findFolderInDirectory(folderName, entryList, function(entryList) {
                if (entryList === undefined) {
                    cb();
                    workerReady();
                    return;
                }
                var_cache.dirCache[fullPath] = entryList;
                if (fullPath === path) {
                    workerReady();
                    return fineFilesInDirectory(entryList, fileList, cb);
                }
                findIn(index + 1, entryList);
            });
        };
        for (var i = path_len - 1; i > 0; i--) {
            var fullPath = path_arr.slice(0, i).join('/');
            if (var_cache.dirCache[fullPath] !== undefined) {
                findIn(i, var_cache.dirCache[fullPath]);
                return 1;
            }
        }
        findIn(0, entryList);
    };

    var getFileTree = function(file_tree, entryList, cb) {
        var fullEntryList = [];
        var promiseList = [];
        $.each(file_tree, function(path, fileList) {
            promiseList.push(
                new Promise(function(resolve){
                    getFilesFromPath(path, fileList, entryList, function(fileEntry) {
                        if (fileEntry !== undefined) {
                            fullEntryList = fullEntryList.concat(fileEntry);
                        }
                        resolve(true);
                    });
                })
            );
        });
        Promise.all(promiseList).then(function() {
            var_cache.dirCache = {};
            cb(fullEntryList);
        });
    };


    var openM3U = function (fileEntry, cb) {
        /*
         * Получает контент m3u
         */
        var fileReader = new FileReader();
        fileReader.onload = function () {
            cb(fileReader.result);
        };
        fileEntry.file(function (file) {
            fileReader.readAsText(file);
        });
    };

    var readM3U = function(m3uEntry, entryList, cb) {
        openM3U(m3uEntry, function(content) {
            var trackList = [];
            var promiseList = [];
            var lines = content.split('\n');
            var i = -1;
            var file_tree = {};
            lines.forEach(function(line){
                i++;
                line = line.trim();
                if (line[0] === '#' || line.length === 0) {
                    return 1;
                }
                var trackName = lines[i - 1] || '';
                if (trackName.substr(0,8) === '#EXTINF:') {
                    trackName = trackName.substr(trackName.indexOf(',') + 1 + 8);
                } else {
                    trackName = undefined;
                }
                var proto_url = line.substr(0, 7).toLowerCase();
                if (proto_url === "http://" || proto_url === "https:/") {
                    promiseList.push(new Promise(function(resolve){
                        trackList.push({url: line, type: '.mp3', tags: {default: {title: trackName || line}}});
                        resolve(true);
                    }));
                    return 1;
                }
                var last_slash_pos = line.lastIndexOf('/');
                var fileName = line.substr(last_slash_pos + 1);
                var filePath = line.substr(0, last_slash_pos);
                if (file_tree[filePath] === undefined) {
                    file_tree[filePath] = [];
                }
                file_tree[filePath].push(fileName);
            });
            promiseList.push(new Promise(function (resolve) {
                getFileTree(file_tree, entryList, function (_trackList) {
                    trackList = trackList.concat(_trackList);
                    resolve(true);
                });
            }));
            Promise.all(promiseList).then(function() {
                var m3uName = m3uEntry.name.substr(0, m3uEntry.name.lastIndexOf('.'));
                if (trackList.length === 0) {
                    return cb();
                }
                cb({title: m3uName, trackList: trackList});
            });
        });
    };
    var addInCollection = function(collection, collectionList) {
        if (collection !== undefined) {
            if (Array.isArray(collection)) {
                collectionList = collectionList.concat(collection);
            } else {
                collectionList.push(collection);
            }
        }
        return collectionList;
    };
    var readEntryList = function(entryList, cb, path) {
        var dirList = [];
        var m3uList = [];
        var fileList = [];
        var promiseList = [];
        var collectionList = [];
        Array.prototype.forEach.call(entryList, function(entry) {
            if (entry === null) {
                return 1;
            }
            if (entry.isDirectory) {
                dirList.push(entry);
                return 1;
            }
            var ext = '.'+entry.name.substr(entry.name.lastIndexOf('.') + 1).toLowerCase();
            var type = ext;
            if (type === '.m3u') {
                m3uList.push(entry);
                return 1;
            }
            if (!engine.player.canPlay(type)) {
                return 1;
            }
            fileList.push({fileEntry: entry, type: type});
        });
        if (m3uList.length > 0) {
            m3uList.forEach(function(entry) {
                promiseList.push(
                    new Promise(function(resolve){
                        readM3U(entry, entryList, function(collection) {
                            collectionList = addInCollection(collection, collectionList);
                            resolve(true);
                        });
                    })
                );
            });
        } else {
            dirList.forEach(function (entry) {
                // чление дирректории - рекурсия
                if (path !== undefined && path.length > 5) {
                    console.log('Deep skip');
                    return 0;
                }
                promiseList.push(
                    new Promise(function(resolve){
                        getEntryFromDir(entry, function (entryList, collectionName) {
                            var subPath = (path === undefined) ? [collectionName] : path.concat([collectionName]);
                            readEntryList(entryList, function (collection) {
                                collectionList = addInCollection(collection, collectionList);
                                resolve(true);
                            }, subPath);
                        });
                    })
                );
            });
        }
        if (fileList.length > 0) {
            promiseList.push(
                new Promise(function(resolve) {
                    var collectionName = (path !== undefined)? path.join('/') : undefined;
                    collectionList.push({title: collectionName || chrome.i18n.getMessage("playlist"), trackList: fileList});
                    resolve(true);
                })
            );
        }
        Promise.all(promiseList).then(function() {
            if (collectionList.length === 0) {
                return cb();
            }
            collectionList.sort(function(a,b){
                if (a.title < b.title) {
                    return -1;
                }
                if (a.title > b.title) {
                    return 1;
                }
                return 0;
            });
            cb(collectionList);
        });
    };
    var readDropFiles = function(dataTransferList, cb) {
        var entryList = [];
        Array.prototype.forEach.call(dataTransferList, function(item) {
            if (item.webkitGetAsEntry !== undefined) {
                item = item.webkitGetAsEntry();
            }
            entryList.push(item);
        });
        readEntryList(entryList, cb);
    };
    return {
        readAnyFiles: readEntryList,
        readDropFiles: readDropFiles
    }
}();