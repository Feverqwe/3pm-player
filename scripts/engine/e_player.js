chrome.runtime.sendMessage('script_ready');
var engine_player = function(mySettings, myEngine) {
    window.engine_player = undefined;
    var settings = mySettings;
    var engine = myEngine;
    var e_player = function () {
        var type_list = {};
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
        var adapter = initAdapter();
        var audioPreload = function (track) {
            if (track.cloud === undefined) {
                return false;
            }
            var track_type = track.cloud.type;
            if (parseInt(settings['preload_' + track_type]) === 1) {
                /*
                 * preload return only BLOB!
                 */
                if (track.blob !== undefined && track.blob.url !== undefined) {
                    engine.cloud.abort();
                    /** @namespace audio.src **/
                    setMediaUrl(track, track.blob.url);
                    return true;
                }
                view.state("preloading");
                engine.cloud[track_type].preload({
                    view: view,
                    track: track
                }, function (blob) {
                    view.state("preloading_dune");
                    if (blob === undefined) {
                        console.log('No url');
                        /** @namespace audio.trigger **/
                        media_el.trigger('error');
                        return;
                    }
                    track.blob = blob;
                    track.blob.url = URL.createObjectURL(blob);
                    setMediaUrl(track, track.blob.url);
                });
                return true;
            } else if (engine.cloud[track_type].onplay !== undefined) {
                /*
                 * onplay return only URL!
                 */
                view.state("preloading");
                engine.cloud[track_type].onplay(track, view, function (url) {
                    view.state("preloading_dune");
                    if (url.length === 0) {
                        console.log('No url');
                        return;
                    }
                    setMediaUrl(track, url);
                });
                return true;
            }
            return false;
        };
        var init_media_el = function () {
            var $mediaEl = $(media_el);
            $mediaEl.off();
            $mediaEl.on('loadstart', function (e) {
                // TODO: Fix me!
                if (_debug) {
                    console.log('loadstart');
                }
                var tb = engine.tags.getTagBody(e_player.current_id);
                view.setTags(tb);
                _send('viz', function (window) {
                    window.viz.audio_state('track', tb);
                });
                _send('video', function (window) {
                    window.video.audio_state('track', tb);
                });
                view.onLoadStart(e);
            });
            $mediaEl.on('error', function (e) {
                if (_debug) {
                    console.log('error');
                }
                view.onError(e);
            });
            $mediaEl.on('emptied', function (e) {
                if (_debug) {
                    console.log('emptied');
                }
                view.onEmptied(e);
            });
            $mediaEl.on('play', function (e) {
                if (_debug) {
                    console.log('play');
                }
                view.onPlay(e);
            });
            $mediaEl.on('pause', function (e) {
                if (_debug) {
                    console.log('pause');
                }
                view.onPause(e);
                discAdapters();
            });
            $mediaEl.on('loadedmetadata', function (e) {
                if (_debug) {
                    console.log('loadedmetadata');
                }
                // TODO: Fix me!
                var track = engine.playlist.playlist[e_player.current_id];
                if (track.duration === undefined) {
                    track.duration = this.duration;
                }
                _send('viz', function (window) {
                    window.viz.audio_state('loadedmetadata');
                });
                discAdapters();
                view.onLoadedMetaData(e);
            });
            $mediaEl.on('loadeddata', function (e) {
                if (_debug) {
                    console.log('loadeddata');
                }
                // TODO: Fix me!
                if (settings.next_track_notification) {
                    engine.notification.show();
                }
                var track = engine.playlist.playlist[e_player.current_id];
                if (track.tags === undefined || track.tags.reader_state !== true) {
                    engine.tags.tagReader(track, function (id) {
                        engine.tags.tagsLoaded(track);
                    });
                } else {
                    engine.tags.tagsLoaded(track, 2);
                    if ((settings.lastfm_info || settings.lastfm_cover) && (track.lfm === undefined || track.lfm.lastfm !== true)) {
                        engine.tags.lfmTagReader(track);
                    }
                }
                view.onLoadedData(e);
            });
            $mediaEl.on('waiting', function (e) {
                if (_debug) {
                    console.log('waiting');
                }
                view.onWaiting(e);
            });
            $mediaEl.on('playing', function (e) {
                if (_debug) {
                    console.log('playing');
                }
                view.onPlaying(e);
                // TODO: Fix me!
                engine.playlist.addPlayed(e_player.current_id);
            });
            $mediaEl.on('canplay', function (e) {
                if (_debug) {
                    console.log('canplay');
                }
                // нафига тут был view.setVolume(media_el.volume);
                view.onCanPlay(e);
            });
            $mediaEl.on('timeupdate', function (e) {
                if (_debug) {
                    console.log('timeupdate');
                }
                view.onTimeUpdate(e);
            });
            $mediaEl.on('ended', function (e) {
                if (_debug) {
                    console.log('ended');
                }
                view.onEnded(e);
                engine.playlist.player_ended();
            });
            $mediaEl.on('volumechange', function (e) {
                if (_debug) {
                    console.log('volumechange');
                }
                view.onVolumeChange(e);
            });
            $mediaEl.on('ratechange', function (e) {
                if (_debug) {
                    console.log('ratechange');
                }
                view.onRateChange(e);
            });
            $mediaEl.on('durationchange', function (e) {
                if (_debug) {
                    console.log('durationchange');
                }
                view.onDurationChange(e);
            });
            $mediaEl.on('canplaythrough', function (e) {
                if (_debug) {
                    console.log('canplaythrough');
                }
                view.onCanPlayThrough(e);
            });
            $mediaEl.on('seeking', function (e) {
                if (_debug) {
                    console.log('seeking');
                }
                view.onSeeking(e);
            });
            $mediaEl.on('seeked', function (e) {
                if (_debug) {
                    console.log('seeked');
                }
                view.onSeeked(e);
            });
            $mediaEl.on('progress', function (e) {
                if (_debug) {
                    console.log('progress');
                }
                view.onProgress(e);
            });
            $mediaEl.on('suspend', function (e) {
                if (_debug) {
                    console.log('suspend');
                }
                view.onSuspend(e);
            });
            $mediaEl.on('abort', function (e) {
                if (_debug) {
                    console.log('abort');
                }
                view.onAbort(e);
            });
            $mediaEl.on('stalled', function (e) {
                if (_debug) {
                    console.log('stalled');
                }
                view.onStalled(e);
            });
        };
        init_media_el();
        var discAdapters = function (name) {
            var rmlist = [];
            if (name !== undefined && adapter.proc_list[name] !== undefined) {
                /**
                 * @namespace adapter.proc_list.disconnect(0
                 */
                adapter.proc_list[name].disconnect();
                rmlist.push(name);
            }
            $.each(adapter.proc_list, function (key, proc) {
                if (proc._window.window === null) {
                    proc.disconnect();
                    rmlist.push(key);
                }
            });
            rmlist.forEach(function (name) {
                delete adapter.proc_list[name];
            });
        };
        var setMediaUrl = function (track, url) {
            if (track.file.isVideo) {
                if (_windows.video === undefined || _windows.video.contentWindow.window === null) {
                    engine.windowManager({type: 'video', config: {src: url}});
                    return;
                } else
                if (e_player.mode === 'audio') {
                    _send('video', function(window) {
                        e_player.switchMedia(window.video.getVideo());
                    });
                }
            }
            if (e_player.mode === 'video' && track.file.isVideo !== true) {
                e_player.switchMedia();
            }
            media_el.src = url;
        };
        return {
            allow_ext: ['mp3', 'm4a', 'm4v', 'mp4', 'mkv', 'avi', 'mov', 'ogg', 'ogm', 'ogv', 'oga', 'webm', 'wav', '3gp'],
            video_ext: ['mp4', 'm4v', 'mkv', 'avi', 'mov', 'ogv', 'ogm', 'webm'],
            current_id: undefined,
            discAdapters: discAdapters,
            getAdapter: function (cb) {
                if (cb !== undefined) {
                    cb(adapter);
                }
                return adapter;
            },
            open: function (id) {
                id = parseInt(id);
                var track = engine.playlist.playlist[id];
                if (track === undefined) {
                    return;
                }
                e_player.current_id = id;
                _send('playlist', function (window) {
                    window.playlist.selected(e_player.current_id);
                });
                if ('url' in track.file) {
                    if (!audioPreload(track)) {
                        setMediaUrl(track,track.file.url);
                    }
                    return;
                }
                var file_url = window.URL.createObjectURL(track.file);
                setMediaUrl(track,file_url);
            },
            playToggle: function () {
                if (media_el.paused) {
                    e_player.play();
                } else {
                    e_player.pause();
                }
            },
            play: function () {
                if (e_player.current_id === undefined || engine.playlist.playlist[e_player.current_id] === undefined) {
                    return;
                }
                if (engine.playlist.playedlist.length === engine.playlist.playlist.length) {
                    engine.playlist.playedlist = [];
                }
                if (engine.playlist.playlist[e_player.current_id].file.url !== undefined && media_el.src.split(':')[0] === "chrome-extension") {
                    var track = engine.playlist.playlist[e_player.current_id];
                    if (!audioPreload(track)) {
                        setMediaUrl(track,track.file.url);
                    }
                } else
                if (media_el.currentSrc === '') {
                    e_player.open( e_player.current_id );
                } else {
                    media_el.play();
                }
            },
            pause: function () {
                media_el.pause();
                if (e_player.current_id === undefined || engine.playlist.playlist[e_player.current_id] === undefined) {
                    return;
                }
                if (engine.playlist.playlist[e_player.current_id].file.url !== undefined && (media_el.duration === Infinity || media_el.currentTime === 0)) {
                    media_el.src = "";
                }
            },
            stop: function () {
                if (!isNaN(media_el.duration)) {
                    media_el.currentTime = 0;
                }
                media_el.pause();
                media_el.src = "";
                e_player.current_id = undefined;
            },
            status: function () {
                var encode_name = function (title) {
                    return window.btoa(encodeURIComponent(title));
                };
                var status = {};
                status.paused = media_el.paused;
                //status['muted'] = audio.muted;
                //status['volume'] = audio.volume;
                //status['duration'] = audio.duration;
                //status['currentTime'] = audio.currentTime;
                //status['ended'] = audio.ended;
                //status['seeking'] = audio.seeking;
                //status['seekable'] = audio.seekable;
                status.loop = engine.playlist.loop;
                status.shuffle = engine.playlist.shuffle;
                status.current_id = e_player.current_id;
                var pl_info = {id:engine.playlist.playlist_info.id};//name:encode_name(engine.playlist.playlist_info.name),
                status.playlist_info = pl_info;
                status.playlist_count = engine.playlist.playlist.length;
                var tb = engine.tags.getTagBody(e_player.current_id);
                if (tb.aa !== undefined) {
                    status.title = encode_name(tb.title + ' – ' + tb.aa);
                } else {
                    status.title = encode_name(tb.title);
                }
                if (_debug) {
                    console.log(status);
                }
                return status;
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
            position: function (persent) {
                if (isNaN(media_el.duration))
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
            mute: function (state) {
                if (state === undefined) {
                    state = !media_el.muted;
                }
                media_el.muted = state;
            },
            getMute: function () {
                return media_el.muted;
            },
            canPlay: function (mime) {
                if (mime[0] === '.') {
                    var ext = mime.substr(1);
                    return (e_player.allow_ext.indexOf(ext) > 0);
                }
                if (type_list[mime] !== undefined) {
                    return type_list[mime];
                }
                type_list[mime] = media_el.canPlayType(mime).length > 0;
                return type_list[mime];
            },
            getMedia: function () {
                return media_el;
            },
            switchMedia: function(type) {
                if (type !== undefined && e_player.mode === 'video') {
                    return;
                }
                if (type === undefined && e_player.mode === 'audio') {
                    return;
                }
                var mute_state = media_el.muted;
                var volume_state = media_el.volume;
                media_el.pause();
                media_el.src="";
                $(media_el).off();
                if (type !== undefined) {
                    media_el = type;
                    e_player.mode = 'video';
                } else {
                    media_el = adapter.audio;
                    e_player.mode = 'audio';
                    view.updateSettings({visual_type: settings.visual_type});
                }
                view.onSwitchMedia(media_el);
                media_el.volume = volume_state;
                media_el.muted = mute_state;
                init_media_el();
            },
            mode: 'audio'
        };
    }();
    return e_player;
};