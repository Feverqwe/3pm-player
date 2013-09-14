var view = function() {
    var dom_cache = null;
    return {
        show: function() {
            dom_cache = {
                btnPlayPause: $('.playpause.btn'),
                btnPrev: $('.prev.btn'),
                btnNext: $('.next.btn'),
                playlist: $('.playlist'),
                title: $('.title'),
                btnVolume_up: $('.volume.up'),
                btnVolume_down: $('.volume.down'),
                btnShuffle: $('.shuffle.btn'),
                btnLoop: $('.loop.btn')
            };
            var read_status = function(data) {
                if ('paused' in data) {
                    if (data.paused) {
                        dom_cache.btnPlayPause.removeClass('pause').addClass('play');
                    } else {
                        dom_cache.btnPlayPause.removeClass('play').addClass('pause');
                    }
                }
                if ('playlist' in data) {
                    var items = data.playlist;
                    dom_cache.playlist.empty();
                    for (var i = 0; i < items.length; i++) {
                        var item = items[i];
                        dom_cache.playlist.append('<a href="#" class="list-group-item" data-id="' + item.id + '">' + item.title + '</a>');
                    }
                }
                if ('title' in data) {
                    dom_cache.title.text(decodeURIComponent(escape(window.atob(data.title))));
                }
                if ('shuffle' in data) {
                    if (data.shuffle) {
                        dom_cache.btnShuffle.addClass('on');
                    } else {
                        dom_cache.btnShuffle.removeClass('on');
                    }
                }
                if ('loop' in data) {
                    if (data.loop) {
                        dom_cache.btnLoop.addClass('on');
                    } else {
                        dom_cache.btnLoop.removeClass('on');
                    }
                }
                if ('current_id' in data) {
                    $('a.active').removeClass('active');
                    $('a[data-id=' + data.current_id + ']').addClass('active');
                }
                //console.log(data);
            };
            dom_cache.playlist.on('click', 'a', function(e) {
                e.preventDefault();
                var id = $(this).attr('data-id');
                $.get('/pl/' + id, function(data) {
                    data.paused = false;
                    read_status(data);
                });
            });
            dom_cache.btnPlayPause.on('click', function(e) {
                e.preventDefault();
                if ($(this).hasClass('pause')) {
                    $.get('/pause', function(data) {
                        read_status(data);
                    });
                } else {
                    $.get('/play', function(data) {
                        read_status(data);
                    });
                }
            });
            dom_cache.btnPrev.on('click', function(e) {
                e.preventDefault();
                $.get('/preview', function(data) {
                    read_status(data);
                });
            });
            dom_cache.btnNext.on('click', function(e) {
                e.preventDefault();
                $.get('/next', function(data) {
                    read_status(data);
                });
            });
            dom_cache.btnShuffle.on('click', function(e) {
                e.preventDefault();
                $.get('/shuffle', function(data) {
                    read_status(data);
                });
            });
            dom_cache.btnLoop.on('click', function(e) {
                e.preventDefault();
                $.get('/loop', function(data) {
                    read_status(data);
                });
            });
            dom_cache.btnVolume_up.on('click', function(e) {
                e.preventDefault();
                $.get('/volume_up/+10', function(data) {
                    read_status(data);
                });
            });
            dom_cache.btnVolume_down.on('click', function(e) {
                e.preventDefault();
                $.get('/volume_down/-10', function(data) {
                    read_status(data);
                });
            });
            $.get('/playlist', function(data) {
                data = JSON.parse(decodeURIComponent(escape(window.atob(data))));
                read_status(data);
                $.get('/status', function(data) {
                    read_status(data);
                });
            });
        }
    };
}();
$(function() {
    view.show();
});