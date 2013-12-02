var _debug = false;
var engine = function() {
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
        var ex_id = null;
        for (var i = 0; i < playedlist.length; i++) {
            if (playedlist[i] === id) {
                ex_id = i;
                break;
            }
        }
        if (ex_id !== null) {
            playedlist.splice(ex_id, 1);
        }
        playedlist.push(id);
    };
    var image_resize = function(binary, cb) {
        /*
         * Изменяет размер обложки.
         */
        var resize_enable = true;
        if (binary === undefined) {
            cb(undefined);
            return;
        }
        binary = "data:" + binary[1] + ";base64," + btoa(binary[0]);
        if (!resize_enable) {
            var id = add_cover(binary.length, binary);
            cb(id);
            return;
        }
        var img = new Image();
        img.onerror = function() {
            cb(undefined);
        };
        img.onload = function() {
            var MAXWidthHeight = 79 * 2;
            var r = MAXWidthHeight / Math.max(this.width, this.height),
                    w = Math.round(this.width * r),
                    h = Math.round(this.height * r),
                    c = document.createElement("canvas");
            c.width = w;
            c.height = h;
            c.getContext("2d").drawImage(this, 0, 0, w, h);
            binary = c.toDataURL();
            var id = add_cover(binary.length, binary);
            cb(id);
        };
        img.src = binary;
    };
    var add_cover = function(len, bin) {
        /*
         * Добавляет обложку в массив обложек.
         * Проверяет на наличие уже существующей в списке, уберает дубли.
         */
        for (var i = 0; i < covers.length; i++) {
            var item = covers[i];
            if (item.len === len && item.data === bin) {
                return item.id;
            }
        }
        var id = covers.length;
        covers.push({id: id, len: len, data: bin});
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
        var types = [
            'audio/mpeg', //0
            'audio/mp4', //1
            'audio/ogg', //2
            'audio/webm', //3
            'audio/wav', //4
            'audio/x-flv', //5
            'audio/rtmp', //6
            'video/ogg', //7
            'video/3gpp'//8
        ];
        var filename = file.name;
        var ext = filename.split('.').slice(-1)[0].toLowerCase();
        type = undefined;
        if (ext === "mp3") {
            type = types[0];
        } else
        if (ext === "m4a" || ext === "m4v" || ext === "mp4") {
            type = types[1];
        } else
        if (ext === "ogg" || ext === "oga" || ext === "spx") {
            type = types[2];
        } else
        if (ext === "webm" || ext === "webma") {
            type = types[3];
        } else
        if (ext === "wav") {
            type = types[4];
        } else
        if (ext === "fla") {
            type = types[5];
        } else
        if (ext === "rtmpa") {
            type = types[6];
        } else
        if (ext === "ogv") {
            type = types[7];
        } else
        if (ext === "3gp") {
            type = types[8];
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
    var player = function() {
        var type_list = {};
        var audio = null;
        var current_id = undefined;
        var read_tags = function(id, rt_cb) {
            var file = playlist[id].file;
            playlist[id].state = "loading";
            sendPlaylist(function(window) {
                window.playlist.updPlaylistItem(id, playlist[id]);
            });
            /*
             var startDate = new Date().getTime();
             */
            ID3.loadTags(file.name, function() {
                /*
                 var endDate = new Date().getTime();
                 console.log("Time: " + ((endDate - startDate) / 1000) + "s");
                 */
                var tags = ID3.getAllTags(file.name);
                ID3.clearAll();
                if ("picture" in tags) {
                    tags.picture = [tags.picture.data, tags.picture.format];
                }
                $.each(tags, function(key) {
                    if ($.inArray(key, ["artist", "title", "album", "picture"]) === -1) {
                        delete tags[key];
                    }
                });
                image_resize(tags.picture, function(i_id) {
                    if (i_id === undefined) {
                        if ("picture" in tags) {
                            delete tags.picture;
                        }
                    } else {
                        tags.picture = i_id;
                    }
                    rt_cb(tags, id);
                });
            }, {tags: ["artist", "title", "album", "picture"], dataReader: FileAPIReader(file), file: file});
        };
        var cache_track = function(item, cb) {
            var reader = new FileReader();
            reader.onload = function(event) {
                var ab = event.target.result;
                var file_blob = new Blob([ab], {type: item.file.type});
                file_blob.name = item.file.name;
                var url = window.URL.createObjectURL(file_blob);
                playlist[item.id].blob = file_blob;
                cb(url, item.id);
            };
            reader.readAsArrayBuffer(item.file);
        };
        return {
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
                var current_type = $(audio).attr('type');
                if ('url' in item.file) {
                    if (current_type !== undefined) {
                        $(audio).removeAttr('type');
                    }
                    audio.src = item.file.url;
                } else {
                    var type = getType(item.file);
                    if (current_type !== type) {
                        if (type === undefined) {
                            $(audio).removeAttr('type');
                        } else {
                            $(audio).attr('type', type);
                        }
                    }
                    /*
                     cache_track(item, function(url, id) {
                     if (current_id === id) {
                     audio.src = url; // window.URL.createObjectURL(item.file);
                     } else {
                     delete item.blob;
                     }
                     });*/
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
                    audio.src = playlist[current_id].file.url;
                } else {
                    audio.play();
                }
            },
            pause: function() {
                if (current_id === undefined || playlist[current_id] === undefined) {
                    return;
                }
                if ('url' in playlist[current_id].file) {
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
                    while ($.inArray(id, playedlist) !== -1 && n > 0) {
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
                        pos = $.inArray(current_id, playedlist);
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
                        if ("title" in tags && tags.title.length > 0) {
                            title = tags.title;
                        } else {
                            title = playlist[current_id].file.name;
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
                if (mime in type_list) {
                    return type_list[mime];
                }
                type_list[mime] = audio.canPlayType(mime).length;
                return type_list[mime];
            },
            init: function() {
                $('.engine').append('<audio/>');
                audio = $('.engine > audio').get(0);
                $(audio).on('loadstart', function(e) {
                    view.setTags(playlist[current_id].tags || {});
                    view.state("loadstart");
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
                });
                $(audio).on('loadedmetadata', function(e) {
                    if (playlist[current_id].duration === undefined) {
                        playlist[current_id].duration = this.duration;
                    }
                    view.state("loadedmetadata");
                });
                $(audio).on('loadeddata', function(e) {
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
                        });
                    } else {
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
                //var startDate = new Date().getTime();
                var thread = 0;
                var item_id = 0;
                var item_len = playlist.length;
                var next_item = function() {
                    if (thread < 4) {
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
            }
        };
    }();
    return {
        run: function() {
            $('.engine').remove();
            $('body').append('<div class="engine"/>');
            player.init();
        },
        get_filename: player.get_filename,
        open: function(files, info) {
            if (files.length === 0) {
                return;
            }
            var my_playlist = [];
            for (var i = 0; i < files.length; i++) {
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
        },
        loop: function(c) {
            if (c === undefined) {
                loop = !loop;
            }
            chrome.storage.local.set({'loop': loop});
            sendPlaylist(function(window) {
                window.playlist.setLoop(loop);
            });
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
                list.push({id: item.id, title: item.file.name});
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
        readAllTags: player.readAllTags
    };
}();
$(function() {
    engine.run();
});