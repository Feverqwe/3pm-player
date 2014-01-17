var engine_player = function() {
    var cache_can_play = {};
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
    var audioPreload = function(track) {
        if (track.cloud === undefined) {
            return false;
        }
        var track_type = track.cloud.type;
        if (parseInt(_settings['preload_' + track_type]) === 1) {
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
    var tagsLoaded = function(id, state) {
        // 1 - playlist only
        // 2 - player, lfm, viz
        // 3 - player, playlist, viz, notifi
        // other - all
        var tb;
        engine.playlist[id].state = "dune";
        var plist = function() {
            _send('playlist', function(window) {
                window.playlist.updPlaylistItem(id, engine.playlist[id]);
            });
        };
        var _player = function() {
            if (id !== engine_player.current_id) {
                return;
            }
            view.setTags(tb);
        };
        var notifi = function() {
            if (id !== engine_player.current_id) {
                return;
            }
            if (_settings.next_track_notification) {
                chrome.runtime.sendMessage({notification: 'update'});
            }
        };
        var viz = function() {
            if (id !== engine_player.current_id) {
                return;
            }
            _send('viz', function(window) {
                window.viz.audio_state('track', tb);
            });
        };
        var lfm = function() {
            if (id !== engine_player.current_id) {
                return;
            }
            if (_settings.lastfm && tb.artist !== undefined && tb.album !== undefined) {
                lastfm.updateNowPlaying(tb.artist, tb.title, tb.album, audio.duration);
            }
        };
        if (state === 1) {
            plist();
            return;
        }
        tb = engine.getTagBody(id);
        if (state === 2) {
            _player();
            lfm();
            viz();
            return;
        } else
        if (state === 3) {
            _player();
            plist();
            notifi();
            viz();
            return;
        }
        _player();
        plist();
        notifi();
        viz();
        lfm();
    };
    var lastfmTagReady = function(id, new_tags, blob, cb) {
        if (new_tags === undefined) {
            return;
        }
        var track = engine.playlist[id];
        engine.readImage(blob, function(cover_id) {
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
                if (changes_vk && _settings.vk_tag_update && track.cloud !== undefined && track.cloud.type === 'vk' && track.cloud.from_lib === true) {
                    cloud.vk.update_tags(track.cloud.owner_id, track.cloud.track_id, track.tags.artist, track.tags.title);
                }
            }
            cb(id);
        });
    };
    $(audio).on('loadstart', function(e) {
        var tb = engine.getTagBody(engine_player.current_id);
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
        engine_player.discAdapters();
    });
    $(audio).on('loadedmetadata', function(e) {
        if (engine.playlist[engine_player.current_id].duration === undefined) {
            engine.playlist[engine_player.current_id].duration = this.duration;
        }
        view.state("loadedmetadata");
        _send('viz', function(window) {
            window.viz.audio_state('loadedmetadata');
        });
        engine_player.discAdapters();
    });
    $(audio).on('loadeddata', function(e) {
        if (_settings.next_track_notification) {
            chrome.runtime.sendMessage({notification: 'show'});
        }
        var track = engine.playlist[engine_player.current_id];
        if (track.tags === undefined || track.tags.reader_state !== true) {
            engine.tagReader(engine_player.current_id, function(id) {
                tagsLoaded(id);
            });
        } else {
            tagsLoaded(engine_player.current_id, 2);
            if ((_settings.lastfm_info || _settings.lastfm_cover) && (track.lfm === undefined || track.lfm.lastfm !== true)) {
                engine_player.lfmTagReader(engine_player.current_id);
            }
        }
        view.state("loadeddata");
    });
    $(audio).on('waiting', function(e) {
        view.state("waiting");
    });
    $(audio).on('playing', function(e) {
        engine.addPlayed(engine_player.current_id);
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
        if (engine._shuffle) {
            if (engine.playedlist.length !== engine.playlist.length || engine._loop) {
                engine_player.next();
            }
        } else {
            var pos = engine.playlist_order[engine.order_index].indexOf(engine_player.current_id);
            if (engine._loop || pos !== engine.playlist_order[engine.order_index].length - 1) {
                engine_player.next();
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
    return {
        lfmTagReader: function(id) {
            var track = engine.playlist[id];
            if (track.lfm === undefined) {
                track.lfm = {};
            }
            if (!_settings.lastfm_info && !_settings.lastfm_cover || track.lfm.lastfm) {
                return;
            }
            var use_cache = engine_player.current_id !== id;
            if (use_cache) {
                if (track.lfm.lastfm_cache) {
                    return;
                } else {
                    track.lfm.lastfm_cache = true;
                }
            } else {
                track.lfm.lastfm = true;
            }
            if (track.tags === undefined
                    || track.tags.artist === undefined
                    || track.tags.title === undefined) {
                return;
            }
            var no_cover = track.tags.picture !== undefined;
            lastfm.getInfo(track.tags.artist, track.tags.title, track.tags.album, function(lfm_tags, blob) {
                if (lfm_tags === undefined) {
                    return;
                }
                lastfmTagReady(id, lfm_tags, blob, function(id) {
                    if (id === engine_player.current_id) {
                        tagsLoaded(id, 3);
                    } else {
                        tagsLoaded(id, 1);
                    }
                });
            }, use_cache, no_cover);
        },
        discAdapters: function(name) {
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
        },
        getAdapter: function(cb) {
            if (!cb) {
                return adapter;
            } else {
                cb(adapter);
            }
        },
        open: function(id) {
            id = parseInt(id);
            var item = engine.playlist[id];
            if (item === undefined) {
                return;
            }
            engine_player.current_id = id;
            _send('playlist', function(window) {
                window.playlist.selected(engine_player.current_id);
            });
            if ('url' in item.file) {
                if (!audioPreload(item)) {
                    audio.src = item.file.url;
                }
            } else {
                audio.src = window.URL.createObjectURL(item.file);
            }
        },
        getFilename: function() {
            return engine.playlist[engine_player.current_id].file.name;
        },
        playToggle: function() {
            if (audio.paused) {
                engine_player.play();
            } else {
                engine_player.pause();
            }
        },
        play: function() {
            if (engine_player.current_id === undefined || engine.playlist[engine_player.current_id] === undefined) {
                return;
            }
            if (engine.playedlist.length === engine.playlist.length) {
                engine.playedlist = [];
            }
            if (engine.playlist[engine_player.current_id].file.url !== undefined && audio.src.split(':')[0] === "chrome-extension") {
                var item = engine.playlist[engine_player.current_id];
                if (!audioPreload(item)) {
                    audio.src = item.file.url;
                }
            } else {
                audio.play();
            }
        },
        pause: function() {
            if (engine_player.current_id === undefined || engine.playlist[engine_player.current_id] === undefined) {
                return;
            }
            if (engine.playlist[engine_player.current_id].file.url !== undefined && (audio.duration === Infinity || audio.currentTime === 0)) {
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
            engine_player.current_id = undefined;
        },
        next: function() {
            engine.current_played_pos = -1;
            var id = engine_player.current_id + 1;
            if (engine._shuffle) {
                if (engine.playedlist.length === engine.playlist.length) {
                    engine.playedlist = [];
                }
                id = engine.getRandomInt(0, engine.playlist.length - 1);
                var n = 2000;
                while (engine.playedlist.indexOf(id) !== -1 && n > 0) {
                    id = engine.getRandomInt(0, engine.playlist.length - 1);
                    n--;
                }
            } else {
                if (engine.playlist_order[engine.order_index] === undefined) {
                    return;
                }
                var pos = engine.playlist_order[engine.order_index].indexOf(engine_player.current_id);
                if (pos < 0) {
                    return;
                }
                if (pos === engine.playlist_order[engine.order_index].length - 1) {
                    id = engine.playlist_order[engine.order_index][0];
                } else {
                    id = engine.playlist_order[engine.order_index][pos + 1];
                }
            }
            engine_player.open(id);
        },
        preview: function() {
            var id = engine_player.current_id - 1;
            if (engine._shuffle) {
                var pos = null;
                if (engine.current_played_pos === -1) {
                    pos = engine.playedlist.indexOf(engine_player.current_id);
                } else {
                    pos = engine.current_played_pos;
                }
                if (pos <= 0) {
                    pos = engine.playedlist.length;
                }
                engine.current_played_pos = pos - 1;
                id = engine.playedlist[engine.current_played_pos];
            } else {
                if (engine.playlist_order[engine.order_index] === undefined) {
                    return;
                }
                var pos = engine.playlist_order[engine.order_index].indexOf(engine_player.current_id);
                if (pos < 0) {
                    return;
                }
                if (pos === 0) {
                    id = engine.playlist_order[engine.order_index].slice(-1)[0];
                } else {
                    id = engine.playlist_order[engine.order_index][pos - 1];
                }
            }
            engine_player.open(id);
        },
        status: function() {
            var encode_name = function(title) {
                return window.btoa(unescape(encodeURIComponent(title)));
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
            status.loop = engine._loop;
            status.shuffle = engine._shuffle;
            status.current_id = engine_player.current_id;
            status.playlist_count = engine.playlist.length;
            var tb = engine.getTagBody(engine_player.current_id);
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
        canPlay: function(mime) {
            if (mime[0] === '.') {
                var ext = mime.substr(1);
                return (engine.allow_ext.indexOf(ext) > 0);
            }
            if (cache_can_play[mime] !== undefined) {
                return cache_can_play[mime];
            }
            cache_can_play[mime] = audio.canPlayType(mime).length > 0;
            return cache_can_play[mime];
        },
        getAudio: function() {
            return audio;
        },
        getCurrentTrack: function() {
            return engine.playlist[engine_player.current_id];
        },
        getCurrentTrackID: function() {
            return engine_player.current_id;
        },
        tagsLoaded: tagsLoaded,
        current_id: undefined
    };
}();