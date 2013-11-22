var _debug = false;
var engine = function() {
    var playlist = [];
    var playlist_name = undefined;
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
        playlist_name = undefined;
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
        if (binary === undefined) {
            cb(undefined);
            return;
        }
        binary = "data:image/" + binary[1] + ";base64," + btoa(binary[0]);
        if (false) {
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
        var type = file.type;
        if (type !== undefined) {
            if (player.canPlay(type) === 0) {
                return;
            }
            return type;
        }
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
    function getRandomInt(min, max) {
        /*
         * Получает случайное число
         */
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    var player = function() {
        var type_list = {};
        var audio = null;
        var current_id = undefined;
        var read_tags = function(id, rt_cb) {
            var file = playlist[id].file;
            if (file.size > 31457280) {
                return;
            }
            ID3.loadTags(file.name, function() {
                var tags = ID3.getAllTags(file.name);
                if ("picture" in tags) {
                    var image = tags.picture;
                    var binary = image.data.reduce(function(str, charIndex) {
                        return str += String.fromCharCode(charIndex);
                    }, '');
                    tags.picture = null;
                    var index = binary.indexOf('JFIF');
                    var type = "jpeg";
                    var pos = 6;
                    if (index === -1) {
                        index = binary.indexOf('PNG');
                        type = "png";
                        pos = 1;
                    }
                    if (index === -1) {
                        var bin = String.fromCharCode.apply(null, [255, 216, 255, 225]);
                        index = binary.indexOf(bin);
                        type = "jpeg";
                        pos = 0;
                    }
                    if (index !== -1) {
                        binary = binary.substr(index - pos);
                        tags.picture = [binary, type];
                    } else {
                        if (_debug) {
                            console.log('Can\'t show image!');
                        }
                        delete tags.picture;
                    }
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
            }, {tags: ["artist", "title", "album", "picture"], dataReader: FileAPIReader(file)});
        };
        return {
            open: function(id) {
                id = parseInt(id);
                if (isNaN(id) || playlist[id] === undefined) {
                    return;
                }
                current_id = id;
                sendPlaylist(function(window) {
                    window.playlist.selected(current_id);
                });
                var current_type = $(audio).attr('type');
                if ('url' in playlist[id].file) {
                    if (current_type !== undefined) {
                        $(audio).removeAttr('type');
                    }
                    audio.src = playlist[id].file.url;
                } else {
                    var type = getType(playlist[id].file);
                    if (current_type !== type) {
                        if (type === undefined) {
                            $(audio).removeAttr('type');
                        } else {
                            $(audio).attr('type', type);
                        }
                    }
                    audio.src = window.URL.createObjectURL(playlist[id].file);
                }
            },
            get_filename: function() {
                return playlist[current_id].file.name;
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
                    if (tags !== null) {
                        if ("title" in tags) {
                            title = tags.title;
                        } else {
                            title = playlist[current_id].file.name;
                        }
                        if ("album" in tags && "artist" in tags) {
                            album = tags.artist + ' - ' + tags.album;
                        } else
                        if ("artist" in tags) {
                            album = tags.artist;
                        } else
                        if ("album" in tags) {
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
                            if ("title" in tags) {
                                obj['title'] = tags.title;
                            }
                            if ("artist" in tags) {
                                obj['artist'] = tags.artist;
                            }
                            if ("album" in tags) {
                                obj['album'] = tags.album;
                            }
                            if ("picture" in tags) {
                                obj['picture'] = tags.picture;
                            }
                            playlist[id].tags = obj;
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
                    } else
                    if (current_id !== playlist.length - 1 || loop) {
                        player.next();
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
        open: function(files, name) {
            if (files.length === 0) {
                return;
            }
            var my_playlist = [];
            for (var i = 0; i < files.length; i++) {
                if (getType(files[i]) === undefined) {
                    continue;
                }
                my_playlist.push({id: my_playlist.length, file: files[i], tags: undefined, duration: undefined});
            }
            if (my_playlist.length > 0) {
                reset_player();
                playlist = my_playlist;
                playlist_name = name;
                sendPlaylist(function(window) {
                    window.playlist.setPlaylist(playlist);
                    window.playlist.setPlaylistName(playlist_name);
                });
                view.state("playlist_not_empty");
                var id = 0;
                if (shuffle) {
                    id = getRandomInt(0, playlist.length - 1);
                }
                player.open(id);
            }
        },
        open_url: function(url) {
            if (url.length === 0) {
                return;
            }
            reset_player();
            playlist.push({id: playlist.length, file: {name: url, url: url}, tags: {}, duration: 0});
            sendPlaylist(function(window) {
                window.playlist.setPlaylist(playlist);
                window.playlist.setPlaylistName(playlist_name);
            });
            view.state("playlist_not_empty");
            player.open(0);
        },
        play: player.play,
        open_id: player.open,
        pause: player.pause,
        next: player.next,
        preview: player.preview,
        position: player.position,
        volume: player.volume,
        mute: player.mute,
        getMute: player.getMute,
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
            return playlist;
        },
        getPlaylistName: function() {
            return playlist_name;
        },
        getCurrent: player.getCurrent,
        APIstatus: function() {
            return JSON.stringify(player.status());
        },
        APIplaylist: function() {
            var list = [];
            for (var i = 0; i < playlist.length; i++) {
                var item = playlist[i];
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
        sendPlaylist: sendPlaylist
    };
}();
$(function() {
    engine.run();
});