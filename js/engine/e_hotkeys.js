engine.setHotkeys = function (_document) {
    var progress_keydown_timer;
    $(_document).on('keydown',function (event) {
        if (event.ctrlKey || event.metaKey) {
            if (event.keyCode === 38) {
                event.preventDefault();
                engine.player.volume("+10");
            } else if (event.keyCode === 40) {
                event.preventDefault();
                engine.player.volume("-10");
            } else if (event.keyCode === 39) {
                event.preventDefault();
                clearTimeout(progress_keydown_timer);
                progress_keydown_timer = setTimeout(function () {
                    engine.player.position("+10");
                }, 25);
            } else if (event.keyCode === 37) {
                event.preventDefault();
                clearTimeout(progress_keydown_timer);
                progress_keydown_timer = setTimeout(function () {
                    engine.player.position("-10");
                }, 25);
            } else if (event.shiftKey && event.keyCode === 79) {
                engine.context.menu.openDirectory.action();
            } else if (event.altKey && event.keyCode === 79) {
                engine.wm.createWindow({type: 'playlist'});
            } else if (event.keyCode === 79) {
                engine.context.menu.openFiles.action();
            }
        } else {
            if (event.keyCode === 32 || event.keyCode === 179) {
                event.preventDefault();
                engine.player.playToggle();
            } else if (event.keyCode === 178) {
                event.preventDefault();
                engine.player.pause();
            } else if (event.keyCode === 86) {
                event.preventDefault();
                engine.player.mute();
            } else if (event.keyCode === 83) {
                event.preventDefault();
                engine.playlist.setShuffle();
            } else if (event.keyCode === 82) {
                event.preventDefault();
                engine.playlist.setLoop();
            } else if (event.keyCode === 113 || event.keyCode === 176) {
                event.preventDefault();
                engine.playlist.nextTrack();
            } else if (event.keyCode === 112 || event.keyCode === 177) {
                event.preventDefault();
                engine.playlist.previousTrack();
            } else if (event.keyCode === 78) {
                event.preventDefault();
                _send('viz', function(window) {
                    window.viz.randomPreset();
                });
            } else if (event.keyCode === 9) {
                event.preventDefault();
                engine.context.showMenu();
            }
        }
    });
};