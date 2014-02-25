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
            $(media_el).off();
            $(media_el).on('loadstart', function () {
                var tb = engine.tags.getTagBody(e_player.current_id);
                view.setTags(tb);
                view.state("loadstart");
                _send('viz', function (window) {
                    window.viz.audio_state('track', tb);
                });
                _send('video', function (window) {
                    window.video.audio_state('track', tb);
                });
            });
            $(media_el).on('progress', function () {
                if (_debug) {
                    view.state("progress");
                }
            });
            $(media_el).on('suspend', function () {
                if (_debug) {
                    view.state("suspend");
                }
            });
            $(media_el).on('abort', function () {
                if (_debug) {
                    view.state("abort");
                }
            });
            $(media_el).on('error', function () {
                view.state("error");
            });
            $(media_el).on('emptied', function () {
                view.state("emptied");
            });
            $(media_el).on('stalled', function () {
                if (_debug) {
                    view.state("stalled");
                }
            });
            $(media_el).on('play', function () {
                view.state("play");
            });
            $(media_el).on('pause', function () {
                view.state("pause");
                discAdapters();
            });
            $(media_el).on('loadedmetadata', function () {
                if (engine.playlist.playlist[e_player.current_id].duration === undefined) {
                    engine.playlist.playlist[e_player.current_id].duration = this.duration;
                }
                if (_debug) {
                    view.state("loadedmetadata");
                }
                _send('viz', function (window) {
                    window.viz.audio_state('loadedmetadata');
                });
                discAdapters();
            });
            $(media_el).on('loadeddata', function () {
                if (settings.next_track_notification) {
                    engine.notification.show();
                }
                var track = engine.playlist.playlist[e_player.current_id];
                if (track.tags === undefined || track.tags.reader_state !== true) {
                    engine.tags.tagReader(e_player.current_id, function (id) {
                        engine.tags.tagsLoaded(id);
                    });
                } else {
                    engine.tags.tagsLoaded(e_player.current_id, 2);
                    if ((settings.lastfm_info || settings.lastfm_cover) && (track.lfm === undefined || track.lfm.lastfm !== true)) {
                        engine.tags.lfmTagReader(e_player.current_id);
                    }
                }
                view.state("loadeddata");
            });
            $(media_el).on('waiting', function () {
                view.state("waiting");
            });
            $(media_el).on('playing', function () {
                engine.playlist.addPlayed(e_player.current_id);
                view.state("playing");
            });
            $(media_el).on('canplay', function () {
                view.state("canplay");
                view.setVolume(media_el.volume);
            });
            $(media_el).on('canplaythrough', function () {
                if (_debug) {
                    view.state("canplaythrough");
                }
            });
            $(media_el).on('seeking', function () {
                if (_debug) {
                    view.state("seeking");
                }
            });
            $(media_el).on('seeked', function () {
                if (_debug) {
                    view.state("seeked");
                }
            });
            $(media_el).on('timeupdate', function () {
                view.setProgress(this.duration, this.currentTime);
            });
            $(media_el).on('ended', function () {
                engine.playlist.player_ended();
                if (_debug) {
                    view.state("ended");
                }
            });
            $(media_el).on('ratechange', function () {
                if (_debug) {
                    view.state("ratechange");
                }
            });
            $(media_el).on('durationchange', function () {
                if (_debug) {
                    view.state("durationchange");
                }
            });
            $(media_el).on('volumechange', function () {
                if (_debug) {
                    view.state("volumechange");
                }
                view.setVolume(media_el.volume);
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
                var item = engine.playlist.playlist[id];
                if (item === undefined) {
                    return;
                }
                e_player.current_id = id;
                _send('playlist', function (window) {
                    window.playlist.selected(e_player.current_id);
                });
                if ('url' in item.file) {
                    if (!audioPreload(item)) {
                        setMediaUrl(item,item.file.url);
                    }
                    return;
                }
                var file_url = window.URL.createObjectURL(item.file);
                setMediaUrl(item,file_url);
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
                    var item = engine.playlist.playlist[e_player.current_id];
                    if (!audioPreload(item)) {
                        setMediaUrl(item,item.file.url);
                    }
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
            volume: function (persent) {
                var save_volume = function (pos) {
                    var width_persent = pos * 100;
                    chrome.storage.local.set({'volume': width_persent});
                };
                if (persent === undefined) {
                    view.setVolume(media_el.volume);
                    return;
                }
                if (media_el.muted) {
                    media_el.muted = false;
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
                    var new_val = media_el.volume + persent / 100;
                    if (new_val > 1) {
                        new_val = 1;
                    } else if (new_val < 0) {
                        new_val = 0;
                    }
                    media_el.volume = new_val;
                    save_volume(media_el.volume);
                    return;
                }
                var val = 1.0 / 100 * persent;
                if (media_el.volume === val) {
                    view.setVolume(media_el.volume);
                } else {
                    media_el.volume = val;
                }
                save_volume(media_el.volume);
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
            mute: function () {
                media_el.muted = !media_el.muted;
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
            getAudio: function () {
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
                media_el.volume = volume_state;
                media_el.muted = mute_state;
                init_media_el();
            },
            mode: 'audio'
        };
    }();
    return e_player;
};