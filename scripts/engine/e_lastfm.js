var engine_lastfm = function(mySettings, myEngine) {
    window.engine_lastfm = undefined;
    var settings = mySettings;
    var engine = myEngine;
    var e_lastfm = function() {
        var suspand = false;
        var token = undefined;
        var session_key = undefined;
        var api_key = '8c51ae859dd656bf61e56fc1fc5f5439';
        var track_start_time = undefined;
        var scrobler_timer = undefined;
        var cache = {};
        var dialog_count = 0;
        var today_date = new Date().getTime();
        //DB
        var iDB = {
            db_name: 'lastfm',
            db: null,
            open: function() {
                iDB.db_open = true;
                var version = 1;
                /**
                 * @namespace indexedDB.open
                 * @namespace db.objectStoreNames
                 * @namespace db.deleteObjectStore
                 * @namespace db.createObjectStore
                 * @namespace request.onupgradeneeded
                 * @namespace request.onsuccess
                 * @namespace request.onerror
                 */
                var request = indexedDB.open(iDB.db_name, version);
                request.onupgradeneeded = function(e) {
                    var db = e.target.result;
                    e.target.transaction.onerror = indexedDB.onerror;
                    if (db.objectStoreNames.contains("cache")) {
                        db.deleteObjectStore("cache");
                    }

                    var store = db.createObjectStore("cache", {keyPath: "key"});
                };
                request.onsuccess = function(e) {
                    iDB.db = e.target.result;
                    iDB.clear();
                };

                request.onerror = function(e) {
                    iDB.onerror(e);
                };
            },
            onerror: function(e) {
                console.log('indexedDB', 'error!', e);
            },
            add: function(key, data) {
                /**
                 * @namespace db.transaction
                 * @namespace trans.objectStore
                 * @namespace store.put
                 */
                //add new or update if cn exists
                var db = iDB.db;
                var trans = db.transaction(["cache"], "readwrite");
                var store = trans.objectStore("cache");
                var request = store.put({
                    key: key,
                    data: data,
                    timeStamp: new Date().getTime()
                });
                /*
                 request.onsuccess = function(e) {
                 iDB.getAll(function(item){console.log(item);});
                 };
                 */
                request.onerror = iDB.onerror;
            },
            success: function(e) {
                if (e.code === 8) {
                    console.log('indexedDB', e.message);
                    return;
                }
                console.log('indexedDB', 'success!', e);
            },
            getAll: function(cb) {
                /**
                 * @namespace IDBKeyRange.lowerBound
                 * @namespace store.openCursor
                 * @namespace result.continue
                 */
                var items = [];
                var db = iDB.db;
                var trans = db.transaction(["cache"], "readonly");
                var store = trans.objectStore("cache");
                var keyRange = IDBKeyRange.lowerBound(0);
                var cursorRequest = store.openCursor(keyRange);

                cursorRequest.onsuccess = function(e) {
                    var result = e.target.result;
                    if (!!result === false) {
                        cb(items);
                        return;
                    }
                    items.push(result.value);
                    result.continue();
                };
                cursorRequest.onerror = iDB.onerror;
            },
            rm: function(cn) {
                //remove by key (in keyPath)
                /**
                 * @namespace db.transaction
                 * @namespace store.delete
                 */
                var db = iDB.db;
                var trans = db.transaction(["cache"], "readwrite");
                var store = trans.objectStore("cache");

                var request = store.delete(cn);
                /*
                 request.onsuccess = function(e) {
                 iDB.getAll(function(item){console.log(item);});
                 };
                 */

                request.onerror = iDB.onerror;
            },
            get: function(cn, cb) {
                //remove by cn (keyPath)
                var db = iDB.db;
                var trans = db.transaction(["cache"], "readonly");
                var store = trans.objectStore("cache");

                var request = store.get(cn);

                request.onsuccess = function(e) {
                    var result = e.target.result;
                    cb(result);
                };

                request.onerror = iDB.onerror;
            },
            clear: function() {
                /*
                 * Удаляет старые ключи, созданные более 7 дней назад.
                 */
                var now_date = new Date().getTime() - 7 * 24 * 60 * 60 * 1000;
                iDB.getAll(function(items) {
                    items.forEach(function(item) {
                        if (item.timeStamp < now_date) {
                            iDB.rm(item.key);
                        }
                    });
                });
            }
        };
        iDB.open();
        //
        var auth_getToken = function(type, url, cb) {
            if (dialog_count > 0) {
                console.log("Auth", "More one opened dialod!", dialog_count);
                return;
            }
            dialog_count++;
            /**
             * @namespace chrome.identity.launchWebAuthFlow
             */
            chrome.identity.launchWebAuthFlow({url: url, interactive: true},
            function(responseURL) {
                dialog_count--;
                if (responseURL === undefined) {
                    console.log("Auth", type, "URL not found!");
                    return;
                }
                var token = undefined;
                if (responseURL.indexOf("token=") !== -1) {
                    token = responseURL.replace(/.*token=([^&]*).*/, "$1");
                }
                if (token !== undefined) {
                    var obj = {};
                    obj[type + '_token'] = token;
                    chrome.storage.local.set(obj);
                    cb(token);
                } else {
                    console.log("Auth", type, "Token not found!", responseURL);
                }
            });
        };
        var auth = function(cb) {
            var type = 'lastfm';
            var url = 'http://www.last.fm/api/auth/?api_key=' + api_key;
            auth_getToken(type, url, function(tkn) {
                token = tkn;
                session_key = undefined;
                chrome.storage.local.remove('lastfm_session_key');
                cb(tkn);
            });
        };
        var getToken = function(cb) {
            if (token !== undefined) {
                cb(token);
                return;
            }
            chrome.storage.local.get('lastfm_token', function(obj) {
                /**
                 * @namespace obj.lastfm_token
                 */
                if (obj.lastfm_token !== undefined) {
                    token = obj.lastfm_token;
                    cb(token);
                } else {
                    auth(cb);
                }
            });
        };
        var clear_data = function() {
            chrome.storage.local.remove(['lastfm_token', 'lastfm_session_key']);
            token = undefined;
            session_key = undefined;
        };
        var apiCallSignature = function(params) {
            var secret = 'e7599b43e138572644a2c49a629af6b2';
            var keys = [];
            var o = '';

            for (var x in params) {
                if (!params.hasOwnProperty(x)) {
                    continue;
                }
                keys.push(x);
            }

            // params has to be ordered alphabetically
            keys.sort();
            var keys_len = keys.length;
            for (var i = 0; i < keys_len; i++) {
                if (keys[i] === 'format' || keys[i] === 'api_sig' || keys[i] === 'callback')
                    continue;
                o = o + keys[i] + params[keys[i]];
            }
            return SparkMD5.hash(o + secret);
        };
        var getSessionKey = function(cb) {
            var param = {
                method: 'auth.getsession',
                api_key: api_key,
                token: token,
                format: 'json'
            };
            param.api_sig = apiCallSignature(param);
            var url = 'http://ws.audioscrobbler.com/2.0/';
            $.ajax({
                type: 'GET',
                url: url,
                dataType: 'JSON',
                data: param,
                success: function(data) {
                    if (data.error === 4 || data.error === 15 || data.error === 14) {
                        console.log('getSessionKey', 'data.error 4 / 15 / 14', data);
                        clear_data();
                    }
                    if (data.error === 9) {
                        console.log('getSessionKey', 'data.error 9', data);
                        session_key = undefined;
                        chrome.storage.local.remove('lastfm_session_key');
                    }
                    if (data.error === 26) {
                        console.log('getSessionKey', 'data.error 26', data);
                        suspand = true;
                    }
                    if (data.error !== undefined) {
                        console.log('getSessionKey', 'data.error!', data);
                        return;
                    }
                    /**
                     * @namespace data.session
                     */
                    if (data.session === undefined || data.session.key === undefined) {
                        console.log('getSessionKey error!', data);
                        return;
                    }
                    cb(data.session.key);
                },
                error: function() {
                    clear_data();
                }
            });
        };
        var getSession = function(cb) {
            if (session_key !== undefined) {
                cb(session_key);
                return;
            }
            chrome.storage.local.get('lastfm_session_key', function(obj) {
                if (obj.lastfm_session_key !== undefined) {
                    session_key = obj.lastfm_session_key;
                    cb(session_key);
                } else {
                    getSessionKey(function(sk) {
                        chrome.storage.local.set({lastfm_session_key: sk});
                        cb(sk);
                    });
                }
            });
        };
        var updateNowPlaying = function(artist, track, album, duration) {
            var data = {
                method: 'track.updateNowPlaying',
                artist: artist || '',
                track: track || '',
                api_key: api_key,
                format: 'json',
                sk: session_key
            };
            if (data.artist.length === 0) {
                return;
            }
            if (data.track.length === 0) {
                return;
            }
            if (album !== undefined && album.length > 0) {
                data.album = album;
            }
            duration = parseInt(duration);
            if (!isNaN(duration)) {
                data.duration = duration;
            }
            var api_sig = apiCallSignature(data);
            $.ajax({
                type: "POST",
                url: 'http://ws.audioscrobbler.com/2.0/?' + $.param(data) + '&api_sig=' + api_sig,
                dataType: 'JSON',
                data: data,
                success: function(data) {
                    if (data.error === 9) {
                        console.log('updateNowPlaying', 'data.error 9', data);
                        session_key = undefined;
                        chrome.storage.local.remove('lastfm_session_key');
                    }
                    if (data.error === 4) {
                        console.log('updateNowPlaying', 'data.error 4', data);
                        clear_data();
                    }
                    if (data.error === 26) {
                        console.log('updateNowPlaying', 'data.error 26', data);
                        suspand = true;
                    }
                    if (data.error !== undefined) {
                        console.log('updateNowPlaying', 'data.error!', data);
                        return;
                    }
                    var start_timer = function() {
                        scrobler_timer = setTimeout(function() {
                            var audio = engine.player.getAudio();
                            var pos = parseInt(audio.currentTime);
                            if (isNaN(pos)) {
                                return;
                            }
                            if (pos > 30 && (pos > audio.duration / 2 || pos > 60 * 3)) {
                                e_lastfm.trackScrobble(artist, track, album, duration);
                            } else {
                                start_timer();
                            }
                        }, 35000);
                    };
                    start_timer();
                },
                error: function() {
                    clear_data();
                }
            });
        };
        var trackScrobble = function(artist, track, album, duration) {
            var data = {
                method: 'track.scrobble',
                timestamp: track_start_time || parseInt(new Date().getTime() / 1000) - 30,
                artist: artist || '',
                track: track || '',
                api_key: api_key,
                format: 'json',
                sk: session_key
            };
            if (data.artist.length === 0) {
                return;
            }
            if (data.track.length === 0) {
                return;
            }
            if (album !== undefined && album.length > 0) {
                data.album = album;
            }
            duration = parseInt(duration);
            if (!isNaN(duration)) {
                data.duration = duration;
            }
            var api_sig = apiCallSignature(data);
            $.ajax({
                type: "POST",
                url: 'http://ws.audioscrobbler.com/2.0/?' + $.param(data) + '&api_sig=' + api_sig,
                dataType: 'JSON',
                data: data,
                success: function(data) {
                    if (data.error === 9) {
                        console.log('trackScrobble', 'data.error 9', data);
                        session_key = undefined;
                        chrome.storage.local.remove('lastfm_session_key');
                    }
                    if (data.error === 4) {
                        console.log('trackScrobble', 'data.error 4', data);
                        clear_data();
                    }
                    if (data.error === 26) {
                        console.log('trackScrobble', 'data.error 26', data);
                        suspand = true;
                    }
                    if (data.error !== undefined) {
                        console.log('trackScrobble', 'data.error', data);
                        return;
                    }
                }
            });
        };
        var makeCN = function(artist, title) {
            return SparkMD5.hash(title + artist);
        };
        var getImage = function(cn, cb) {
            var url = cache[cn].url;
            if (url === undefined || url.length === 0 || !settings.lastfm_cover) {
                cb(cache[cn].info);
                return;
            }
            var xhr = new XMLHttpRequest();
            xhr.open("GET", url, true);
            xhr.responseType = "blob";
            xhr.onload = function() {
                cb(cache[cn].info, xhr.response);
            };
            xhr.onerror = function() {
                cb(cache[cn].info);
            };
            xhr.send(null);
        };
        var getTrackInfo = function(cn, artist, title, cb, no_cover) {
            var data = {
                method: 'track.getInfo',
                artist: artist,
                track: title,
                api_key: api_key,
                format: 'json',
                autocorrect: 1
            };
            if (cache[cn] === undefined) {
                cache[cn] = {};
            } else {
                if (no_cover === true) {
                    cb(cache[cn].info);
                } else {
                    getImage(cn, cb);
                }
                return;
            }
            var _cache = cache[cn];
            $.ajax({
                type: "GET",
                url: 'http://ws.audioscrobbler.com/2.0/?' + $.param(data),
                dataType: 'JSON',
                data: data,
                success: function(data) {
                    if (data.error === 26) {
                        console.log('getTrackInfo', 'data.error 26', data);
                        suspand = true;
                    }
                    _cache.info = {};
                    if (data.error === 6) {
                        iDB.add(cn, _cache);
                        cb();
                        return;
                    }
                    if (data.error !== undefined) {
                        console.log('getTrackInfo', 'data.error!', data);
                        cb();
                        return;
                    }
                    if (data.track === undefined) {
                        cb();
                        return;
                    }
                    if (data.track.name !== undefined
                            && data.track.name.length > 0) {
                        _cache.info.title = data.track.name;
                    }
                    if (data.track.artist !== undefined
                            && data.track.artist.name !== undefined
                            && data.track.artist.name.length > 0) {
                        _cache.info.artist = data.track.artist.name;
                    }
                    if (data.track.album !== undefined
                            && data.track.album.title !== undefined
                            && data.track.album.title.length > 0) {
                        _cache.info.album = data.track.album.title;
                    }
                    if (data.track.album === undefined
                            || data.track.album.image === undefined
                            || data.track.album.image.length === 0) {
                        iDB.add(cn, _cache);
                        cb(_cache.info);
                        return;
                    }
                    var item = data.track.album.image.slice(-1)[0];
                    var url = item['#text'];
                    if (url === undefined || url.indexOf('noimage') !== -1) {
                        iDB.add(cn, _cache);
                        cb(_cache.info);
                        return;
                    }
                    _cache.url = url;
                    iDB.add(cn, _cache);
                    if (no_cover === true) {
                        cb(_cache.info);
                    } else {
                        getImage(cn, cb);
                    }
                },
                error: function() {
                    cb();
                }
            });
        };
        var getAlbumInfo = function(cn, artist, album, cb) {
            var data = {
                method: 'album.getInfo',
                artist: artist,
                album: album,
                api_key: api_key,
                format: 'json',
                autocorrect: 1
            };
            if (cache[cn] === undefined) {
                cache[cn] = {};
            } else {
                getImage(cn, cb);
                return;
            }
            var _cache = cache[cn];
            $.ajax({
                type: "GET",
                url: 'http://ws.audioscrobbler.com/2.0/?' + $.param(data),
                dataType: 'JSON',
                data: data,
                success: function(data) {
                    if (data.error === 26) {
                        console.log('getAlbumInfo', 'data.error 26', data);
                        suspand = true;
                    }
                    _cache.info = {};
                    if (data.error === 6) {
                        iDB.add(cn, _cache);
                        cb();
                        return;
                    }
                    if (data.error !== undefined) {
                        console.log('getAlbumInfo', 'data.error!', data);
                        cb();
                        return;
                    }
                    if (data.album === undefined) {
                        cb();
                        return;
                    }
                    if (data.album.name !== undefined
                            && data.album.name.length > 0) {
                        _cache.info.album = data.album.name;
                    }
                    if (data.album.artist !== undefined
                            && data.album.artist.length > 0) {
                        _cache.info.artist = data.album.artist;
                    }
                    if (data.album.image === undefined
                            && data.album.image.length === 0) {
                        iDB.add(cn, _cache);
                        cb(_cache.info);
                        return;
                    }
                    var item = data.album.image.slice(-1)[0];
                    var url = item['#text'];
                    if (url === undefined || url.indexOf('noimage') !== -1) {
                        iDB.add(cn, _cache);
                        cb(_cache.info);
                        return;
                    }
                    _cache.url = url;
                    iDB.add(cn, _cache);
                    getImage(cn, cb);
                },
                error: function() {
                    cb();
                }
            });
        };
        var _getAlbumInfo = function(cn, artist, album, cb, cache_only, no_cover) {
            if (cn === undefined || no_cover === true || !settings.lastfm_cover) {
                cb();
                return;
            }
            if (cache[cn] !== undefined) {
                return getAlbumInfo(cn, artist, album, cb);
            }
            iDB.get(cn, function(item) {
                if (item !== undefined) {
                    if (item.timeStamp < today_date - 2 * 24 * 60 * 60 * 1000) {
                        iDB.add(cn, item.data);
                    }
                    cache[cn] = item.data;
                } else
                if (cache_only || navigator.onLine === false) {
                    cb();
                    return;
                }
                getAlbumInfo(cn, artist, album, cb);
            });
        };
        var _getTrackInfo = function(cn, artist, title, cb, cache_only, no_cover) {
            if (cache[cn] !== undefined || !settings.lastfm_info) {
                return getTrackInfo(cn, artist, title, cb, no_cover);
            }
            iDB.get(cn, function(item) {
                if (item !== undefined) {
                    if (item.timeStamp < today_date - 2 * 24 * 60 * 60 * 1000) {
                        iDB.add(cn, item.data);
                    }
                    cache[cn] = item.data;
                } else
                if (cache_only || navigator.onLine === false) {
                    cb();
                    return;
                }
                getTrackInfo(cn, artist, title, cb, no_cover);
            });
        };
        return {
            getInfo : function(artist, title, album, cb, cache_only, no_cover) {
                var track_hash, album_hash;
                if (artist.length !== 0 && title.length !== 0) {
                    track_hash = makeCN(artist, title);
                }
                if (album !== undefined && artist.length !== 0 && album.length !== 0) {
                    album_hash = makeCN(artist, album);
                }
                _getAlbumInfo(album_hash, artist, album, function(a_info, a_blob) {
                    var _no_cover = (no_cover === true) ? no_cover : a_blob !== undefined;
                    _getTrackInfo(track_hash, artist, title, function(t_info, t_blob) {
                        if (t_info === undefined) {
                            cb(a_info, a_blob);
                            return;
                        }
                        if (a_info !== undefined) {
                            t_info.album = a_info.album;
                        }
                        if (a_blob !== undefined) {
                            t_blob = a_blob;
                        }
                        cb(t_info, t_blob);
                    }, cache_only, _no_cover);
                }, cache_only, no_cover);
            },
            updateNowPlaying : function(a, b, c, d) {
                if (navigator.onLine === false) {
                    return;
                }
                if (suspand) {
                    return;
                }
                clearTimeout(scrobler_timer);
                track_start_time = parseInt(new Date().getTime() / 1000);
                getToken(function() {
                    getSession(function() {
                        updateNowPlaying(a, b, c, d);
                    });
                });
            },
            trackScrobble : function(a, b, c, d) {
                if (suspand) {
                    return;
                }
                getToken(function() {
                    getSession(function() {
                        trackScrobble(a, b, c, d);
                    });
                });
            }
        };
    }();
    return e_lastfm;
};