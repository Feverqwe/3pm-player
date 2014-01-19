var engine_player = function(mySettings, myEngine) {
    delete window.engine_player;
    var settings = mySettings;
    var engine = myEngine;
    var e_player = function () {
        var type_list = {};
        /** @namespace Audio **/
        var audio = new Audio();
        var adapter = function () {
            var AC = window.AudioContext || window.webkitAudioContext;
            var _ad = {context: new AC(),
                audio: audio,
                proc_list: {}
            };
            /** @namespace _ad.context.createMediaElementSource **/
            _ad.source = _ad.context.createMediaElementSource(_ad.audio);
            _ad.source.connect(_ad.context.destination);
            return _ad;
        }();
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
                    audio.src = track.blob.url;
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
                        audio.trigger('error');
                        return;
                    }
                    track.blob = blob;
                    track.blob.url = URL.createObjectURL(blob);
                    audio.src = track.blob.url;
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
                    audio.src = url;
                });
                return true;
            }
            return false;
        };
        (function init() {
            $(audio).on('loadstart', function () {
                var tb = engine.tags.getTagBody(e_player.current_id);
                view.setTags(tb);
                view.state("loadstart");
                _send('viz', function (window) {
                    window.viz.audio_state('track', tb);
                });
            });
            $(audio).on('progress', function () {
                view.state("progress");
            });
            $(audio).on('suspend', function () {
                view.state("suspend");
            });
            $(audio).on('abort', function () {
                view.state("abort");
            });
            $(audio).on('error', function () {
                view.state("error");
            });
            $(audio).on('emptied', function () {
                view.state("emptied");
            });
            $(audio).on('stalled', function () {
                view.state("stalled");
            });
            $(audio).on('play', function () {
                view.state("play");
            });
            $(audio).on('pause', function () {
                view.state("pause");
                discAdapters();
            });
            $(audio).on('loadedmetadata', function () {
                if (engine.playlist.playlist[e_player.current_id].duration === undefined) {
                    engine.playlist.playlist[e_player.current_id].duration = this.duration;
                }
                view.state("loadedmetadata");
                _send('viz', function (window) {
                    window.viz.audio_state('loadedmetadata');
                });
                discAdapters();
            });
            $(audio).on('loadeddata', function () {
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
            $(audio).on('waiting', function () {
                view.state("waiting");
            });
            $(audio).on('playing', function () {
                engine.playlist.addPlayed(e_player.current_id);
                view.state("playing");
            });
            $(audio).on('canplay', function () {
                view.state("canplay");
                view.setVolume(audio.volume);
            });
            $(audio).on('canplaythrough', function () {
                view.state("canplaythrough");
            });
            $(audio).on('seeking', function () {
                view.state("seeking");
            });
            $(audio).on('seeked', function () {
                view.state("seeked");
            });
            $(audio).on('timeupdate', function () {
                view.setProgress(this.duration, this.currentTime);
            });
            $(audio).on('ended', function () {
                engine.playlist.player_ended();
                view.state("ended");
            });
            $(audio).on('ratechange', function () {
                view.state("ratechange");
            });
            $(audio).on('durationchange', function () {
                view.state("durationchange");
            });
            $(audio).on('volumechange', function () {
                view.state("volumechange");
                view.setVolume(audio.volume);
            });
        })();
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
        return {
            allow_ext: ['mp3', 'm4a', 'm4v', 'mp4', 'ogg', 'oga', 'spx', 'webm', 'webma', 'wav', 'fla', 'rtmpa', 'ogv', '3gp'],
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
                        audio.src = item.file.url;
                    }
                } else {
                    audio.src = window.URL.createObjectURL(item.file);
                }
            },
            playToggle: function () {
                if (audio.paused) {
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
                if (engine.playlist.playlist[e_player.current_id].file.url !== undefined && audio.src.split(':')[0] === "chrome-extension") {
                    var item = engine.playlist.playlist[e_player.current_id];
                    if (!audioPreload(item)) {
                        audio.src = item.file.url;
                    }
                } else {
                    audio.play();
                }
            },
            pause: function () {
                audio.pause();
                if (e_player.current_id === undefined || engine.playlist.playlist[e_player.current_id] === undefined) {
                    return;
                }
                if (engine.playlist.playlist[e_player.current_id].file.url !== undefined && (audio.duration === Infinity || audio.currentTime === 0)) {
                    audio.src = "";
                }
            },
            stop: function () {
                if (!isNaN(audio.duration)) {
                    audio.currentTime = 0;
                }
                audio.pause();
                audio.src = "";
                e_player.current_id = undefined;
            },
            status: function () {
                var encode_name = function (title) {
                    return window.btoa(encodeURIComponent(title));
                };
                var status = {};
                status.paused = audio.paused;
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
                    } else if (new_val < 0) {
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
            position: function (persent) {
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
                    } else if (new_val < 0) {
                        new_val = 0;
                    }
                    audio.currentTime = new_val;
                    return;
                }
                audio.currentTime = audio.duration / 100 * persent;
            },
            mute: function () {
                audio.muted = !audio.muted;
            },
            getMute: function () {
                return audio.muted;
            },
            canPlay: function (mime) {
                if (mime[0] === '.') {
                    var ext = mime.substr(1);
                    return (e_player.allow_ext.indexOf(ext) > 0);
                }
                if (type_list[mime] !== undefined) {
                    return type_list[mime];
                }
                type_list[mime] = audio.canPlayType(mime).length > 0;
                return type_list[mime];
            },
            getAudio: function () {
                return audio;
            }
        };
    }();
    return e_player;
};