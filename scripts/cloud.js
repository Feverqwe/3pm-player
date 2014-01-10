var cloud = function() {
    var dl_xhr = undefined;
    var getTrack = function(options, cb) {
        if (options.url === undefined) {
            cb('');
            return;
        }
        var view = options.view;
        if (dl_xhr !== undefined) {
            dl_xhr.abort();
        }
        dl_xhr = new XMLHttpRequest();
        dl_xhr.open("GET", options.url, true);
        if (options.headers !== undefined) {
            $.each(options.headers, function(key, value) {
                dl_xhr.setRequestHeader(key, value);
            });
        }
        dl_xhr.responseType = "blob";
        dl_xhr.onprogress = function(e) {
            view.pre_buffering_controller.download(parseInt((e.loaded / e.total) * 100));
        };
        dl_xhr.onload = function() {
            cb(dl_xhr.response);
        };
        dl_xhr.onerror = function() {
            cb('');
        };
        dl_xhr.send(null);
    };
    var cookie = function() {
        return {
            set: function(key, value, expire) {
                var exp = new Date().getTime() + parseInt(expire) * 1000;
                var obj = {};
                obj[key] = value;
                obj[key + '_expire'] = exp;
                chrome.storage.local.set(obj);
            },
            get: function(key, cb) {
                var exp_key = key + '_expire';
                var arr = [key, exp_key];
                chrome.storage.local.get(arr, function(obj) {
                    var time = new Date().getTime();
                    if (obj[exp_key] === undefined) {
                        cb(obj);
                    } else
                    if (obj[key] !== undefined && obj[exp_key] >= time) {
                        cb(obj);
                    } else {
                        chrome.storage.local.remove([key, key + '_expire']);
                        cb({});
                    }
                });
            },
            remove: function(key) {
                chrome.storage.local.remove([key, key + '_expire']);
            }
        };
    }();
    var auth_getToken = function(type, url, cb) {
        chrome.identity.launchWebAuthFlow({url: url, interactive: true},
        function(responseURL) {
            if (responseURL === undefined) {
                console.log("Auth", type, "URL not found!");
                return;
            }
            var token = undefined;
            var expires = undefined;
            if (responseURL.indexOf("access_token=") !== -1) {
                token = responseURL.replace(/.*access_token=([^&]*).*/, "$1");
            }
            if (responseURL.indexOf("expires_in=") !== -1) {
                var value = responseURL.replace(/.*expires_in=([0-9]*).*/, "$1");
                expires = parseInt(value);
                if (isNaN(expires)) {
                    console.log("Auth", type, "Expaires is NaN!", expires);
                    expires = undefined;
                }
            }
            if (token !== undefined) {
                if (expires !== undefined && expires !== 0) {
                    cookie.set(type + '_token', token, expires);
                } else {
                    var obj = {};
                    obj[type + '_token'] = token;
                    chrome.storage.local.set(obj);
                }
                cb(token);
            } else {
                console.log("Auth", type, "Token not found!", responseURL);
            }
        });
    };
    var vk = function() {
        var type = 'vk';
        var token = undefined;
        var timeout = 500;
        var saved_tracks = [];
        var clear_data = function() {
            token = undefined;
            cookie.remove('vk_token');
        };
        var vkAuth = function(cb) {
            var client_id = "4037628";
            var settings = "audio,offline";
            var redirect_uri = 'https://' + chrome.runtime.id + '.chromiumapp.org/cb';
            var display = "page";
            var url = 'https://oauth.vk.com/authorize?v=5.5&client_id=' + client_id + '&scope=' + settings + '&redirect_uri=' + redirect_uri + '&display=' + display + '&response_type=token';
            auth_getToken(type, url, function(tkn) {
                token = tkn;
                cb(token);
            });
        };
        var getPopular = function(cb, genre_id) {
            if (genre_id === undefined) {
                genre_id = 0;
            }
            var only_eng = (_settings.foreign_tracks === 1) ? 1 : 0;
            var data = {
                v: '5.5',
                access_token: token,
                count: 100,
                only_eng: only_eng,
                genre_id: genre_id
            };
            var url = 'https://api.vk.com/method/audio.getPopular';
            var tracks = [];
            $.ajax({
                type: 'POST',
                url: url,
                data: data,
                dataType: 'JSON',
                statusCode: {
                    401: function() {
                        vkAuth(function() {
                            getPopular(cb, genre_id);
                        });
                    },
                    200: function(data) {
                        if (data.error !== undefined) {
                            clear_data();
                            if (data.error.error_code === 5) {
                                vkAuth(function() {
                                    getPopular(cb, genre_id);
                                });
                            }
                            console.log("VK", "getPopular", "API error", data);
                            return;
                        }
                        if (data.response === undefined) {
                            console.log("VK", "getPopular", "API error", data);
                            return;
                        }
                        data.response.forEach(function(item) {
                            tracks.push({id: tracks.length, owner_id: item.owner_id, track_id: item.id, file: {name: item.url, url: item.url}, tags: {title: item.title, artist: item.artist}, duration: item.duration, type: 'vk'});
                        });
                        cb(tracks);
                    }
                }
            });
        };
        var getRecommendations = function(cb) {
            var data = {
                v: '5.5',
                access_token: token,
                count: 100,
                shuffle: 1
            };
            var url = 'https://api.vk.com/method/audio.getRecommendations';
            var tracks = [];
            $.ajax({
                type: 'POST',
                data: data,
                url: url,
                dataType: 'JSON',
                statusCode: {
                    401: function() {
                        vkAuth(function() {
                            getRecommendations(cb);
                        });
                    },
                    200: function(data) {
                        if (data.error !== undefined) {
                            clear_data();
                            if (data.error.error_code === 5) {
                                vkAuth(function() {
                                    getRecommendations(cb);
                                });
                            }
                            console.log("VK", "getRecommendations", "API error", data);
                            return;
                        }
                        if (data.response === undefined) {
                            console.log("VK", "getRecommendations", "API error", data);
                            return;
                        }
                        data.response.forEach(function(item) {
                            tracks.push({id: tracks.length, owner_id: item.owner_id, track_id: item.id, file: {name: item.url, url: item.url}, tags: {title: item.title, artist: item.artist}, duration: item.duration, type: 'vk'});
                        });
                        cb(tracks);
                    }
                }
            });
        };
        var getTracks = function(cb, album_id) {
            var data = {
                v: '5.5',
                access_token: token
            };
            if (album_id !== undefined) {
                data.album_id = album_id;
            }
            var url = 'https://api.vk.com/method/audio.get';
            var tracks = [];
            var offset = 0;
            var getPage = function(offset) {
                data.count = 6000;
                data.offset = offset;
                $.ajax({
                    type: 'POST',
                    data: data,
                    url: url,
                    dataType: 'JSON',
                    statusCode: {
                        401: function() {
                            vkAuth(function() {
                                getTracks(cb, album_id);
                            });
                        },
                        200: function(data) {
                            if (data.error !== undefined) {
                                clear_data();
                                if (data.error.error_code === 5) {
                                    vkAuth(function() {
                                        getTracks(cb, album_id);
                                    });
                                }
                                console.log("VK", "getTracks", "API error", data);
                                return;
                            }
                            if (data.response === undefined || data.response.items === undefined || data.response.count === undefined) {
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
                                tracks.push({id: tracks.length, owner_id: item.owner_id, track_id: item.id, file: {name: item.url, url: item.url}, tags: {title: item.title, artist: item.artist}, duration: item.duration, type: 'vk', from_lib: true});
                                len++;
                            });
                            if (len === 0) {
                                if (tracks.length > 0) {
                                    cb(tracks);
                                } else {
                                    console.log("VK", "getTracks", "len = 0", data);
                                }
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
                        }
                    }
                });
            };
            getPage(offset);
        };
        var getAlbums = function(cb) {
            var data = {
                v: '5.5',
                access_token: token
            };
            var url = 'https://api.vk.com/method/audio.getAlbums';
            var albums = [];
            var offset = 0;
            var getPage = function(offset) {
                data.count = 100;
                data.offset = offset;
                $.ajax({
                    type: 'POST',
                    data: data,
                    url: url,
                    dataType: 'JSON',
                    statusCode: {
                        401: function() {
                            vkAuth(function() {
                                getAlbums(cb);
                            });
                        },
                        200: function(data) {
                            if (data.error !== undefined) {
                                clear_data();
                                if (data.error.error_code === 5) {
                                    vkAuth(function() {
                                        getAlbums(cb);
                                    });
                                }
                                console.log("VK", "getAlbums", "API error", data);
                                return;
                            }
                            if (data.response === undefined || data.response.items === undefined || data.response.count === undefined) {
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
                            if (len === 0) {
                                if (albums.length > 0) {
                                    cb(albums);
                                } else {
                                    console.log("VK", "getAlbums", "len = 0", data);
                                }
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
                        }
                    }
                });
            };
            getPage(offset);
        };
        var updateTags = function(owner_id, audio_id, artist, title) {
            var data = {
                v: '5.5',
                audio_id: audio_id,
                owner_id: owner_id,
                artist: artist,
                title: title,
                access_token: token
            };
            var url = 'https://api.vk.com/method/audio.edit';
            $.ajax({
                type: 'POST',
                url: url,
                data: data,
                dataType: 'JSON',
                statusCode: {
                    200: function(data) {
                        if (data.error !== undefined) {
                            if (data.error.error_code === 15) {
                                _settings.vk_tag_update = 0;
                                return;
                            }
                            clear_data();
                            if (data.error.error_code === 5) {
                                vkAuth(function() {
                                    updateTags(owner_id, audio_id, artist, title);
                                });
                            }
                            console.log("VK", "addInLibrarty", "API error", data);
                            return;
                        }
                        if (data.response === undefined) {
                            console.log("VK", "addInLibrarty", "API error", data);
                            return;
                        }
                    }
                }
            });
        };
        var addInLibrarty = function(id, oid, cb) {
            var data = {
                v: '5.5',
                access_token: token,
                audio_id: id,
                owner_id: oid
            };
            var url = 'https://api.vk.com/method/audio.add';
            $.ajax({
                type: 'POST',
                data: data,
                url: url,
                dataType: 'JSON',
                statusCode: {
                    401: function() {
                        vkAuth(function() {
                            addInLibrarty(id, oid, cb);
                        });
                    },
                    200: function(data) {
                        if (data.error !== undefined) {
                            clear_data();
                            if (data.error.error_code === 5) {
                                vkAuth(function() {
                                    addInLibrarty(id, oid, cb);
                                });
                            }
                            console.log("VK", "addInLibrarty", "API error", data);
                            return;
                        }
                        if (data.response === undefined) {
                            console.log("VK", "addInLibrarty", "API error", data);
                            return;
                        }
                        if (cb !== undefined) {
                            cb(true);
                        }
                    }
                }
            });
        };
        var getToken = function(cb) {
            if (token !== undefined) {
                cb(token);
                return;
            }
            cookie.get('vk_token', function(obj) {
                if (obj.vk_token !== undefined) {
                    token = obj['vk_token'];
                    cb(token);
                } else {
                    vkAuth(cb);
                }
            });
        };
        var makeAlbums = function(cb) {
            getAlbums(function(all_albums) {
                all_albums.push({title: _lang.vk_all, album_id: "nogroup"});
                all_albums.push({title: _lang.vk_rec, album_id: "recommendations", vk_save: true});
                all_albums.push({title: _lang.vk_pop, album_id: "popular0", vk_save: true});
                all_albums.push({title: "[ Rock ]", album_id: "popular1", vk_save: true});
                all_albums.push({title: "[ Pop ]", album_id: "popular2", vk_save: true});
                all_albums.push({title: "[ Rap & Hip-Hop ]", album_id: "popular3", vk_save: true});
                all_albums.push({title: "[ Easy Listening ]", album_id: "popular4", vk_save: true});
                all_albums.push({title: "[ Dance & House ]", album_id: "popular5", vk_save: true});
                all_albums.push({title: "[ Instrumental ]", album_id: "popular6", vk_save: true});
                all_albums.push({title: "[ Metal ]", album_id: "popular7", vk_save: true});
                all_albums.push({title: "[ Alternative ]", album_id: "popular21", vk_save: true});
                all_albums.push({title: "[ Dubstep ]", album_id: "popular8", vk_save: true});
                all_albums.push({title: "[ Jazz & Blues ]", album_id: "popular9", vk_save: true});
                all_albums.push({title: "[ Drum & Bass ]", album_id: "popular10", vk_save: true});
                all_albums.push({title: "[ Trance ]", album_id: "popular11", vk_save: true});
                all_albums.push({title: "[ Chanson ]", album_id: "popular12", vk_save: true});
                all_albums.push({title: "[ Ethnic ]", album_id: "popular13", vk_save: true});
                all_albums.push({title: "[ Acoustic & Vocal ]", album_id: "popular14", vk_save: true});
                all_albums.push({title: "[ Reggae ]", album_id: "popular15", vk_save: true});
                all_albums.push({title: "[ Classical ]", album_id: "popular16", vk_save: true});
                all_albums.push({title: "[ Indie Pop ]", album_id: "popular17", vk_save: true});
                all_albums.push({title: "[ Speech ]", album_id: "popular19", vk_save: true});
                all_albums.push({title: "[ Electropop & Disco ]", album_id: "popular22", vk_save: true});
                all_albums.push({title: "[ Other ]", album_id: "popular18", vk_save: true});
                var list = new Array(all_albums.length);
                for (var i = 0, item; item = all_albums[i]; i++) {
                    list[i] = {name: item.title, album_id: item.album_id, id: i, type: "vk", vk_save: (item.vk_save === true)};
                }
                cb(list);
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
                getToken(function() {
                    addInLibrarty(id, oid, function() {
                        saved_tracks.push(id + '_' + oid);
                        if (cb) {
                            cb();
                        }
                    });
                });
            },
            on_select_list: function(list, cb) {
                cloud.vk.makeAlbumTracks(list.album_id, function(tracks) {
                    cb(tracks, {name: list.name, id: list.id, vk_save: (list.vk_save === true), type: 'vk'});
                });
            },
            preload: function(options, cb) {
                options.url = options.track.file.url;
                cloud.getTrack(options, cb);
            },
            update_tags: function(a, b, c, d) {
                getToken(function() {
                    updateTags(a, b, c, d);
                });
            }
        };
    }();
    var db = function() {
        var type = 'db';
        var token = undefined;
        var clear_data = function() {
            chrome.storage.local.remove('db_token');
            token = undefined;
        };
        var dbAuth = function(cb) {
            var client_id = "t8uqhrqkw9rz5x8";
            var redirect_uri = 'https://' + chrome.runtime.id + '.chromiumapp.org/cb';
            var url = 'https://www.dropbox.com/1/oauth2/authorize?client_id=' + client_id + '&response_type=token&redirect_uri=' + redirect_uri;
            auth_getToken(type, url, function(tkn) {
                token = tkn;
                cb(token);
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
            $.ajax({
                url: url,
                dataType: 'JSON',
                beforeSend: function(xhr) {
                    xhr.setRequestHeader('Authorization', 'Bearer ' + token);
                },
                statusCode: {
                    401: function() {
                        dbAuth(function() {
                            getFilelist(cb, root, cb);
                        });
                    },
                    200: function(data) {
                        cb(data);
                    }
                },
                error: function(jqXHR) {
                    if (jqXHR.status === 401)
                        return;
                    clear_data();
                }
            });
        };
        var getMedia = function(cb, root, path) {
            if (root === undefined) {
                root = 'dropbox';
            }
            if (path === undefined) {
                path = '';
            }
            var url = 'https://api.dropbox.com/1/media/' + root + path;
            $.ajax({
                url: url,
                dataType: 'JSON',
                beforeSend: function(xhr) {
                    xhr.setRequestHeader('Authorization', 'Bearer ' + token);
                },
                statusCode: {
                    401: function() {
                        dbAuth(function() {
                            getMedia(cb, root, path);
                        });
                    },
                    200: function(data) {
                        cb(data.url);
                    }
                },
                error: function(jqXHR) {
                    if (jqXHR.status === 401)
                        return;
                    clear_data();
                }
            });
        };
        var getToken = function(cb) {
            if (token !== undefined) {
                cb(token);
                return;
            }
            chrome.storage.local.get('db_token', function(obj) {
                if (obj.db_token !== undefined) {
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
            },
            preload: function(options, cb) {
                if (options.track.blob === undefined) {
                    options.track.tags = undefined;
                }
                db.onplay(options.track, options.view, function(url) {
                    options.url = url;
                    cloud.getTrack(options, cb);
                });
            }
        };
    }();
    var sc = function() {
        var type = 'sc';
        var client_id = '13f6a1d3bbd03d754387a51dccd8bf83';
        var token = undefined;
        var user_id = undefined;
        var clear_data = function() {
            chrome.storage.local.remove(['sc_token', 'sc_user_id']);
            token = undefined;
            user_id = undefined;
        };
        var scAuth = function(cb) {
            var redirect_uri = 'https://' + chrome.runtime.id + '.chromiumapp.org/cb';
            var url = 'https://soundcloud.com/connect?client_id=' + client_id + '&response_type=token&redirect_uri=' + redirect_uri;
            auth_getToken(type, url, function(tkn) {
                token = tkn;
                cb(token);
            });
        };
        var scUserId = function(cb) {
            var url = 'https://api.soundcloud.com/me.json?oauth_token=' + token;
            $.ajax({
                url: url,
                dataType: 'JSON',
                statusCode: {
                    401: function() {
                        scAuth(function() {
                            scUserId(cb);
                        });
                    },
                    200: function(data) {
                        user_id = data.id;
                        cb(data.id);
                    }
                },
                error: function(jqXHR) {
                    if (jqXHR.status === 401)
                        return;
                    clear_data();
                }
            });
        };
        var getAlbums = function(cb) {
            var url = 'http://api.soundcloud.com/users/' + user_id + '/playlists.json?client_id=' + client_id;
            $.ajax({
                url: url,
                dataType: 'JSON',
                statusCode: {
                    401: function() {
                        scAuth(function() {
                            if (user_id === undefined) {
                                scUserId(function() {
                                    getAlbums(cb);
                                });
                            } else {
                                getAlbums(cb);
                            }
                        });
                    },
                    200: function(data) {
                        var list = [];
                        data.forEach(function(item) {
                            var tracks = [];
                            for (var i = 0, track; track = item.tracks[i]; i++) {
                                if (track.streamable === false || (track.original_format === "wav" && track.track_type === 'original')) {
                                    continue;
                                }
                                tracks.push({id: 0, file: {name: track.title, url: track.stream_url + '?client_id=' + client_id}, tags: undefined, meta: {title: track.title, artist: track.user.username, artwork: track.artwork_url}, duration: track.duration, type: 'sc'});
                            }
                            list.push({name: item.title, id: list.length, type: "sc", tracks: tracks});
                        });
                        if (list.length === 0) {
                            return;
                        }
                        cb(list);
                    }
                },
                error: function(jqXHR) {
                    if (jqXHR.status === 401)
                        return;
                    clear_data();
                }
            });
        };
        var getUserId = function(cb) {
            if (user_id !== undefined) {
                cb(user_id);
                return;
            }
            chrome.storage.local.get('sc_user_id', function(obj) {
                if (obj.sc_user_id !== undefined) {
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
            chrome.storage.local.get('sc_token', function(obj) {
                if (obj.sc_token !== undefined) {
                    token = obj.sc_token;
                    cb(token);
                } else {
                    scAuth(cb);
                }
            });
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
                if (track.meta === undefined) {
                    return;
                }
                var tags = track.meta;
                var url = tags.artwork;
                if (url === null) {
                    cb(tags);
                    return;
                }
                var xhr = new XMLHttpRequest();
                xhr.open("GET", url, true);
                xhr.responseType = "blob";
                xhr.onload = function() {
                    tags.picture = {data: xhr.response};
                    cb(tags);
                };
                xhr.onerror = function() {
                    cb(tags);
                };
                xhr.send(null);
            },
            on_select_list: function(list, cb) {
                cb(list.tracks, {name: list.name, id: list.id, type: "sc"});
            },
            preload: function(options, cb) {
                options.url = options.track.file.url;
                cloud.getTrack(options, cb);
            }
        };
    }();
    var gd = function() {
        var type = 'gd';
        var token = undefined;
        var clear_data = function() {
            cookie.remove('gd_token');
            token = undefined;
        };
        var gdAuth = function(cb) {
            var client_id = '304269969384-d9cvnmhdquebnm8ulkne9ecveij7cjap.apps.googleusercontent.com';
            var scope = 'https://www.googleapis.com/auth/drive';
            var redirect_uri = 'https://' + chrome.runtime.id + '.chromiumapp.org/cb';
            var url = 'https://accounts.google.com/o/oauth2/auth?client_id=' + client_id + '&response_type=token&redirect_uri=' + redirect_uri + '&scope=' + scope;
            auth_getToken(type, url, function(tkn) {
                token = tkn;
                cb(token);
            });
        };
        var getFilelist = function(id, cb) {
            if (id === undefined) {
                id = 'root';
            }
            var colums = 'items(downloadUrl,id,mimeType,parents(isRoot),title)';
            var data = {
                q : '\''+id+'\' in parents', 
                fields: colums
            };
            var url = 'https://www.googleapis.com/drive/v2/files';
            $.ajax({
                type: 'GET',
                url: url,
                data: data,
                dataType: 'JSON',
                beforeSend: function(xhr) {
                    xhr.setRequestHeader('Authorization', 'Bearer ' + token);
                },
                statusCode: {
                    401: function() {
                        gdAuth(function() {
                            getFilelist(id, cb);
                        });
                    },
                    200: function(data) {
                        cb(data);
                    }
                },
                error: function(jqXHR) {
                    if (jqXHR.status === 401)
                        return;
                    clear_data();
                }
            });
        };
        var getToken = function(cb) {
            if (token !== undefined) {
                cb(token);
                return;
            }
            cookie.get('gd_token', function(obj) {
                if (obj.gd_token !== undefined) {
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
            },
            onplay: function(track, player, cb) {
                getToken(function() {
                    cb(track.file.url + '&access_token=' + token);
                });
            },
            preload: function(options, cb) {
                if (options.track.blob === undefined) {
                    options.track.tags = undefined;
                }
                gd.onplay(options.track, options.view, function(url) {
                    options.url = url;
                    cloud.getTrack(options, cb);
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
        var clear_data = function() {
            code = undefined;
            token = undefined;
            cookie.remove('box_token');
            chrome.storage.local.remove(['box_code', 'box_refresh_token']);
        };
        var boxCode = function(cb) {
            var url = 'https://www.box.com/api/oauth2/authorize?response_type=code&client_id=' + client_id + '&redirect_uri=' + redirect_uri;
            chrome.identity.launchWebAuthFlow({url: url, interactive: true},
            function(responseURL) {
                if (!responseURL) {
                    return;
                }
                if (responseURL.indexOf("code=") !== -1) {
                    code = responseURL.replace(/.*code=([a-zA-Z0-9]*)&?.*/, "$1");
                    chrome.storage.local.set({box_code: code});
                    cb(code);
                } else {
                    clear_data();
                    console.log("BOX", "No code", responseURL);
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
                    if (data.access_token === undefined || data.expires_in === undefined || data.refresh_token === undefined) {
                        console.log('boxAuth data problem', data);
                        return;
                    }
                    cookie.set('box_token', data.access_token, data.expires_in);
                    chrome.storage.local.set({box_refresh_token: data.refresh_token});
                    token = data.access_token;
                    cb(token);
                },
                error: function(jqXHR) {
                    if (jqXHR.status === 400) {
                        boxCode(function() {
                            boxAuth(cb);
                        });
                        return;
                    }
                    clear_data();
                    console.log('boxAuth resp. error');
                }
            });
        };
        var getCode = function(cb) {
            if (code !== undefined) {
                cb(code);
                return;
            }
            chrome.storage.local.get('box_code', function(obj) {
                if (obj.box_code !== undefined) {
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
            cookie.get('box_token', function(obj) {
                if (obj.box_token !== undefined) {
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
            $.ajax({
                url: url,
                dataType: 'JSON',
                beforeSend: function(xhr) {
                    xhr.setRequestHeader('Authorization', 'Bearer ' + token);
                },
                statusCode: {
                    401: function() {
                        boxAuth(function() {
                            getFilelist(cb, id);
                        });
                    },
                    200: function(data) {
                        cb(data);
                    }
                },
                error: function(jqXHR) {
                    if (jqXHR.status === 401)
                        return;
                    clear_data();
                }
            });
        };
        var getMedia = function(cb, id) {
            var url = 'https://api.box.com/2.0/files/' + id;
            var parems = '{"shared_link": {"access": "open"}}';
            $.ajax({
                url: url,
                dataType: 'JSON',
                data: {shared_link: {access: "open"}},
                beforeSend: function(xhr) {
                    xhr.setRequestHeader('Authorization', 'Bearer ' + token);
                },
                statusCode: {
                    401: function() {
                        boxAuth(function() {
                            getMedia(cb, id);
                        });
                    },
                    200: function(data) {
                        if (data.shared_link !== undefined && data.shared_link.download_url !== undefined) {
                            cb(data.shared_link.download_url);
                        }
                    }
                },
                error: function(jqXHR) {
                    if (jqXHR.status === 401)
                        return;
                    clear_data();
                }
            });
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
            preload: function(options, cb) {
                if (options.track.blob === undefined) {
                    options.track.tags = undefined;
                }
                getTrack({
                    view: options.view,
                    url: 'https://api.box.com/2.0/files/' + options.track.file_id + '/content',
                    headers: {"Authorization": "Bearer " + token}
                }, cb);
            }
        };
    }();
    var sd = function() {
        var type = 'sd';
        var token = undefined;
        var clear_data = function() {
            cookie.remove('sd_token');
            token = undefined;
        };
        var sdAuth = function(cb) {
            var client_id = '000000004410D305';
            var scope = 'wl.skydrive';
            var redirect_uri = 'https://' + chrome.runtime.id + '.chromiumapp.org/cb';
            var url = 'https://login.live.com/oauth20_authorize.srf?client_id=' + client_id + '&scope=' + scope + '&response_type=token&redirect_uri=' + redirect_uri;
            auth_getToken(type, url, function(tkn) {
                token = tkn;
                cb(token);
            });
        };
        var getFilelist = function(id, cb) {
            if (id === undefined) {
                id = 'me/skydrive';
            }
            var url = 'https://apis.live.net/v5.0/' + id + '/files?access_token=' + token;
            $.ajax({
                url: url,
                dataType: 'JSON',
                statusCode: {
                    401: function() {
                        sdAuth(function() {
                            getFilelist(id, cb);
                        });
                    },
                    200: function(data) {
                        cb(data);
                    }
                },
                error: function(jqXHR) {
                    if (jqXHR.status === 401)
                        return;
                    clear_data();
                }
            });
        };
        var getToken = function(cb) {
            if (token !== undefined) {
                cb(token);
                return;
            }
            cookie.get('sd_token', function(obj) {
                if (obj.sd_token !== undefined) {
                    token = obj.sd_token;
                    cb(token);
                } else {
                    sdAuth(cb);
                }
            });
        };
        return {
            getToken: getToken,
            getFilelist: function(id, cb) {
                getToken(function() {
                    getFilelist(id, cb);
                });
            },
            read_tags: function(track, cb) {
                if (track.meta === undefined) {
                    return;
                }
                var tags = track.meta;
                var url = tags.artwork;
                if (url === undefined) {
                    cb(tags);
                    return;
                }
                var xhr = new XMLHttpRequest();
                xhr.open("GET", url, true);
                xhr.responseType = "blob";
                xhr.onload = function() {
                    tags.picture = {data: xhr.response};
                    cb(tags);
                };
                xhr.onerror = function() {
                    cb(tags);
                };
                xhr.send(null);
            },
            onplay: function(track, player, cb) {
                getToken(function() {
                    cb(track.file.url + '&access_token=' + token);
                });
            },
            preload: function(options, cb) {
                sd.onplay(options.track, options.view, function(url) {
                    options.url = url;
                    cloud.getTrack(options, cb);
                });
            }
        };
    }();
    return {
        getTrack: getTrack,
        abort: function() {
            if (dl_xhr !== undefined) {
                dl_xhr.abort();
            }
        },
        vk: vk,
        db: db,
        sc: sc,
        gd: gd,
        box: box,
        sd: sd
    };
}();