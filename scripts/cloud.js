var cloud = function() {
    var cookie = function() {
        return {
            set: function(key, value, expire) {
                var exp = new Date().getTime() + parseInt(expire) * 1000;
                var obj = {};
                obj[key] = value;
                obj[key + '_expire'] = exp;
                chrome.storage.sync.set(obj);
            },
            get: function(key, cb) {
                var exp_key = key + '_expire';
                var arr = [key, exp_key];
                chrome.storage.sync.get(arr, function(obj) {
                    var time = new Date().getTime();
                    if (key in obj && obj[exp_key] >= time) {
                        cb(obj);
                    } else {
                        cb({});
                    }
                });
            },
            remove: function(key) {
                chrome.storage.sync.remove([key, key + '_expire']);
            }
        };
    }();
    var vk = function() {
        var token = undefined;
        var timeout = 500;
        var saved_tracks = [];
        var is_error = function(data) {
            if ('error' in data) {
                token = undefined;
                cookie.remove('vk_token');
                return true;
            }
            return false;
        };
        var getPopular = function(cb, genre_id) {
            if (genre_id === undefined) {
                genre_id = 0;
            }
            var url = 'https://api.vk.com/method/audio.getPopular?v=5.5&access_token=' + token + '&count=100&genre_id=' + genre_id;
            var tracks = [];
            $.getJSON(url, function(data) {
                if (is_error(data) || 'response' in data === false) {
                    console.log("VK", "getPopular", "API error", data);
                    return;
                }
                data.response.forEach(function(item) {
                    tracks.push({id: tracks.length, owner_id: item.owner_id, track_id: item.id, file: {name: item.url, url: item.url}, tags: {title: item.title, artist: item.artist}, duration: item.duration});
                });
                cb(tracks);
            });
        };
        var getRecommendations = function(cb) {
            var url = 'https://api.vk.com/method/audio.getRecommendations?v=5.5&access_token=' + token + '&count=100&shuffle=1';
            var tracks = [];
            $.getJSON(url, function(data) {
                if (is_error(data) || 'response' in data === false) {
                    console.log("VK", "getRecommendations", "API error", data);
                    return;
                }
                data.response.forEach(function(item) {
                    tracks.push({id: tracks.length, owner_id: item.owner_id, track_id: item.id, file: {name: item.url, url: item.url}, tags: {title: item.title, artist: item.artist}, duration: item.duration});
                });
                cb(tracks);
            });
        };
        var getTracks = function(cb, album_id) {
            var url = 'https://api.vk.com/method/audio.get?v=5.5&access_token=' + token + ((album_id !== undefined) ? '&album_id=' + album_id : '');
            var tracks = [];
            var offset = 0;
            var getPage = function(offset) {
                $.getJSON(url + "&count=6000&offset=" + offset, function(data) {
                    if (is_error(data) || 'response' in data === false || 'items' in data.response === false || 'count' in data.response === false) {
                        console.log("VK", "getTracks", "API error", data);
                        return;
                    }
                    data = data.response;
                    if (data.count === 0) {
                        cb(tracks);
                        return;
                    }
                    var len = 0;
                    data.items.forEach(function(item) {
                        tracks.push({id: tracks.length, album_id: item.album_id, file: {name: item.url, url: item.url}, tags: {title: item.title, artist: item.artist}, duration: item.duration});
                        len++;
                    });
                    if (len <= 0) {
                        console.log("VK", "getTracks", "len = 0", data);
                        return;
                    }
                    if (tracks.length !== data.count) {
                        offset += len;
                        setTimeout(function() {
                            getPage(offset);
                        }, timeout);
                    } else {
                        cb(tracks);
                    }
                });
            };
            getPage(offset);
        };
        var getAlbums = function(cb) {
            var url = 'https://api.vk.com/method/audio.getAlbums?v=5.5&access_token=' + token;
            var albums = [];
            var offset = 0;
            var getPage = function(offset) {
                $.getJSON(url + "&count=100&offset=" + offset, function(data) {
                    if (is_error(data) || 'response' in data === false || 'items' in data.response === false || 'count' in data.response === false) {
                        console.log("VK", "getAlbums", "API error", data);
                        return;
                    }
                    data = data.response;
                    if (data.count === 0) {
                        cb(albums);
                        return;
                    }
                    var len = 0;
                    data.items.forEach(function(item) {
                        albums.push({id: albums.length, album_id: item.album_id, title: item.title});
                        len++;
                    });
                    if (len <= 0) {
                        console.log("VK", "getAlbums", "len = 0", data);
                        return;
                    }
                    if (albums.length !== data.count) {
                        offset += len;
                        setTimeout(function() {
                            getPage(offset);
                        }, timeout);
                    } else {
                        cb(albums);
                    }
                });
            };
            getPage(offset);
        };
        var getToken = function(cb) {
            if (token !== undefined) {
                cb(token);
                return;
            }
            cookie.get('vk_token', function(obj) {
                if ('vk_token' in obj) {
                    token = obj['vk_token'];
                    cb(token);
                } else {
                    vkAuth(cb);
                }
            });
        };
        var makeAlbums = function(cb) {
            getAlbums(function(all_albums) {
                all_albums.push({title: "[All]", album_id: "nogroup"});
                all_albums.push({title: "[Recommendations]", album_id: "recommendations", vk_save: true});
                all_albums.push({title: "[Popular]", album_id: "popular0", vk_save: true});
                all_albums.push({title: "[Rock]", album_id: "popular1", vk_save: true});
                all_albums.push({title: "[Pop]", album_id: "popular2", vk_save: true});
                all_albums.push({title: "[Rap & Hip-Hop]", album_id: "popular3", vk_save: true});
                all_albums.push({title: "[Easy Listening]", album_id: "popular4", vk_save: true});
                all_albums.push({title: "[Dance & House]", album_id: "popular5", vk_save: true});
                all_albums.push({title: "[Instrumental]", album_id: "popular6", vk_save: true});
                all_albums.push({title: "[Metal]", album_id: "popular7", vk_save: true});
                all_albums.push({title: "[Alternative]", album_id: "popular21", vk_save: true});
                all_albums.push({title: "[Dubstep]", album_id: "popular8", vk_save: true});
                all_albums.push({title: "[Jazz & Blues]", album_id: "popular9", vk_save: true});
                all_albums.push({title: "[Drum & Bass]", album_id: "popular10", vk_save: true});
                all_albums.push({title: "[Trance]", album_id: "popular11", vk_save: true});
                all_albums.push({title: "[Chanson]", album_id: "popular12", vk_save: true});
                all_albums.push({title: "[Ethnic]", album_id: "popular13", vk_save: true});
                all_albums.push({title: "[Acoustic & Vocal]", album_id: "popular14", vk_save: true});
                all_albums.push({title: "[Reggae]", album_id: "popular15", vk_save: true});
                all_albums.push({title: "[Classical]", album_id: "popular16", vk_save: true});
                all_albums.push({title: "[Indie Pop]", album_id: "popular17", vk_save: true});
                all_albums.push({title: "[Speech]", album_id: "popular19", vk_save: true});
                all_albums.push({title: "[Electropop & Disco]", album_id: "popular22", vk_save: true});
                all_albums.push({title: "[Other]", album_id: "popular18", vk_save: true});
                var list = [];
                all_albums.forEach(function(item) {
                    list.push({name: item.title, album_id: item.album_id, id: list.length, type: "vk", vk_save: (item.vk_save === true)});
                });
                cb(list);
            });
        };
        var vkAuth = function(cb) {
            var client_id = "4037628";
            var settings = "audio";
            var redirect_uri = 'https://' + chrome.runtime.id + '.chromiumapp.org/cb';
            var display = "page";
            var url = 'https://oauth.vk.com/authorize?v=5.5&client_id=' + client_id + '&scope=' + settings + '&redirect_uri=' + redirect_uri + '&display=' + display + '&response_type=token';
            chrome.identity.launchWebAuthFlow({url: url, interactive: true},
            function(responseURL) {
                if (!responseURL) {
                    console.log("VK", "No url");
                    return;
                }
                if (responseURL.indexOf("access_token=") !== -1) {
                    token = responseURL.replace(/.*access_token=([a-zA-Z0-9]*)&.*/, "$1");
                    var exp = responseURL.replace(/.*expires_in=([0-9]*)&?.*/, "$1");
                    cookie.set('vk_token', token, exp);
                    cb(token);
                } else {
                    cookie.remove('vk_token');
                    token = undefined;
                    console.log("VK", "No token", responseURL);
                }
            });
        };
        var makeAlbumTracks = function(id, cb) {
            if (id === "nogroup") {
                id = undefined;
            }
            if (id !== undefined) {
                if (id.length > 7 && id.substr(0, 7) === "popular") {
                    var sid = parseInt(id.substr(7));
                    if (isNaN(sid)) {
                        return;
                    }
                    getPopular(function(tracks) {
                        if (tracks.length === 0) {
                            return;
                        }
                        cb(tracks);
                    }, sid);
                    return;
                } else
                if (id === "recommendations") {
                    getRecommendations(function(tracks) {
                        if (tracks.length === 0) {
                            return;
                        }
                        cb(tracks);
                    });
                    return;
                }
            }
            getTracks(function(tracks) {
                if (tracks.length === 0) {
                    return;
                }
                cb(tracks);
            }, id);
        };
        var addInLibrarty = function(id, oid, cb) {
            var url = 'https://api.vk.com/method/audio.add?v=5.5&audio_id=' + id + '&owner_id=' + oid + '&access_token=' + token;
            $.getJSON(url, function(data) {
                if (is_error(data) || 'response' in data === false) {
                    console.log("VK", "addInLibrarty", "API error", data);
                    return;
                }
                if (cb !== undefined) {
                    cb(true);
                }
            });
        };
        return {
            makeAlbums: function(a) {
                getToken(function() {
                    makeAlbums(a);
                });
            },
            makeAlbumTracks: function(a, b) {
                saved_tracks = [];
                getToken(function() {
                    makeAlbumTracks(a, b);
                });
            },
            addInLibrarty: function(id, oid, cb) {
                if (saved_tracks.indexOf(id + '_' + oid) !== -1) {
                    console.log('VK', 'addInLibrarty', 'The track has already been added.');
                    return;
                }
                saved_tracks.push(id + '_' + oid);
                getToken(function() {
                    addInLibrarty(id, oid, cb);
                });
            },
            on_select_list: function(list, cb) {
                engine.vk.makeAlbumTracks(list.album_id, function(tracks) {
                    cb(tracks, {name: list.name, id: list.id, vk_save: (list.vk_save === true)});
                });
            }
        };
    }();
    var db = function() {
        var token = undefined;
        var clear = function() {
            chrome.storage.sync.remove('db_token');
            token = undefined;
        };
        var dbAuth = function(cb) {
            var client_id = "t8uqhrqkw9rz5x8";
            var redirect_uri = 'https://' + chrome.runtime.id + '.chromiumapp.org/cb';
            var url = 'https://www.dropbox.com/1/oauth2/authorize?client_id=' + client_id + '&response_type=token&redirect_uri=' + redirect_uri;
            chrome.identity.launchWebAuthFlow({url: url, interactive: true},
            function(responseURL) {
                if (!responseURL) {
                    console.log("DB", "No url");
                    return;
                }
                if (responseURL.indexOf("access_token=") !== -1) {
                    token = responseURL.replace(/.*access_token=([a-zA-Z0-9\-]*)&.*/, "$1");
                    chrome.storage.sync.set({db_token: token});
                    cb(token);
                } else {
                    clear();
                    console.log("DB", "No token", responseURL);
                }
            });
        };
        var getFilelist = function(cb, root, path) {
            if (root === undefined) {
                root = 'dropbox';
            }
            if (path === undefined) {
                path = '';
            }
            var url = 'https://api.dropbox.com/1/metadata/' + root + path;
            var xhr = new XMLHttpRequest();
            xhr.open("GET", url);
            xhr.setRequestHeader("Authorization", "Bearer " + token);
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    var data = JSON.parse(xhr.responseText);
                    if ('error' in data) {
                        clear();
                        console.log("DB", "getFilelist", "API Error", data);
                        return;
                    }
                    cb(data);
                }
            };
            xhr.send(null);
        };
        var getMedia = function(cb, root, path) {
            if (root === undefined) {
                root = 'dropbox';
            }
            if (path === undefined) {
                path = '';
            }
            var url = 'https://api.dropbox.com/1/media/' + root + path;
            var xhr = new XMLHttpRequest();
            xhr.open("GET", url);
            xhr.setRequestHeader("Authorization", "Bearer " + token);
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4)
                {
                    var data = JSON.parse(xhr.responseText);
                    if ('error' in data) {
                        clear();
                        cb(undefined);
                        console.log("DB", "getMedia", "API Error", data);
                        return;
                    }
                    cb(data.url);
                }
            };
            xhr.send(null);
        };
        var getToken = function(cb) {
            if (token !== undefined) {
                cb(token);
                return;
            }
            chrome.storage.sync.get('db_token', function(obj) {
                if ('db_token' in obj) {
                    token = obj.db_token;
                    cb(token);
                } else {
                    dbAuth(cb);
                }
            });
        };
        return {
            getFilelist: function(a, b, c) {
                getToken(function() {
                    getFilelist(a, b, c);
                });
            },
            getMedia: function(a, b, c) {
                getToken(function() {
                    getMedia(a, b, c);
                });
            },
            onplay: function(track, player, cb) {
                var getHead = function(url) {
                    $.ajax({type: "HEAD", url: url,
                        success: function() {
                            track.file.head = true;
                            cb(url);
                        }, error: function() {
                            track.file.head = false;
                            cb('');
                        }
                    });
                };
                if (track.file.url !== undefined && track.file.head === true) {
                    cb(track.file.url);
                    return;
                }
                if (track.file.head === false) {
                    getHead(track.file.url);
                    return;
                }
                db.getMedia(function(url) {
                    track.file.url = url;
                    getHead(url);
                }, track.root, track.path);
            }
        };
    }();
    var sc = function() {
        var client_id = '13f6a1d3bbd03d754387a51dccd8bf83';
        var token = undefined;
        var user_id = undefined;
        var clear = function() {
            chrome.storage.sync.remove(['sc_token', 'sc_user_id']);
            token = undefined;
            user_id = undefined;
        };
        var scAuth = function(cb) {
            var redirect_uri = 'https://' + chrome.runtime.id + '.chromiumapp.org/cb';
            var url = 'https://soundcloud.com/connect?client_id=' + client_id + '&response_type=token&redirect_uri=' + redirect_uri;
            chrome.identity.launchWebAuthFlow({url: url, interactive: true},
            function(responseURL) {
                if (!responseURL) {
                    console.log("SC", "No url");
                    return;
                }
                if (responseURL.indexOf("access_token=") !== -1) {
                    token = responseURL.replace(/.*access_token=([a-zA-Z0-9\-]*)&.*/, "$1");
                    chrome.storage.sync.set({sc_token: token});
                    cb(token);
                } else {
                    clear();
                    console.log("SC", "No token", responseURL);
                }
            });
        };
        var scUserId = function(cb) {
            var url = 'https://api.soundcloud.com/me.json?oauth_token=' + token;
            var xhr = new XMLHttpRequest();
            xhr.open("GET", url);
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4)
                {
                    if (xhr.status !== 200) {
                        clear();
                        console.log("SC", "scUserId", "API Error", data);
                        return;
                    }
                    var data = JSON.parse(xhr.responseText);
                    user_id = data.id;
                    cb(data.id);
                }
            };
            xhr.send(null);
        };
        var getUserId = function(cb) {
            if (user_id !== undefined) {
                cb(user_id);
                return;
            }
            chrome.storage.sync.get('sc_user_id', function(obj) {
                if ('sc_user_id' in obj) {
                    user_id = obj.sc_user_id;
                    cb(user_id);
                } else {
                    scUserId(cb);
                }
            });
        };
        var getToken = function(cb) {
            if (token !== undefined) {
                cb(token);
                return;
            }
            chrome.storage.sync.get('sc_token', function(obj) {
                if ('sc_token' in obj) {
                    token = obj.sc_token;
                    cb(token);
                } else {
                    scAuth(cb);
                }
            });
        };
        var getAlbums = function(cb) {
            var url = 'http://api.soundcloud.com/users/' + user_id + '/playlists.json?client_id=' + client_id;
            var xhr = new XMLHttpRequest();
            xhr.open("GET", url);
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4)
                {
                    if (xhr.status !== 200) {
                        clear();
                        console.log("SC", "getAlbums", "API Error", data);
                        return;
                    }
                    var data = JSON.parse(xhr.responseText);
                    var list = [];
                    data.forEach(function(item) {
                        var tracks = [];
                        item.tracks.forEach(function(track) {
                            if (track.streamable === false || (track.original_format === "wav" && track.track_type === 'original')) {
                                return 1;
                            }
                            tracks.push({id: 0, file: {name: track.title, url: track.stream_url + '?client_id=' + client_id}, tags: undefined, meta: {title: track.title, artist: track.user.username, artwork: track.artwork_url}, duration: track.duration, type: 'sc'});
                        });
                        list.push({name: item.title, id: list.length, type: "sc", tracks: tracks});
                    });
                    if (list.length === 0) {
                        return;
                    }
                    cb(list);
                }
            };
            xhr.send(null);
        };
        return {
            makeAlbums: function(cb) {
                getToken(function() {
                    getUserId(function() {
                        getAlbums(cb);
                    });
                });
            },
            read_tags: function(track, cb) {
                var tags = {title: track.meta.title, artist: track.meta.artist};
                var xhr = new XMLHttpRequest();
                var url = track.meta.artwork;
                if (url === null) {
                    cb(tags);
                    return;
                }
                xhr.open("GET", url, true);
                xhr.responseType = "arraybuffer";
                xhr.onload = function() {
                    var binary = '';
                    var bytes = new Uint8Array(xhr.response);
                    var len = bytes.byteLength;
                    for (var i = 0; i < len; i++) {
                        binary += String.fromCharCode(bytes[ i ]);
                    }
                    var ext = url.split('.').slice(-1)[0].toLowerCase().split('?')[0];
                    var mime = 'image/jpeg';
                    if (ext === 'png') {
                        mime = 'image/png';
                    }
                    tags.picture = [binary, mime];
                    cb(tags);
                };
                xhr.onerror = function() {
                    cb(tags);
                };
                xhr.send(null);
            },
            on_select_list: function(list, cb) {
                cb(list.tracks, {name: list.name, id: list.id, type: "sc"});
            }
        };
    }();
    var gd = function() {
        var token = undefined;
        var clear_data = function() {
            chrome.storage.sync.remove('gd_token');
            token = undefined;
        };
        var gdAuth = function(cb) {
            var client_id = '304269969384-d9cvnmhdquebnm8ulkne9ecveij7cjap.apps.googleusercontent.com';
            var scope = 'https://www.googleapis.com/auth/drive';
            var redirect_uri = 'https://' + chrome.runtime.id + '.chromiumapp.org/cb';
            var url = 'https://accounts.google.com/o/oauth2/auth?client_id=' + client_id + '&response_type=token&redirect_uri=' + redirect_uri + '&scope=' + scope;
            chrome.identity.launchWebAuthFlow({url: url, interactive: true},
            function(responseURL) {
                if (!responseURL) {
                    console.log("GD", "No url");
                    return;
                }
                if (responseURL.indexOf("access_token=") !== -1) {
                    token = responseURL.replace(/.*access_token=([a-zA-Z0-9\-\._]*)&.*/, "$1");
                    chrome.storage.sync.set({gd_token: token});
                    cb(token);
                } else {
                    clear_data();
                    console.log("GD", "No token", responseURL);
                }
            });
        };
        var getFilelist = function(id, cb) {
            if (id === undefined) {
                id = 'root';
            }
            var colums = encodeURIComponent('items(downloadUrl,id,mimeType,parents(isRoot),title)');
            var url = 'https://www.googleapis.com/drive/v2/files?q=\'' + id + '\'+in+parents&fields=' + colums;
            var xhr = new XMLHttpRequest();
            xhr.open("GET", url);
            xhr.setRequestHeader("Authorization", "Bearer " + token);
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4)
                {
                    if (xhr.status !== 200) {
                        clear_data();
                        console.log("GD", "getFilelist", "API Error", data);
                        return;
                    }
                    var data = JSON.parse(xhr.responseText);
                    cb(data);
                }
            };
            xhr.send(null);

        };
        var getToken = function(cb) {
            if (token !== undefined) {
                cb(token);
                return;
            }
            chrome.storage.sync.get('gd_token', function(obj) {
                if ('gd_token' in obj) {
                    token = obj.gd_token;
                    cb(token);
                } else {
                    gdAuth(cb);
                }
            });
        };
        return {
            getToken: getToken,
            getFilelist: function(id, cb) {
                getToken(function() {
                    getFilelist(id, cb);
                });
            }
        };
    }();
    var box = function() {
        var code = undefined;
        var client_id = 'g527juooilqjql1ggzpohrzyf7a8troc';
        var client_secret = 'PTEyM5lwSgNkvqK5BjBp5iGj4ypPx2wd';
        var redirect_uri = 'https://' + chrome.runtime.id + '.chromiumapp.org/cb';
        var token = undefined;
        var dl_xhr = undefined;
        var boxCode = function(cb) {
            var url = 'https://www.box.com/api/oauth2/authorize?response_type=code&client_id=' + client_id + '&redirect_uri=' + redirect_uri;
            chrome.identity.launchWebAuthFlow({url: url, interactive: true},
            function(responseURL) {
                if (!responseURL) {
                    return;
                }
                if (responseURL.indexOf("code=") !== -1) {
                    code = responseURL.replace(/.*code=([a-zA-Z0-9]*)&?.*/, "$1");
                    chrome.storage.sync.set({box_code: code});
                    cb(code);
                } else {
                    chrome.storage.sync.remove('box_code');
                    code = undefined;
                }
            });
        };
        var boxAuth = function(cb) {
            var url = 'https://www.box.com/api/oauth2/token';
            $.ajax({
                type: "POST",
                url: url,
                data: {
                    grant_type: 'authorization_code',
                    code: code,
                    client_id: client_id,
                    client_secret: client_secret,
                    redirect_uri: redirect_uri
                },
                success: function(data) {
                    if ('access_token' in data === false || 'expires_in' in data === false || 'refresh_token' in data === false) {
                        console.log('boxAuth data problem', data);
                        return;
                    }
                    chrome.storage.sync.set({box_token: data.access_token, box_expires_in: data.expires_in, box_refresh_token: data.refresh_token});
                    token = data.access_token;
                    cb(token);
                },
                error: function() {
                    console.log('boxAuth resp. error');
                    code = undefined;
                    token = undefined;
                    chrome.storage.sync.remove(['box_code', 'box_token', 'box_expires_in', 'box_refresh_token']);
                }
            });
        };
        var getCode = function(cb) {
            if (code !== undefined) {
                cb(code);
                return;
            }
            chrome.storage.sync.get('box_code', function(obj) {
                if ('box_code' in obj) {
                    code = obj.box_code;
                    cb(code);
                } else {
                    boxCode(cb);
                }
            });
        };
        var getToken = function(cb, r) {
            if (code === undefined) {
                if (r !== undefined) {
                    return;
                }
                getCode(function() {
                    getToken(cb, 1);
                });
                return;
            }
            if (token !== undefined) {
                cb(token);
                return;
            }
            chrome.storage.sync.get('box_token', function(obj) {
                if ('box_token' in obj) {
                    token = obj.box_token;
                    cb(token);
                } else {
                    boxAuth(cb);
                }
            });
        };
        var getFilelist = function(cb, id) {
            if (id === undefined) {
                id = 0;
            }
            var url = 'https://api.box.com/2.0/folders/' + id + '/items?fields=parent,shared_link,name,path_collection';
            var xhr = new XMLHttpRequest();
            xhr.open("GET", url);
            xhr.setRequestHeader("Authorization", "Bearer " + token);
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4)
                {
                    if (xhr.status !== 200) {
                        code = undefined;
                        token = undefined;
                        chrome.storage.sync.remove(['box_code', 'box_token', 'box_expires_in', 'box_refresh_token']);
                        return;
                    }
                    var data = JSON.parse(xhr.responseText);
                    cb(data);
                }
            };
            xhr.send(null);
        };
        var getMedia = function(cb, id) {
            var url = 'https://api.box.com/2.0/files/' + id;
            var parems = '{"shared_link": {"access": "open"}}';
            var xhr = new XMLHttpRequest();
            xhr.open("PUT", url);
            xhr.setRequestHeader("Authorization", "Bearer " + token);
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4)
                {
                    if (xhr.status !== 200) {
                        code = undefined;
                        token = undefined;
                        chrome.storage.sync.remove(['box_code', 'box_token', 'box_expires_in', 'box_refresh_token']);
                        return;
                    }
                    var data = JSON.parse(xhr.responseText);
                    cb(data.shared_link.download_url);
                }
            };
            xhr.send(parems);
        };
        var getTrack = function(track, player, cb) {
            if (dl_xhr !== undefined) {
                dl_xhr.abort();
            }
            dl_xhr = new XMLHttpRequest();
            dl_xhr.open("GET", 'https://api.box.com/2.0/files/' + track.file_id + '/content', true);
            dl_xhr.setRequestHeader("Authorization", "Bearer " + token);
            dl_xhr.responseType = "blob";
            dl_xhr.onprogress = function(e) {
                player.pre_buffering_controller.download(parseInt((e.loaded / e.total) * 100));
            };
            dl_xhr.onload = function() {
                var blob = dl_xhr.response;
                cb(URL.createObjectURL(blob));
            };
            dl_xhr.onerror = function() {
                cb('');
            };
            dl_xhr.send(null);
        };
        return {
            getFilelist: function(cb, id) {
                getToken(function() {
                    getFilelist(cb, id);
                });
            },
            getMedia: function(a, b) {
                getToken(function() {
                    getMedia(a, b);
                });
            },
            onplay: function(track, player, cb) {
                getTrack(track, player, cb);
            }
        };
    }();
    return {
        vk: vk,
        db: db,
        sc: sc,
        gd: gd,
        box: box
    };
}();