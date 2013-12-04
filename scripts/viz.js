var viz = function() {
    var audio = undefined;
    var var_cache = {};
    var dancerInited = false;
    var _player_window = undefined;
    function sendPlayer(callback) {
        /*
         * Функция отправки действий в плеер
         */
        if (_player_window === undefined || _player_window.window === null) {
            chrome.runtime.getBackgroundPage(function(bg) {
                _player_window = bg.wm.getPlayer();
                if (_player_window !== undefined) {
                    callback(_player_window);
                }
            });
        } else {
            callback(_player_window);
        }
    }
    var setTags = function(value) {
        var_cache.track.html(value[0] + "<br/>" + value[1]);
    };
    return {
        run: function() {
            var_cache.body = $('body');
            var_cache.body.append('<div class="track"></div>');
            var_cache.track = $('div.track');
            sendPlayer(function(window) {
                audio = window.engine.getAudio();
                setTags(window.engine.getTagBody());
            });
            $(document).keydown(function(event) {
                if ('keyCode' in event === false) {
                    return;
                }
                if (event.keyCode === 32) {
                    event.preventDefault();
                    sendPlayer(function(window) {
                        window.engine.playToggle();
                    });
                } else
                if (event.keyCode === 118 || event.keyCode === 86) {
                    event.preventDefault();
                    sendPlayer(function(window) {
                        window.engine.mute();
                    });
                } else
                if (event.keyCode === 115 || event.keyCode === 83) {
                    event.preventDefault();
                    sendPlayer(function(window) {
                        window.engine.shuffle();
                    });
                } else
                if (event.keyCode === 114 || event.keyCode === 82) {
                    event.preventDefault();
                    sendPlayer(function(window) {
                        window.engine.loop();
                    });
                } else
                if (event.keyCode === 78) {
                    event.preventDefault();
                    reality.randomPreset();
                } else
                if (event.keyCode === 113) {
                    event.preventDefault();
                    sendPlayer(function(window) {
                        window.engine.next();
                    });
                } else
                if (event.keyCode === 112) {
                    event.preventDefault();
                    sendPlayer(function(window) {
                        window.engine.preview();
                    });
                } else
                if (event.ctrlKey) {
                    if (event.keyCode === 38) {
                        event.preventDefault();
                        sendPlayer(function(window) {
                            window.engine.volume("+10");
                        });
                    } else
                    if (event.keyCode === 40) {
                        event.preventDefault();
                        sendPlayer(function(window) {
                            window.engine.volume("-10");
                        });
                    } else
                    if (event.keyCode === 39) {
                        event.preventDefault();
                        clearTimeout(var_cache.progress_keydown_timer);
                        var_cache.progress_keydown_timer = setTimeout(function() {
                            sendPlayer(function(window) {
                                window.engine.position("+10");
                            });
                        }, 25);
                    } else
                    if (event.keyCode === 37) {
                        event.preventDefault();
                        clearTimeout(var_cache.progress_keydown_timer);
                        var_cache.progress_keydown_timer = setTimeout(function() {
                            sendPlayer(function(window) {
                                window.engine.position("-10");
                            });
                        }, 25);
                    }
                }
            });
        },
        audio_state: function(key, value) {
            if (dancerInited === false && key === "loadedmetadata") {
                if ("loadMusic" in reality) {
                    reality.loadMusic(audio);
                }
                return;
            }
            if (key === "track") {
                setTags(value);
                return;
            }
        },
        getAudio: function() {
            return audio;
        },
        getAdapter: function(cb) {
            sendPlayer(function(window) {
                cb(window.engine.getAdapter());
            });
        },
        dancerInit: function(val) {
            dancerInited = val;
        }
    };
}();
$(function() {
    var aid = "pkjkdmdknbppnobblmffeamifdhjhhma";
    var ext_url = "chrome-extension://" + aid + "/viz/";
    reality = (typeof reality === 'undefined' ? {} : reality);
    $.extend(true, reality, {timing: {boot: new Date().getTime()}});
    var add_script = function(path) {
        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.async = false;
        script.src = ext_url + path;
        var s = document.getElementsByTagName('script')[0];
        s.parentNode.insertBefore(script, s);
    };
    $('head').append('<base href="' + ext_url + '"/>');
    $.ajax({
        url: ext_url + 'ping',
        success: function() {
            viz.run();
            var arr = ["dancer.js", "support.js", "kick.js", "adapterWebkit.js", "lib/fft.js", "plugins/dancer.fft.js", "plugins/dancer.waveform.js", "three.min.js", "boot.js"];
            arr.forEach(function(item) {
                add_script(item);
            });
        },
        error: function() {
            $('body').append('<a class="need_addon" target="_blank" href="https://chrome.google.com/webstore/detail/' + aid + '">Need install visualizatitoin extension!</a>');
        }
    });
});