engine.tags = function() {
    var var_cache = {
        coverList: [],
        coverListByURL: {},
        coverMaxWidthHeight: 80 * 2,
        id3SizeLimit: 1024*1024*100
    };
    var options = {
        hasGetMetadata: chrome.mediaGalleries.getMetadata !== undefined
    };
    var arrayChkSum = function (a) {
        var len = a.length;
        var c = 128;
        if (len < c) {
            c = len;
        }
        var step = Math.floor(len / c);
        var chk = new Array(len);
        for (var i = 0; i < c; i++) {
            chk[i] = [i * step];
        }
        return chk.join('');
    };
    var getBlobCheckSum = function(blob, cb) {
        if (blob.buffer !== undefined) {
            // blob - is Unit8Array
            return cb(arrayChkSum(blob) + '_' + blob.length);
        }
        var reader = new FileReader();
        reader.onload = function() {
            var array = new Uint8Array(this.result);
            cb(arrayChkSum(array) + '_' + blob.size);
        };
        reader.readAsArrayBuffer(blob);
    };
    var str2blob = function (byteCharacters, contentType, sliceSize) {
        var byteCharacters_len = byteCharacters.length;
        var byteArrays = new Array(Math.ceil(byteCharacters_len / sliceSize));
        var n = 0;
        for (var offset = 0; offset < byteCharacters_len; offset += sliceSize) {
            var slice = byteCharacters.slice(offset, offset + sliceSize);
            var slice_len = slice.length;
            var byteNumbers = new Array(slice_len);
            for (var i = 0; i < slice_len; i++) {
                byteNumbers[i] = slice.charCodeAt(i) & 0xff;
            }
            byteArrays[n] = new Uint8Array(byteNumbers);
            n++;
        }
        return new Blob(byteArrays, {type: contentType});
    };
    var b64toBlob = function (b64Data, contentType) {
        var byteCharacters = atob(b64Data);
        return str2blob(byteCharacters, contentType, 256);
    };
    var resizeImage = function(url, cb) {
        /*
         * Проверяет изображение на возможность прочтения
         * Изменяет размер обложки.
         */
        var image = new Image();
        image.onerror = function () {
            cb();
        };
        image.onload = function () {
            var r = var_cache.coverMaxWidthHeight / Math.max(this.width, this.height),
                w = Math.round(this.width * r),
                h = Math.round(this.height * r);
            var canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;
            canvas.getContext("2d").drawImage(this, 0, 0, w, h);
            var blob = b64toBlob(canvas.toDataURL('image/png', 1).split(',')[1], 'image/png');
            cb(blob);
        };
        image.src = url;
    };
    var findCheckSum = function(checksum) {
        for (var i = 0, item; item = var_cache.coverList[i]; i++) {
            if (checksum === item.checksum) {
                return i;
            }
        }
        return undefined;
    };
    var addCoverInLibrary = function(data, cb) {
        // data - blob, or data from ID3 library
        if (data === undefined) {
            return cb();
        }
        var blob = undefined;
        if (data.data !== undefined) {
            // data from ID3 lib
            if (data.data.buffer === undefined) {
                //data is Array
                data.data = new Uint8Array(data.data);
            }
            blob = new Blob([data.data], {type: 'image/jpeg'});
        } else {
            blob = data;
        }
        getBlobCheckSum(data.data || blob, function(checksum) {
            var cacheID = findCheckSum(checksum);
            if (cacheID !== undefined) {
                return cb(cacheID);
            }
            var url = URL.createObjectURL(blob);
            resizeImage(url, function(mini_blob) {
                window.URL.revokeObjectURL(url);
                if (mini_blob === undefined) {
                    return cb();
                }
                var id = var_cache.coverList.length;
                var_cache.coverList.push({size: blob.size, url: window.URL.createObjectURL(mini_blob), checksum: checksum});
                cb(id);
            });
        });
    };
    var getID3tags = function(blob, cover_id, cb) {
        var args = {tags: ["artist", "title", "album", "picture"], file: blob};
        ID3.loadTags(0, function () {
            var new_tags = ID3.getAllTags(0);
            ID3.clearAll();
            var tags = {};
            ['title', 'artist', 'album'].forEach(function (key) {
                var item = new_tags[key];
                if (item !== undefined && item.length > 0) {
                    tags[key] = item;
                }
            });
            if (cover_id !== undefined) {
                new_tags.picture = undefined;
            }
            addCoverInLibrary(new_tags.picture, function (cover_id) {
                tags.cover = cover_id;
                cb(tags);
            });
        }, args);
    };
    var getImage = function(url, cb) {
        if (url === undefined) {
            return cb();
        }
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.responseType = "blob";
        xhr.onload = function() {
            cb(xhr.response);
        };
        xhr.onerror = function() {
            cb();
        };
        xhr.send(null);
    };
    var getCover = function(tags, cb) {
        /*
        Если в tags есть cover то это URL, его надо скачат и добавить в библиотеку.
         */
        var url = tags.cover;
        if (url === undefined) {
            return cb();
        }
        if (var_cache.coverListByURL[url] !== undefined) {
            return cb(var_cache.coverListByURL[url]);
        }
        getImage(url, function(blob) {
            if (blob === undefined) {
                return cb();
            }
            addCoverInLibrary(blob, function(cover_id) {
                var_cache.coverListByURL[url] = cover_id;
                cb(cover_id);
            });
        });
    };
    var getLastFMtags = function(track, tags, cache, cb) {
        // LastFM только уточняет тэги и получает обложку!
        if (track.tags.lfm !== undefined && ( track.tags.lfm.cache === 0 || (track.tags.lfm.cache === 1 && cache === 1) ) ) {
            return cb();
        }
        if (_settings.lastfm_album_info === 0 && _settings.lastfm_track_info === 0) {
            // if lfm disabled
            track.tags.lfm = {cache: 0};
            return cb();
        }
        engine.lastfm.getTags(tags, track.cover, cache, function (lfm_tags) {
            //extend - т.к. элемент мог быть получен из кэша и он должен быть скопирован
            var tags = $.extend({}, lfm_tags);
            getCover(tags, function (cover_id) {
                if (cover_id !== undefined) {
                    track.cover = cover_id;
                }
                delete tags.cover;
                tags.cache = cache;
                track.tags.lfm = tags;
                cb();
            });
        });
    };
    var getTags = function(track, cache, cb) {
        getCover(track.tags.default, function(cover) {
            delete track.tags.default.cover;
            if (cover !== undefined) {
                track.cover = cover;
            }
            if (track.fileEntry !== undefined ) {
                if (track.tags.id3 === undefined) {
                    // track.tags.id3 всегда обьект
                    track.fileEntry.file(function (file) {
                        if ( file.size > var_cache.id3SizeLimit ) {
                            track.tags.id3 = {};
                            return getLastFMtags(track, track.tags.default, cache, cb);
                        }
                        getID3tags(file, track.cover, function (tags) {
                            // set tags to track
                            track.tags.id3 = tags;
                            if (tags.cover !== undefined) {
                                track.cover = tags.cover;
                                delete tags.cover;
                            }
                            getLastFMtags(track, tags, cache, cb);
                        });
                    });
                } else {
                    getLastFMtags(track, track.tags.id3, cache, cb);
                }
                return;
            }
            getLastFMtags(track, track.tags.default, cache, cb);
        });
    };
    var formatTags = function(tags) {
        var title = "";
        var album = "";
        var artist = "";
        var artist_album = "";
        if (tags.title !== undefined && tags.title.length > 0) {
            title = tags.title;
        }
        if (tags.artist !== undefined && tags.artist.length > 0) {
            artist = tags.artist;
        }
        if (tags.album !== undefined && tags.album.length > 0) {
            album = tags.album;
        }
        if (album.length > 0 && artist.length > 0) {
            artist_album = tags.artist + ' ‒ ' + tags.album;
        } else if (artist.length > 0) {
            artist_album = artist;
        } else if (album.length > 0) {
            artist_album = album;
        }
        var data = {title: title};
        if (artist.length > 0) {
            data.artist = artist;
        }
        if (album.length > 0) {
            data.album = album;
        }
        data.title_artist_album = title;
        if (artist_album.length > 0) {
            data.artist_album = artist_album;
            data.title_artist_album += ' ‒ ' + artist_album;
        }
        return data;
    };
    var readTags = function(track) {
        var cover = track.cover;
        var tags = track.tags;
        var info = undefined;
        if (tags.lfm !== undefined && tags.lfm.title !== undefined) {
            // читает тэги lfm
            info = formatTags(tags.lfm);
        } else
        if (tags.id3 !== undefined && tags.id3.title !== undefined) {
            // читает тэги id3
            info = formatTags(tags.id3);
        } else {
            // читает тэги default
            info = formatTags(tags.default);
        }
        info.cover = cover;
        return info;
    };
    var readTrackTags = function(track) {
        var tags = readTags(track);
            player.setTags(tags);
        _send('video', function(window) {
            window.video.setTags(tags);
        });
        _send('viz', function(window) {
            window.viz.setTags(tags);
        });
        _send('playlist', function(window) {
            window.playlist.updateTrack(track);
        });
    };
    return {
        readTags: readTags,
        readTrackTags: readTrackTags,
        getTags: getTags,
        cover: var_cache.coverList,
        readTrackList: function() {
            var thread = 0;
            var item_id = -1;
            var items = engine.playlist.memory.collection.trackList;
            var items_len = items.length;
            var next_item = function () {
                if (thread < 5) {
                    item_id++;
                    thread++;
                    if (item_id >= items_len) {
                        return;
                    }
                    var track = items[item_id];
                    if (track.tags.id3 !== undefined && (track.tags.lfm !== undefined && track.tags.lfm.cache !== undefined ) ) {
                        thread--;
                        next_item();
                        return;
                    }
                    read_item(track);
                }
            };
            var read_item = function (track) {
                next_item();
                getTags(track, 1, function() {
                    _send('playlist', function(window) {
                        window.playlist.updateTrack(track);
                    });
                    thread--;
                    next_item();
                });
            };
            next_item();
        }
    }
}();