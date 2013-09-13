var view = function() {
    var dom_cache = null;
    return {
        show: function() {
            dom_cache = {
                btnPlayPause: $('.playpause.btn'),
                btnPrev: $('.prev.btn'),
                btnNext: $('.next.btn'),
                playlist: $('.playlist_ul'),
                title: $('.title')
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
                        dom_cache.playlist.append('<li><a href="#" data-id="' + item.id + '">' + item.title + '</a></li>');
                    }
                    dom_cache.playlist.listview("refresh");
                }
                if ('title' in data) {
                    dom_cache.title.text(decodeURIComponent(escape(window.atob(data.title))));
                }
                if ('current_id' in data) {
                    $('a.selected').removeClass('selected');
                    $('a[data-id=' + data.current_id + ']').addClass('selected');
                }
                //console.log(data);
            };
            dom_cache.playlist.on('click', 'a', function() {
                var id = $(this).attr('data-id');
                $.get('/pl/' + id, function(data) {
                    data.paused = false;
                    read_status(data);
                });
            });
            dom_cache.btnPlayPause.on('click', function() {
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
            dom_cache.btnPrev.on('click', function() {
                $.get('/preview', function(data) {
                    read_status(data);
                });
            });
            dom_cache.btnNext.on('click', function() {
                $.get('/next', function(data) {
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