engine.playlist = function() {
    var var_cache = {
        collectionList: [],
        idIndex: 0,
        collection: undefined,
        // индекс трека в массиве поспроизведенных треков.
        // Позволяет перемещаться по историит воспроизведения
        track_history_index: 0,
        urlList: []
    };
    var addURL = function(url) {
        var_cache.urlList.push(url);
    };
    var removeAllURLs = function() {
        if (var_cache.urlList.length === 0) {
            return;
        }
        var_cache.urlList.forEach(function(url) {
            URL.revokeObjectURL(url);
        });
        var_cache.urlList = [];
    };
    var configureTrackList = function(collection) {
        if (collection.trackObj !== undefined) {
            return;
        }
        var trackList = collection.trackList;
        var trackObj = collection.trackObj = {};
        collection.history = [];
        collection.nextList = [];
        if (trackList === undefined || trackList.length === 0) {
            collection.trackList = [];
            collection.trackObj = {};
            console.log('Error! configureTrackList', trackList);
            return;
        }
        var id = 0;
        for (var i = 0, track; track = trackList[i]; i++) {
            track.index = i;
            while (trackObj[id] !== undefined) {
                id++;
            }
            track.id = id;
            if (track.tags === undefined) {
                if (track.fileEntry !== undefined) {
                    track.tags = {default: {title: track.fileEntry.name}};
                }
            }
            if (track.type === undefined) {
                console.log('type not found!', track);
            }
            trackObj[track.id] = track;
            id++;
        }
    };
    var getRandomInt = function (min, max) {
        /*
         * Получает случайное число [a,b]
         */
        return Math.floor(Math.random() * (max - min + 1)) + min;
    };
    var removeTrack = function( id ) {
        if (id === var_cache.collection.track_id) {
            engine.player.stop();
        }
        var index = var_cache.collection.trackObj[id].index;
        var_cache.collection.trackList.splice(index, 1);
        var idx = 0;
        var_cache.collection.trackList.forEach(function(item) {
            item.index = idx;
            idx++;
        });
        if (id === var_cache.collection.track_id) {
            if (var_cache.collection.trackList[index] === undefined) {
                var_cache.collection.track_id = 0;
            } else {
                var_cache.collection.track_id = var_cache.collection.trackList[index].id;
            }
        }
        delete var_cache.collection.trackObj[id];
        var played_index = var_cache.collection.played.indexOf(id);
        if (played_index !== -1) {
            var_cache.collection.played.splice(played_index, 1);
        }
        var history_index = var_cache.collection.history.indexOf(id);
        while (history_index !== -1) {
            var_cache.collection.history.splice(history_index, 1);
            history_index = var_cache.collection.history.indexOf(id);
        }
        if ( var_cache.collection.trackList.length === 0 ) {
            engine.playlist.removeCollection(var_cache.collection.id);
            return;
        }
        _send('playlist', function(window) {
            window.playlist.removeTrack(id, index);
        });
        engine.player.preopen(var_cache.collection.track_id);
    };
    var appendTrack = function(collection) {
        if (var_cache.collection === undefined) {
            return;
        }
        var max_id = 0;
        var_cache.collection.trackList.forEach(function(track) {
            if (max_id < track.id) {
                max_id = track.id;
            }
        });
        configureTrackList(collection);
        var _collection = var_cache.collection;
        var index = var_cache.collection.trackList.length;
        max_id++;
        collection.trackList.forEach(function(track) {
            track.index = index;
            track.id = max_id;
            var_cache.collection.trackList.push(track);
            var_cache.collection.trackObj[track.id] = track;
            index++;
            max_id++;
        });
        _send('playlist', function(window) {
            window.playlist.updatePlaylist(var_cache.collection);
        });
    };
    var getTrackList = function(collection, cb) {
        if (collection.cloud !== undefined && engine.cloud[collection.cloud.type].getTrackList !== undefined) {
            engine.cloud[collection.cloud.type].getTrackList(collection, function() {
                configureTrackList(collection);
                cb();
            });
            return;
        }
        if (collection.trackList !== undefined) {
            configureTrackList(collection);
            return cb();
        }
    };
    var onOpenTrack = function(id) {
        removeAllURLs();
        engine.playlist.memory.wait_tags = true;
        engine.notification.show( var_cache.collection.trackObj[id] );
        engine.player.open(id);
    };
    return {
        setLoop: function (value) {
            if (value === undefined) {
                value = (_settings.loop === 1)?0:1;
            }
            engine.settings.set({'loop': value});
            player.setLoop(_settings.loop);
            _send('playlist', function (window) {
                window.playlist.setLoop(_settings.loop);
            });
        },
        setShuffle: function (value) {
            var_cache.track_history_index = 0;
            if (value === undefined) {
                value = (_settings.shuffle === 1)?0:1;
            }
            engine.settings.set({'shuffle': value});
            player.setShuffle(_settings.shuffle);
            _send('playlist', function (window) {
                window.playlist.setShuffle(_settings.shuffle);
            });
        },
        nextTrack: function () {
            // следующий трек в списке воспроизведения
            var collection = var_cache.collection;
            if (collection === undefined) {
                return;
            }
            var n_track_id = undefined;
            if (collection.nextList.length > 0) {
                var track = var_cache.collection.trackObj[collection.nextList.shift().id];
                while (track === undefined && collection.nextList.length > 0) {
                    track = var_cache.collection.trackObj[collection.nextList.shift().id];
                }
                if (track !== undefined) {
                    onOpenTrack(track.id);
                    _send('playlist', function (window) {
                        window.playlist.updateNextList(collection);
                    });
                    return;
                }
            }
            if (_settings.shuffle) {
                if (var_cache.track_history_index !== 0) {
                    // идем вперед по истории
                    var_cache.track_history_index--;
                    n_track_id = collection.history[ var_cache.track_history_index ];
                } else {
                    var track_list_len = collection.trackList.length - 1;
                    // получаем случайны трек из списка, кроме воспроизведенных
                    var n = 100;
                    var n_track_index = getRandomInt(0, track_list_len);
                    n_track_id = collection.trackList[n_track_index].id;
                    if (collection.played.length === collection.trackList.length) {
                        collection.played = [];
                    }
                    while (collection.played.indexOf(n_track_id) !== -1 && n > 0) {
                        n_track_index = getRandomInt(0, track_list_len);
                        n_track_id = collection.trackList[n_track_index].id;
                        n--;
                    }
                }
            } else {
                var c_id = collection.track_id;
                var c_track_index = collection.trackObj[c_id].index;
                var n_track = collection.trackList[c_track_index + 1];
                if (n_track === undefined) {
                    // конец списка воспроизведения идем в начало
                    n_track_id = collection.trackList[0].id;
                } else {
                    n_track_id = n_track.id;
                }
            }
            onOpenTrack(n_track_id);
        },
        previousTrack: function () {
            // предыдущий трек в списке воспроизведения
            var collection = var_cache.collection;
            if (collection === undefined) {
                return;
            }
            var p_track_id = undefined;
            if (_settings.shuffle) {
                if (var_cache.track_history_index === collection.history.length - 1) {
                    // конец списка истории
                    return;
                }
                var_cache.track_history_index++;
                p_track_id = collection.history[var_cache.track_history_index];
            } else {
                var c_id = collection.track_id;
                var c_track_index = collection.trackObj[c_id].index;
                var p_track = collection.trackList[c_track_index - 1];
                if (p_track === undefined) {
                    // крутить назад уже неукуда переходим в конец списка
                    p_track_id = collection.trackList.slice(-1)[0].id;
                } else {
                    p_track_id = p_track.id;
                }
            }
            onOpenTrack(p_track_id);
        },
        trackEnd: function() {
            // автоматический переход на след. трек при завершении текущего
            var collection = var_cache.collection;
            if (collection === undefined) {
                return;
            }
            if (_settings.shuffle) {
                if ( _settings.loop) {
                    engine.playlist.nextTrack();
                } else {
                    if (collection.played.length === collection.trackList.length) {
                        // если все треки уже были проигранны
                        if (var_cache.track_history_index !== 0) {
                            // если воспроизведение из истории, продолжаем пока история не закончится
                            engine.playlist.nextTrack();
                        } else {
                            // если последний трек отиграл - нужно сбросить список воспроизведенных треков
                            console.log('trackEnd played reset!');
                            collection.played = [];
                        }
                    } else {
                        engine.playlist.nextTrack();
                    }
                }
            } else {
                var c_id = collection.track_id;
                var c_track_index = collection.trackObj[c_id].index;
                var n_track = collection.trackList[c_track_index + 1];
                if (n_track === undefined) {
                    if (_settings.loop) {
                        engine.playlist.nextTrack();
                    }
                } else {
                    engine.playlist.nextTrack();
                }
            }
        },
        appendPlaylist: function(collections, cb) {
            collections.forEach(function(collection) {
                collection.id = var_cache.idIndex;
                var_cache.collectionList.push(collection);
                var_cache.idIndex++;
            });
            _send('playlist', function(window) {
                window.playlist.updateCollectionList(var_cache.collectionList);
            });
            cb && cb();
        },
        emptyPlaylist: function(cb) {
            engine.tags.emptyCovers();
            var_cache.collectionList = [];
            var_cache.idIndex = 0;
            cb && cb();
        },
        removeCollection: function(id, cb) {
            var index = undefined;
            for (var i = 0, item; item = var_cache.collectionList[i]; i++) {
                if (id === item.id) {
                    index = i;
                    break;
                }
            }
            if (index !== undefined) {
                var_cache.collectionList.splice(index, 1);
            }
            if (var_cache.collection !== undefined && id === var_cache.collection.id) {
                var_cache.collection = undefined;
                _send('playlist', function(window) {
                    window.playlist.updatePlaylist(var_cache.collection);
                });
            }
            cb && cb();
        },
        selectPlaylist: function(id) {
            var playlist = undefined;
            for (var i = 0, item; item = var_cache.collectionList[i]; i++) {
                if (id === item.id) {
                    playlist = item;
                    break;
                }
            }
            if (playlist === undefined) {
                return;
            }
            engine.context.empty();
            getTrackList(playlist, function() {
                var_cache.collection = playlist;
                var collection = var_cache.collection;
                collection.played = [];
                var_cache.track_history_index = 0;
                _send('playlist', function(window) {
                    window.playlist.updatePlaylist(collection);
                });
                var track_id = 0;
                if (_settings.shuffle) {
                    var track_index = getRandomInt(0, playlist.trackList.length - 1);
                    track_id = collection.trackList[track_index].id;
                }
                onOpenTrack( playlist.track_id || track_id );
            });
        },
        memory: var_cache,
        addInPlayedList: function( id ) {
            var collection = var_cache.collection;
            var pos = collection.played.indexOf(id);
            if (pos >= 0) {
                collection.played.splice(pos, 1);
            }
            collection.played.push(id);
            // если воспроизвводится не из истории и треки не играю два раза подряд.
            if (var_cache.track_history_index === 0
                && id !== collection.history[0]) {
                collection.history.unshift(id);
                if (collection.history.length > 200) {
                    collection.history.splice(-1);
                }
            }
        },
        selectTrack: function( id ) {
            var_cache.track_history_index = 0;
            onOpenTrack(id);
        },
        removeTrack: removeTrack,
        appendTrack: appendTrack,
        addURL: addURL
    }
}();