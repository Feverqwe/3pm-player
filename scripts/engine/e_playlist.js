var engine_playlist = function(mySettings, myEngine) {
    window.engine_playlist = undefined;
    var settings = mySettings;
    var engine = myEngine;
    var e_playlist = function () {
        var current_played_pos = -1,
            M3UPlaylists = [];
        var canFilePlay = function (file) {
            /*
             * Определяет может ли плеер проигрывать файл, возвращает true / false.
             */
            var type = file.type;
            if (type !== undefined && type.length > 0) {
                return engine.player.canPlay(type);
            } else {
                var filename = file.name;
                var ext = filename.substr(filename.lastIndexOf('.') + 1).toLowerCase();
                return engine.player.canPlay('.' + ext);
            }
        };
        var isVideoFile = function (file) {
            var filename = file.name;
            var ext = filename.substr(filename.lastIndexOf('.') + 1).toLowerCase();
            return engine.player.video_ext.indexOf(ext) !== -1;
        };
        return {
            playlist: [],
            //playlist_info - это объект. Обязательно должен иметь id едля отображения акой либо информации - в простивном случае плэйлист не имеющий id - не будет иметь инфмаци о себе.
            playlist_info: {},
            playlist_order: {},
            order_index: 0,
            playedlist: [],
            shuffle: false,
            loop: false,
            addPlayed: function (id) {
                /*
                 * Добавляет трек в список програнного.
                 * Если такой ID уже есть в списке - он удаляется.
                 * ID добавляется в конец списка.
                 */
                var ex_id = e_playlist.playedlist.indexOf(id);
                if (ex_id !== -1) {
                    e_playlist.playedlist.splice(ex_id, 1);
                }
                e_playlist.playedlist.push(id);
            },
            reset: function () {
                //массив плэйлиста
                e_playlist.playlist = [];
                //сбрасываем инфу о плейлисте
                e_playlist.playlist_info = {};
                //индекс сортировки
                e_playlist.order_index = 0;
                //порядок сортровки
                e_playlist.playlist_order = {};
                //список проигранных компазиций
                e_playlist.playedlist = [];
                //если трек уже был проигран похиция не -1;
                current_played_pos = -1;
            },
            next: function () {
                current_played_pos = -1;
                var id = engine.player.current_id + 1;
                if (e_playlist.shuffle) {
                    if (e_playlist.playedlist.length === e_playlist.playlist.length) {
                        e_playlist.playedlist = [];
                    }
                    id = engine.getRandomInt(0, e_playlist.playlist.length - 1);
                    var n = 2000;
                    while (e_playlist.playedlist.indexOf(id) !== -1 && n > 0) {
                        id = engine.getRandomInt(0, e_playlist.playlist.length - 1);
                        n--;
                    }
                } else {
                    if (e_playlist.playlist_order[e_playlist.order_index] === undefined) {
                        return;
                    }
                    var pos = e_playlist.playlist_order[e_playlist.order_index].indexOf(engine.player.current_id);
                    if (pos < 0) {
                        return;
                    }
                    if (pos === e_playlist.playlist_order[e_playlist.order_index].length - 1) {
                        id = e_playlist.playlist_order[e_playlist.order_index][0];
                    } else {
                        id = e_playlist.playlist_order[e_playlist.order_index][pos + 1];
                    }
                }
                engine.player.open(id);
            },
            preview: function () {
                var id = engine.player.current_id - 1;
                var pos = null;
                if (e_playlist.shuffle) {
                    if (current_played_pos === -1) {
                        pos = e_playlist.playedlist.indexOf(engine.player.current_id);
                    } else {
                        pos = current_played_pos;
                    }
                    if (pos <= 0) {
                        pos = e_playlist.playedlist.length;
                    }
                    current_played_pos = pos - 1;
                    id = e_playlist.playedlist[current_played_pos];
                } else {
                    if (e_playlist.playlist_order[e_playlist.order_index] === undefined) {
                        return;
                    }
                    pos = e_playlist.playlist_order[e_playlist.order_index].indexOf(engine.player.current_id);
                    if (pos < 0) {
                        return;
                    }
                    if (pos === 0) {
                        id = e_playlist.playlist_order[e_playlist.order_index].slice(-1)[0];
                    } else {
                        id = e_playlist.playlist_order[e_playlist.order_index][pos - 1];
                    }
                }
                engine.player.open(id);
            },
            getCurrentTrack: function () {
                return e_playlist.playlist[engine.player.current_id];
            },
            player_ended: function () {
                if (e_playlist.shuffle) {
                    if (e_playlist.playedlist.length !== e_playlist.playlist.length || e_playlist.loop) {
                        e_playlist.next();
                    }
                } else {
                    var pos = e_playlist.playlist_order[e_playlist.order_index].indexOf(engine.player.current_id);
                    if (e_playlist.loop || pos !== e_playlist.playlist_order[e_playlist.order_index].length - 1) {
                        e_playlist.next();
                    }
                }
            },
            setPlaylistOrder: function (new_order_index) {
                e_playlist.order_index = new_order_index;
                return e_playlist.getPlaylist();
            },
            setSortedList: function (new_playlist_order, new_order_index) {
                e_playlist.playlist_order[new_order_index] = new_playlist_order;
                e_playlist.order_index = new_order_index;
                return e_playlist.getPlaylist();
            },
            getM3UPlaylists: function () {
                return M3UPlaylists;
            },
            setM3UPlaylists: function (m3u) {
                M3UPlaylists = m3u;
                _send('playlist', function (window) {
                    window.playlist.setSelectList(M3UPlaylists);
                });
            },
            appendPlaylists: function (m3u) {
                var m3upl_len = M3UPlaylists.length;
                if (m3upl_len === 0) {
                    e_playlist.setM3UPlaylists(m3u);
                    return;
                }
                var id = -1;
                M3UPlaylists.forEach(function (item) {
                    if (id < item.id) {
                        id = item.id;
                    }
                });
                id++;
                var append_list = [];
                m3u.forEach(function(item) {
                    item.id = id;
                    id++;
                    append_list.push(item)
                });
                M3UPlaylists = M3UPlaylists.concat(append_list);
                _send('playlist', function (window) {
                    window.playlist.setSelectList(M3UPlaylists);
                });
            },
            APIplaylist: function () {
                var playlist_ordered = e_playlist.playlist_order[e_playlist.order_index];
                var playlist_order_len = 0;
                if (playlist_ordered !== undefined) {
                    playlist_order_len = playlist_ordered.length;
                }
                var list = new Array(playlist_order_len);
                for (var i = 0; i < playlist_order_len; i++) {
                    var track = e_playlist.playlist[playlist_ordered[i]];
                    var tb = engine.tags.getTagBody(track.id);
                    var title = tb.title;
                    if (tb.aa !== undefined) {
                        title += ' - ' + tb.aa;
                    }
                    list[i] = {id: track.id, title: title};
                }
                var pls = [];
                M3UPlaylists.forEach(function (item) {
                    pls.push({name: item.name, id: item.id});
                });
                var rez = engine.player.status();
                rez.playlist = list;
                rez.playlists = pls;
                return window.btoa(encodeURIComponent(JSON.stringify(rez)));
            },
            getPlaylist: function () {
                return {order_index: e_playlist.order_index, playlist_ordered: e_playlist.playlist_order[e_playlist.order_index], playlist: e_playlist.playlist, info: e_playlist.playlist_info};
            },
            setLoop: function (c) {
                if (c === undefined) {
                    e_playlist.loop = !e_playlist.loop;
                }
                chrome.storage.local.set({'loop': e_playlist.loop});
                _send('playlist', function (window) {
                    window.playlist.setLoop(e_playlist.loop);
                });
                view.setLoop(e_playlist.loop);
            },
            setShuffle: function (c) {
                if (c === undefined) {
                    e_playlist.shuffle = !e_playlist.shuffle;
                }
                chrome.storage.local.set({'shuffle': e_playlist.shuffle});
                _send('playlist', function (window) {
                    window.playlist.setShuffle(e_playlist.shuffle);
                });
                view.setShuffle(e_playlist.shuffle);
            },
            readTrackList: function (files) {
                var my_playlist = [];
                var my_playlist_order = {0: []};
                for (var i = 0; i < files.length; i++) {
                    var id = my_playlist.length;
                    if (files[i].tags !== undefined && files[i].tags.picture !== undefined) {
                        /*
                         * Возможны конфиликты, если в облаке
                         *  не переписываетс список треков при выборе
                         *  или нету read_tags который получает тэги не из track.tags
                         */
                        delete files[i].lfm;
                        files[i].tags = undefined;
                    }
                    if (files[i].id !== undefined && files[i].file !== undefined) {
                        files[i].id = id;
                        my_playlist_order[0].push(id);
                        my_playlist.push(files[i]);
                        continue;
                    }
                    if (files[i].url !== undefined) {
                        my_playlist_order[0].push(id);
                        var item_name = (files[i].name === undefined)?files[i].url:files[i].name;
                        my_playlist.push({id: id, file: {name: item_name, url: files[i].url}, tags: {}, duration: 0});
                        continue;
                    }
                    if (canFilePlay(files[i]) === false) {
                        continue;
                    }
                    if (isVideoFile(files[i])) {
                        files[i].isVideo = true;
                    }
                    my_playlist_order[0].push(id);
                    my_playlist.push({id: id, file: files[i], tags: undefined, duration: undefined});
                }
                return [my_playlist, my_playlist_order];
            },
            append: function (files) {
                if (files.length === 0) {
                    return;
                }
                if (e_playlist.playlist.length === 0) {
                    engine.open(files);
                    return;
                }
                var tracks = e_playlist.readTrackList(files)[0];
                if (tracks.length === 0) {
                    return;
                }
                var id = e_playlist.playlist.slice(-1)[0].id;
                for (var i = 0, track; track = tracks[i]; i++) {
                    id++;
                    track.id = id;
                    e_playlist.playlist.push(track);
                    $.each(e_playlist.playlist_order, function (key, value) {
                        value.push(id);
                    });
                }
                _send('playlist', function (window) {
                    window.playlist.setPlaylist(e_playlist.getPlaylist());
                });
            },
            selectPlaylist : function (id) {
                if (M3UPlaylists.length === 0) {
                    return;
                }
                var album;
                M3UPlaylists.forEach(function (item) {
                    if (item.id === id) {
                        album = item;
                    }
                });
                if (album === undefined) {
                    return;
                }
                engine.cloud.abort();
                if (album.type === 'subfiles') {
                    engine.files.getFilesFromFolder(album.entry, function (files) {
                        engine.open(files, {name: album.name, id: id});
                    });
                } else if (album.type === 'm3u') {
                    engine.files.entry2files(album.entrys, function (files) {
                        engine.open(files, {name: album.name, id: id});
                    });
                } else if (album.cloud !== undefined && engine.cloud[album.cloud.type] !== undefined && engine.cloud[album.cloud.type].on_select_list !== undefined) {
                    engine.cloud[album.cloud.type].on_select_list(album, function (track_list, info) {
                        engine.open(track_list, info);
                    });
                } else {
                    engine.open(album.tracks, {name: album.name, id: id});
                }
            },
            rmPlaylist: function (id) {
                var item_num = -1;
                M3UPlaylists.forEach(function (item, n) {
                    if (item.id === id) {
                        item_num = n;
                    }
                });
                M3UPlaylists.splice(item_num, 1);
            }
        }
    }();
    return e_playlist;
};