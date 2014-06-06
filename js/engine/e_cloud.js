engine.cloud = function() {
    var var_cache = {
        auth_dialog_count: 0
    };
    var tokenStore = function() {
        var tokenList = {};
        (function() {
            chrome.storage.local.get('tokenList', function(store) {
                if (store.tokenList !== undefined) {
                    tokenList = store.tokenList;
                    var killList = [];
                    $.each(tokenList, function(key, value) {
                        if (value.expire !== undefined && value.expire < Date.now()) {
                            killList.push(key);
                        }
                    });
                    if (killList.length > 0) {
                        killList.forEach(function (key) {
                            delete tokenList[key];
                        });
                        chrome.storage.local.set({tokenList: tokenList});
                    }
                }
            });
        })();
        var save = function() {
            chrome.storage.local.set({tokenList: tokenList});
        };
        return {
            set: function(key, token, expire) {
                if (token === undefined) {
                    delete tokenList[key];
                    return save();
                }
                tokenList[key] = {token: token};
                if (isNaN(expire)) {
                    console.log("Auth", key, "Expaires is bad!", expire);
                    expire = undefined;
                }
                if (expire < 1) {
                    expire = undefined;
                }
                if (expire !== undefined) {
                    tokenList[key].expire = expire;
                }
                return save();
            },
            get: function(key) {
                if (tokenList[key] === undefined) {
                    return;
                }
                return tokenList[key].token;
            }
        }
    }();
    var auth_getToken = function(type, url, cb) {
        if (var_cache.auth_dialog_count > 0) {
            console.log("Auth", "More one opened dialod!", var_cache.auth_dialog_count);
            return;
        }
        var_cache.auth_dialog_count++;
        chrome.identity.launchWebAuthFlow({url: url, interactive: true},
            function(responseURL) {
                var_cache.auth_dialog_count--;
                if (responseURL === undefined) {
                    return console.log("Auth", type, "URL not found!");
                }
                var token = undefined, expires = undefined;
                if (responseURL.indexOf("expires_in=") !== -1) {
                    expires = parseInt(responseURL.replace(/.*expires_in=([0-9]*).*/, "$1"));
                }
                if (type === 'lastfm') {
                    if (responseURL.indexOf("token=") === -1) {
                        return console.log("Auth", type, "Token not found!", responseURL);
                    }
                    token = responseURL.replace(/.*token=([^&]*).*/, "$1");
                } else {
                    if (responseURL.indexOf("access_token=") === -1) {
                        return console.log("Auth", type, "Token not found!", responseURL);
                    }
                    token = responseURL.replace(/.*access_token=([^&]*).*/, "$1");
                }
                tokenStore.set(type, token, expires);
                cb(token);
            }
        );
    };
    var vk = function() {
        var type = 'vk';
        var token = undefined;
        var saved_tracks = [];
        var clear_data = function() {
            token = undefined;
            tokenStore.set('vk');
        };
        var vkAuth = function(cb) {
            var client_id = "4037628";
            var settings = "audio,offline";
            var redirect_uri = 'https://' + chrome.runtime.id + '.chromiumapp.org/cb';
            var display = "page";
            var url = 'https://oauth.vk.com/authorize?v=5.5&client_id=' + client_id + '&scope=' + settings + '&redirect_uri=' + redirect_uri + '&display=' + display + '&response_type=token';
            auth_getToken(type, url, function(tkn) {
                token = tkn;
                cb();
            });
        };
        var getPopular = function(cb, genre_id) {
            if (genre_id === undefined) {
                genre_id = 0;
            }
            var only_eng = (_settings.vk_foreign_tracks === 1) ? 1 : 0;
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
                            /**
                             * @namespace data.error.error_code
                             */
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
                            tracks.push({url: item.url, type: '.mp3', tags: { default: {title: item.title, artist: item.artist} }, cloud: {type: 'vk', owner_id: item.owner_id, track_id: item.id}});
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
                            tracks.push({url: item.url, type: '.mp3', tags: { default: {title: item.title, artist: item.artist}}, cloud: {type: 'vk', owner_id: item.owner_id, track_id: item.id}});
                        });
                        cb(tracks);
                    }
                }
            });
        };
        var getTracks = function(cb, album_id) {
            var data = {
                v: '5.5',
                access_token: token,
                count: 6000
            };
            if (album_id !== undefined) {
                data.album_id = album_id;
            }
            var url = 'https://api.vk.com/method/audio.get';
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
                        var tracks = [];
                        data.response.items.forEach(function(item) {
                            tracks.push({url: item.url, type: '.mp3', tags: { default: { title: item.title, artist: item.artist}}, cloud: {type: 'vk', owner_id: item.owner_id, track_id: item.id, from_lib: true}});
                        });
                        cb(tracks);
                    }
                }
            });
        };
        var getAlbums = function(cb) {
            var data = {
                v: '5.5',
                access_token: token,
                count: 100
            };
            var url = 'https://api.vk.com/method/audio.getAlbums';
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
                        var albums = [];
                        data.response.items.forEach(function(item) {
                            albums.push({title: item.title, cloud: {album_id: item.album_id, type: 'vk'}});
                        });
                        cb(albums);
                    }
                }
            });
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
                success: function(data) {
                    if (data.error !== undefined) {
                        if (data.error.error_code === 15) {
                            engine.settings.set('vk_tag_update', 0);
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
                return cb();
            }
            token = tokenStore.get('vk');
            if (token === undefined) {
                return vkAuth(cb);
            }
            cb();
        };
        var makeAlbums = function(cb) {
            getAlbums(function(all_albums) {
                all_albums.push({title: chrome.i18n.getMessage("vk_all"), cloud: {type: 'vk', album_id: "nogroup"}});
                all_albums.push({title: chrome.i18n.getMessage("vk_rec"), cloud: {type: 'vk', album_id: "recommendations"}});
                all_albums.push({title: chrome.i18n.getMessage("vk_pop"), cloud: {type: 'vk', album_id: "popular0"}});
                all_albums.push({title: "[ Rock ]", cloud: {type: 'vk', album_id: "popular1"}});
                all_albums.push({title: "[ Pop ]", cloud: {type: 'vk', album_id: "popular2"}});
                all_albums.push({title: "[ Rap & Hip-Hop ]", cloud: {type: 'vk', album_id: "popular3"}});
                all_albums.push({title: "[ Easy Listening ]", cloud: {type: 'vk', album_id: "popular4"}});
                all_albums.push({title: "[ Dance & House ]", cloud: {type: 'vk', album_id: "popular5"}});
                all_albums.push({title: "[ Instrumental ]", cloud: {type: 'vk', album_id: "popular6"}});
                all_albums.push({title: "[ Metal ]", cloud: {type: 'vk', album_id: "popular7"}});
                all_albums.push({title: "[ Alternative ]", cloud: {type: 'vk', album_id: "popular21"}});
                all_albums.push({title: "[ Dubstep ]", cloud: {type: 'vk', album_id: "popular8"}});
                all_albums.push({title: "[ Jazz & Blues ]", cloud: {type: 'vk', album_id: "popular9"}});
                all_albums.push({title: "[ Drum & Bass ]", cloud: {type: 'vk', album_id: "popular10"}});
                all_albums.push({title: "[ Trance ]", cloud: {type: 'vk', album_id: "popular11"}});
                all_albums.push({title: "[ Chanson ]", cloud: {type: 'vk', album_id: "popular12"}});
                all_albums.push({title: "[ Ethnic ]", cloud: {type: 'vk', album_id: "popular13"}});
                all_albums.push({title: "[ Acoustic & Vocal ]", cloud: {type: 'vk', album_id: "popular14"}});
                all_albums.push({title: "[ Reggae ]", cloud: {type: 'vk', album_id: "popular15"}});
                all_albums.push({title: "[ Classical ]", cloud: {type: 'vk', album_id: "popular16"}});
                all_albums.push({title: "[ Indie Pop ]", cloud: {type: 'vk', album_id: "popular17"}});
                all_albums.push({title: "[ Speech ]", cloud: {type: 'vk', album_id: "popular19"}});
                all_albums.push({title: "[ Electropop & Disco ]", cloud: {type: 'vk', album_id: "popular22"}});
                all_albums.push({title: "[ Other ]", cloud: {type: 'vk', album_id: "popular18"}});
                cb(all_albums);
            });
        };
        var makeAlbumTracks = function(album_id, cb) {
            if (album_id === "nogroup") {
                album_id = undefined;
            }
            if (album_id !== undefined) {
                if (album_id.length > 7 && album_id.substr(0, 7) === "popular") {
                    var sid = parseInt(album_id.substr(7));
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
                if (album_id === "recommendations") {
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
            }, album_id);
        };
        return {
            makeAlbums: function(cb) {
                getToken(function() {
                    makeAlbums(cb);
                });
            },
            makeAlbumTracks: function(album_id, cb) {
                saved_tracks = [];
                getToken(function() {
                    makeAlbumTracks(album_id, cb);
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
                        cb && cb();
                    });
                });
            },
            onOpen: function(track) {
                // Вызывается когда в track есть cloud и onOpen
                var hide = 0;
                if (track.cloud === undefined || track.cloud.from_lib) {
                    hide = 1;
                }
                if (hide) {
                    if (engine.context.custom_menu.track.save_vk === undefined) {
                        return;
                    }
                    delete engine.context.custom_menu.track.save_vk;
                    chrome.contextMenus.remove('save_vk');
                    return;
                }
                if (engine.context.custom_menu.track.save_vk !== undefined) {
                    return;
                }
                engine.context.custom_menu.track.save_vk = {
                    id: 'save_vk',
                    title: chrome.i18n.getMessage('ctx_save_vk_track'),
                    contexts: ['page'],
                    action: function () {
                        var collection = engine.playlist.memory.collection;
                        var track = collection.trackObj[collection.track_id];
                        engine.cloud.vk.addInLibrarty(track.cloud.track_id, track.cloud.owner_id);
                    }
                };
                var c_item = $.extend({},engine.context.custom_menu.track.save_vk);
                delete c_item.action;
                chrome.contextMenus.create(c_item);
            },
            getTrackList: function(collection, cb) {
                // Вызывается если есть cloud и getTrackList
                vk.makeAlbumTracks(collection.cloud.album_id, function(trackList) {
                    delete collection.trackObj;
                    collection.track_id = undefined;
                    collection.trackList = trackList;
                    cb();
                });
            },
            onTagReady: function(track) {
                // вызывается когда получены все возможные тэги трека, если есть cloud и метод onTagReady в облаке
                if (!_settings.vk_tag_update || !track.from_lib) {
                    return;
                }
                var tags = engine.tags.readTags(track);
                if (track.tags.default.title === tags.title && track.tags.default.artist === tags.artist) {
                    return;
                }
                getToken(function() {
                    updateTags(track.cloud.owner_id, track.cloud.track_id, tags.artist, tags.title);
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
            tokenStore.set('sc');
            chrome.storage.local.remove('sc_user_id');
            token = undefined;
            user_id = undefined;
        };
        var scAuth = function(cb) {
            var redirect_uri = 'https://' + chrome.runtime.id + '.chromiumapp.org/cb';
            var url = 'https://soundcloud.com/connect?client_id=' + client_id + '&response_type=token&scope=non-expiring&redirect_uri=' + redirect_uri;
            auth_getToken(type, url, function(tkn) {
                token = tkn;
                cb();
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
                        cb();
                        chrome.storage.local.set({sc_user_id: user_id});
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
            var url = 'https://api.soundcloud.com/users/' + user_id + '/playlists.json?client_id=' + client_id;
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
                                /**
                                 * @namespace track.streamable
                                 * @namespace track.original_format
                                 * @namespace track.track_type
                                 * @namespace track.stream_url
                                 * @namespace track.user.username
                                 * @namespace track.artwork_url
                                 */
                                if (track.streamable === false || (track.original_format === "wav" && track.track_type === 'original')) {
                                    continue;
                                }
                                if (track.artwork_url === null) {
                                    track.artwork_url = undefined;
                                }
                                tracks.push({url: track.stream_url + '?client_id=' + client_id, type: '.mp3', tags: {default: { title: track.title, artist: track.user.username, cover: track.artwork_url }}, cloud: {type: 'sc'}});
                            }
                            list.push({title: item.title, trackList: tracks, cloud: {type: "sc"}});
                        });
                        cb(list);
                    }
                },
                error: function(jqXHR) {
                    if (jqXHR.status === 401) {
                        return;
                    }
                    clear_data();
                }
            });
        };
        var getFavorited = function(cb) {
            var url = 'https://api.soundcloud.com/users/' + user_id + '/favorites.json?client_id=' + client_id;
            $.ajax({
                url: url,
                dataType: 'JSON',
                success: function(data) {
                    var tracks = [];
                    for (var i = 0, track; track = data[i]; i++) {
                        if (track.streamable === false || (track.original_format === "wav" && track.track_type === 'original')) {
                            continue;
                        }
                        if (track.artwork_url === null) {
                            track.artwork_url = undefined;
                        }
                        tracks.push({url: track.stream_url + '?client_id=' + client_id, type: '.mp3', tags: {default: {title: track.title, artist: track.user.username, cover: track.artwork_url}}, cloud: {type: 'sc'}});
                    }
                    if (tracks.length === 0) {
                        return;
                    }
                    cb(tracks);
                }
            });
        };
        var getExploreCategory = function(cb) {
            var url = 'https://api-v2.soundcloud.com/explore/categories';
            $.ajax({
                url: url,
                dataType: 'JSON',
                success: function(data) {
                    var albums = [];
                    /**
                     * @namespace data.categories
                     */
                    if (data.music === undefined) {
                        return cb(albums);
                    }
                    var categoryList = data.music;
                    categoryList = categoryList.concat(data.audio);
                    categoryList.forEach(function(item) {
                        var name = item.replace(/\+/g, ' ').replace(/%26/g, '&');
                        albums.push({title: '[ ' + name + ' ]', cloud: {type: "sc", isExplore: true, name: name}});
                    });
                    cb(albums);
                },
                error: function() {
                    cb([]);
                }
            });
        };
        var getExploreTracks = function(category, cb) {
            var url = 'https://api-v2.soundcloud.com/explore/' + encodeURIComponent(category) + '?limit=100&offset=0&client_id=' + client_id;
            $.ajax({
                url: url,
                dataType: 'JSON',
                success: function(data) {
                    var tracks = [];
                    if (data.tracks === undefined) {
                        return cb(tracks);
                    }
                    for (var i = 0, track; track = data.tracks[i]; i++) {
                        if (track.streamable === false || (track.original_format === "wav" && track.track_type === 'original')) {
                            continue;
                        }
                        if (track.artwork_url === null) {
                            track.artwork_url = undefined;
                        }
                        tracks.push({url: track.stream_url + '?client_id=' + client_id, type: '.mp3', tags: {default: {title: track.title, artist: track.user.username, cover: track.artwork_url}}, cloud: {type: 'sc', track_id: track.id}});
                    }
                    cb(tracks);
                }
            });
        };
        var addInFavorite = function(track_id) {
            var url = 'https://api.soundcloud.com/users/' + user_id + '/favorites/' + track_id + '.json?client_id=' + client_id + '&oauth_token=' + token;
            $.ajax({
                type: 'PUT',
                url: url,
                statusCode: {
                    401: function() {
                        scAuth(function() {
                            if (user_id === undefined) {
                                scUserId(function() {
                                    addInFavorite(track_id);
                                });
                            } else {
                                addInFavorite(track_id);
                            }
                        });
                    }
                }
            });
        };
        var getUserId = function(cb) {
            if (user_id !== undefined) {
                return cb();
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
                return cb();
            }
            token = tokenStore.get(type);
            if (token === undefined) {
                return scAuth(cb);
            }
            cb();
        };
        return {
            makeAlbums: function(cb) {
                getToken(function() {
                    getUserId(function() {
                        getAlbums(function(albums) {
                            getExploreCategory(function(explore) {
                                var list = [];
                                list.push({title: chrome.i18n.getMessage('sc_favorite'), cloud: {type: "sc", isFavorite: true}});
                                albums.forEach(function(item) {
                                    item.id = list.length;
                                    list.push(item);
                                });
                                explore.forEach(function(item) {
                                    item.id = list.length;
                                    list.push(item);
                                });
                                cb(list);
                            });
                        });
                    });
                });
            },
            getTrackList: function(collection, cb) {
                if (collection.cloud.isExplore) {
                    getToken(function() {
                        getExploreTracks(collection.cloud.name, function(trackList) {
                            delete collection.trackObj;
                            collection.track_id = undefined;
                            collection.trackList = trackList;
                            cb();
                        });
                    });
                    return;
                }
                if (collection.cloud.isFavorite) {
                    getToken(function() {
                        getUserId(function() {
                            getFavorited(function(trackList) {
                                delete collection.trackObj;
                                collection.track_id = undefined;
                                collection.trackList = trackList;
                                cb();
                            });
                        });
                    });
                    return;
                }
                if (collection.trackList !== undefined) {
                    return cb();
                }
                console.log('Cloud',type,'trackList not found!');
            },
            onOpen: function(track) {
                // Вызывается когда в track есть cloud и onOpen
                var hide = 0;
                if (track.cloud.track_id === undefined) {
                    hide = 1;
                }
                if (hide) {
                    if (engine.context.custom_menu.track.save_sc === undefined) {
                        return;
                    }
                    delete engine.context.custom_menu.track.save_sc;
                    chrome.contextMenus.remove('save_sc');
                    return;
                }

                if (engine.context.custom_menu.track.save_sc !== undefined) {
                    return;
                }
                engine.context.custom_menu.track.save_sc = {
                    id: 'save_sc',
                    title: chrome.i18n.getMessage('ctx_save_sc_track'),
                    contexts: ['page'],
                    action: function () {
                        var collection = engine.playlist.memory.collection;
                        var track = collection.trackObj[collection.track_id];
                        getToken(function() {
                            getUserId(function() {
                                addInFavorite(track.cloud.track_id);
                            });
                        });
                    }
                };
                var c_item = $.extend({},engine.context.custom_menu.track.save_sc);
                delete c_item.action;
                chrome.contextMenus.create(c_item);
            }
        };
    }();
    var db = function() {
        var type = 'db';
        var token = undefined;
        var clear_data = function() {
            tokenStore.set(type);
            token = undefined;
        };
        var dbAuth = function(cb) {
            var client_id = "t8uqhrqkw9rz5x8";
            var redirect_uri = 'https://' + chrome.runtime.id + '.chromiumapp.org/cb';
            var url = 'https://www.dropbox.com/1/oauth2/authorize?client_id=' + client_id + '&response_type=token&redirect_uri=' + redirect_uri;
            auth_getToken(type, url, function(tkn) {
                token = tkn;
                cb();
            });
        };
        var getFileList = function(cb, root, path) {
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
                            getFileList(cb, root, cb);
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
                return cb();
            }
            token = tokenStore.get(type);
            if (token === undefined) {
                return dbAuth(cb);
            }
            cb();
        };
        var getHead = function(track, cb) {
            $.ajax({type: "HEAD", url: track.url,
                success: function() {
                    track.cloud.head = true;
                    cb();
                },
                error: function() {
                    track.cloud.head = false;
                    cb();
                }
            });
        };
        return {
            getFileList: function(cb, root, path) {
                getToken(function() {
                    getFileList(cb, root, path);
                });
            },
            getMedia: function(cb, root, path) {
                getToken(function() {
                    getMedia(cb, root, path);
                });
            },
            getTrackURL: function(track, cb) {
                if (track.url !== undefined && track.cloud.head === true) {
                    return cb(track.url);
                }
                if (track.cloud.head === false) {
                    return getHead(track, cb);
                }
                db.getMedia(function(url) {
                    track.url = url;
                    getHead(track, cb);
                }, track.cloud.root, track.cloud.path);
            }
        };
    }();
    var gd = function() {
        var type = 'gd';
        var token = undefined;
        var clear_data = function() {
            tokenStore.set(type);
            token = undefined;
        };
        var gdAuth = function(cb) {
            var client_id = '304269969384-d9cvnmhdquebnm8ulkne9ecveij7cjap.apps.googleusercontent.com';
            var scope = 'https://www.googleapis.com/auth/drive';
            var redirect_uri = 'https://' + chrome.runtime.id + '.chromiumapp.org/cb';
            var url = 'https://accounts.google.com/o/oauth2/auth?client_id=' + client_id + '&response_type=token&redirect_uri=' + redirect_uri + '&scope=' + scope;
            auth_getToken(type, url, function(tkn) {
                token = tkn;
                cb();
            });
        };
        var getFileList = function(id, cb) {
            if (id === undefined) {
                id = 'root';
            }
            var colums = 'items(downloadUrl,id,mimeType,parents(isRoot),title)';
            var data = {
                q: '\'' + id + '\' in parents',
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
                            getFileList(id, cb);
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
                return cb();
            }
            token = tokenStore.get(type);
            if (token === undefined) {
                return gdAuth(cb);
            }
            cb();
        };
        return {
            getToken: getToken,
            getFileList: function(id, cb) {
                getToken(function() {
                    getFileList(id, cb);
                });
            },
            getTrackURL: function(track, cb) {
                if (track.cloud.hasAccessToken === 1) {
                    return cb();
                }
                getToken(function() {
                    track.cloud.hasAccessToken = 1;
                    track.url += '&access_token=' + token;
                    cb();
                });
            }
        };
    }();
    var od = function() {
        var type = 'od';
        var token = undefined;
        var clear_data = function() {
            tokenStore.set(type);
            token = undefined;
        };
        var sdAuth = function(cb) {
            var client_id = '000000004410D305';
            var scope = 'wl.skydrive';
            var redirect_uri = 'https://' + chrome.runtime.id + '.chromiumapp.org/cb';
            var url = 'https://login.live.com/oauth20_authorize.srf?client_id=' + client_id + '&scope=' + scope + '&response_type=token&redirect_uri=' + redirect_uri;
            auth_getToken(type, url, function(tkn) {
                token = tkn;
                cb();
            });
        };
        var getFileList = function(id, cb) {
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
                            getFileList(id, cb);
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
            token = tokenStore.get(token);
            if (token === undefined) {
                return sdAuth(cb);
            }
            cb();
        };
        return {
            getToken: getToken,
            getFileList: function(id, cb) {
                getToken(function() {
                    getFileList(id, cb);
                });
            },
            getTrackURL: function(track, cb) {
                if (track.cloud.hasAccessToken === 1) {
                    return cb();
                }
                getToken(function() {
                    track.cloud.hasAccessToken = 1;
                    track.url += '&access_token=' + token;
                    cb();
                });
            }
        };
    }();
    return {
        vk: vk,
        sc: sc,
        db: db,
        gd: gd,
        od: od,
       onceGetTokenStore: function() {
            delete engine.cloud.getTokenStore;
            return tokenStore;
        },
        auth_getToken: auth_getToken
    };
}();