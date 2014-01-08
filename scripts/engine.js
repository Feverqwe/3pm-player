var _debug = false;
var engine = function() {
    //options
    var boot = true;
    var settings = {
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
        lastfm_cover: 1,
        lastfm_tag_update: 1,
        webui_port: 9898,
        webui_interface: 'Any',
        webui_run_onboot: 0,
        vk_tag_update: 0
    };
    var loadSettings = function(obj) {
        var _old_settings = JSON.parse(JSON.stringify(settings));
        $.each(settings, function(k) {
            if (obj[k] !== undefined) {
                settings[k] = obj[k];
            }
        });
        if (boot) {
            window._settings = settings;
            chrome.runtime.sendMessage(chrome.runtime.id, 'settings_ready');
            boot = undefined;
            return;
        }
        if ((settings.webui_port !== _old_settings.webui_port || settings.webui_interface !== _old_settings.webui_interface) && webui.active()) {
            webui.start();
        }
        chrome.runtime.sendMessage(chrome.runtime.id, 'settings_changed');
    };
    //<<<<<<<
    //allow_ext - only for files without mime.
    var allow_ext = ['mp3', 'm4a', 'm4v', 'mp4', 'ogg', 'oga', 'spx', 'webm', 'webma', 'wav', 'fla', 'rtmpa', 'ogv', '3gp'];
    var playlist = [];
    var playlist_info = undefined;
    var sorted_playlist = undefined;
    var sort_type = 0;
    var covers = [];
    var playedlist = [];
    var shuffle = false;
    var loop = false;
    var current_played_pos = -1;
    var M3UPlaylists = undefined;
    var adapter = {};
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
        //сортированный лист
        sorted_playlist = undefined;
        //сбрасываем текущий тип сортировки
        sort_type = 0;
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
    var image_resize = function(url, cb) {
        /*
         * Изменяет размер обложки.
         */
        var img = new Image();
        img.onerror = function() {
            webkitURL.revokeObjectURL(url);
            cb(undefined);
        };
        img.onload = function() {
            webkitURL.revokeObjectURL(url);
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
    var read_image = function(binary, cb, enable_search) {
        /*
         * binary = [Array || ArrayBuffer || Blob, 'image/*'];
         */
        var resize = true;
        var blob;
        if (binary === undefined) {
            cb(undefined);
            return;
        }
        if (binary[0].size === undefined) {
            if (binary[1].substr(0, 1) !== 'i' && binary[1].substr(4, 1) !== 'e') {
                binary[1] = 'image/jpeg';
            }
            if (binary[0].buffer === undefined) {
                binary[0] = new Uint8Array(binary[0]);
            }
            var check_summ = array_chksum(binary[0]);
            var o_b_len = binary[0].length;
            var id = check_cover(o_b_len, check_summ);
            if (id !== undefined) {
                cb(id);
                return;
            }
            blob = new Blob([binary[0]], {type: binary[1]});
        } else {
            blob = binary[0];
        }
        var url = webkitURL.createObjectURL(blob);
        if (resize) {
            image_resize(url, function(blob) {
                if (blob === undefined) {
                    cb(undefined);
                    return;
                }
                var url = webkitURL.createObjectURL(blob);
                var id = add_cover(o_b_len, url, check_summ);
                cb(id);
            });
        } else {
            id = add_cover(o_b_len, url, check_summ);
            cb(id);
        }
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
    var getType = function(file) {
        /*
         * Определяет может ли плеер проигрывать файл, возвращает тип файла для плеера.
         */
        var type = file.type;
        if (type !== undefined && type.length > 0) {
            if (player.canPlay(type) === 0) {
                return;
            }
            return type;
        }
        var filename = file.name;
        var ext = filename.split('.').slice(-1)[0].toLowerCase();
        type = undefined;
        if (ext === "mp3") {
            type = 'audio/mpeg';
        } else
        if (ext === "m4a" || ext === "m4v" || ext === "mp4") {
            type = 'audio/mp4';
        } else
        if (ext === "ogg" || ext === "oga" || ext === "spx") {
            type = 'audio/ogg';
        } else
        if (ext === "webm" || ext === "webma") {
            type = 'audio/webm';
        } else
        if (ext === "wav") {
            type = 'audio/wav';
        } else
        if (ext === "fla") {
            type = 'audio/x-flv';
        } else
        if (ext === "rtmpa") {
            type = 'audio/rtmp';
        } else
        if (ext === "ogv") {
            type = 'video/ogg';
        } else
        if (ext === "3gp") {
            type = 'video/3gpp';
        }
        return type;
    };
    var getRandomInt = function(min, max) {
        /*
         * Получает случайное число
         */
        return Math.floor(Math.random() * (max - min + 1)) + min;
    };
    var getObjArrayPos = function(array, type, value) {
        var index = undefined;
        array.forEach(function(item, n) {
            if (item[type] === value) {
                index = n;
                return false;
            }
        });
        return index;
    };
    var discAdapters = function(name) {
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
    var player = function() {
        var type_list = {};
        var audio = null;
        var current_id = undefined;
        var read_tags = function(id, rt_cb) {
            if (playlist[id].type !== undefined && cloud[playlist[id].type].read_tags !== undefined) {
                playlist[id].state = "loading";
                _send('playlist', function(window) {
                    window.playlist.updPlaylistItem(id, playlist[id]);
                });
                cloud[playlist[id].type].read_tags(playlist[id], function(tags) {
                    // NOTE: tags.picture = [binary, mime]
                    read_image(tags.picture, function(i_id) {
                        if (i_id === undefined) {
                            delete tags.picture;
                        } else {
                            tags.picture = i_id;
                        }
                        rt_cb(tags, id);
                    });
                });
                return;
            }
            var file;
            if (playlist[id].blob !== undefined) {
                file = playlist[id].blob;
            } else {
                file = playlist[id].file;
            }
            playlist[id].state = "loading";
            _send('playlist', function(window) {
                window.playlist.updPlaylistItem(id, playlist[id]);
            });
            /*
             if (window.time_log === undefined) {
             window.time_log = [];
             }
             var startDate = new Date().getTime();
             */
            var params = {tags: ["artist", "title", "album", "picture"], file: file};
            var f_name = 0;
            ID3.loadTags(f_name, function() {
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
                var tags = ID3.getAllTags(f_name);
                ID3.clearAll();
                if (tags.picture !== undefined) {
                    tags.picture = [tags.picture.data, tags.picture.format];
                }
                read_image(tags.picture, function(i_id) {
                    if (i_id === undefined) {
                        delete tags.picture;
                    } else {
                        tags.picture = i_id;
                    }
                    rt_cb(tags, id);
                }, true);
            }, params);
        };
        var getTagBody = function(id) {
            if (id === undefined) {
                id = current_id;
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
        var notification = function() {
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
                    iconUrl: '/images/no-cover.png',
                    title: tb.title,
                    message: ''
                };
                if (tb.aa !== undefined) {
                    opt.message = tb.aa;
                }
                if (tb.picture !== undefined) {
                    opt.iconUrl = engine.getCover(tb.picture).data;
                }
                return opt;
            };
            var init = function() {
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
                        chrome.runtime.getBackgroundPage(function(bg) {
                            window._focus_all();
                        });
                    });
                });
            }();
            return {
                show: function() {
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
                },
                update: function() {
                    chrome.notifications.getAll(function(obj) {
                        if (obj.current_track === undefined) {
                            return;
                        }
                        var opt = getOpt();
                        chrome.notifications.update('current_track', opt, function(obj) {
                        });
                    });
                }
            };
        }();
        var audio_preload = function(item) {
            if (item.type === undefined) {
                return false;
            }
            if (parseInt(settings['preload_' + item.type]) === 1) {
                /*
                 * preload return only BLOB!
                 */
                if (item.blob !== undefined && item.blob.url !== undefined) {
                    audio.src = item.blob.url;
                    return true;
                }
                view.state("preloading");
                cloud[item.type].preload({
                    view: view,
                    track: item
                }, function(blob) {
                    view.state("preloading_dune");
                    if (typeof blob === 'string') {
                        console.log('No url');
                        return;
                    }
                    item.blob = blob;
                    item.blob.url = URL.createObjectURL(blob);
                    audio.src = item.blob.url;
                });
                return true;
            } else
            if (cloud[item.type].onplay !== undefined) {
                /*
                 * onplay return only URL!
                 */
                view.state("preloading");
                cloud[item.type].onplay(item, view, function(url) {
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
        var tags_loaded = function(tags, id, state) {
            // 1 - playlist only
            // 2 - player, lfm, notifi
            // 3 - player, playlist, notifi
            // 4 - viz, playlist, player, notifi
            // other - all
            var tb;
            playlist[id].tags = tags;
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
            if (state === 3) {
                plist();
                player();
                notifi();
                return;
            }
            if (state === 4) {
                player();
                plist();
                notifi();
                viz();
                return;
            }
            player();
            plist();
            notifi();
            viz();
            lfm();
        };
        var lastfm_tag_reader = function(id) {
            if (!settings.lastfm_cover || settings.is_winamp) {
                return;
            }
            var tags = playlist[id].tags;
            if (tags === undefined
                    || tags.picture !== undefined
                    || tags.artist === undefined
                    || tags.title === undefined) {
                return;
            }
            lastfm.getCover(tags.artist, tags.title, function(lfm_tags, blob) {
                if (lfm_tags === undefined) {
                    return;
                }
                var binary;
                if (blob !== undefined) {
                    binary = [blob, ''];
                }
                read_image(binary, function(i_id) {
                    if (i_id === undefined) {
                        delete tags.picture;
                    } else {
                        tags.picture = i_id;
                    }
                    if (settings.lastfm_tag_update && lfm_tags !== undefined) {
                        var track = playlist[id];
                        var changes = false;
                        var changes_vk = false;
                        if (lfm_tags.artist !== undefined && tags.artist !== lfm_tags.artist) {
                            tags.artist = lfm_tags.artist;
                            changes = true;
                            changes_vk = true;
                        }
                        if (lfm_tags.album !== undefined && tags.album !== lfm_tags.album) {
                            tags.album = lfm_tags.album;
                            changes = true;
                        }
                        if (lfm_tags.title !== undefined && tags.title !== lfm_tags.title) {
                            tags.title = lfm_tags.title;
                            changes = true;
                            changes_vk = true;
                        }
                        if (changes_vk && settings.vk_tag_update && track.type === 'vk' && track.from_lib === true) {
                            cloud.vk.update_tags(track.owner_id, track.track_id, tags.artist, tags.title);
                        }
                        if (changes) {
                            tags_loaded(tags, id, 4);
                        } else
                        if (i_id !== undefined) {
                            tags_loaded(tags, id, 3);
                        }
                    } else {
                        tags_loaded(tags, id, 3);
                    }
                });
            });
        };
        return {
            getTagBody: getTagBody,
            open: function(id) {
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
            },
            get_filename: function() {
                return playlist[current_id].file.name;
            },
            playToggle: function() {
                if (audio.paused) {
                    player.play();
                } else {
                    player.pause();
                }
            },
            play: function() {
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
            },
            pause: function() {
                if (current_id === undefined || playlist[current_id] === undefined) {
                    return;
                }
                if (playlist[current_id].file.url !== undefined && audio.duration === Infinity) {
                    audio.pause();
                    audio.src = "";
                } else {
                    audio.pause();
                }
            },
            stop: function() {
                if (!isNaN(audio.duration)) {
                    audio.currentTime = 0;
                }
                audio.pause();
                audio.src = "";
                current_id = undefined;
            },
            next: function() {
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
                    var pl = sorted_playlist || playlist;
                    var pl_len = playlist.length;
                    var indx = getObjArrayPos(pl, "id", current_id) + 1;
                    if (pl[indx] !== undefined) {
                        id = pl[indx].id;
                    } else
                    if (pl_len > 0) {
                        id = pl[0].id;
                    }
                    if (pl_len <= id) {
                        id = 0;
                    }
                }
                player.open(id);
            },
            preview: function() {
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
                    var pl = sorted_playlist || playlist;
                    var indx = getObjArrayPos(pl, "id", current_id) - 1;
                    if (pl[indx] !== undefined) {
                        id = pl[indx].id;
                    } else {
                        id = -1;
                    }
                    if (id < 0) {
                        id = playlist.length - 1;
                    }
                }
                player.open(id);
            },
            status: function() {
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
            },
            volume: function(persent) {
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
            },
            position: function(persent) {
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
            },
            mute: function() {
                audio.muted = !audio.muted;
            },
            getMute: function() {
                return audio.muted;
            },
            getCurrent: function() {
                _send('playlist', function(window) {
                    window.playlist.selected(current_id);
                });
            },
            canPlay: function(mime) {
                if (mime[0] === '.') {
                    var ext = mime.substr(1);
                    return (allow_ext.indexOf(ext) > 0);
                }
                if (type_list[mime] !== undefined) {
                    return type_list[mime];
                }
                type_list[mime] = audio.canPlayType(mime).length;
                return type_list[mime];
            },
            init: function() {
                audio = new Audio();
                adapter.context = new window.webkitAudioContext();
                adapter.audio = audio;
                adapter.source = adapter.context.createMediaElementSource(adapter.audio);
                adapter.source.connect(adapter.context.destination);
                adapter.proc_list = {};
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
                    discAdapters();
                });
                $(audio).on('loadedmetadata', function(e) {
                    if (playlist[current_id].duration === undefined) {
                        playlist[current_id].duration = this.duration;
                    }
                    view.state("loadedmetadata");
                    _send('viz', function(window) {
                        window.viz.audio_state('loadedmetadata');
                    });
                    discAdapters();
                });
                $(audio).on('loadeddata', function(e) {
                    if (settings.next_track_notification) {
                        notification.show();
                    }
                    var tags = playlist[current_id].tags;
                    if (tags === undefined) {
                        read_tags(current_id, function(tags, id) {
                            tags_loaded(tags, id);
                            lastfm_tag_reader(id);
                        });
                    } else {
                        tags_loaded(tags, current_id, 2);
                        lastfm_tag_reader(current_id);
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
                        var pl = sorted_playlist || playlist;
                        if (loop || current_id !== pl[pl.length - 1].id) {
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
            },
            getAudio: function() {
                return audio;
            },
            readAllTags: function() {
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
                        var item = playlist[item_id];
                        if (item.tags !== undefined) {
                            thread--;
                            next_item();
                            return;
                        }
                        read_item(item);
                    }
                };
                var read_item = function(item) {
                    next_item();
                    read_tags(item.id, function(tags, id) {
                        tags_loaded(tags, id, 1);
                        thread--;
                        next_item();
                    });
                };
                next_item();
            },
            getCurrentTrack: function() {
                return playlist[current_id];
            }
        };
    }();
    var add_in_ctx_menu = function(playlist_info) {
        var context_menu = view.getContextMenu();
        if (playlist_info !== undefined && playlist_info.vk_save === true) {
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
    var init_engine = function() {
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
    };
    return {
        run: function() {
            init_engine();
            player.init();
            chrome.storage.local.get(function(obj) {
                loadSettings(obj);
            });
        },
        loadSettings: loadSettings,
        get_filename: player.get_filename,
        open: function(files, info) {
            if (files.length === 0) {
                return;
            }
            var my_playlist = [];
            for (var i = 0; i < files.length; i++) {
                if (files[i].tags !== undefined && files[i].tags.picture !== undefined) {
                    files[i].tags = undefined;
                }
                if (files[i].id !== undefined && files[i].file !== undefined && 'tags' in files[i]) {
                    files[i].id = my_playlist.length;
                    my_playlist.push(files[i]);
                    continue;
                }
                if (files[i].url !== undefined) {
                    my_playlist.push({id: my_playlist.length, file: {name: files[i].url, url: files[i].url}, tags: {}, duration: 0});
                    continue;
                }
                if (getType(files[i]) === undefined) {
                    continue;
                }
                my_playlist.push({id: my_playlist.length, file: files[i], tags: undefined, duration: undefined});
            }
            if (my_playlist.length > 0) {
                reset_player();
                playlist = my_playlist;
                playlist_info = info;
                _send('playlist', function(window) {
                    window.playlist.setPlaylist(playlist);
                    window.playlist.setPlaylistInfo(playlist_info);
                });
                view.state("playlist_not_empty");
                var id = 0;
                if (shuffle) {
                    id = getRandomInt(0, playlist.length - 1);
                }
                player.open(id);
                add_in_ctx_menu(playlist_info);
            }
        },
        play: player.play,
        playToggle: player.playToggle,
        open_id: player.open,
        pause: player.pause,
        next: player.next,
        preview: player.preview,
        position: player.position,
        volume: player.volume,
        mute: player.mute,
        getMute: player.getMute,
        getAudio: player.getAudio,
        getCurrentTrack: player.getCurrentTrack,
        getCover: function(id) {
            return covers[id];
        },
        badImage: function(id) {
            covers[id].data = null;
            covers[id].len = null;
        },
        shuffle: function(c) {
            if (c === undefined) {
                shuffle = !shuffle;
            }
            chrome.storage.local.set({'shuffle': shuffle});
            _send('playlist', function(window) {
                window.playlist.setShuffle(shuffle);
            });
            view.setShuffle(shuffle);
        },
        loop: function(c) {
            if (c === undefined) {
                loop = !loop;
            }
            chrome.storage.local.set({'loop': loop});
            _send('playlist', function(window) {
                window.playlist.setLoop(loop);
            });
            view.setLoop(loop);
        },
        getPlaylist: function() {
            return sorted_playlist || playlist;
        },
        getPlaylistInfo: function() {
            return playlist_info;
        },
        getCurrent: player.getCurrent,
        APIstatus: function() {
            return JSON.stringify(player.status());
        },
        APIplaylist: function() {
            var pl = sorted_playlist || playlist;
            var list = new Array(pl.length);
            for (var i = 0, item; item = pl[i]; i++) {
                var title;
                var tb = player.getTagBody(item.id);
                if (tb.aa === undefined) {
                    title = tb.title;
                } else {
                    title = tb.title + ' - ' + tb.aa;
                }
                list[i] = {id: item.id, title: title};
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
        },
        setM3UPlaylists: function(m3u) {
            M3UPlaylists = m3u;
            _send('playlist', function(window) {
                window.playlist.setSelectList(M3UPlaylists);
            });
        },
        getM3UPlaylists: function() {
            return M3UPlaylists;
        },
        setSortedList: function(playlist, type, hide) {
            sorted_playlist = playlist;
            sort_type = type;
            if (hide) {
                return;
            }
            _send('playlist', function(window) {
                window.playlist.setPlaylist(sorted_playlist);
            });
        },
        getSortedList: function() {
            var list = (sorted_playlist || playlist).slice();
            return [sort_type, list];
        },
        readAllTags: player.readAllTags,
        getAdapter: function(cb) {
            if (!cb) {
                return adapter;
            } else {
                cb(adapter);
            }
        },
        discAdapters: function(a) {
            discAdapters(a);
        },
        getTagBody: player.getTagBody,
        vizRandomPreset: function() {
            _send('viz', function(window) {
                window.viz.randomPreset();
            });
        },
        get_allow_ext: function() {
            return allow_ext;
        },
        canPlay: player.canPlay,
        set_hotkeys: function(_document) {
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
        },
        select_playlist: function(id) {
            var filePlaylists = engine.getM3UPlaylists();
            if (filePlaylists === undefined) {
                return;
            }
            cloud.abort();
            var list = {name: undefined};
            filePlaylists.list.forEach(function(item) {
                if (item.id === id) {
                    list = item;
                }
            });
            if (list.type === 'subfiles') {
                view.getFilesFromFolder(list.entry, function(files) {
                    engine.open(files, {name: list.name, id: id});
                });
            } else
            if (list.type === 'm3u') {
                view.entry2files(list.entrys, function(files) {
                    engine.open(files, {name: list.name, id: id});
                });
            } else
            if (cloud[list.type] !== undefined && cloud[list.type].on_select_list !== undefined) {
                cloud[list.type].on_select_list(list, function(track_list, info) {
                    engine.open(track_list, info);
                });
            } else {
                engine.open(list.tracks, {name: list.name, id: id});
            }
        },
        showMenu: function() {
            engine.window_manager({type: 'dialog', config: {type: "menu", h: 290, w: 250, r: true, list: view.getContextMenu(), webui_state: webui.active()}});
        },
        window_manager: function(options) {
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
                            discAdapters('viz');
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
        }
    };
}();
engine.run();