var _debug = false;
(function(ns) {
    var engine = ns.engine = {};
    //options
    var boot = true;
    var settings = _settings = {
        next_track_notification: 0,
        extend_volume_scroll: 0,
        notifi_buttons: 0,
        is_winamp: 0,
        visual_type: '1',
        foreign_tracks: 0,
        preload_vk: 0,
        preload_db: 0,
        preload_sc: 0,
        preload_gd: 1,
        preload_box: 1,
        preload_sd: 0,
        lastfm: 0,
        lastfm_info: 1,
        lastfm_cover: 1,
        webui_port: 9898,
        webui_interface: 'Any',
        webui_run_onboot: 0,
        vk_tag_update: 0,
        pined_playlist: 0,
        pin_position: 2
    };
    chrome.storage.local.get(function(obj) {
        engine.loadSettings(obj);
    });
    //<<<<<<<
    //allow_ext - only for files without mime.
    engine.allow_ext = ['mp3', 'm4a', 'm4v', 'mp4', 'ogg', 'oga', 'spx', 'webm', 'webma', 'wav', 'fla', 'rtmpa', 'ogv', '3gp'];
    engine.playlist = [];
    engine.playlist_order = {};
    engine.playlist_info = undefined;
    engine.order_index = 0;
    engine.covers = [];
    engine.playedlist = [];
    engine.current_played_pos = -1;
    engine._shuffle = false;
    engine._loop = false;
    var M3UPlaylists = undefined;
    var var_cache = {};
    var resetPlayer = function() {
        /*
         * Функция сброса плэйлиста.
         */
        //останавливает воспроизведение
        engine_player.stop();
        //массив плэйлиста
        engine.playlist = [];
        //название плэйлиста
        engine.playlist_info = undefined;
        //индекс сортировки
        engine.order_index = 0;
        //порядок сортровки
        engine.playlist_order = {};
        //кэш изображений альбомов
        engine.covers = [];
        //список проигранных компазиций
        engine.playedlist = [];
        //если трек уже был проигран похиция не -1;
        engine.current_played_pos = -1;
        //отправляет команду на очистку плэйлиста
        _send('playlist', function(window) {
            window.playlist.empty();
        });
    };
    var addPlayed = function(id) {
        /*
         * Добавляет трек в список програнного.
         * Если такой ID уже есть в списке - он удаляется.
         * ID добавляется в конец списка.
         */
        var ex_id = engine.playedlist.indexOf(id);
        if (ex_id !== -1) {
            engine.playedlist.splice(ex_id, 1);
        }
        engine.playedlist.push(id);
    };
    var str2blob = function(byteCharacters, contentType, sliceSize) {
        contentType = contentType || '';
        sliceSize = sliceSize || 256;
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
            var byteArray = new Uint8Array(byteNumbers);
            byteArrays[n] = byteArray;
            n++;
        }
        return new Blob(byteArrays, {type: contentType});
    };
    var b64toBlob = function(b64Data, contentType) {
        contentType = contentType || '';
        var byteCharacters = atob(b64Data);
        return str2blob(byteCharacters, contentType, 256);
    };
    var arrayChksum = function(a) {
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
    var imageCheck = function(url, cb) {
        /*
         * Проверяет изображение на возможность прочтения
         * Изменяет размер обложки.
         */
        var img = new Image();
        img.onerror = function() {
            URL.revokeObjectURL(url);
            cb(undefined);
        };
        img.onload = function() {
            URL.revokeObjectURL(url);
            var MAXWidthHeight = 80 * 2;
            var r = MAXWidthHeight / Math.max(this.width, this.height),
                    w = Math.round(this.width * r),
                    h = Math.round(this.height * r),
                    c = document.createElement("canvas");
            c.width = w;
            c.height = h;
            c.getContext("2d").drawImage(this, 0, 0, w, h);
            var blob = b64toBlob(c.toDataURL('image/png', 1).split(',')[1], 'image/png');
            cb(blob);
        };
        img.src = url;
    };
    var readImage = function(data, cb) {
        /*
         * data = Array || ArrayBuffer || Blob
         */
        var blob;
        if (data === undefined) {
            cb(undefined);
            return;
        }
        if (data.size === undefined) {
            if (data.buffer === undefined) {
                //data is Array
                data = new Uint8Array(data);
            }
            //data is Uint8Array
            var check_summ = arrayChksum(data);
            var o_b_len = data.length;
            var id = checkCover(o_b_len, check_summ);
            if (id !== undefined) {
                cb(id);
                return;
            }
            blob = new Blob([data], {type: 'image/jpeg'});
        } else {
            blob = data;
        }
        var url = URL.createObjectURL(blob);
        imageCheck(url, function(blob) {
            if (blob === undefined) {
                cb(undefined);
                return;
            }
            var url = URL.createObjectURL(blob);
            var cover_id = addCover(o_b_len, url, check_summ);
            cb(cover_id);
        });
    };
    var checkCover = function(len, checksum) {
        /*
         * Проверяет наличие уже обложке в массиве обложек по некой checksum
         */
        var id;
        engine.covers.forEach(function(item) {
            if (item.len === len && item.chk === checksum) {
                id = item.id;
                return 0;
            }
        });
        return id;
    };
    var addCover = function(len, bin, chk) {
        /*
         * Добавляет обложку в массив обложек.
         */
        var id = engine.covers.length;
        engine.covers.push({id: id, len: len, data: bin, chk: chk});
        return id;
    };
    var fileTagReader = function(id, cb) {
        var track = engine.playlist[id];
        var file = track.blob || track.file;
        /*
         if (window.time_log === undefined) {
         window.time_log = [];
         }
         var startDate = new Date().getTime();
         */
        var params = {tags: ["artist", "title", "album", "picture"], file: file};
        ID3.loadTags(0, function() {
            /*
             var endDate = new Date().getTime();
             var raz = ((endDate - startDate) / 1000);
             console.log("Time: " + raz + "s");
             window.time_log.push(raz);
             var sum = window.time_log.reduce(function(pv, cv) {
             return pv + cv;
             }, 0);
             console.log('Среднее время: ', sum / window.time_log.length);
             */
            var new_tags = ID3.getAllTags(0);
            ID3.clearAll();

            ['title', 'artist', 'album'].forEach(function(key) {
                var item = new_tags[key];
                if (item !== undefined) {
                    track.tags[key] = item;
                }
            });
            if (new_tags.picture === undefined) {
                cb(id);
                return;
            }
            readImage(new_tags.picture.data, function(cover_id) {
                if (cover_id !== undefined) {
                    track.tags.picture = cover_id;
                }
                cb(id);
            });
        }, params);
    };
    var cloudTagReader = function(id, cb) {
        var track = engine.playlist[id];
        cloud[track.cloud.type].read_tags(track, function(new_tags) {
            ['title', 'artist', 'album'].forEach(function(key) {
                var item = new_tags[key];
                if (item !== undefined) {
                    track.tags[key] = item;
                }
            });
            if (new_tags.picture === undefined) {
                cb(id);
                return;
            }
            readImage(new_tags.picture.data, function(cover_id) {
                if (cover_id !== undefined) {
                    track.tags.picture = cover_id;
                }
                cb(id);
            });
        });
    };
    var postTagReader = function(id, cb) {
        cb(id);
        if (settings.lastfm_info || settings.lastfm_cover) {
            engine_player.lfmTagReader(id);
        }
    };
    var tagReader = function(id, cb) {
        var loading_mode = function(id, track) {
            track.state = "loading";
            _send('playlist', function(window) {
                window.playlist.updPlaylistItem(id, track);
            });
        };
        var track = engine.playlist[id];
        if (track.tags === undefined) {
            track.tags = {};
        }
        if (track.tags.reader_state === true) {
            return;
        }
        track.tags.reader_state = true;
        if (track.cloud !== undefined) {
            var config = track.cloud.tag_config;
            if (config === undefined) {
                if (cloud[track.cloud.type].read_tags) {
                    config = 'cloud';
                } else {
                    postTagReader(id, cb);
                    return;
                }
            }
            if (config === 'blob') {
                loading_mode(id, track);
                fileTagReader(id, function(id) {
                    postTagReader(id, cb);
                });
            } else
            if (config === 'cloud') {
                loading_mode(id, track);
                cloudTagReader(id, function(id) {
                    postTagReader(id, cb);
                });
            }
        } else
        if (track.file.slice !== undefined) {
            loading_mode(id, track);
            fileTagReader(id, function(id) {
                postTagReader(id, cb);
            });
        }
    };
    var canFilePlay = function(file) {
        /*
         * Определяет может ли плеер проигрывать файл, возвращает true / false.
         */
        var type = file.type;
        if (type !== undefined && type.length > 0) {
            return engine_player.canPlay(type);
        } else {
            var filename = file.name;
            var ext = filename.substr(filename.lastIndexOf('.') + 1).toLowerCase();
            return engine_player.canPlay('.' + ext);
        }
    };
    var getRandomInt = function(min, max) {
        /*
         * Получает случайное число [a,b] 
         */
        return Math.floor(Math.random() * (max - min + 1)) + min;
    };
    var getTagBody = function(id) {
        if (id === undefined) {
            id = engine_player.current_id;
        }
        if (engine.playlist[id] === undefined) {
            return {title: '3pm-player'};
        }
        var tags = engine.playlist[id].tags;
        if (tags === undefined) {
            return {title: engine.playlist[id].file.name};
        }
        var title = "";
        var album = "";
        var artist = "";
        var artist_album = "";
        if (tags.title !== undefined && tags.title.length > 0) {
            title = tags.title;
        } else {
            title = engine.playlist[id].file.name;
        }
        if (tags.artist !== undefined && tags.artist.length > 0) {
            artist = tags.artist;
        }
        if (tags.album !== undefined && tags.album.length > 0) {
            album = tags.album;
        }
        if (album.length > 0 && artist.length > 0) {
            artist_album = tags.artist + ' - ' + tags.album;
        } else
        if (artist.length > 0) {
            artist_album = artist;
        } else
        if (album.length > 0) {
            artist_album = album;
        }
        var data = {title: title};
        if (artist.length > 0) {
            data.artist = artist;
        }
        if (artist.length > 0) {
            data.album = album;
        }
        if (artist.length > 0) {
            data.aa = artist_album;
        }
        if (tags.picture !== undefined) {
            data.picture = tags.picture;
        }
        return data;
    };
    var addInCtxMenu = function(playlist_info) {
        var context_menu = view.getContextMenu();
        ['save_vk', 'save_sc'].forEach(function(type) {
            if (playlist_info !== undefined && playlist_info.cloud !== undefined && playlist_info.cloud[type] === true) {
                if (context_menu[type].hide === 0) {
                    return;
                }
                var item = {};
                item.id = context_menu[type].id;
                item.title = context_menu[type].title;
                item.contexts = context_menu[type].contexts;
                chrome.contextMenus.create(item);
                context_menu[type].hide = 0;
            } else
            if (context_menu[type].hide === 0) {
                chrome.contextMenus.remove(type);
                context_menu[type].hide = 1;
            }
        });
    };
    var checkWindowPosition = function(position) {
        var screen_width = screen.width,
                screen_height = screen.height,
                dpr = window.devicePixelRatio;
        position.width = parseInt(position.width * dpr);
        position.height = parseInt(position.height * dpr);
        if (position.left === undefined) {
            position.left = parseInt(screen_width / 2 - position.width / 2);
        }
        if (position.top === undefined) {
            position.top = parseInt(screen_height / 2 - position.height / 2);
        }
        if (position.left < 0) {
            position.left = 0;
        }
        if (position.top < 0) {
            position.top = 0;
        }
        if (screen_width < position.left + position.width) {
            position.left = screen_width - position.width;
        }
        if (screen_height < position.top + position.height) {
            position.top = screen_height - position.height;
        }
        return {width: position.width, height: position.height, left: position.left, top: position.top};
    };
    chrome.app.window.current().onClosed.addListener(function() {
        var _windows = window._windows;
        for (var i in _windows) {
            if (i === 'player') {
                continue;
            }
            _windows[i].contentWindow.close();
        }
        delete _windows['player'];
    });
    chrome.app.window.current().onMinimized.addListener(function() {
        var _windows = window._windows;
        for (var i in _windows) {
            _windows[i].minimize();
        }
    });
    chrome.app.window.current().onRestored.addListener(function() {
        window._focusAll();
    });
    window._focusAll = function(type) {
        if (type === undefined) {
            type = 'player';
        }
        var _windows = window._windows;
        for (var i in _windows) {
            if (i === type) {
                continue;
            }
            _windows[i].focus();
        }
        _windows[type].focus();
    };
    window._showAll = function(type, oncancel) {
        if (type === undefined) {
            type = 'player';
        }
        var _windows = window._windows;
        var n = 0;
        for (var i in _windows) {
            if (i === type || _windows[i].isMinimized()) {
                continue;
            }
            _windows[i].focus();
            n++;
        }
        if (n === 0) {
            oncancel();
            return;
        }
        _windows[type].focus();
    };
    window._send = function(type, cb) {
        var _windows = window._windows;
        if (_windows[type] === undefined || _windows[type].contentWindow.window === null) {
            return;
        }
        cb(_windows[type].contentWindow);
    };
    chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
        if (msg === '_player_') {
            sendResponse('ok');
            window._focusAll();
        } else
        if (msg === '_player_window_') {
            chrome.runtime.getBackgroundPage(function(bg) {
                bg.player_window = window;
                sendResponse('ok');
            });
        }
    });
    chrome.runtime.onMessageExternal.addListener(function(msg, sender, resp) {
        if (msg === 'prev') {
            engine.preview();
        } else
        if (msg === 'next') {
            engine.next();
        } else
        if (msg === 'pp') {
            engine.playToggle();
        } else
        if (msg === 'volu') {
            engine.volume("+10");
        } else
        if (msg === 'vold') {
            engine.volume("-10");
        } else
        if (msg === 'scru') {
            engine.position("+10");
        } else
        if (msg === 'scrd') {
            engine.position("-10");
        } else
        if (msg === 'shuffle') {
            engine.shuffle();
        } else
        if (msg === 'loop') {
            engine.loop();
        } else
        if (msg === 'mute') {
            engine.mute();
        } else
        if (msg === 'menu') {
            engine.showMenu();
        }
    });
    engine.loadSettings = function(obj) {
        var changes = {};
        $.each(settings, function(k) {
            if (obj[k] !== undefined && settings[k] !== obj[k]) {
                settings[k] = obj[k];
                changes[k] = obj[k];
            }
        });
        if (boot) {
            chrome.runtime.sendMessage(chrome.runtime.id, 'settings_ready');
            boot = undefined;
            return;
        }
        if ((changes.webui_port !== undefined || changes.webui_interface !== undefined) && webui.active()) {
            webui.start();
        }
        chrome.runtime.sendMessage(chrome.runtime.id, 'settings_changed');
    };
    var readTrackList = function(files) {
        var my_playlist = [];
        var my_playlist_order = {0: []};
        for (var i = 0; i < files.length; i++) {
            var id = my_playlist.length;
            if (files[i].tags !== undefined && files[i].tags.picture !== undefined) {
                /*
                 * Возможны конфиликты, если в облаке
                 *  не переписываетс список треков при выборе
                 *  или нету read_tags который получает тэги не из track.tags
                 */
                delete files[i].lfm;
                files[i].tags = undefined;
            }
            if (files[i].id !== undefined && files[i].file !== undefined) {
                files[i].id = id;
                my_playlist_order[0].push(id);
                my_playlist.push(files[i]);
                continue;
            }
            if (files[i].url !== undefined) {
                my_playlist_order[0].push(id);
                my_playlist.push({id: id, file: {name: files[i].url, url: files[i].url}, tags: {}, duration: 0});
                continue;
            }
            if (canFilePlay(files[i]) === false) {
                continue;
            }
            my_playlist_order[0].push(id);
            my_playlist.push({id: id, file: files[i], tags: undefined, duration: undefined});
        }
        return [my_playlist, my_playlist_order];
    };
    engine.open = function(files, info) {
        if (files.length === 0) {
            return;
        }
        var trackList = readTrackList(files);
        if (trackList[0].length === 0) {
            return;
        }
        resetPlayer();
        engine.playlist = trackList[0];
        engine.playlist_order = trackList[1];
        engine.playlist_info = info;
        _send('playlist', function(window) {
            window.playlist.setPlaylist(engine.getPlaylist());
        });
        view.state("playlist_not_empty");
        var id = 0;
        if (engine._shuffle) {
            id = getRandomInt(0, engine.playlist.length - 1);
        }
        engine_player.open(id);
        addInCtxMenu(engine.playlist_info);
    };
    engine.append = function(files) {
        if (files.length === 0) {
            return;
        }
        if (engine.playlist.length === 0) {
            engine.open(files);
            return;
        }
        var tracks = readTrackList(files)[0];
        if (tracks.length === 0) {
            return;
        }
        var id = engine.playlist.slice(-1)[0].id;
        for (var i = 0, track; track = tracks[i]; i++) {
            id++;
            track.id = id;
            engine.playlist.push(track);
            $.each(engine.playlist_order, function(key, value) {
                value.push(id);
            });
        }
        _send('playlist', function(window) {
            window.playlist.setPlaylist(engine.getPlaylist());
        });
    };
    engine.play = engine_player.play;
    engine.playToggle = engine_player.playToggle;
    engine.openById = engine_player.open;
    engine.pause = engine_player.pause;
    engine.next = engine_player.next;
    engine.preview = engine_player.preview;
    engine.position = engine_player.position;
    engine.volume = engine_player.volume;
    engine.mute = engine_player.mute;
    engine.getMute = engine_player.getMute;
    engine.getAudio = engine_player.getAudio;
    engine.getCurrentTrack = engine_player.getCurrentTrack;
    engine.getCover = function(id) {
        /*
         if (id === undefined || covers[id] === undefined) {
         return 'images/no-cover.png';
         }
         */
        return engine.covers[id].data;
    };
    engine.shuffle = function(c) {
        if (c === undefined) {
            engine._shuffle = !engine._shuffle;
        }
        chrome.storage.local.set({'shuffle': engine._shuffle});
        _send('playlist', function(window) {
            window.playlist.setShuffle(engine._shuffle);
        });
        view.setShuffle(engine._shuffle);
    };
    engine.loop = function(c) {
        if (c === undefined) {
            engine._loop = !engine._loop;
        }
        chrome.storage.local.set({'loop': engine._loop});
        _send('playlist', function(window) {
            window.playlist.setLoop(engine._loop);
        });
        view.setLoop(engine._loop);
    };
    engine.getPlaylist = function() {
        return {order_index: engine.order_index, playlist_ordered: engine.playlist_order[engine.order_index], playlist: engine.playlist, info: engine.playlist_info};
    };
    engine.getCurrentTrackID = engine_player.getCurrentTrackID;
    engine.APIstatus = function() {
        return JSON.stringify(engine_player.status());
    };
    engine.APIplaylist = function() {
        var playlist_ordered = engine.playlist_order[engine.order_index];
        var playlist_order_len = 0;
        if (playlist_ordered !== undefined) {
            playlist_order_len = playlist_ordered.length;
        }
        var list = new Array(playlist_order_len);
        for (var i = 0; i < playlist_order_len; i++) {
            var track = engine.playlist[playlist_ordered[i]];
            var tb = getTagBody(track.id);
            var title = tb.title;
            if (tb.aa !== undefined) {
                title += ' - ' + tb.aa;
            }
            list[i] = {id: track.id, title: title};
        }
        var pls = [];
        if (M3UPlaylists !== undefined) {
            M3UPlaylists.list.forEach(function(item) {
                pls.push({name: item.name, id: item.id});
            });
        }
        var pl_i = {name: _lang.playlist_title};
        if (engine.playlist_info !== undefined) {
            pl_i = {name: engine.playlist_info.name, id: engine.playlist_info.id};
        }
        var rez = engine_player.status();
        rez.playlist = list;
        rez.playlists = pls;
        rez.playlist_info = pl_i;
        var data = window.btoa(unescape(encodeURIComponent(JSON.stringify(rez))));
        return data;
    };
    engine.setM3UPlaylists = function(m3u) {
        M3UPlaylists = m3u;
        _send('playlist', function(window) {
            window.playlist.setSelectList(M3UPlaylists);
        });
    };
    engine.getM3UPlaylists = function() {
        return M3UPlaylists;
    };
    engine.setSortedList = function(new_playlist_order, new_order_index, no_update_pl) {
        engine.playlist_order[new_order_index] = new_playlist_order;
        engine.order_index = new_order_index;
        return engine.getPlaylist();
    };
    engine.getPlaylistOrder = function() {
        return engine.playlist_order;
    };
    engine.setPlaylistOrder = function(new_order_index) {
        engine.order_index = new_order_index;
        return engine.getPlaylist();
    };
    engine.readAllTags = readAllTags = function() {
        /*
         var startDate = new Date().getTime();
         */
        var thread = 0;
        var item_id = -1;
        var item_len = engine.playlist.length;
        var next_item = function() {
            if (thread < 5) {
                item_id++;
                thread++;
                if (item_id >= item_len) {
                    /*
                     var endDate = new Date().getTime();
                     console.log("Time: " + ((endDate - startDate) / 1000) + "s");
                     */
                    return;
                }
                var track = engine.playlist[item_id];
                if (track.tags !== undefined && track.tags.reader_state === true) {
                    thread--;
                    next_item();
                    return;
                }
                read_item(track);
            }
        };
        var read_item = function(item) {
            next_item();
            tagReader(item.id, function(id) {
                engine_player.tagsLoaded(id, 1);
                thread--;
                next_item();
            });
        };
        next_item();
    };
    engine.getAdapter = engine_player.getAdapter;
    engine.discAdapters = engine_player.discAdapters;
    engine.getTagBody = getTagBody;
    engine.vizRandomPreset = function() {
        _send('viz', function(window) {
            window.viz.randomPreset();
        });
    };
    engine.getAllowExt = function() {
        return engine.allow_ext;
    };
    engine.canPlay = engine_player.canPlay;
    engine.setHotkeys = function(_document) {
        $(_document).keydown(function(event) {
            if (event.ctrlKey || event.metaKey) {
                if (event.keyCode === 38) {
                    event.preventDefault();
                    engine.volume("+10");
                } else
                if (event.keyCode === 40) {
                    event.preventDefault();
                    engine.volume("-10");
                } else
                if (event.keyCode === 39) {
                    event.preventDefault();
                    clearTimeout(var_cache.progress_keydown_timer);
                    var_cache.progress_keydown_timer = setTimeout(function() {
                        engine.position("+10");
                    }, 25);
                } else
                if (event.keyCode === 37) {
                    event.preventDefault();
                    clearTimeout(var_cache.progress_keydown_timer);
                    var_cache.progress_keydown_timer = setTimeout(function() {
                        engine.position("-10");
                    }, 25);
                }
            } else {
                if (event.keyCode === 32 || event.keyCode === 179) {
                    event.preventDefault();
                    engine.playToggle();
                } else
                if (event.keyCode === 178) {
                    event.preventDefault();
                    engine.pause();
                } else
                if (event.keyCode === 86) {
                    event.preventDefault();
                    engine.mute();
                } else
                if (event.keyCode === 83) {
                    event.preventDefault();
                    engine.shuffle();
                } else
                if (event.keyCode === 82) {
                    event.preventDefault();
                    engine.loop();
                } else
                if (event.keyCode === 113 || event.keyCode === 176) {
                    event.preventDefault();
                    engine.next();
                } else
                if (event.keyCode === 112 || event.keyCode === 177) {
                    event.preventDefault();
                    engine.preview();
                } else
                if (event.keyCode === 78) {
                    event.preventDefault();
                    engine.vizRandomPreset();
                } else
                if (event.keyCode === 9) {
                    event.preventDefault();
                    engine.showMenu();
                }
            }
        });
    };
    engine.selectPlaylist = function(id) {
        var filePlaylists = engine.getM3UPlaylists();
        if (filePlaylists === undefined) {
            return;
        }
        cloud.abort();
        var album = {name: undefined};
        filePlaylists.list.forEach(function(item) {
            if (item.id === id) {
                album = item;
            }
        });
        if (album.type === 'subfiles') {
            view.getFilesFromFolder(album.entry, function(files) {
                engine.open(files, {name: album.name, id: id});
            });
        } else
        if (album.type === 'm3u') {
            view.entry2files(album.entrys, function(files) {
                engine.open(files, {name: album.name, id: id});
            });
        } else
        if (album.cloud !== undefined && cloud[album.cloud.type] !== undefined && cloud[album.cloud.type].on_select_list !== undefined) {
            cloud[album.cloud.type].on_select_list(album, function(track_list, info) {
                engine.open(track_list, info);
            });
        } else {
            engine.open(album.tracks, {name: album.name, id: id});
        }
    };
    engine.showMenu = function() {
        engine.windowManager({type: 'dialog', config: {type: "menu", h: 290, w: 250, r: true, list: view.getContextMenu(), webui_state: webui.active()}});
    };
    engine.setPinPosition = function(type, pos) {
        if (_windows[type] === undefined || _windows[type].contentWindow.window === null || _windows[type].isMinimized() || _windows[type].isMaximized()) { //isFullscreen?
            return;
        }
        var pb = _windows.player.getBounds();
        var params, plb;
        if (pos === 2) {
            params = {left: pb.left, top: pb.top + pb.height, width: pb.width};
        } else
        if (pos === 1) {
            params = {left: pb.left + pb.width, top: pb.top};
        } else
        if (pos === 3) {
            plb = _windows[type].getBounds();
            params = {left: pb.left - plb.width, top: pb.top};
        } else
        if (pos === 4) {
            plb = _windows[type].getBounds();
            params = {left: pb.left, top: pb.top - plb.height, width: pb.width};
        } else
        if (pos === 5) {
            plb = _windows[type].getBounds();
            params = {left: pb.left - plb.width, top: pb.top + pb.height - plb.height};
        } else
        if (pos === 6) {
            plb = _windows[type].getBounds();
            params = {left: pb.left + pb.width, top: pb.top + pb.height - plb.height};
        }
        _windows[type].setBounds(params);
    };
    engine.windowManager = function(options) {
        var create_window = function(url, args, oncreate) {
            if ((options.toggle || options.only) && _windows[options.type] !== undefined && _windows[options.type].contentWindow.window !== null) {
                _windows[options.type].contentWindow.window.close();
                if (options.only === undefined) {
                    return;
                }
            }
            chrome.app.window.create(url, args, oncreate);
        };
        if (options.type === 'playlist') {
            options.toggle = true;
            chrome.storage.local.get(['pl_pos_left', 'pl_pos_top', 'pl_w', 'pl_h'], function(storage) {
                var position = checkWindowPosition({
                    width: storage.pl_w || 335,
                    height: storage.pl_h || 400,
                    left: storage.pl_pos_left,
                    top: storage.pl_pos_top
                });
                create_window('playlist.html', {
                    bounds: position,
                    frame: "none"
                }, function(window) {
                    _windows[options.type] = window;
                    if (settings.pined_playlist) {
                        engine.setPinPosition(options.type, settings.pin_position);
                    }
                    window.onClosed.addListener(function() {
                        delete _windows[options.type];
                    });
                    window.contentWindow._windows = _windows;
                    window.contentWindow._lang = _lang;
                    window.contentWindow._send = _send;
                });
            });
        } else
        if (options.type === 'viz') {
            options.toggle = true;
            chrome.storage.local.get(['viz_pos_left', 'viz_pos_top', 'viz_w', 'viz_h'], function(storage) {
                var position = checkWindowPosition({
                    width: storage.viz_w || 1024,
                    height: storage.viz_h || 768,
                    left: storage.viz_pos_left,
                    top: storage.viz_pos_top
                });
                create_window('viz.html', {
                    bounds: position,
                    frame: "none"
                }, function(window) {
                    _windows[options.type] = window;
                    window.onClosed.addListener(function() {
                        delete _windows[options.type];
                        engine_player.discAdapters('viz');
                    });
                    window.contentWindow._lang = _lang;
                    window.contentWindow._send = _send;
                });
            });
        } else
        if (options.type === 'dialog') {
            options.only = true;
            options.config.w = options.config.w || 400;
            options.config.h = options.config.h || 120;
            if (options.config.type === 'm3u') {
                var len = 3;
                if (options.config.playlists !== undefined) {
                    len = options.config.playlists.length;
                }
                if (len === 0) {
                    len = 1;
                }
                if (len > 8) {
                    len = 8;
                }
                options.config.h = len * 52 + 43;
            } else
            if (options.config.type === 'menu') {
                delete options.only;
                options.toggle = true;
                var len = 14;
                if (options.config.list !== undefined) {
                    len = 0;
                    for (var index in options.config.list) {
                        var item = options.config.list[index];
                        if (item.hide) {
                            continue;
                        }
                        if (item.action === undefined) {
                            continue;
                        }
                        if (item.contexts.indexOf('page') === -1) {
                            continue;
                        }
                        len++;
                    }
                }
                if (len === 0) {
                    len = 1;
                }
                if (len > 20) {
                    len = 14;
                }
                options.config.h = len * 19 + 40;
            }
            var position = checkWindowPosition({
                width: options.config.w,
                height: options.config.h,
                left: undefined,
                top: undefined
            });
            create_window('dialog.html', {
                bounds: position,
                frame: "none",
                resizable: options.config.r || false
            }, function(window) {
                _windows[options.type] = window;
                window.onClosed.addListener(function() {
                    delete _windows[options.type];
                });
                window.contentWindow._lang = _lang;
                window.contentWindow.options = options.config;
                window.contentWindow._send = _send;
            });
        } else
        if (options.type === 'options') {
            options.only = true;
            var position = checkWindowPosition({
                width: 820,
                height: 600,
                left: undefined,
                top: undefined
            });
            create_window('options.html', {
                bounds: position,
                frame: "chrome",
                resizable: true
            }, function(window) {
                _windows[options.type] = window;
                window.onClosed.addListener(function() {
                    delete _windows[options.type];
                });
                window.contentWindow._language = _language;
                window.contentWindow._send = _send;
            });
        }
    };
    engine.tagReader = tagReader;
    engine.addPlayed = addPlayed;
    engine.readImage = readImage;
    engine.getRandomInt = getRandomInt
})(this);