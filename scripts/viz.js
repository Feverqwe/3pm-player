var viz = function() {
    var audio = undefined;
    var dancerInited = false;
    var events = {};
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
    return {
        run: function() {
            sendPlayer(function(window) {
                if (!window.engine) {
                    return;
                }
                audio = window.engine.getAudio();
                if ("loadMusic" in reality) {
                    reality.loadMusic(audio);
                }
            });
            $(document).bind('keypress', function(e)
            {
                switch (e.keyCode) {
                    case 114:
                        reality.randomPreset();
                        break;
                }
            });
        },
        audio_state: function(key) {
            if (dancerInited === false && key === "loadedmetadata") {
                if ("loadMusic" in reality) {
                    reality.loadMusic(audio);
                }
            }
        },
        getAudio: function() {
            return audio;
        },
        getAdapter: function(cb) {
            sendPlayer(function(window) {
                cb(window.engine.getAdapter());
            });
        }
    };
}();
$(function() {
    viz.run();

    reality = (typeof reality === 'undefined' ? {} : reality);
    $.extend(true, reality, {timing: {boot: new Date().getTime()}});
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = 'viz/boot.js';
    var s = document.getElementsByTagName('script')[0];
    s.parentNode.insertBefore(script, s);
});