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
    var aid = "pkjkdmdknbppnobblmffeamifdhjhhma";
    var ext_url = "chrome-extension://"+aid+"/viz/";
    reality = (typeof reality === 'undefined' ? {} : reality);
    $.extend(true, reality, {timing: {boot: new Date().getTime()}});
    var add_script = function(path) {
        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.async = true;
        script.src = ext_url + path;
        var s = document.getElementsByTagName('script')[0];
        s.parentNode.insertBefore(script, s);
    };
    var arr = ["dancer.js", "support.js", "kick.js", "adapterWebkit.js", "lib/fft.js", "plugins/dancer.fft.js", "plugins/dancer.waveform.js", "three.min.js", "boot.js"];
    arr.forEach(function(item) {
        add_script(item);
    });
    $('head').append('<base href="' + ext_url + '"/>');
    $('body').append('<a class="need_addon" target="_blank" href="https://chrome.google.com/webstore/detail/'+aid+'">Need install visualizatitoin extension!</a>')
    $.get(ext_url + 'ping', function() {
        $('.need_addon').hide();
    });
    viz.run();
});