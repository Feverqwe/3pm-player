var playlist = function() {
    /**
     * @namespace $
     */
    var dom_cache = {};
    var var_cache = {
        // массив id изображеий которые добавлены на странцу
        coverList: [],
        // dom массив списка треков
        trackList: [],
        // dom элементов плейлиста, которые добавлены на страницу, обьект по id
        trackObj: {},
        // dom элементов коллекций, который добавлены на страницу, обьект по id
        collectionList: {},
        // текущий выделенный элемент
        selectedTrackId: undefined,
        // текущй выделенная коллекция
        selectedCollectionId: undefined,
        shuffle: false,
        loop: false,
        // функция чтения тэгов из e_tags
        readTags: undefined,
        stateCollectionList: false,
        // dom элементы списка следующих треков
        nextList: [],
        nextObj: {}
    };
    var setCollectionId = function(id) {
        if (var_cache.selectedCollectionId !== id) {
            if (var_cache.selectedCollectionId !== undefined) {
                var_cache.collectionList[var_cache.selectedCollectionId].removeClass('selected');
            }
            var_cache.selectedCollectionId = id;
            if (id !== undefined) {
                var_cache.collectionList[id].addClass('selected');
            }
        }
    };
    var setTrackId = function(id) {
        if (var_cache.selectedTrackId === id) {
            return;
        }
        if (var_cache.selectedTrackId !== undefined) {
            var_cache.trackObj[var_cache.selectedTrackId].removeClass('selected');
        }
        var_cache.trackObj[id].addClass('selected');
        var_cache.selectedTrackId = id;
        scroll_to(var_cache.trackObj[id]);
    };
    var createPlaylistItem = function(track, tags) {
        var id = track.id;
        var filename = undefined;
        if (track.fileEntry !== undefined) {
            filename = track.fileEntry.name;
        }
        filename = filename || tags.title;
        if (var_cache.is_winamp) {
            return var_cache.trackObj[id] = $('<li>', {'class': 'inline'}).data('id', id).data('filename', filename).append(
                //$('<div>', {'class': 'state'}),
                $('<span>', {'class': 'title_artist_album', title: tags.title_artist_album, text: tags.title_artist_album}),
                $('<div>', {'class': 'menu'}).append(
                    $('<div>', {'class': 'remove', title: chrome.i18n.getMessage('btnRemove')}),
                    $('<div>', {'class': 'move', title: chrome.i18n.getMessage('btnMove')}),
                    $('<div>', {'class': 'inNext', title: chrome.i18n.getMessage('btnInNext')}).data('id', id)
                )
            );
        }
        return var_cache.trackObj[id] = $('<li>').data('id', id).data('filename', filename).append(
            $('<i>', {'class': 'gr_line'}),
            $('<div>', {'class': 'cover pic_'+( (tags.cover !== undefined)?tags.cover:'none' )}).attr('title', filename),
            $('<span>', {'class': 'title', title: tags.title, text: tags.title}),
            $('<span>', {'class': 'artist_album', title: tags.artist_album, text: tags.artist_album}),
            $('<div>', {'class': 'menu'}).append(
                $('<div>', {'class': 'remove', title: chrome.i18n.getMessage('btnRemove')}),
                $('<div>', {'class': 'move', title: chrome.i18n.getMessage('btnMove')}),
                $('<div>', {'class': 'inNext', title: chrome.i18n.getMessage('btnInNext')}).data('id', id)
            )
        );
    };
    var writeCoverList = function(coverList) {
        _send('player', function(window) {
            var style = '';
            coverList.forEach(function(id) {
                if ( var_cache.coverList[id] !== undefined ) {
                    return 1;
                }
                var cover = window.engine.tags.cover[id];
                style += 'div.cover.pic_'+id+'{background-image:url('+cover.url+')}';
                var_cache.coverList[id] = 1;
            });
            if (style.length > 0) {
                dom_cache.body.append(
                    $('<style>', {'class': 'covers', text: style})
                );
            }
        });
    };
    var writeCollection = function(collection) {
        if (collection === undefined) {
            document.title = chrome.i18n.getMessage('playlist');
            dom_cache.title.text(chrome.i18n.getMessage('playlist'));
            setCollectionId(undefined);
            dom_cache.trackList.empty();
            var_cache.selectedTrackId = undefined;
            return;
        }
        dom_cache.title.text(collection.title);
        setCollectionId(collection.id);
        var trackList = collection.trackList;
        var_cache.trackList = [];
        var coverList = [];
        trackList.forEach(function(track) {
            var tags = var_cache.readTags(track);
            if (tags.cover !== undefined) {
                coverList.push(tags.cover);
            }
            var_cache.trackList.push( createPlaylistItem(track, tags) );
        });
        if (!var_cache.is_winamp) {
            writeCoverList(coverList);
        }
        dom_cache.trackList.empty().append(var_cache.trackList);
        setTrackId(collection.track_id);
    };
    var writeCollectionList = function(collectionList) {
        var list = [];
        collectionList.forEach(function(collection) {
            list.push( var_cache.collectionList[collection.id] = $('<li>').data('id', collection.id).append(
                $('<div>', {'class': 'action remove', title: chrome.i18n.getMessage('btnRemove')}),
                $('<span>', {text: collection.title})
            ));
        });
        dom_cache.collectionList.empty().append(list);
    };
    var updateCollectionList = function(collectionList) {
        var_cache.collectionList = {};
        writeCollectionList(collectionList);
    };
    var updatePlaylist = function(collection) {
        var_cache.coverList = [];
        var_cache.trackObj = {};
        var_cache.selectedTrackId = undefined;
        $('style.covers').remove();
        writeCollection(collection);
        updateNextList(collection);
    };
    var updateTrack = function(track) {
        var dom = var_cache.trackObj[track.id];
        var tags = var_cache.readTags(track);
        if (var_cache.is_winamp) {
            dom.children('.title_artist_album').attr('title', tags.title_artist_album).text(tags.title_artist_album);
        } else {
            dom.children('.title').attr('title', tags.title).text(tags.title);
            dom.children('.artist_album').attr('title', tags.artist_album).text(tags.artist_album);
            var cover = (tags.cover !== undefined)?tags.cover:'none';
            dom.children('.cover').attr('class', 'cover pic_'+cover);
            if (tags.cover !== undefined) {
                writeCoverList([cover]);
            }
        }
        var n_dom = var_cache.nextObj[track.id];
        if (n_dom !== undefined) {
            n_dom.children('.title_artist_album').attr('title', tags.title_artist_album).text(tags.title_artist_album);
        }
    };
    var numberSort = function(items) {
        return items.sort(function(aa, bb) {
            var a = aa[1];
            var b = bb[1];
            var c = parseInt(a);
            var d = parseInt(b);
            if (isNaN(c) && isNaN(d)) {
                return (a === b) ? 0 : (a > b) ? 1 : -1;
            } else
            if (isNaN(c)) {
                return 1;
            } else
            if (isNaN(d)) {
                return -1;
            }
            return (c === d) ? 0 : (c > d) ? 1 : -1;
        });
    };
    var idSort = function(items) {
        return items.sort(function(aa, bb) {
            var a = aa[0];
            var b = bb[0];
            var c = parseInt(a);
            var d = parseInt(b);
            if (isNaN(c) && isNaN(d)) {
                return (a === b) ? 0 : (a > b) ? 1 : -1;
            } else
            if (isNaN(c)) {
                return 1;
            } else
            if (isNaN(d)) {
                return -1;
            }
            return (c === d) ? 0 : (c > d) ? 1 : -1;
        });
    };
    var textSort = function(items) {
        return items.sort(function(aa, bb) {
            var a = aa[1];
            var b = bb[1];
            return (a === b) ? 0 : (a > b) ? 1 : -1;
        });
    };
    var updateTrackList = function() {
        dom_cache.trackList.append(var_cache.trackList);
    };
    var sortTrackList = function(sortType) {
        _send('player', function(window) {
            var trackObj = window.engine.playlist.memory.collection.trackObj;
            // var_cache.trackList текущий порядок списка
            var list = [];
            for (var i = 0, item; item = var_cache.trackList[i]; i++) {
                var id = item.data('id');
                var fn = item.data('filename');
                list.push([id, fn]);
            }
            list = sortType(list);
            var new_trackList = [];
            var $trackList = [];
            var index = 0;
            list.forEach(function(item) {
                var id = item[0];
                trackObj[id].index = index;
                new_trackList.push( trackObj[id] );
                $trackList.push( var_cache.trackObj[id] );
                index++;
            });
            window.engine.playlist.memory.collection.trackList = new_trackList;
            var_cache.trackList = $trackList;
            updateTrackList();
        });
    };
    var playlistRender = function() {
        dom_cache.body.append(
            dom_cache.title = $('<div>', {'class': 'title', title: chrome.i18n.getMessage('playlist'), text: chrome.i18n.getMessage('playlist')}),
            $('<div>', {'class': 'collections t_btn', title: chrome.i18n.getMessage('show_collections')}).on('click', function(e) {
                e.preventDefault();
                if (var_cache.stateCollectionList) {
                    dom_cache.collectionList.hide();
                    var_cache.stateCollectionList = false;
                } else {
                    dom_cache.collectionList.show();
                    var_cache.stateCollectionList = true;
                }
            }),
            dom_cache.drop_layer = $('<div>', {'class': 'drop layer'}).append(
                $('<div>', {'class': 'append'}).append(
                    $('<span>', {'class': 'append', text: chrome.i18n.getMessage("onDropAppendText") })
                ),
                $('<div>', {'class': 'newPlaylist'}).append(
                    $('<span>', {'class': 'newPlaylist', text: chrome.i18n.getMessage("onDropNewPlaylistText") })
                )
            ),
            dom_cache.collectionList = $('<ul>', {'class': 'collectionList customScroll'}),
            dom_cache.trackList = $('<ul>', {'class': 'trackList customScroll trackListStyle'}),
            dom_cache.nextList = $('<ul>', {'class': 'nextList customScroll trackListStyle', title: ''}),
            $('<div>', {'class': 'controls'}).append(
                dom_cache.shuffle = $('<div>', {'class': 'btn shuffle'+( (var_cache.shuffle)?' on':'' ), title: chrome.i18n.getMessage("btnShuffle") }).on('click', function(e) {
                    e.preventDefault();
                    _send('player', function(window) {
                        window.engine.playlist.setShuffle();
                    });
                }),
                dom_cache.loop = $('<div>', {'class': 'btn loop'+( (var_cache.loop)?' on':'' ), title: chrome.i18n.getMessage("btnLoop") }).on('click', function(e) {
                    e.preventDefault();
                    _send('player', function(window) {
                        window.engine.playlist.setLoop();
                    });
                }),
                $('<div>', {'class': 'btn sort', title: chrome.i18n.getMessage("btnSort") }).append(
                    $('<div>', {'class': 'popup'}).append(
                        $('<div>', {'text': chrome.i18n.getMessage("sortAsNum")}).on('click', function(e) {
                            // сортировка по номеру
                            e.preventDefault();
                            sortTrackList(numberSort);
                        }),
                        $('<div>', {'text': chrome.i18n.getMessage("sortAsTxt")}).on('click', function(e) {
                            // сортировка по тексту
                            e.preventDefault();
                            sortTrackList(textSort);
                        }),
                        $('<div>', {'text': chrome.i18n.getMessage("sortByDef")}).on('click', function(e) {
                            // сортировка по id
                            e.preventDefault();
                            sortTrackList(idSort);
                        })
                    )
                ),
                $('<div>', {'class': 'btn read_tags', title: chrome.i18n.getMessage("btnReadAllTags") }).on('click', function(e) {
                    _send('player', function(window) {
                        window.engine.tags.readTrackList();
                    });
                })
            )
        );
        if (var_cache.is_winamp) {
            dom_cache.body.addClass('winamp').append(
                $('<div>', {'class': 'w_head'}),
                $('<div>', {'class': 'w_left'}),
                $('<div>', {'class': 'w_right'}),
                $('<div>', {'class': 'w_bottom'}),
                $('<div>', {'class': 'w_l_t'}),
                $('<div>', {'class': 'w_r_t'}),
                $('<div>', {'class': 'w_b_l'}),
                $('<div>', {'class': 'w_b_r'})
            );
        }
    };
    var setShuffle = function(state) {
        if (var_cache.shuffle === state) {
            return;
        }
        if (state) {
            dom_cache.shuffle.addClass('on');
        } else {
            dom_cache.shuffle.removeClass('on');
        }
        var_cache.shuffle = state;
    };
    var setLoop = function(state) {
        if (var_cache.loop === state) {
            return;
        }
        if (state) {
            dom_cache.loop.addClass('on');
        } else {
            dom_cache.loop.removeClass('on');
        }
        var_cache.loop = state;
    };
    var removeTrack = function(id, list_index) {
        if (id === var_cache.selectedTrackId) {
            var_cache.selectedTrackId = undefined;
        }
        var_cache.trackObj[id].remove();
        delete var_cache.trackObj[id];
        var_cache.trackList.splice(list_index, 1);
    };
    var scroll_to = function(el) {
        /*
         * Скролит до конкретного элемента.
         */
        if (el.offset() === undefined) {
            return;
        }
        dom_cache.trackList.scrollTop(el.offset().top + dom_cache.trackList.scrollTop() - (dom_cache.trackList.height() / 2));
    };
    var inRang = function(value, a, b) {
        return (value >= a && value <= b);
    };
    var checkPin = function() {
        var window_left = window.screenLeft;
        var window_top = window.screenTop;
        var pb = chrome.app.window.get('player').outerBounds;
        var pl_l = window_left;
        var pl_t = window_top;
        var dpr = window.devicePixelRatio;
        var pl_r = parseInt(window_left + window.innerWidth * dpr);
        var pl_b = parseInt(window_top + window.innerHeight * dpr);
        var p_b = pb.top + pb.height;
        var p_r = pb.left + pb.width;
        var p_t = pb.top;
        var p_l = pb.left;
        if (inRang(pl_r, p_l - 10, p_l) && inRang(pl_t, p_t, p_b)) {
            _settings.pined_playlist = 1;
            _settings.pin_position = 3;
        } else
        if (inRang(pl_l, p_r, p_r + 10) && inRang(pl_t, p_t, p_b)) {
            _settings.pined_playlist = 1;
            _settings.pin_position = 1;
        } else
        if (inRang(pl_r, p_l - 10, p_l) && inRang(pl_b, p_t, p_b)) {
            _settings.pined_playlist = 1;
            _settings.pin_position = 5;
        } else
        if (inRang(pl_l, p_r, p_r + 10) && inRang(pl_b, p_t, p_b)) {
            _settings.pined_playlist = 1;
            _settings.pin_position = 6;
        } else
        if (inRang(pl_b, p_t - 10, p_t) && inRang(pl_l, p_l, p_r)) {
            _settings.pined_playlist = 1;
            _settings.pin_position = 4;
        } else
        if (inRang(pl_t, p_b, p_b + 10) && inRang(pl_l, p_l, p_r)) {
            _settings.pined_playlist = 1;
            _settings.pin_position = 2;
        } else {
            _settings.pined_playlist = 0;
        }
        chrome.storage.local.set({pined_playlist: _settings.pined_playlist, pin_position: _settings.pin_position});
        if (_settings.pined_playlist) {
            _send('player', function(window) {
                window.engine.wm.setPinPosition('playlist', _settings.pin_position);
            });
        }
    };
    var createNextListItem = function(track, tags) {
        var id = track.id;
        var filename = undefined;
        if (track.fileEntry !== undefined) {
            filename = track.fileEntry.name;
        }
        filename = filename || tags.title;
        return var_cache.nextObj[id] = $('<li>', {'class': 'inline'}).data('id', id).data('filename', filename).append(
            $('<span>', {'class': 'title_artist_album', title: tags.title_artist_album, text: tags.title_artist_album}),
            $('<div>', {'class': 'sub_menu'}).append(
                $('<div>', {'class': 'sub_remove', title: chrome.i18n.getMessage('btnRemove')})
                    .on('click', function(e) {
                    e.stopPropagation();
                    e.preventDefault();
                    var $this = $(this);
                    var id = $this.parent().parent().data('id');
                    _send('player', function(window) {
                        var nextList = window.engine.playlist.memory.collection.nextList;
                        var index = undefined;
                        for (var i = 0, track; track = nextList[i]; i++) {
                            if (track.id !== id) {
                                continue;
                            }
                            index = i;
                            break;
                        }
                        if (index === undefined) {
                            return;
                        }
                        nextList.splice(index, 1);
                        updateNextList(window.engine.playlist.memory.collection);
                    });
                }),
                $('<div>', {'class': 'sub_move', title: chrome.i18n.getMessage('btnMove')})
            )
        );
    };
    var updateNextList = function(collection) {
        if (collection === undefined) {
            dom_cache.nextList.empty().addClass('hidden');
            return;
        }
        var trackList = collection.nextList;
        var_cache.nextList = [];
        trackList.forEach(function(track) {
            var tags = var_cache.readTags(track);
            var_cache.nextList.push( createNextListItem(track, tags) );
        });
        if (var_cache.nextList.length === 0) {
            dom_cache.nextList.empty().addClass('hidden');
            return;
        }
        dom_cache.nextList.empty().removeClass('hidden');
        dom_cache.nextList.append(var_cache.nextList);
        if (dom_cache.nextList.hasClass('ui-sortable')) {
            dom_cache.nextList.sortable('refresh');
        } else {
            dom_cache.nextList.sortable({
                handle: ".sub_move",
                axis: "y",
                stop: function () {
                    _send('player', function (window) {
                        var nextList = window.engine.playlist.memory.collection.nextList;
                        var trackObj = window.engine.playlist.memory.collection.trackObj;
                        var new_nextList = [];
                        var $nextList = [];
                        var arr = $.makeArray(dom_cache.nextList.children('li'));
                        arr.forEach(function (item) {
                            var $item = $(item);
                            var id = $item.data('id');
                            new_nextList.push(trackObj[id]);
                            $nextList.push($item);
                        });
                        window.engine.playlist.memory.collection.nextList = new_nextList;
                        var_cache.nextList = $nextList;
                    });
                }
            });
        }
    };
    return {
        show: function() {
            dom_cache.body = $(document.body);
            dom_cache.body.append(
                $('<div>', {'class': 'mini t_btn', title: chrome.i18n.getMessage("btnMinimize") }).on('click', function (e) {
                    e.preventDefault();
                    chrome.app.window.current().minimize();
                }),
                $('<div>', {'class': 'close t_btn', title: chrome.i18n.getMessage("btnClose") }).on('click', function (e) {
                    e.preventDefault();
                    window.close();
                })
            );
            var_cache.is_winamp = _settings.is_winamp;
            var_cache.shuffle = _settings.shuffle;
            var_cache.loop = _settings.loop;
            playlistRender();
            _send('player', function(window) {
                var_cache.readTags = window.engine.tags.readTags;
                updateCollectionList(window.engine.playlist.memory.collectionList);
                updatePlaylist(window.engine.playlist.memory.collection);
            });
            dom_cache.trackList.on('click', '> li', function(e) {
                e.preventDefault();
                var id = $(this).data('id');
                _send('player', function(window) {
                    window.engine.playlist.selectTrack(id);
                });
            });
            dom_cache.trackList.on('click', '.remove', function(e) {
                e.stopPropagation();
                var id = $(this).parent().parent().data('id');
                _send('player', function(window) {
                    window.engine.playlist.removeTrack(id);
                });
            });
            dom_cache.trackList.on('click', '.move', function(e) {
                e.stopPropagation();
            });
            dom_cache.collectionList.on('click', 'li', function(e) {
                e.preventDefault();
                var $this = $(this);
                if ($this.hasClass('selected')) {
                    return;
                }
                var id = $this.data('id');
                _send('player', function(window) {
                    window.engine.playlist.selectPlaylist(id);
                });
                dom_cache.collectionList.hide();
                var_cache.stateCollectionList = false;
            });
            dom_cache.collectionList.on('click', '.action.remove', function(e) {
                e.stopPropagation();
                var $this = $(this);
                var collection = $this.parent();
                var id = collection.data('id');
                _send('player', function(window) {
                    window.engine.playlist.removeColelction(id, function() {
                        collection.remove();
                    })
                });
            });
            dom_cache.trackList.sortable({
                handle: ".move",
                axis: "y",
                stop: function() {
                    _send('player', function(window) {
                        var trackObj = window.engine.playlist.memory.collection.trackObj;
                        var new_trackList = [];
                        var $trackList = [];
                        var arr = $.makeArray(dom_cache.trackList.children('li'));
                        var index = 0;
                        arr.forEach(function(item) {
                            var id = $(item).data('id');
                            trackObj[id].index = index;
                            new_trackList.push( trackObj[id] );
                            $trackList.push( var_cache.trackObj[id] );
                            index++;
                        });
                        window.engine.playlist.memory.collection.trackList = new_trackList;
                        var_cache.trackList = $trackList;
                    });
                }
            });
            dom_cache.trackList.on('click', '.inNext', function(e) {
                e.stopPropagation();
                if (e.target.className.indexOf('inNext') === -1) {
                    return;
                }
                var $this = $(this);
                var id = $this.parent().parent().data('id');
                _send('player', function(window) {
                    var track = window.engine.playlist.memory.collection.trackObj[id];
                    window.engine.playlist.memory.collection.nextList.push(track);
                    updateNextList(window.engine.playlist.memory.collection);
                });
            });
            dom_cache.trackList.on('mouseover', '.inNext', function(e) {
                var $this = $(this);
                var id = $this.data('id');
                if (var_cache.nextListID === id) {
                    return;
                }
                var_cache.nextListID = id;
                var width = dom_cache.trackList.width();
                dom_cache.nextList.css({left: -(width-60+14)+'px', width: (width-32)+'px'});
                $this.append(dom_cache.nextList);
            });
            dom_cache.body.on('drop', function (e) {
                /**
                 * @namespace e.originalEvent.dataTransfer
                 * @namespace e.originalEvent.dataTransfer.files
                 */
                e.preventDefault();
                var append = false;
                if (e.target.className.indexOf('append') !== -1) {
                    append = true;
                }
                if (append) {
                    dom_cache.drop_layer.children('.append').addClass('dropped');
                } else {
                    dom_cache.drop_layer.children('.newPlaylist').addClass('dropped');
                }
                var entryList = e.originalEvent.dataTransfer.items;
                _send('player', function(window) {
                    window.engine.files.readDropFiles(entryList, function(collections) {
                        if (collections === undefined) {
                            return;
                        }
                        if (append) {
                            var _collection = {trackList: []};
                            collections.forEach(function(collection) {
                                _collection.trackList = _collection.trackList.concat(collection.trackList);
                            });
                            window.engine.playlist.appendTrack(_collection);
                            return;
                        }
                        window.engine.playlist.appendPlaylist(collections, function() {
                            if (!var_cache.stateCollectionList) {
                                dom_cache.collectionList.show();
                                var_cache.stateCollectionList = true;
                            }
                        });
                    });
                });
            }).on('dragover', function (e) {
                e.preventDefault();
                dom_cache.drop_layer.css({"display": "block"});
                clearTimeout(var_cache.drop_timer);
                var_cache.drop_timer = setTimeout(function () {
                    dom_cache.drop_layer.css({"display": "none"});
                    dom_cache.drop_layer.children().removeClass('dropped');
                }, 300);
            });
            if (_settings.pineble_playlist === 1) {
                chrome.app.window.current().onBoundsChanged.addListener(function () {
                    var time = Date.now();
                    if (var_cache.pin_time > time) {
                        return;
                    }
                    var_cache.pin_time = time + 150;
                    if (document.webkitHidden) {
                        return;
                    }
                    clearTimeout(var_cache.pin_timer);
                    var_cache.pin_timer = setTimeout(function () {
                        checkPin();
                    }, 200);
                });
            }
        },
        setShuffle: setShuffle,
        setLoop: setLoop,
        updatePlaylist: updatePlaylist,
        updateCollectionList: updateCollectionList,
        updateTrack: updateTrack,
        selectTrack: setTrackId,
        removeTrack: removeTrack,
        updateNextList: updateNextList
    }
}();
$(function(){
    playlist.show();
});
