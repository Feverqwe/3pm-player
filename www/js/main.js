var view = function() {
    var dom_cache = {};
    var var_cache = {};
    var getStatus = function() {
        if ('status_timer' in var_cache === false) {
            var_cache['status_timer'] = null;
        }
        clearTimeout(var_cache.status_timer);
        var_cache.status_timer = setTimeout(function() {
            $.get('/status', function(data) {
                read_status(data);
            });
        }, 50);
    };
    var decode_name = function(data) {
        return decodeURIComponent(window.atob(data));
    }
    var getPlaylist = function(cb) {
        $.get('/playlist', function(data) {
            data = JSON.parse(decode_name(data));
            read_status(data);
            if (cb) {
                cb();
            }
        });
    };
    var read_status = function(data) {
        var pl_get = false;
        if (data.paused) {
            dom_cache.btnPlayPause.removeClass('pause').addClass('play');
        } else {
            dom_cache.btnPlayPause.removeClass('play').addClass('pause');
        }
        if (data.playlist !== undefined) {
            //если получен список треков в плейлисте
            var_cache.playlist_count = data.playlist_count;
            var items = data.playlist;
            dom_cache.playlist.empty();
            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                dom_cache.playlist.append($('<a>', {href: '#', 'class': 'list-group-item', 'data-id': item.id, text: item.title}));
            }
        }
        if (data.playlists !== undefined) {
            //если получен список плейлистов
            var item_count = dom_cache.playlists.children('option').length;
            if (data.playlists.length === 0) {
                //если список плейлистов пуст, то очищаем и скрываем его
                dom_cache.playlists.empty();
                dom_cache.playlists.parent().hide();
            } else {
                dom_cache.playlists.parent().show();
                var new_selected_id = dom_cache.playlists.children('option[value='+data.playlist_info.id+']');
                if (data.playlists.length !== item_count || (data.playlist_info.id !== undefined && new_selected_id.length !== 1)) {
                    //если кол-во элементов не совпало - переписываем список
                    dom_cache.playlists.empty();
                    data.playlists.forEach(function(item) {
                        dom_cache.playlists.append($('<option>', {text: item.name, value: item.id, selected: (data.playlist_info.id === item.id)}));
                    });
                } else if (new_selected_id.prop('selected') === false) {
                    dom_cache.playlists.children('option:selected').prop('selected', false);
                    new_selected_id.prop('selected', true);
                }
            }
        } else
        if (data.playlist_info !== undefined) {
            if (data.playlist_info.id === undefined) {
                dom_cache.playlists.children('option:selected').prop('selected', false);
            } else {
                var selected_pl = parseInt(dom_cache.playlists.children('option:selected').val());
                if ( selected_pl !== data.playlist_info.id && !pl_get) {
                    getPlaylist();
                    pl_get = true;
                }
            }
        }
        if (data.title !== undefined) {
            dom_cache.title.text(decode_name(data.title));
        }
        if (data.shuffle !== undefined) {
            if (data.shuffle) {
                dom_cache.btnShuffle.addClass('on');
            } else {
                dom_cache.btnShuffle.removeClass('on');
            }
        }
        if (data.loop !== undefined) {
            if (data.loop) {
                dom_cache.btnLoop.addClass('on');
            } else {
                dom_cache.btnLoop.removeClass('on');
            }
        }
        if (data.current_id !== undefined) {
            $('a.active').removeClass('active');
            $('a[data-id=' + data.current_id + ']').addClass('active');
        }
        if (data.playlist_count !== undefined) {
            if (var_cache.playlist_count === undefined) {
                var_cache.playlist_count = data.playlist_count;
            } else
            if (data.playlist_count !== var_cache.playlist_count) {
                if (!pl_get) {
                    getPlaylist();
                }
                var_cache.playlist_count = data.playlist_count;
            }
        }
//console.log(data);
    };
    return {
        show: function() {
            dom_cache = {
                btnPlayPause: $('.playpause.btn'),
                btnPrev: $('.prev.btn'),
                btnPrev_down: $('.prev_10'),
                btnNext: $('.next.btn'),
                btnPrev_next: $('.next_10'),
                playlist: $('.playlist'),
                title: $('.title'),
                btnVolume_up: $('.volume.up'),
                btnVolume_down: $('.volume.down'),
                btnShuffle: $('.shuffle.btn'),
                btnLoop: $('.loop.btn'),
                playlists: $('select.pl_select'),
                readTags: $('.read_tags.btn')
            };
            dom_cache.playlists.on('change', function() {
                var id = this.value;
                $.get('/set_playlist/' + id, function(data) {
                    data = JSON.parse(decode_name(data));
                    read_status(data);
                });
            });
            dom_cache.title.on('click', function(e) {
                e.preventDefault();
                getStatus();
            });
            dom_cache.playlist.on('click', 'a', function(e) {
                e.preventDefault();
                var id = $(this).attr('data-id');
                $.get('/pl/' + id, function(data) {
                    data.paused = false;
                    read_status(data);
                });
            });
            dom_cache.readTags.on('click', function(e) {
                e.preventDefault();
                $.get('/readTags', function(data) {
                    read_status(data);
                });
            });
            dom_cache.btnPlayPause.on('click', function(e) {
                e.preventDefault();
                $.get('/playToggle', function(data) {
                    read_status(data);
                });
            });
            dom_cache.btnPrev.on('click', function(e) {
                e.preventDefault();
                $.get('/preview', function(data) {
                    read_status(data);
                });
            });
            dom_cache.btnPrev_down.on('click', function(e) {
                e.preventDefault();
                $.get('/prew_down/-10', function(data) {
                    read_status(data);
                });
            });
            dom_cache.btnNext.on('click', function(e) {
                e.preventDefault();
                $.get('/next', function(data) {
                    read_status(data);
                });
            });
            dom_cache.btnPrev_next.on('click', function(e) {
                e.preventDefault();
                $.get('/next_up/+10', function(data) {
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
            getPlaylist(function() {
                getStatus();
            });
            window.onfocus = function() {
                getStatus();
            };
            window.ononline = function() {
                getStatus();
            };
            window.onpageshow = function() {
                getStatus();
            };
        }
    };
}();
$(function() {
    view.show();
});