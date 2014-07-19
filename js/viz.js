var viz = function() {
    var var_cache = {
        dancerInited: false
    };
    var dom_cache = {};
    return {
        boot: function() {
            dom_cache.body = $(document.body);
            dom_cache.body.append(
                dom_cache.btnFullScreen = $('<div>', {'class': 'inFullscreen t_btn', title: chrome.i18n.getMessage("btnFullScreen") }).on('click', function (e) {
                    e.preventDefault();
                    if (document.webkitIsFullScreen) {
                        document.webkitCancelFullScreen();
                    } else {
                        document.documentElement.webkitRequestFullScreen(document.body.ALLOW_KEYBOARD_INPUT);
                    }
                }),
                $('<div>', {'class': 'mini t_btn', title: chrome.i18n.getMessage("btnMinimize") }).on('click', function (e) {
                    e.preventDefault();
                    chrome.app.window.current().minimize();
                }),
                $('<div>', {'class': 'close t_btn', title: chrome.i18n.getMessage("btnClose") }).on('click', function (e) {
                    e.preventDefault();
                    window.close();
                }),
                dom_cache.track = $('<div>', {'class': 'track'})
            );
            var_cache.is_winamp = _settings.is_winamp;
            chrome.power.requestKeepAwake('display');
            $(document).on('keydown', function(event) {
                if (event.ctrlKey || event.metaKey) {
                    return;
                }
                if (event.keyCode === 122) {
                    dom_cache.btnFullScreen.trigger('click');
                }
            });
            _send('player', function(window) {
                if (window.engine.playlist.memory.collection === undefined) {
                    return;
                }
                var track_id = window.engine.playlist.memory.collection.track_id;
                if (track_id === undefined) {
                    return;
                }
                var track = window.engine.playlist.memory.collection.trackObj[track_id];
                var tags = window.engine.tags.readTags(track);
                viz.setTags(tags);
            });
        },
        setTags: function(tags) {
            document.title = tags.title_artist_album;
            dom_cache.track.empty().append($('<span>', {text: tags.title}), $('<br>'), $('<span>', {text: tags.artist_album || ''}));
        },
        getAudio: function() {
            return _config.adapter.audio;
        },
        getAdapter: function() {
            return _config.adapter;
        },
        dancerInit: function(val) {
            var_cache.dancerInited = val;
        },
        randomPreset: function() {
            if (reality.randomPreset === undefined) {
                return;
            }
            reality.randomPreset();
        },
        waitThree: function(url) {
            if (window.THREE === undefined) {
                setTimeout(function() {
                    viz.waitThree(url);
                }, 250);
            } else {
                $(document.head).append($('<script>', {src: url}));
            }
        }
    }
}();
$(function() {
    viz.boot();
    if (window.reality === undefined) {
        window.reality = {};
    }
    $.extend(true, reality, {timing: {boot: Date.now()}});
    var aid = "pkjkdmdknbppnobblmffeamifdhjhhma";
    var ext_url = "chrome-extension://" + aid + "/viz/";
    $(document.head).append($('<base>', {href: ext_url}));
    $.ajax({
        url: ext_url + 'ping',
        success: function() {
            var arr = ["storage.js", "three.min.js"];
            arr.forEach(function(item) {
                $('head').append($('<script>', {src: ext_url + item}));
            });
            viz.waitThree(ext_url + "boot.js");
        },
        error: function() {
            var msg = chrome.i18n.getMessage("no_viz");
            $('body').append($('<a>', {'class': 'need_addon', target: '_blank', href: 'https://chrome.google.com/webstore/detail/' + aid, text: msg}));
        }
    });
});