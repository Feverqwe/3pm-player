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
        vk_tag_update: 0
    };
    chrome.storage.local.get(function(obj) {
        engine.loadSettings(obj);
    });
    //<<<<<<<
    //allow_ext - only for files without mime.
    var allow_ext = ['mp3', 'm4a', 'm4v', 'mp4', 'ogg', 'oga', 'spx', 'webm', 'webma', 'wav', 'fla', 'rtmpa', 'ogv', '3gp'];
    var playlist = [];
    var playlist_info = undefined;
    var playlist_order = {};
    var order_index = 0;
    var covers = [];
    var playedlist = [];
    var shuffle = false;
    var loop = false;
    var current_played_pos = -1;
    var M3UPlaylists = undefined;
    var var_cache = {};
    var reset_player = function() {
        /*
         * Функция сброса плэйлиста.
         */
        //останавливает воспроизведение
        player.stop();
        //массив плэйлиста
        playlist = [];
        //название плэйлиста
        playlist_info = undefined;
        //индекс сортировки
        order_index = 0;
        //порядок сортровки
        playlist_order = {};
        //кэш изображений альбомов
        covers = [];
        //список проигранных компазиций
        playedlist = [];
        //если трек уже был проигран похиция не -1;
        current_played_pos = -1;
        //отправляет команду на очистку плэйлиста
        _send('playlist', function(window) {
            window.playlist.empty();
        });
    };
    var add_played = function(id) {
        /*
         * Добавляет трек в список програнного.
         * Если такой ID уже есть в списке - он удаляется.
         * ID добавляется в конец списка.
         */
        var ex_id = playedlist.indexOf(id);
        if (ex_id !== -1) {
            playedlist.splice(ex_id, 1);
        }
        playedlist.push(id);
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
    var array_chksum = function(a) {
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
    var image_check = function(url, cb) {
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
    var read_image = function(data, cb) {
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
            var check_summ = array_chksum(data);
            var o_b_len = data.length;
            var id = check_cover(o_b_len, check_summ);
            if (id !== undefined) {
                cb(id);
                return;
            }
            blob = new Blob([data], {type: 'image/jpeg'});
        } else {
            blob = data;
        }
        var url = URL.createObjectURL(blob);
        image_check(url, function(blob) {
            if (blob === undefined) {
                cb(undefined);
                return;
            }
            var url = URL.createObjectURL(blob);
            var cover_id = add_cover(o_b_len, url, check_summ);
            cb(cover_id);
        });
    };
    var check_cover = function(len, checksum) {
        var id;
        covers.forEach(function(item) {
            if (item.len === len && item.chk === checksum) {
                id = item.id;
                return 0;
            }
        });
        return id;
    };
    var add_cover = function(len, bin, chk) {
        /*
         * Добавляет обложку в массив обложек.
         * Проверяет на наличие уже существующей в списке, уберает дубли.
         */
        var id = covers.length;
        covers.push({id: id, len: len, data: bin, chk: chk});
        return id;
    };
    var fileTagReader = function(id, cb) {
        var track = playlist[id];
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
            read_image(new_tags.picture.data, function(cover_id) {
                if (cover_id !== undefined) {
                    track.tags.picture = cover_id;
                }
                cb(id);
            });
        }, params);
    };
    var cloudTagReader = function(id, cb) {
        var track = playlist[id];
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
            read_image(new_tags.picture.data, function(cover_id) {
                if (cover_id !== undefined) {
                    track.tags.picture = cover_id;
                }
                cb(id);
            });
        });
    };
    var postTagReader = function(id, cb) {
        if (settings.lastfm_info) {
            player.lfmTagReader(id, cb);
        } else {
            cb(id);
        }
    };
    var tagReader = function(id, cb) {
        var loading_mode = function(id, track) {
            track.state = "loading";
            _send('playlist', function(window) {
                window.playlist.updPlaylistItem(id, track);
            });
        };
        var track = playlist[id];
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
            return player.canPlay(type);
        } else {
            var filename = file.name;
            var ext = filename.substr(filename.lastIndexOf('.') + 1).toLowerCase();
            return player.canPlay('.' + ext);
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
            id = player.getTrackID();
        }
        if (playlist[id] === undefined) {
            return {title: '3pm-player'};
        }
        var tags = playlist[id].tags;
        if (tags === undefined) {
            return {title: playlist[id].file.name};
        }
        var title = "";
        var album = "";
        var artist = "";
        var artist_album = "";
        if (tags.title !== undefined && tags.title.length > 0) {
            title = tags.title;
        } else {
            title = playlist[id].file.name;
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
    var player;
    (function() {
        player = {};
        var type_list = {};
        var audio = new Audio();
        var adapter = function() {
            var _ad = {context: new window.webkitAudioContext(),
                audio: audio,
                proc_list: {}
            };
            _ad.source = _ad.context.createMediaElementSource(_ad.audio);
            _ad.source.connect(_ad.context.destination);
            return _ad;
        }();
        var current_id = undefined;
        var notification;
        (function(ns) {
            notification = {};
            var timeout = 3000;
            var timer = undefined;
            var starTimer = function() {
                clearTimeout(timer);
                timer = setTimeout(function() {
                    chrome.notifications.clear('current_track', function() {
                    });
                }, timeout);
            };
            var getOpt = function() {
                var tb = getTagBody();
                var opt = {
                    type: 'basic',
                    title: tb.title,
                    message: ''
                };
                if (tb.aa !== undefined) {
                    opt.message = tb.aa;
                }
                if (tb.picture !== undefined) {
                    opt.iconUrl = engine.getCover(tb.picture);
                }
                return opt;
            };
            chrome.notifications.onButtonClicked.addListener(function(a, b) {
                if (a !== 'current_track') {
                    return;
                }
                clearTimeout(timer);
                chrome.notifications.clear('current_track', function(obj) {
                });
                if (b === 1) {
                    player.preview();
                } else {
                    player.next();
                }
            });
            chrome.notifications.onClicked.addListener(function(a, b) {
                clearTimeout(timer);
                chrome.notifications.clear('current_track', function(obj) {
                    window._focus_all();
                });
            });
            notification.show = function() {
                var opt = getOpt();
                if (settings.notifi_buttons) {
                    opt.buttons = [
                        {title: _lang.next, iconUrl: '/images/playback_next.png'},
                        {title: _lang.prev, iconUrl: '/images/playback_prev.png'}
                    ];
                }
                //отображаем уведомление о воспроизведении
                chrome.notifications.getAll(function(obj) {
                    if (obj.current_track !== undefined) {
                        starTimer();
                        notification.update();
                        return;
                    }
                    chrome.notifications.create('current_track', opt, function(obj) {
                        starTimer();
                    });
                });
            };
            notification.update = function() {
                chrome.notifications.getAll(function(obj) {
                    if (obj.current_track === undefined) {
                        return;
                    }
                    var opt = getOpt();
                    chrome.notifications.update('current_track', opt, function(obj) {
                    });
                });
            };
        })();
        var audio_preload = function(track) {
            if (track.cloud === undefined) {
                return false;
            }
            var track_type = track.cloud.type;
            if (parseInt(settings['preload_' + track_type]) === 1) {
                /*
                 * preload return only BLOB!
                 */
                if (track.blob !== undefined && track.blob.url !== undefined) {
                    cloud.abort();
                    audio.src = track.blob.url;
                    return true;
                }
                view.state("preloading");
                cloud[track_type].preload({
                    view: view,
                    track: track
                }, function(blob) {
                    view.state("preloading_dune");
                    if (blob === undefined) {
                        console.log('No url');
                        audio.trigger('error');
                        return;
                    }
                    track.blob = blob;
                    track.blob.url = URL.createObjectURL(blob);
                    audio.src = track.blob.url;
                });
                return true;
            } else
            if (cloud[track_type].onplay !== undefined) {
                /*
                 * onplay return only URL!
                 */
                view.state("preloading");
                cloud[track_type].onplay(track, view, function(url) {
                    view.state("preloading_dune");
                    if (url.length === 0) {
                        console.log('No url');
                        return;
                    }
                    audio.src = url;
                });
                return true;
            }
            return false;
        };
        var tags_loaded = function(id, state) {
            // 1 - playlist only
            // 2 - player, lfm, viz
            // other - all
            var tb;
            playlist[id].state = "dune";
            var plist = function() {
                _send('playlist', function(window) {
                    window.playlist.updPlaylistItem(id, playlist[id]);
                });
            };
            var player = function() {
                if (id !== current_id) {
                    return;
                }
                view.setTags(tb);
            };
            var notifi = function() {
                if (id !== current_id) {
                    return;
                }
                if (settings.next_track_notification) {
                    notification.update();
                }
            };
            var viz = function() {
                if (id !== current_id) {
                    return;
                }
                _send('viz', function(window) {
                    window.viz.audio_state('track', tb);
                });
            };
            var lfm = function() {
                if (id !== current_id) {
                    return;
                }
                if (settings.lastfm && tb.artist !== undefined && tb.album !== undefined) {
                    lastfm.updateNowPlaying(tb.artist, tb.title, tb.album, audio.duration);
                }
            };
            if (state === 1) {
                plist();
                return;
            }
            tb = getTagBody(id);
            if (state === 2) {
                player();
                lfm();
                viz();
                return;
            }
            player();
            plist();
            notifi();
            viz();
            lfm();
        };
        var lastfm_tag_ready = function(id, new_tags, blob, cb) {
            if (new_tags === undefined) {
                cb(id);
                return;
            }
            var track = playlist[id];
            read_image(blob, function(cover_id) {
                if (cover_id !== undefined) {
                    track.tags.picture = cover_id;
                }
                if (new_tags !== undefined) {
                    var changes_vk = false;
                    if (new_tags.artist !== undefined && track.tags.artist !== new_tags.artist) {
                        track.tags.artist = new_tags.artist;
                        changes_vk = true;
                    }
                    if (new_tags.album !== undefined && track.tags.album !== new_tags.album) {
                        track.tags.album = new_tags.album;
                    }
                    if (new_tags.title !== undefined && track.tags.title !== new_tags.title) {
                        track.tags.title = new_tags.title;
                        changes_vk = true;
                    }
                    if (changes_vk && settings.vk_tag_update && track.cloud !== undefined && track.cloud.type === 'vk' && track.cloud.from_lib === true) {
                        cloud.vk.update_tags(track.cloud.owner_id, track.cloud.track_id, track.tags.artist, track.tags.title);
                    }
                }
                cb(id);
            });
        };
        player.lfmTagReader = function(id, cb) {
            var track = playlist[id];
            if (track.lfm === undefined) {
                track.lfm = {};
            }
            if (!settings.lastfm_info || track.lfm.lastfm) {
                cb(id);
                return;
            }
            var cache = current_id !== id;
            if (cache) {
                if (track.lfm.lastfm_cache) {
                    cb(id);
                    return;
                } else {
                    track.lfm.lastfm_cache = true;
                }
            } else {
                track.lfm.lastfm = true;
            }
            if (track.tags === undefined
                    || track.tags.picture !== undefined
                    || track.tags.artist === undefined
                    || track.tags.title === undefined) {
                cb(id);
                return;
            }
            lastfm.getInfo(track.tags.artist, track.tags.title, function(lfm_tags, blob) {
                if (lfm_tags === undefined) {
                    cb(id);
                }
                lastfm_tag_ready(id, lfm_tags, blob, cb);
            }, cache);
        };
        player.discAdapters = function(name) {
            var rmlist = [];
            if (name !== undefined && adapter.proc_list[name] !== undefined) {
                adapter.proc_list[name].disconnect();
                rmlist.push(name);
            }
            $.each(adapter.proc_list, function(key, proc) {
                if (proc._window.window === null) {
                    proc.disconnect();
                    rmlist.push(key);
                }
            });
            rmlist.forEach(function(name) {
                delete adapter.proc_list[name];
            });
        };
        player.getAdapter = function(cb) {
            if (!cb) {
                return adapter;
            } else {
                cb(adapter);
            }
        };
        player.open = function(id) {
            id = parseInt(id);
            var item = playlist[id];
            if (item === undefined) {
                return;
            }
            current_id = id;
            _send('playlist', function(window) {
                window.playlist.selected(current_id);
            });
            if ('url' in item.file) {
                if (!audio_preload(item)) {
                    audio.src = item.file.url;
                }
            } else {
                audio.src = window.URL.createObjectURL(item.file);
            }
        };
        player.get_filename = function() {
            return playlist[current_id].file.name;
        };
        player.playToggle = function() {
            if (audio.paused) {
                player.play();
            } else {
                player.pause();
            }
        };
        player.play = function() {
            if (current_id === undefined || playlist[current_id] === undefined) {
                return;
            }
            if (playedlist.length === playlist.length) {
                playedlist = [];
            }
            if (playlist[current_id].file.url !== undefined && audio.src.split(':')[0] === "chrome-extension") {
                var item = playlist[current_id];
                if (!audio_preload(item)) {
                    audio.src = item.file.url;
                }
            } else {
                audio.play();
            }
        };
        player.pause = function() {
            if (current_id === undefined || playlist[current_id] === undefined) {
                return;
            }
            if (playlist[current_id].file.url !== undefined && (audio.duration === Infinity || audio.currentTime === 0)) {
                audio.pause();
                audio.src = "";
            } else {
                audio.pause();
            }
        };
        player.stop = function() {
            if (!isNaN(audio.duration)) {
                audio.currentTime = 0;
            }
            audio.pause();
            audio.src = "";
            current_id = undefined;
        };
        player.next = function() {
            current_played_pos = -1;
            var id = current_id + 1;
            if (shuffle) {
                if (playedlist.length === playlist.length) {
                    playedlist = [];
                }
                id = getRandomInt(0, playlist.length - 1);
                var n = 2000;
                while (playedlist.indexOf(id) !== -1 && n > 0) {
                    id = getRandomInt(0, playlist.length - 1);
                    n--;
                }
            } else {
                var pos = playlist_order[order_index].indexOf(current_id);
                if (pos < 0) {
                    return;
                }
                if (pos === playlist_order[order_index].length - 1) {
                    id = playlist_order[order_index][0];
                } else {
                    id = playlist_order[order_index][pos + 1];
                }
            }
            player.open(id);
        };
        player.preview = function() {
            var id = current_id - 1;
            if (shuffle) {
                var pos = null;
                if (current_played_pos === -1) {
                    pos = playedlist.indexOf(current_id);
                } else {
                    pos = current_played_pos;
                }
                if (pos <= 0) {
                    pos = playedlist.length;
                }
                current_played_pos = pos - 1;
                id = playedlist[current_played_pos];
            } else {
                var pos = playlist_order[order_index].indexOf(current_id);
                if (pos < 0) {
                    return;
                }
                if (pos === 0) {
                    id = playlist_order[order_index].slice(-1)[0];
                } else {
                    id = playlist_order[order_index][pos - 1];
                }
            }
            player.open(id);
        };
        player.status = function() {
            var encode_name = function(title) {
                return window.btoa(unescape(encodeURIComponent(title)));
            };
            var status = {};
            status['paused'] = audio.paused;
            //status['muted'] = audio.muted;
            //status['volume'] = audio.volume;
            //status['duration'] = audio.duration;
            //status['currentTime'] = audio.currentTime;
            //status['ended'] = audio.ended;
            //status['seeking'] = audio.seeking;
            //status['seekable'] = audio.seekable;
            status['loop'] = loop;
            status['shuffle'] = shuffle;
            status['current_id'] = current_id;
            status['playlist_count'] = playlist.length;
            var tb = getTagBody(current_id);
            if (tb.aa !== undefined) {
                status['title'] = encode_name(tb.title + ' – ' + tb.aa);
            } else {
                status['title'] = encode_name(tb.title);
            }
            if (_debug) {
                console.log(status);
            }
            return status;
        };
        player.volume = function(persent) {
            var save_volume = function(pos) {
                var width_persent = pos / 1.0 * 100;
                chrome.storage.local.set({'volume': width_persent});
            };
            if (persent === undefined) {
                view.setVolume(audio.volume);
                return;
            }
            if (audio.muted) {
                audio.muted = false;
            }
            if (typeof (persent) === "string") {
                if (persent.substr(0, 1) === "+") {
                    persent = parseFloat(persent.substr(1));
                } else {
                    persent = -1 * parseFloat(persent.substr(1));
                }
                if (isNaN(persent)) {
                    return;
                }
                var new_val = audio.volume + persent / 100;
                if (new_val > 1) {
                    new_val = 1;
                } else
                if (new_val < 0) {
                    new_val = 0;
                }
                audio.volume = new_val;
                save_volume(audio.volume);
                return;
            }
            var val = 1.0 / 100 * persent;
            if (audio.volume === val) {
                view.setVolume(audio.volume);
            } else {
                audio.volume = val;
            }
            save_volume(audio.volume);
        };
        player.position = function(persent) {
            if (isNaN(audio.duration))
                return;
            if (typeof (persent) === "string") {
                if (persent.substr(0, 1) === "+") {
                    persent = parseFloat(persent.substr(1));
                } else {
                    persent = -1 * parseFloat(persent.substr(1));
                }
                if (isNaN(persent)) {
                    return;
                }
                var new_val = audio.currentTime + persent;
                if (new_val > audio.duration) {
                    new_val = audio.duration;
                } else
                if (new_val < 0) {
                    new_val = 0;
                }
                audio.currentTime = new_val;
                return;
            }
            audio.currentTime = audio.duration / 100 * persent;
        };
        player.mute = function() {
            audio.muted = !audio.muted;
        };
        player.getMute = function() {
            return audio.muted;
        };
        player.getCurrent = function() {
            _send('playlist', function(window) {
                window.playlist.selected(current_id);
            });
        };
        player.canPlay = function(mime) {
            if (mime[0] === '.') {
                var ext = mime.substr(1);
                return (allow_ext.indexOf(ext) > 0);
            }
            if (type_list[mime] !== undefined) {
                return type_list[mime];
            }
            type_list[mime] = audio.canPlayType(mime).length > 0;
            return type_list[mime];
        };
        $(audio).on('loadstart', function(e) {
            var tb = getTagBody(current_id);
            view.setTags(tb);
            view.state("loadstart");
            _send('viz', function(window) {
                window.viz.audio_state('track', tb);
            });
        });
        $(audio).on('progress', function(e) {
            view.state("progress");
        });
        $(audio).on('suspend', function(e) {
            view.state("suspend");
        });
        $(audio).on('abort', function(e) {
            view.state("abort");
        });
        $(audio).on('error', function(e) {
            view.state("error");
        });
        $(audio).on('emptied', function(e) {
            view.state("emptied");
        });
        $(audio).on('stalled', function(e) {
            view.state("stalled");
        });
        $(audio).on('play', function(e) {
            view.state("play");
        });
        $(audio).on('pause', function(e) {
            view.state("pause");
            player.discAdapters();
        });
        $(audio).on('loadedmetadata', function(e) {
            if (playlist[current_id].duration === undefined) {
                playlist[current_id].duration = this.duration;
            }
            view.state("loadedmetadata");
            _send('viz', function(window) {
                window.viz.audio_state('loadedmetadata');
            });
            player.discAdapters();
        });
        $(audio).on('loadeddata', function(e) {
            if (settings.next_track_notification) {
                notification.show();
            }
            var track = playlist[current_id];
            if (track.tags === undefined || track.tags.reader_state !== true) {
                tagReader(current_id, function(id) {
                    tags_loaded(id);
                });
            } else
            if (settings.lastfm_info && (track.lfm === undefined || track.lfm.lastfm !== true)) {
                player.lfmTagReader(current_id, function(id) {
                    tags_loaded(id);
                });
            } else {
                tags_loaded(current_id, 2);
            }
            view.state("loadeddata");
        });
        $(audio).on('waiting', function(e) {
            view.state("waiting");
        });
        $(audio).on('playing', function(e) {
            add_played(current_id);
            view.state("playing");
        });
        $(audio).on('canplay', function(e) {
            view.state("canplay");
            view.setVolume(audio.volume);
        });
        $(audio).on('canplaythrough', function(e) {
            view.state("canplaythrough");
        });
        $(audio).on('seeking', function(e) {
            view.state("seeking");
        });
        $(audio).on('seeked', function(e) {
            view.state("seeked");
        });
        $(audio).on('timeupdate', function(e) {
            view.setProgress(this.duration, this.currentTime);
        });
        $(audio).on('ended', function(e) {
            if (shuffle) {
                if (playedlist.length !== playlist.length || loop) {
                    player.next();
                }
            } else {
                var pos = playlist_order[order_index].indexOf(current_id);
                if (loop || pos !== playlist_order[order_index].length - 1) {
                    player.next();
                }
            }
            view.state("ended");
        });
        $(audio).on('ratechange', function(e) {
            view.state("ratechange");
        });
        $(audio).on('durationchange', function(e) {
            view.state("durationchange");
        });
        $(audio).on('volumechange', function(e) {
            view.state("volumechange");
            view.setVolume(audio.volume);
        });
        player.getAudio = function() {
            return audio;
        };
        player.readAllTags = function() {
            /*
             var startDate = new Date().getTime();
             */
            var thread = 0;
            var item_id = -1;
            var item_len = playlist.length;
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
                    var track = playlist[item_id];
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
                    tags_loaded(id, 1);
                    thread--;
                    next_item();
                });
            };
            next_item();
        };
        player.getCurrentTrack = function() {
            return playlist[current_id];
        };
        player.getTrackID = function() {
            return current_id;
        };
    })();
    var add_in_ctx_menu = function(playlist_info) {
        var context_menu = view.getContextMenu();
        if (playlist_info !== undefined && playlist_info.cloud !== undefined && playlist_info.cloud.vk_save === true) {
            if (context_menu.save_vk.hide === 0) {
                return;
            }
            var item = {};
            item.id = context_menu.save_vk.id;
            item.title = context_menu.save_vk.title;
            item.contexts = context_menu.save_vk.contexts;
            chrome.contextMenus.create(item);
            context_menu.save_vk.hide = 0;
        } else
        if (context_menu.save_vk.hide === 0) {
            chrome.contextMenus.remove('save_vk');
            context_menu.save_vk.hide = 1;
        }
    };
    var check_window_position = function(position) {
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
        window._focus_all();
    });
    window._focus_all = function(type) {
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
    window._show_all = function(type, oncancel) {
        if (type === undefined) {
            type = 'player';
        }
        var _windows = window._windows;
        var n = 0;
        for (var i in _windows) {
            if (i === type) {
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
            window._focus_all();
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
        var _old_settings = JSON.parse(JSON.stringify(settings));
        $.each(settings, function(k) {
            if (obj[k] !== undefined) {
                settings[k] = obj[k];
            }
        });
        if (boot) {
            chrome.runtime.sendMessage(chrome.runtime.id, 'settings_ready');
            boot = undefined;
            return;
        }
        if ((settings.webui_port !== _old_settings.webui_port || settings.webui_interface !== _old_settings.webui_interface) && webui.active()) {
            webui.start();
        }
        chrome.runtime.sendMessage(chrome.runtime.id, 'settings_changed');
    };
    engine.get_filename = player.get_filename;
    engine.open = function(files, info) {
        if (files.length === 0) {
            return;
        }
        var my_playlist = [];
        var my_playlist_order = {0: []};
        for (var i = 0; i < files.length; i++) {
            my_playlist_order[0].push(i);
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
                files[i].id = my_playlist.length;
                my_playlist.push(files[i]);
                continue;
            }
            if (files[i].url !== undefined) {
                my_playlist.push({id: my_playlist.length, file: {name: files[i].url, url: files[i].url}, tags: {}, duration: 0});
                continue;
            }
            if (canFilePlay(files[i]) === false) {
                continue;
            }
            my_playlist.push({id: my_playlist.length, file: files[i], tags: undefined, duration: undefined});
        }
        if (my_playlist.length > 0) {
            reset_player();
            playlist = my_playlist;
            playlist_order = my_playlist_order;
            playlist_info = info;
            _send('playlist', function(window) {
                window.playlist.setPlaylist(engine.getPlaylist());
            });
            view.state("playlist_not_empty");
            var id = 0;
            if (shuffle) {
                id = getRandomInt(0, playlist.length - 1);
            }
            player.open(id);
            add_in_ctx_menu(playlist_info);
        }
    };
    engine.play = player.play;
    engine.playToggle = player.playToggle;
    engine.open_id = player.open;
    engine.pause = player.pause;
    engine.next = player.next;
    engine.preview = player.preview;
    engine.position = player.position;
    engine.volume = player.volume;
    engine.mute = player.mute;
    engine.getMute = player.getMute;
    engine.getAudio = player.getAudio;
    engine.getCurrentTrack = player.getCurrentTrack;
    engine.getCover = function(id) {
        /*
         if (id === undefined || covers[id] === undefined) {
         return 'images/no-cover.png';
         }
         */
        return covers[id].data;
    };
    engine.shuffle = function(c) {
        if (c === undefined) {
            shuffle = !shuffle;
        }
        chrome.storage.local.set({'shuffle': shuffle});
        _send('playlist', function(window) {
            window.playlist.setShuffle(shuffle);
        });
        view.setShuffle(shuffle);
    };
    engine.loop = function(c) {
        if (c === undefined) {
            loop = !loop;
        }
        chrome.storage.local.set({'loop': loop});
        _send('playlist', function(window) {
            window.playlist.setLoop(loop);
        });
        view.setLoop(loop);
    };
    engine.getPlaylist = function() {
        return {order_index: order_index, playlist_ordered: playlist_order[order_index], playlist: playlist, info: playlist_info};
    };
    engine.getCurrent = player.getCurrent;
    engine.APIstatus = function() {
        return JSON.stringify(player.status());
    };
    engine.APIplaylist = function() {
        var playlist_ordered = playlist_order[order_index];
        var playlist_order_len = playlist_ordered.length;
        var list = new Array(playlist_order_len);
        for (var i = 0; i < playlist_order_len; i++) {
            var track = playlist[playlist_ordered[i]];
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
        if (playlist_info !== undefined) {
            pl_i = {name: playlist_info.name, id: playlist_info.id};
        }
        var rez = player.status();
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
        playlist_order[new_order_index] = new_playlist_order;
        order_index = new_order_index;
        if (no_update_pl) {
            return;
        }
        _send('playlist', function(window) {
            window.playlist.setPlaylist(engine.getPlaylist());
        });
    };
    engine.getPlaylistOrder = function() {
        return playlist_order;
    };
    engine.setPlaylistOrder = function(new_order_index) {
        order_index = new_order_index;
        return engine.getPlaylist();
    };
    engine.readAllTags = player.readAllTags;
    engine.getAdapter = player.getAdapter;
    engine.discAdapters = player.discAdapters;
    engine.getTagBody = getTagBody;
    engine.vizRandomPreset = function() {
        _send('viz', function(window) {
            window.viz.randomPreset();
        });
    };
    engine.get_allow_ext = function() {
        return allow_ext;
    };
    engine.canPlay = player.canPlay;
    engine.set_hotkeys = function(_document) {
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
    engine.select_playlist = function(id) {
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
        engine.window_manager({type: 'dialog', config: {type: "menu", h: 290, w: 250, r: true, list: view.getContextMenu(), webui_state: webui.active()}});
    };
    engine.window_manager = function(options) {
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
                var position = check_window_position({
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
                    window.onClosed.addListener(function() {
                        delete _windows[options.type];
                    });
                    window.contentWindow._lang = _lang;
                    window.contentWindow._send = _send;
                });
            });
        } else
        if (options.type === 'viz') {
            options.toggle = true;
            chrome.storage.local.get(['viz_pos_left', 'viz_pos_top', 'viz_w', 'viz_h'], function(storage) {
                var position = check_window_position({
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
                        player.discAdapters('viz');
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
            var position = check_window_position({
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
            var position = check_window_position({
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
})(this);