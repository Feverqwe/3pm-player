(function(ns) {
    var lastfm = ns.lastfm = {};
    var suspand = false;
    var token = undefined;
    var session_key = undefined;
    var api_key = '8c51ae859dd656bf61e56fc1fc5f5439';
    var track_start_time = undefined;
    var scrobler_timer = undefined;
    var track_cache = {};
    var dialog_count = 0;
    var auth_getToken = function(type, url, cb) {
        if (dialog_count > 0) {
            console.log("Auth", "More one opened dialod!", dialog_count);
            return;
        }
        dialog_count++;
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
        var keys = new Array();
        var o = '';

        for (var x in params)
            keys.push(x);

        // params has to be ordered alphabetically
        keys.sort();

        for (var i = 0; i < keys.length; i++) {
            if (keys[i] === 'format' || keys[i] === 'api_sig' || keys[i] === 'callback')
                continue;
            o = o + keys[i] + params[keys[i]];
        }
        return MD5(o + secret);
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
            statusCode: {
                200: function(data) {
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
                    if (data.session === undefined || data.session.key === undefined) {
                        console.log('getSessionKey error!', data);
                        return;
                    }
                    cb(data.session.key);
                }
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
            statusCode: {
                200: function(data) {
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
                            var audio = engine.getAudio();
                            var pos = parseInt(audio.currentTime);
                            if (isNaN(pos)) {
                                return;
                            }
                            if (pos > 30 && (pos > audio.duration / 2 || pos > 60 * 3)) {
                                lastfm.trackScrobble(artist, track, album, duration);
                            } else {
                                start_timer();
                            }
                        }, 35000);
                    };
                    start_timer();
                }
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
            statusCode: {
                200: function(data) {
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
            }
        });
    };
    var getImage = function(cn, cb) {
        var url = track_cache[cn].url;
        if (url === undefined) {
            cb(track_cache[cn].info);
            return;
        }
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.responseType = "blob";
        xhr.onload = function() {
            cb(track_cache[cn].info, xhr.response);
        };
        xhr.send(null);
    };
    lastfm.getCover = function(artist, title, cb) {
        var data = {
            method: 'track.getInfo',
            artist: artist || '',
            track: title || '',
            api_key: api_key,
            format: 'json',
            autocorrect: 1
        };
        var cn = data.artist + data.track;
        if (track_cache[cn] === undefined) {
            track_cache[cn] = {};
        } else {
            getImage(cn, cb);
            return;
        }
        if (suspand) {
            return;
        }
        if (data.artist.length === 0) {
            return;
        }
        if (data.track.length === 0) {
            return;
        }
        $.ajax({
            type: "GET",
            url: 'http://ws.audioscrobbler.com/2.0/?' + $.param(data),
            dataType: 'JSON',
            data: data,
            statusCode: {
                200: function(data) {
                    if (data.error === 26) {
                        console.log('getCover', 'data.error 26', data);
                        suspand = true;
                    }
                    track_cache[cn].info = {};
                    if (data.error !== undefined) {
                        console.log('getCover', 'data.error!', data);
                        return;
                    }
                    if (data.track === undefined) {
                        return;
                    }
                    if (data.track.name !== undefined
                            && data.track.name.length > 0) {
                        track_cache[cn].info.title = data.track.name;
                    }
                    if (data.track.artist !== undefined
                            && data.track.artist.name !== undefined
                            && data.track.artist.name.length > 0) {
                        track_cache[cn].info.artist = data.track.artist.name;
                    }
                    if (data.track.album !== undefined
                            && data.track.album.title !== undefined
                            && data.track.album.title.length > 0) {
                        track_cache[cn].info.album = data.track.album.title;
                    }
                    if (track_cache[cn].info.artist !== undefined && track_cache[cn].info.title !== undefined) {
                        var _cn = track_cache[cn].info.artist + track_cache[cn].info.title;
                        track_cache[_cn] = track_cache[cn];
                    }
                    if (data.track.album === undefined
                            || data.track.album.image === undefined
                            || data.track.album.image.length === 0) {
                        cb(track_cache[cn].info);
                        return;
                    }
                    var item = data.track.album.image.slice(-1)[0];
                    var url = item['#text'];
                    track_cache[cn].url = url;
                    getImage(cn, cb);
                }
            }
        });
    };
    lastfm.updateNowPlaying = function(a, b, c, d) {
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
    };
    lastfm.trackScrobble = function(a, b, c, d) {
        if (suspand) {
            return;
        }
        getToken(function() {
            getSession(function() {
                trackScrobble(a, b, c, d);
            });
        });
    };
})(this);