var _debug = false;
var engine = function() {
    var setings_loaded = false;
    //options
    var settings = {
        next_track_notification: 0,
        extend_volume_scroll: 0,
        notifi_buttons: 0,
        is_winamp: 0,
        visual_type: 1,
        preload_vk: 0,
        preload_db: 0,
        preload_sc: 0,
        preload_gd: 1,
        preload_box: 1,
        preload_sd: 0
    };
    var updateSettings = function(obj) {
        $.each(settings, function(k) {
            if (obj[k] !== undefined) {
                settings[k] = obj[k];
            }
        });
        if (!setings_loaded) {
            setings_loaded = true;
            $(document).trigger('settings_loaded');
        } else {
            view.updateSettings(settings);
        }
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
    var _playlist_window = undefined;
    var _viz_window = undefined;
    var adapter = {};
    var var_cache = {};
    function sendPlaylist(callback) {
        /*
         * Функция отправки действий в плэйлист
         */
        if (_playlist_window === undefined || _playlist_window.window === null) {
            chrome.runtime.getBackgroundPage(function(bg) {
                _playlist_window = bg.wm.getPlaylist();
                if (_playlist_window !== undefined) {
                    callback(_playlist_window);
                }
            });
        } else {
            callback(_playlist_window);
        }
    }
    function sendViz(callback, fail) {
        /*
         * Функция отправки действий в плэйлист
         */
        if (_viz_window === undefined || _viz_window.window === null) {
            chrome.runtime.getBackgroundPage(function(bg) {
                _viz_window = bg.wm.getViz();
                if (_viz_window !== undefined) {
                    if (callback !== undefined) {
                        callback(_viz_window);
                    }
                } else {
                    if (fail !== undefined) {
                        fail();
                    }
                }
            });
        } else {
            if (callback !== undefined) {
                callback(_viz_window);
            }
        }
    }
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
        sendPlaylist(function(window) {
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
            cb(undefined);
        };
        img.onload = function() {
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
    var search_image = function(u8a) {
        var subarr = u8a.subarray(0, 128);
        var il = subarr.length;
        var str = new Array(il);
        for (var i = 0; i < il; i++) {
            str[i] = String.fromCharCode(subarr[i] & 0xff);
        }
        var data = str.join('');
        var index = data.indexOf('JFIF');
        var pos = 6;
        if (index === -1) {
            index = data.indexOf('PNG');
            pos = 1;
        }
        if (index !== -1) {
            return u8a.subarray(index - pos);
        } else {
            return u8a;
        }
    };
    var read_image = function(binary, cb, enable_search) {
        /*
         * binary = [Array || ArrayBuffer || String, 'image/*'];
         */
        var resize = true;
        if (binary === undefined) {
            cb(undefined);
            return;
        }
        if (binary[1].indexOf('image') === -1) {
            binary[1] = 'image/jpeg';
        }
        var blob;
        if ('buffer' in binary[0] === false) {
            binary[0] = new Uint8Array(binary[0]);
        }
        if (enable_search) {
            binary[0] = search_image(binary[0]);
        }
        var check_summ = array_chksum(binary[0]);
        var o_b_len = binary[0].length;
        var id = check_cover(o_b_len, check_summ);
        if (id !== undefined) {
            cb(id);
            return;
        }
        blob = new Blob([binary[0]], {type: binary[1]});
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
        if (name !== undefined && name in adapter.proc_list) {
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
            if (playlist[id].type !== undefined && 'read_tags' in cloud[playlist[id].type]) {
                playlist[id].state = "loading";
                sendPlaylist(function(window) {
                    window.playlist.updPlaylistItem(id, playlist[id]);
                });
                cloud[playlist[id].type].read_tags(playlist[id], function(tags) {
                    // NOTE: tags.picture = [binary, mime]
                    read_image(tags.picture, function(i_id) {
                        if (i_id === undefined) {
                            if ("picture" in tags) {
                                delete tags.picture;
                            }
                        } else {
                            tags.picture = i_id;
                        }
                        rt_cb(tags, id);
                    });
                });
                return;
            }
            var file;
            if ('blob' in playlist[id]) {
                file = playlist[id].blob;
                if ('url' in playlist[id].blob) {
                    playlist[id].blob = {url: playlist[id].blob.url};
                }
            } else {
                file = playlist[id].file;
            }
            playlist[id].state = "loading";
            sendPlaylist(function(window) {
                window.playlist.updPlaylistItem(id, playlist[id]);
            });
            /*
             if (window.time_log === undefined) {
             window.time_log = [];
             }
             var startDate = new Date().getTime();
             */
            var params = {tags: ["artist", "title", "album", "picture"], file: file};
            var f_name = new Date().getTime();
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
                if ("picture" in tags) {
                    tags.picture = [tags.picture.data, tags.picture.format];
                }
                $.each(tags, function(key) {
                    if ($.inArray(key, ["artist", "title", "album", "picture"]) === -1) {
                        delete tags[key];
                    }
                });
                read_image(tags.picture, function(i_id) {
                    if (i_id === undefined) {
                        if ("picture" in tags) {
                            delete tags.picture;
                        }
                    } else {
                        tags.picture = i_id;
                    }
                    rt_cb(tags, id);
                }, true);
            }, params);
        };
        var getTagBody = function(id) {
            if (id in playlist === false) {
                return ["3pm-player", ""];
            }
            var tags = playlist[id].tags;
            if (tags === undefined) {
                return [playlist[id].file.name, ""];
            }
            var title = "";
            var album = "";
            if ("title" in tags && tags.title.length > 0) {
                title = tags.title;
            } else {
                title = playlist[id].file.name;
            }
            if ("album" in tags && "artist" in tags && tags.album.length > 0 && tags.artist.length > 0) {
                album = tags.artist + ' - ' + tags.album;
            } else
            if ("artist" in tags && tags.artist.length > 0) {
                album = tags.artist;
            } else
            if ("album" in tags && tags.album.length > 0) {
                album = tags.album;
            }
            return [title, album];
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
                var title = player.getTagBody();
                var opt = {
                    type: 'basic',
                    iconUrl: '/images/no-cover.png',
                    title: title[0],
                    message: ''
                };
                if (title[1].length !== 0) {
                    opt.message = title[1];
                }
                if (playlist[current_id].tags !== undefined) {
                    if (playlist[current_id].tags.picture !== undefined) {
                        opt.iconUrl = engine.getCover(playlist[current_id].tags.picture).data;
                    }
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
                            bg.wm.run_player();
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
                        if ('current_track' in obj === true) {
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
                        if ('current_track' in obj === false) {
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
                if (item.blob !== undefined && 'url' in item.blob) {
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
            if ('onplay' in cloud[item.type]) {
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
        return {
            getTagBody: function(id) {
                if (id === undefined) {
                    id = current_id;
                }
                return getTagBody(id);
            },
            open: function(id) {
                id = parseInt(id);
                var item = playlist[id];
                if (item === undefined) {
                    return;
                }
                current_id = id;
                sendPlaylist(function(window) {
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
                if ('url' in playlist[current_id].file && audio.src.split(':')[0] === "chrome-extension") {
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
                if ('url' in playlist[current_id].file && audio.duration === Infinity) {
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
                    var indx = getObjArrayPos(pl, "id", current_id) + 1;
                    if (pl[indx] !== undefined) {
                        id = pl[indx].id;
                    } else {
                        id = 0;
                    }
                    if (playlist.length <= id) {
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
                if (playlist.length === 0) {
                    status['title'] = encode_name("3pm-player");
                } else {
                    var tags = playlist[current_id].tags;
                    var title = '';
                    var album = '';
                    if (tags !== undefined) {
                        var title = getTagBody(current_id);
                        var album = title[1];
                        title = title[0];
                        if (album.length > 0) {
                            status['title'] = encode_name(title + ' – ' + album);
                        } else {
                            status['title'] = encode_name(title);
                        }
                    } else {
                        status['title'] = encode_name(playlist[current_id].file.name);
                    }
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
                if (audio.muted) {
                    audio.muted = false;
                }
                audio.volume = 1.0 / 100 * persent;
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
                sendPlaylist(function(window) {
                    window.playlist.selected(current_id);
                });
            },
            canPlay: function(mime) {
                if (mime[0] === '.') {
                    var ext = mime.substr(1);
                    return (allow_ext.indexOf(ext) > 0);
                }
                if (mime in type_list) {
                    return type_list[mime];
                }
                type_list[mime] = audio.canPlayType(mime).length;
                return type_list[mime];
            },
            init: function() {
                $('.engine').append('<audio/>');
                audio = $('.engine > audio').get(0);

                adapter.context = new window.webkitAudioContext();
                adapter.audio = audio;
                adapter.source = adapter.context.createMediaElementSource(adapter.audio);
                adapter.source.connect(adapter.context.destination);
                adapter.proc_list = {};

                $(audio).on('loadstart', function(e) {
                    view.setTags(playlist[current_id].tags || {});
                    view.state("loadstart");
                    sendViz(function(window) {
                        window.viz.audio_state('track', getTagBody(current_id));
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
                    sendViz(function(window) {
                        window.viz.audio_state('loadedmetadata');
                    });
                    discAdapters();
                });
                $(audio).on('loadeddata', function(e) {
                    if (settings.next_track_notification) {
                        notification.show();
                    }
                    if (playlist[current_id].tags === undefined) {
                        read_tags(current_id, function(tags, id) {
                            var obj = {};
                            $.each(tags, function(key, value) {
                                if (key in ["title", "artist", "album", "picture"] !== -1) {
                                    obj[key] = value;
                                }
                            });
                            playlist[id].tags = obj;
                            playlist[id].state = "dune";
                            sendPlaylist(function(window) {
                                window.playlist.updPlaylistItem(id, playlist[id]);
                            });
                            view.setTags(playlist[id].tags);
                            sendViz(function(window) {
                                window.viz.audio_state('track', getTagBody(current_id));
                            });
                            if (settings.next_track_notification) {
                                notification.update();
                            }
                        });
                    } else {
                        sendViz(function(window) {
                            window.viz.audio_state('track', getTagBody(current_id));
                        });
                        view.setTags(playlist[current_id].tags);
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
                        var obj = {};
                        $.each(tags, function(key, value) {
                            if (key in ["title", "artist", "album", "picture"] !== -1) {
                                obj[key] = value;
                            }
                        });
                        playlist[id].tags = obj;
                        playlist[id].state = "dune";
                        sendPlaylist(function(window) {
                            window.playlist.updPlaylistItem(id, playlist[id]);
                        });
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
    return {
        run: function() {
            chrome.storage.local.get(function(obj) {
                updateSettings(obj);
            });
            $('.engine').remove();
            $('body').append($('<div>', {'class': 'engine'}));
            player.init();
        },
        updateSettings: updateSettings,
        get_filename: player.get_filename,
        open: function(files, info) {
            if (files.length === 0) {
                return;
            }
            var my_playlist = [];
            for (var i = 0; i < files.length; i++) {
                if ('tags' in files[i] && 'picture' in files[i].tags) {
                    files[i].tags = undefined;
                }
                if ("id" in files[i] && "file" in files[i] && "tags" in files[i]) {
                    files[i].id = my_playlist.length;
                    my_playlist.push(files[i]);
                    continue;
                }
                if ("url" in files[i]) {
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
                sendPlaylist(function(window) {
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
            sendPlaylist(function(window) {
                window.playlist.setShuffle(shuffle);
            });
            view.setShuffle(shuffle);
        },
        loop: function(c) {
            if (c === undefined) {
                loop = !loop;
            }
            chrome.storage.local.set({'loop': loop});
            sendPlaylist(function(window) {
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
            var list = [];
            for (var i = 0; i < pl.length; i++) {
                var item = pl[i];
                var title = item.file.name;
                if ('url' in item.file) {
                    title = player.getTagBody(item.id);
                    if (title[1].length === 0) {
                        title = title[0];
                    } else {
                        title = title.join(' - ');
                    }
                }
                list.push({id: item.id, title: title});
            }
            var data = window.btoa(unescape(encodeURIComponent(JSON.stringify({'playlist': list}))));
            return data;
        },
        setM3UPlaylists: function(m3u) {
            M3UPlaylists = m3u;
            sendPlaylist(function(window) {
                window.playlist.setSelectList(M3UPlaylists);
            });
        },
        getM3UPlaylists: function() {
            return M3UPlaylists;
        },
        sendPlaylist: sendPlaylist,
        setSortedList: function(playlist, type, hide) {
            sorted_playlist = playlist;
            sort_type = type;
            if (hide) {
                return;
            }
            sendPlaylist(function(window) {
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
            sendViz(function(window) {
                window.viz.randomPreset();
            });
        },
        vizClose: function() {
            sendViz(function(window) {
                window.close();
            });
        },
        vizMini: function() {
            sendViz(function(window) {
                window.viz.minimize();
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
            cloud.abort();
            var filePlaylists = engine.getM3UPlaylists();
            if (filePlaylists === undefined) {
                return;
            }
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
            if (cloud[list.type] !== undefined && 'on_select_list' in cloud[list.type]) {
                cloud[list.type].on_select_list(list, function(track_list, info) {
                    engine.open(track_list, info);
                });
            } else {
                engine.open(list.tracks, {name: list.name, id: id});
            }
        },
        getSettings: function() {
            return settings;
        },
        showMenu: function() {
            chrome.runtime.getBackgroundPage(function(bg) {
                bg.wm.showDialog({type: "menu", h: 290, w: 250, r: true, list: view.getContextMenu(), webui_state: bg.wm.ws.active()});
            });
        },
        vk: cloud.vk,
        db: cloud.db,
        sc: cloud.sc,
        gd: cloud.gd
    };
}();
$(function() {
    engine.run();
});