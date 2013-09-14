var _debug = false;
var _playlist = null;
var engine = function() {
    var playlist = [];
    var covers = [];
    var playedlist = [];
    var shuffle = false;
    var loop = false;
    var current_played_pos = -1;
    function sendPlaylist(callback) {
        if (_playlist === null || _playlist.window === null) {
            chrome.runtime.getBackgroundPage(function(bg) {
                _playlist = bg.wm.getPlaylist(wm_id);
                if (_playlist !== null) {
                    callback();
                }
            });
        } else {
            callback();
        }
    }
    var reset_playlist = function() {
        playlist = [];
        covers = [];
        playedlist = [];
        current_played_pos = -1;
        sendPlaylist(function() {
            _playlist.playlist.empty();
        });
    };
    var add_played = function(id) {
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
    var add_cover = function(len, bin, type) {
        for (var i = 0; i < covers.length; i++) {
            var item = covers[i];
            if (item.len === len && item.type === type && item.data === bin) {
                return item.id;
            }
        }
        var id = covers.length;
        covers.push({id: id, len: len, data: bin, type: type});
        return id;
    };
    var getType = function(filename) {
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
        var ext = filename.split('.').slice(-1)[0].toLowerCase();
        var type = undefined;
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
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    var player = function() {
        var audio = null;
        var current_id = null;
        var read_tags = function(id, m_cb) {
            var file = playlist[id].file;
            if (file.size > 31457280) {
                return;
            }
            function loadUrl(url, callback, reader) {
                ID3.loadTags(url, function() {
                    var tags = ID3.getAllTags(url);

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
                            tags.picture = add_cover(binary.length, binary, type);
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

                    m_cb(tags, id);
                    view.setTags(tags);
                },
                        {tags: ["artist", "title", "album", "picture"], dataReader: reader});
            }
            var url = file.urn || file.name;
            var t = FileAPIReader(file);
            loadUrl(url, null, t);
        };
        return {
            open: function(id) {
                if (playlist[id] === undefined) {
                    return;
                }
                current_id = parseInt(id);
                sendPlaylist(function() {
                    _playlist.playlist.selected(current_id);
                });
                if ('url' in playlist[id].file) {
                    $(audio).removeAttr('codecs');
                    audio.src = playlist[id].file.url;
                } else {
                    $(audio).attr('codecs', getType(playlist[id].file.name));
                    audio.src = window.URL.createObjectURL(playlist[id].file);
                }
            },
            get_filename: function() {
                return playlist[current_id].file.name;
            },
            play: function() {
                if (current_id === null) {
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
                if (current_id === null) {
                    return;
                }
                if ('url' in playlist[current_id].file) {
                    audio.pause();
                    audio.src = "";
                } else {
                    audio.pause();
                }
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
                    status['title'] = encode_name(title + ' – ' + album);
                }
                if (_debug) {
                    console.log(status);
                }
                return status;
            },
            volume: function(persent) {
                if (persent === undefined) {
                    view.setVolume(audio.volume);
                    return;
                }
                if (typeof(persent) === "string") {
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
                    return;
                }
                if (audio.muted) {
                    audio.muted = false;
                }
                audio.volume = 1.0 / 100 * persent;
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
                sendPlaylist(function() {
                    _playlist.playlist.selected(current_id);
                });
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
                    if (playlist[current_id].duration === null) {
                        playlist[current_id].duration = this.duration;
                    }
                    view.state("loadedmetadata");
                });
                $(audio).on('loadeddata', function(e) {
                    if (playlist[current_id].tags === null) {
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
                            sendPlaylist(function() {
                                _playlist.playlist.updPlaylistItem(id, playlist[id]);
                            });
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
        open: function(files) {
            if (files.length === 0) {
                return;
            }
            reset_playlist();
            for (var i = 0; i < files.length; i++) {
                if (getType(files[i].name) === undefined) {
                    continue;
                }
                playlist.push({id: playlist.length, file: files[i], tags: null, duration: null});
            }
            if (playlist.length > 0) {
                sendPlaylist(function() {
                    _playlist.playlist.setPlaylist(playlist);
                });
                view.state("playlist_not_empty");
                var id = 0;
                if (shuffle) {
                    id = getRandomInt(0, playlist.length - 1);
                }
                player.open(id);
            } else {
                player.pause();
                view.state("emptied");
                view.state("playlist_is_empty");
            }
        },
        open_url: function(url) {
            if (url.length === 0) {
                return;
            }
            reset_playlist();
            playlist.push({id: playlist.length, file: {name: url, url: url}, tags: {}, duration: 0});
            sendPlaylist(function() {
                _playlist.playlist.setPlaylist(playlist);
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
        shuffle: function(c) {
            if (c === undefined) {
                shuffle = !shuffle;
            }
            sendPlaylist(function() {
                _playlist.playlist.setShuffle(shuffle);
            });
        },
        loop: function(c) {
            if (c === undefined) {
                loop = !loop;
            }
            sendPlaylist(function() {
                _playlist.playlist.setLoop(loop);
            });
        },
        getPlaylist: function() {
            return playlist;
        },
        getCurrent: player.getCurrent,
        APIstatus: function() {
            return JSON.stringify(player.status())
        },
        APIplaylist: function() {
            var list = [];
            for (var i = 0; i < playlist.length; i++) {
                var item = playlist[i];
                list.push({id: item.id, title: item.file.name});
            }
            var data = window.btoa(unescape(encodeURIComponent(JSON.stringify({'playlist': list}))))
            return data;
        }
    };
}();
$(function() {
    engine.run();
});