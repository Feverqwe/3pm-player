engine.player = function () {
    var var_cache = {
        allow_audio_ext: ['mp3', 'ogg', 'oga', "m4a"],
        allow_video_ext: ['mp4', 'm4v', 'mkv', 'mov', 'ogv', 'ogm', 'webm', '3gp'],
        allow_mime: {},
        allow_ext: []
    };
    var_cache.allow_ext = var_cache.allow_ext.concat(var_cache.allow_audio_ext, var_cache.allow_video_ext);
    var state = {
        stoped: false,
        url: undefined,
        video: false
    };
    /** @namespace Audio **/
    var media_el = new Audio();
    var initAdapter = function () {
        var AC = window.AudioContext || window.webkitAudioContext;
        var _ad = {context: new AC(),
            audio: media_el,
            proc_list: {}
        };
        /** @namespace _ad.context.createMediaElementSource **/
        _ad.source = _ad.context.createMediaElementSource(_ad.audio);
        _ad.source.connect(_ad.context.destination);
        return _ad;
    };
    var discAdapters = function (name) {
        var disableList = [];
        if (name !== undefined && adapter.proc_list[name] !== undefined) {
            /**
             * @namespace adapter.proc_list.disconnect(0
             */
            adapter.proc_list[name].disconnect();
            disableList.push(name);
        }
        $.each(adapter.proc_list, function (key, proc) {
            if (proc._window.window === null) {
                proc.disconnect();
                disableList.push(key);
            }
        });
        disableList.forEach(function (name) {
            delete adapter.proc_list[name];
        });
    };
    var adapter = initAdapter();
    var onTrackMetaLoaded = function () {
        // получение тэгов
        var id = engine.playlist.memory.collection.track_id;
        if (id === undefined) {
            return;
        }
        var track = engine.playlist.memory.collection.trackObj[id];
        engine.tags.getTags(track, 0, function() {
            engine.tags.readTrackTags(track);
            if (track.cloud !== undefined && engine.cloud[track.cloud.type].onTagReady !== undefined) {
                engine.cloud[track.cloud.type].onTagReady(track);
            }
            if (engine.playlist.memory.wait_tags) {
                var tags = engine.tags.readTags(track);
                var duration = media_el.duration;
                engine.lastfm.nowPlaying(tags, duration);
                engine.notification.updateInfo(track);
            }
        });
    };
    var bind_media_el = function () {
        var $mediaEl = $(media_el);
        $mediaEl.off().on('loadstart', function (e) {
            if (_debug) {
                if (state.stoped) {
                    console.log('stoped (loadstart)');
                } else {
                    console.log('loadstart');
                }
            }
            if (state.stoped) {
                return;
            }
            var id = engine.playlist.memory.collection.track_id;
            var track = engine.playlist.memory.collection.trackObj[id];
            engine.tags.readTrackTags(track);
            player.on.onLoadStart(e);
        }).on('error', function (e) {
            if (_debug) {
                if (state.stoped) {
                    console.log('stoped (error)');
                } else {
                    console.log('error');
                }
            }
            if (state.stoped) {
                return;
            }
            player.on.onError(e);
        }).on('emptied', function (e) {
            if (_debug) {
                console.log('emptied');
            }
            player.on.onEmptied(e);
        }).on('play', function (e) {
            if (_debug) {
                console.log('play');
            }
            player.on.onPlay(e);
        }).on('pause', function (e) {
            if (_debug) {
                console.log('pause');
            }
            player.on.onPause(e);
        }).on('loadedmetadata', function (e) {
            if (_debug) {
                console.log('loadedmetadata');
            }
            onTrackMetaLoaded();
            player.on.onLoadedMetaData(e);
        }).on('loadeddata', function (e) {
            if (_debug) {
                console.log('loadeddata');
            }
            player.on.onLoadedData(e);
        }).on('waiting', function (e) {
            if (_debug) {
                console.log('waiting');
            }
            player.on.onWaiting(e);
        }).on('playing', function (e) {
            if (_debug) {
                console.log('playing');
            }
            player.on.onPlaying(e);
        }).on('canplay', function (e) {
            if (_debug) {
                console.log('canplay');
            }
            player.on.onCanPlay(e);
        }).on('timeupdate', function (e) {
            if (_debug) {
                console.log('timeupdate');
            }
            player.on.onTimeUpdate(e);
        }).on('ended', function (e) {
            if (_debug) {
                console.log('ended');
            }
            engine.playlist.trackEnd();
            player.on.onEnded(e);
        }).on('volumechange', function (e) {
            if (_debug) {
                console.log('volumechange');
            }
            player.on.onVolumeChange(e);
        }).on('ratechange', function (e) {
            if (_debug) {
                console.log('ratechange');
            }
            player.on.onRateChange(e);
        }).on('durationchange', function (e) {
            if (_debug) {
                console.log('durationchange');
            }
            player.on.onDurationChange(e);
        }).on('canplaythrough', function (e) {
            if (_debug) {
                console.log('canplaythrough');
            }
            player.on.onCanPlayThrough(e);
        }).on('seeking', function (e) {
            if (_debug) {
                console.log('seeking');
            }
            player.on.onSeeking(e);
        }).on('seeked', function (e) {
            if (_debug) {
                console.log('seeked');
            }
            player.on.onSeeked(e);
        }).on('progress', function (e) {
            if (_debug) {
                console.log('progress');
            }
            player.on.onProgress(e);
        }).on('suspend', function (e) {
            if (_debug) {
                console.log('suspend');
            }
            player.on.onSuspend(e);
        }).on('abort', function (e) {
            if (_debug) {
                console.log('abort');
            }
            player.on.onAbort(e);
        }).on('stalled', function (e) {
            if (_debug) {
                console.log('stalled');
            }
            player.on.onStalled(e);
        });
    };
    bind_media_el();
    var getTrackURL = function(track, cb) {
        if (track.cloud !== undefined && engine.cloud[track.cloud.type].getTrackURL !== undefined) {
            engine.cloud[track.cloud.type].getTrackURL(track, function() {
                cb(track.url);
            });
            return;
        }
        if (track.url !== undefined) {
            return cb(track.url);
        }
        if (track.fileEntry !== undefined) {
            track.fileEntry.file(function(file) {
                return cb(window.URL.createObjectURL(file));
            });
        }
    };
    var switchMediaEl = function( new_media_el, cb ) {
        engine.player.stop();
        var mute_state = media_el.muted;
        var volume_state = media_el.volume;
        $(media_el).off();
        media_el = new_media_el;
        media_el.volume = volume_state;
        media_el.muted = mute_state;
        bind_media_el();
        cb();
    };
    var setPlayerMode = function(isVideo, cb) {
        if (isVideo && state.video === true) {
            return cb();
        }
        if (isVideo) {
            state.video = true;
            engine.wm.createWindow({type: 'video', config: {cb: function(video) {
                switchMediaEl(video, cb);
            }}});
            return;
        }
        state.video = false;
        switchMediaEl( adapter.audio, function () {
            var vw = chrome.app.window.get('video');
            vw !== null && vw.close();
            cb();
        });
    };
    return {
        allow_audio_ext: var_cache.allow_audio_ext,
        allow_video_ext: var_cache.allow_video_ext,
        allow_ext: var_cache.allow_ext,
        preopen: function(id) {
            // создает эффект что трек открыт но не воспроизведен
            var track = engine.playlist.memory.collection.trackObj[id];
            engine.tags.readTrackTags(track);
            _send('playlist', function(window) {
                window.playlist.selectTrack(track.id);
            });
        },
        open: function (id) {
            var track = engine.playlist.memory.collection.trackObj[id];
            if (track === undefined) {
                console.log('Error track is', track, id);
                return;
            }
            engine.playlist.memory.collection.track_id = id;
            _send('playlist', function(window) {
                window.playlist.selectTrack(track.id);
            });
            setPlayerMode(track.isVideo, function() {
                getTrackURL(track, function(url) {
                    state.stoped = false;
                    state.url = undefined;
                    media_el.src = url;
                    if (track.cloud !== undefined && engine.cloud[track.cloud.type].onOpen !== undefined) {
                        engine.cloud[track.cloud.type].onOpen(track);
                    }
                    engine.playlist.addInPlayedList( track.id );
                });
            });
        },
        playToggle: function () {
            if (media_el.paused || state.stoped) {
                engine.player.play();
            } else {
                engine.player.pause();
            }
        },
        play: function () {
            if (engine.playlist.memory.collection === undefined) {
                if (_debug) {
                    console.log('Playlist is empty');
                }
                return;
            }
            if (state.stoped) {
                engine.player.open( engine.playlist.memory.collection.track_id );
            } else {
                media_el.play();
            }
        },
        pause: function () {
            media_el.pause();
            if ( media_el.duration === Infinity || media_el.currentTime === 0 || media_el.currentTime === media_el.duration ) {
                // если не определена продолжительность или позиция трека в нуле - убиваем url, что бы не кэшировался.
                state.stoped = true;
                state.url = undefined;
                media_el.src = "";
            }
        },
        stop: function () {
            if (!isNaN(media_el.duration)) {
                media_el.currentTime = 0;
            }
            state.stoped = true;
            state.url = undefined;
            media_el.src = "";
        },
        volume: function (value) {
            if (value === undefined) {
                return media_el.volume;
            }
            if (typeof (value) === "string") {
                if (value.substr(0, 1) === "+") {
                    value = media_el.volume * 100 + parseInt(value.substr(1));
                } else {
                    value = media_el.volume * 100 - parseInt(value.substr(1));
                }
                if (isNaN(value)) {
                    return;
                }
            }
            if (value > 0 && media_el.muted) {
                media_el.muted = false;
            }
            if (value < 0) {
                value = 0;
            }
            if (value > 100) {
                value = 100;
            }
            media_el.volume = value / 100;
            chrome.storage.local.set({'volume': value});
        },
        mute: function (state) {
            if (state === undefined) {
                state = !media_el.muted;
            }
            media_el.muted = state;
        },
        position: function (persent) {
            if (isNaN(media_el.duration)) {
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
                var new_val = media_el.currentTime + persent;
                if (new_val > media_el.duration) {
                    new_val = media_el.duration;
                } else if (new_val < 0) {
                    new_val = 0;
                }
                media_el.currentTime = new_val;
                return;
            }
            media_el.currentTime = media_el.duration / 100 * persent;
        },
        canPlay: function (mime) {
            if (mime[0] === '.') {
                var ext = mime.substr(1);
                return var_cache.allow_ext.indexOf(ext) !== -1;
            }
            if (var_cache.allow_mime[mime] !== undefined) {
                return var_cache.allow_mime[mime];
            }
            var_cache.allow_mime[mime] = media_el.canPlayType(mime).length > 0;
            return var_cache.allow_mime[mime];
        },
        isVideo: function  (mime) {
            if (mime[0] === '.') {
                var ext = mime.substr(1);
                return var_cache.allow_video_ext.indexOf(ext) !== -1;
            }
            var isVideo = false;
            if (mime.substr(0, 5) === 'video') {
                isVideo = true;
            }
            return isVideo;
        },
        getMedia: function () {
            return media_el;
        },
        discAdapters: discAdapters,
        getAdapter: function () {
            return adapter;
        },
        closeVideo: function () {
            if (state.video === false) {
                return;
            }
            engine.player.stop();
            state.video = undefined;
        }
    };
}();