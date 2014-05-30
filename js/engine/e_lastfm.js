engine.lastfm = function() {
    /**
     * @namespace chrome.identity.launchWebAuthFlow
     * @namespace obj.lastfm_token
     */
    var var_cache = {
        cache: {},
        type: 'lastfm',
        token: undefined,
        session_key: undefined,
        api_key: '8c51ae859dd656bf61e56fc1fc5f5439',
        track_start_time: undefined,
        scrobler_timer: undefined,
        today_date: Date.now()
    };
    var tokenStore = undefined;
    chrome.storage.local.get('lfm_cache', function(storage) {
        var_cache.cache = storage.lfm_cache || {};
    });
    var save_cache = function() {
        chrome.storage.local.set({lfm_cache: var_cache.cache});
    };
    var auth = function(cb) {
        var type = var_cache.type;
        var url = 'http://www.last.fm/api/auth/?api_key=' + var_cache.api_key;
        engine.cloud.auth_getToken(type, url, function(token) {
            var_cache.token = token;
            var_cache.session_key = undefined;
            chrome.storage.local.remove('lastfm_session_key');
            cb();
        });
    };
    var getToken = function(cb) {
        if (var_cache.token !== undefined) {
            return cb();
        }
        if (tokenStore === undefined) {
            tokenStore = engine.cloud.onceGetTokenStore();
        }
        var token = tokenStore.get(var_cache.type);
        if (token === undefined) {
            return auth(cb);
        }
        cb();
    };
    var clear_data = function() {
        tokenStore.set(var_cache.type);
        chrome.storage.local.remove(['lastfm_session_key']);
        var_cache.token = undefined;
        var_cache.session_key = undefined;
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
        for (var i = 0, len = keys.length; i < len; i++) {
            if (keys[i] === 'format' || keys[i] === 'api_sig' || keys[i] === 'callback') {
                continue;
            }
            o = o + keys[i] + params[keys[i]];
        }
        return SparkMD5.hash(o + secret);
    };
    var getSessionKey = function(cb) {
        var param = {
            method: 'auth.getsession',
            api_key: var_cache.api_key,
            token: var_cache.token,
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
                    var_cache.session_key = undefined;
                    chrome.storage.local.remove('lastfm_session_key');
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
        if (var_cache.session_key !== undefined) {
            return cb(var_cache.session_key);
        }
        chrome.storage.local.get('lastfm_session_key', function(obj) {
            if (obj.lastfm_session_key !== undefined) {
                var_cache.session_key = obj.lastfm_session_key;
                return cb();
            }
            getSessionKey(function(session_key) {
                chrome.storage.local.set({lastfm_session_key: session_key});
                cb();
            });
        });
    };
    var getAlbumInfo = function(hash, artist, album, cb) {
        var data = {
            method: 'album.getInfo',
            artist: artist,
            album: album,
            api_key: var_cache.api_key,
            format: 'json',
            autocorrect: 1
        };
        $.ajax({
            type: "GET",
            url: 'http://ws.audioscrobbler.com/2.0/?' + $.param(data),
            dataType: 'JSON',
            data: data,
            success: function(data) {
                var info = {};
                if (data.error === 6) {
                    var_cache.cache[hash] = null;
                    return cb();
                }
                if (data.error !== undefined) {
                    console.log('getAlbumInfo', 'data.error!', data);
                    return cb();
                }
                if (data.album === undefined) {
                    var_cache.cache[hash] = null;
                    return cb();
                }
                if (data.album.name !== undefined) {
                    info.album = data.album.name;
                }
                if (data.album.artist !== undefined) {
                    info.artist = data.album.artist;
                }
                if (data.album.image !== undefined) {
                    var item = data.album.image.slice(-1)[0];
                    var url = item['#text'];
                    if (url !== undefined && url.length > 0 && url.indexOf('noimage') === -1) {
                        info.cover = url;
                    }
                }
                var_cache.cache[hash] = info;
                cb(info);
            },
            error: function() {
                cb();
            }
        });
    };
    var getTrackInfo = function(hash, artist, title, cb) {
        var data = {
            method: 'track.getInfo',
            artist: artist,
            track: title,
            api_key: var_cache.api_key,
            format: 'json',
            autocorrect: 1
        };
        $.ajax({
            type: "GET",
            url: 'http://ws.audioscrobbler.com/2.0/?' + $.param(data),
            dataType: 'JSON',
            data: data,
            success: function(data) {
                var info = {};
                if (data.error === 6) {
                    var_cache.cache[hash] = null;
                    return cb();
                }
                if (data.error !== undefined) {
                    console.log('getTrackInfo', 'data.error!', data);
                    return cb();
                }
                if (data.track === undefined) {
                    var_cache.cache[hash] = null;
                    return cb();
                }
                if (data.track.name !== undefined
                    && data.track.name.length > 0) {
                    info.title = data.track.name;
                }
                if (data.track.artist !== undefined
                    && data.track.artist.name !== undefined) {
                    info.artist = data.track.artist.name;
                }
                if (data.track.album !== undefined
                    && data.track.album.title !== undefined) {
                    info.album = data.track.album.title;
                }
                if (data.track.album !== undefined
                    && data.track.album.image !== undefined) {
                    var item = data.track.album.image.slice(-1)[0];
                    var url = item['#text'];
                    if (url !== undefined && url.length > 0 && url.indexOf('noimage') === -1) {
                        info.cover = url;
                    }
                }
                var_cache.cache[hash] = info;
                cb(info);
            },
            error: function() {
                cb();
            }
        });
    };
    var _getAlbumInfo = function(tags, cache, cb) {
        if (_settings.lastfm_album_info === 0) {
            return cb();
        }
        if ( tags.artist === undefined || tags.album === undefined ) {
            return cb();
        }
        var hash = 'a_'+tags.artist+'_'+tags.album;
        if (cache || var_cache.cache[hash] !== undefined) {
            return cb(var_cache.cache[hash]);
        }
        getAlbumInfo(hash, tags.artist, tags.album, function(info){
            cb(info);
            save_cache();
        });
    };
    var _getTrackInfo = function(tags, cache, cb) {
        if (_settings.lastfm_track_info === 0) {
            return cb();
        }
        if ( tags.artist === undefined || tags.title === undefined ) {
            return cb();
        }
        var hash = 't_'+tags.artist+'_'+tags.title;
        if (cache || var_cache.cache[hash] !== undefined ) {
            return cb( var_cache.cache[hash] );
        }
        getTrackInfo(hash, tags.artist, tags.title, function(info){
            cb(info);
            save_cache();
        });
    };
    var getTags = function(tags, cover, cache, cb) {
        if (navigator.onLine === false) {
            cache = 1;
        }
        if (cover === undefined ) {
            _getAlbumInfo(tags, cache, function(albumInfo) {
                albumInfo = $.extend({}, albumInfo);
                _getTrackInfo(tags, cache, function(trackInfo) {
                    trackInfo = $.extend({}, trackInfo, albumInfo);
                    cb(trackInfo);
                });
            });
            return;
        }
        _getTrackInfo(tags, cache, function(trackInfo) {
            trackInfo = $.extend({}, trackInfo);
            if (tags.album !== undefined) {
                trackInfo.album = tags.album;
            }
            delete trackInfo.cover;
            cb(trackInfo);
        });
    };
    var nowPlaying = function(tags, duration) {
        var data = {
            method: 'track.updateNowPlaying',
            api_key: var_cache.api_key,
            artist: tags.artist,
            track: tags.title,
            format: 'json',
            sk: session_key
        };
        if (tags.artist === undefined || data.track.length === 0) {
            return;
        }
        if (tags.album !== undefined) {
            data.album = tags.album;
        }
        if (duration !== Infinity) {
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
                    var_cache.session_key = undefined;
                    chrome.storage.local.remove('lastfm_session_key');
                }
                if (data.error === 4) {
                    console.log('updateNowPlaying', 'data.error 4', data);
                    clear_data();
                }
                if (data.error === 26) {
                    console.log('updateNowPlaying', 'data.error 26', data);
                }
                if (data.error !== undefined) {
                    console.log('updateNowPlaying', 'data.error!', data);
                    return;
                }
                var start_timer = function() {
                    var_cache.scrobler_timer = setTimeout(function() {
                        var audio = engine.player.getMedia();
                        var pos = parseInt(audio.currentTime);
                        if (pos === Infinity) {
                            return;
                        }
                        if (pos > 30 && (pos > audio.duration / 2 || pos > 60 * 3)) {
                            trackScrobble(tags, duration);
                        } else {
                            start_timer();
                        }
                    }, 35000);
                };
                start_timer();
            }
        });
    };
    var trackScrobble = function(tags, duration) {
        var data = {
            method: 'track.scrobble',
            timestamp: var_cache.track_start_time || parseInt(Date.now() / 1000) - 30,
            artist: tags.artist,
            track: tags.title,
            api_key: var_cache.api_key,
            format: 'json',
            sk: var_cache.session_key
        };
        if (tags.album !== undefined) {
            data.album = tags.album;
        }
        if (duration !== Infinity) {
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
                    var_cache.session_key = undefined;
                    chrome.storage.local.remove('lastfm_session_key');
                }
                if (data.error === 4) {
                    console.log('trackScrobble', 'data.error 4', data);
                }
                if (data.error === 26) {
                    console.log('trackScrobble', 'data.error 26', data);
                }
                if (data.error !== undefined) {
                    console.log('trackScrobble', 'data.error', data);
                }
            }
        });
    };
    return {
        getTags: getTags,
        nowPlaying : function(tags, duration) {
            if (_settings.lastfm_scrobble === 0 || navigator.onLine === false) {
                return;
            }
            clearTimeout(var_cache.scrobler_timer);
            var_cache.track_start_time = parseInt(Date.now() / 1000);
            getToken(function() {
                getSession(function() {
                    nowPlaying(tags, duration);
                });
            });
        }
    }
}();