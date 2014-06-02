var dialog = function() {
    /**
     * @namespace _config
     */
    var var_cache = {
        allow_ext: []
    };
    var dom_cache = {};
    var cloud = function() {
        var isAllowFile = function (ext) {
            return var_cache.allow_ext.indexOf(ext) !== -1;
        };
        var db = function() {
            var cacheList = undefined;
            var writeFileList = function(list) {
                cacheList = list;
                dom_cache.playSelected.prop('disabled', 1);
                var $list = [];
                if (list.path.length > 1) {
                    $list.push($('<div>', {title: chrome.i18n.getMessage('fl_btnBack'), text: chrome.i18n.getMessage('fl_btnBack')}).data('index', -1));
                }
                for (var i = 0, item; item = list.contents[i]; i++) {
                    var action;
                    var name = item.path.split('/').slice(-1)[0];
                    if (item.is_dir) {
                        action = $('<div>', {'class': 'play', title: chrome.i18n.getMessage('fl_playFolder') });
                    } else {
                        var type = name.substr(name.lastIndexOf('.') + 1).toLowerCase();
                        if (isAllowFile(type) === false) {
                            continue;
                        }
                        item._type = type;
                        item._name = name;
                        action = $('<input>', {type: 'checkbox'}).data('index', i);
                    }
                    $list.push(
                        $('<div>', {title: name, text: name}).data('index', i).append(action)
                    );
                }
                dom_cache.fileList.empty().append($list);
            };
            var init = function() {
                dom_cache.fileList.on('click', 'input[type="checkbox"]', function(e) {
                    e.stopPropagation();
                });
                dom_cache.fileList.on('click', '> div', function(e) {
                    e.preventDefault();
                    var $this = $(this);
                    var index = $this.data('index');
                    var path, root;
                    if (index === -1) {
                        path = cacheList.path + '/..';
                        root = cacheList.root;
                    } else {
                        var item = cacheList.contents[index];
                        if (item.is_dir) {
                            path = item.path;
                            root = item.root;
                        } else {
                            var inp = $this.children('input');
                            inp[0].checked = !inp[0].checked;
                            inp.trigger('change');
                            return;
                        }
                    }
                    _send('player', function(window) {
                        window.engine.cloud.db.getFileList(function(list) {
                            writeFileList(list);
                        }, root, path);
                    });
                });
                dom_cache.fileList.on('change', 'input[type="checkbox"]', function(e) {
                    e.preventDefault();
                    var $this = $(this);
                    var checked = $this.prop('checked');
                    if (checked) {
                        $this.parent().addClass('selected');
                    } else {
                        $this.parent().removeClass('selected');
                    }
                    var count = dom_cache.fileList.find('input:checked').length;
                    if (count > 0) {
                        dom_cache.playSelected.prop('disabled', 0);
                    } else {
                        dom_cache.playSelected.prop('disabled', 1);
                    }
                });
                dom_cache.fileList.on('click', 'div > .play', function(e) {
                    e.stopPropagation();
                    var $this = $(this);
                    var index = $this.parent().data("index");
                    var item = cacheList.contents[index];
                    var path = item.path;
                    var root = item.root;
                    var _window = window;
                    _send('player', function(window) {
                        window.engine.cloud.db.getFileList(function(list) {
                            var pl_name = list.path.split('/').slice(-1)[0] || "Dropbox";
                            var collection = {title: pl_name, trackList: [], cloud: {type: 'db'}};
                            list.contents.forEach(function(item) {
                                var name = item.path.split('/').slice(-1)[0];
                                if (item.is_dir) {
                                    return 1;
                                }
                                var type = name.substr(name.lastIndexOf('.') + 1).toLowerCase();
                                if (isAllowFile(type) === false) {
                                    return 1;
                                }
                                collection.trackList.push({tags: {default: {title: name}}, type: type, cloud: {type: "db", root: item.root, path: item.path}});
                            });
                            if (collection.trackList.length === 0) {
                                return;
                            }
                            _config.cb(collection);
                            _window.close();
                        }, root, path);
                    });
                });
                dom_cache.playSelected.on('click', function(e) {
                    e.preventDefault();
                    var pl_name = cacheList.path.split('/').slice(-1)[0] || "Dropbox";
                    var collection = {title: pl_name, trackList: [], cloud: {type: 'db'}};
                    var items = $.makeArray(dom_cache.fileList.find('input[type="checkbox"]:checked'));
                    items.forEach(function(item) {
                        var index = $(item).data('index');
                        item = cacheList.contents[index];
                        var name = item._name;
                        var type = item._type;
                        collection.trackList.push({tags: {default: {title: name}}, type: type, cloud: {type: "db", root: item.root, path: item.path}});
                    });
                    if (collection.trackList.length === 0) {
                        return;
                    }
                    _config.cb(collection);
                    window.close();
                });
            };
            return {
                writeFileList: writeFileList,
                init: init
            }
        }();
        var gd = function() {
            var cacheList = undefined;
            var pathList = [];
            var writeFileList = function(list, folder_id) {
                cacheList = list;
                list.items.reverse();
                pathList.push(folder_id || 'root');
                dom_cache.playSelected.prop('disabled', 1);
                var $list = [];
                if (pathList.length > 1) {
                    $list.push($('<div>', {title: chrome.i18n.getMessage('fl_btnBack'), text: chrome.i18n.getMessage('fl_btnBack')}).data('index', -1));
                }
                for (var i = 0, item; item = list.items[i]; i++) {
                    /**
                     * @namespace item.downloadUrl
                     */
                    var action;
                    var name = item.title;
                    var is_dir = (item.mimeType.indexOf('.folder') !== -1);
                    if (is_dir) {
                        action = $('<div>', {'class': 'play', title: chrome.i18n.getMessage('fl_playFolder') });
                    } else {
                        var type = name.substr(name.lastIndexOf('.') + 1).toLowerCase();
                        if (item.downloadUrl === undefined || isAllowFile(type) === false) {
                            continue;
                        }
                        item._type = type;
                        action = $('<input>', {type: 'checkbox'}).data('index', i);
                    }
                    $list.push(
                        $('<div>', {title: name, text: name}).data('index', i).append(action)
                    );
                }
                dom_cache.fileList.empty().append($list);
            };
            var init = function() {
                dom_cache.fileList.on('click', 'input[type="checkbox"]', function(e) {
                    e.stopPropagation();
                });
                dom_cache.fileList.on('change', 'input[type="checkbox"]', function(e) {
                    e.preventDefault();
                    var $this = $(this);
                    var checked = $this.prop('checked');
                    if (checked) {
                        $this.parent().addClass('selected');
                    } else {
                        $this.parent().removeClass('selected');
                    }
                    var count = dom_cache.fileList.find('input:checked').length;
                    if (count > 0) {
                        dom_cache.playSelected.prop('disabled', 0);
                    } else {
                        dom_cache.playSelected.prop('disabled', 1);
                    }
                });
                dom_cache.fileList.on('click', '> div', function(e) {
                    e.preventDefault();
                    var $this = $(this);
                    var index = $this.data("index");
                    var folder_id = undefined;
                    if (index === -2) {
                        return;
                    }
                    if (index === -1) {
                        $this.data("index", -2);
                        folder_id = pathList.splice(-2)[0];
                    } else {
                        var item = cacheList.items[index];
                        var is_dir = (item.mimeType.indexOf('.folder') !== -1);
                        if (is_dir) {
                            folder_id = item.id;
                        } else {
                            var inp = $this.children('input');
                            inp[0].checked = !inp[0].checked;
                            inp.trigger('change');
                            return;
                        }
                    }
                    _send('player', function(window) {
                        window.engine.cloud.gd.getFileList(folder_id, function(list) {
                            writeFileList(list, folder_id);
                        });
                    });
                });
                dom_cache.fileList.on('click', 'div > .play', function(e) {
                    e.stopPropagation();
                    var $this = $(this);
                    var index = $this.parent().data("index");
                    var item = cacheList.items[index];
                    var folder_id = item.id;
                    var _window = window;
                    var pl_name = item.title || "Google Drive";
                    _send('player', function(window) {
                        window.engine.cloud.gd.getFileList(folder_id, function(list) {
                            var collection = {title: pl_name, trackList: [], cloud: {type: 'gd'}};
                            list.items.reverse();
                            list.items.forEach(function(item) {
                                var is_dir = (item.mimeType.indexOf('.folder') !== -1);
                                if (is_dir || item.downloadUrl === undefined) {
                                    return 1;
                                }
                                var name = item.title;
                                var type = name.substr(name.lastIndexOf('.') + 1).toLowerCase();
                                if (isAllowFile(type) === false) {
                                    return 1;
                                }
                                collection.trackList.push({url: item.downloadUrl, type: type, tags: {default: {title: name}}, cloud: {type: 'gd'}});
                            });
                            if (collection.trackList.length === 0) {
                                return;
                            }
                            _config.cb(collection);
                            _window.close();
                        });
                    });
                });
                dom_cache.playSelected.on('click', function(e) {
                    e.preventDefault();
                    var pl_name = "Google Drive";
                    var collection = {title: pl_name, trackList: [], cloud: {type: "gd"}};
                    var items = $.makeArray(dom_cache.fileList.find('input[type="checkbox"]:checked'));
                    items.forEach(function(item) {
                        var index = $(item).data('index');
                        item = cacheList.items[index];
                        var is_dir = (item.mimeType.indexOf('.folder') !== -1);
                        if (is_dir) {
                            return 1;
                        }
                        var name = item.title;
                        var type = item._type;
                        collection.trackList.push({url: item.downloadUrl, type: type, tags: {default: {title: name}}, cloud: {type: 'gd'}});
                    });
                    if (collection.trackList.length === 0) {
                        return;
                    }
                    _config.cb(collection);
                    window.close();
                });
            };
            return {
                writeFileList: writeFileList,
                init: init
            }
        }();
        var od = function() {
            var pathList = [];
            var cacheList = undefined;
            var writeFileList = function(list, folder_id) {
                cacheList = list;
                pathList.push(folder_id || 'me/skydrive');
                dom_cache.playSelected.prop('disabled', 1);
                var $list = [];
                if (pathList.length > 1) {
                    $list.push($('<div>', {title: chrome.i18n.getMessage('fl_btnBack'), text: chrome.i18n.getMessage('fl_btnBack')}).data('index', -1));
                }
                for (var i = 0, item; item = list.data[i]; i++) {
                    var action;
                    var name = item.name;
                    var is_dir = (item.type === 'folder' || item.type === 'album');
                    if (is_dir) {
                        action = $('<div>', {'class': 'play', title: chrome.i18n.getMessage('fl_playFolder') });
                    } else {
                        var type = name.substr(name.lastIndexOf('.') + 1).toLowerCase();
                        if (isAllowFile(type) === false) {
                            continue;
                        }
                        item._type = type;
                        action = $('<input>', {type: 'checkbox'}).data('index', i);
                    }
                    $list.push(
                        $('<div>', {title: name, text: name}).data('index', i).append(action)
                    );
                }
                dom_cache.fileList.empty().append($list);
            };
            var readTags = function(track) {
                var tags = {
                    title: track.name
                };
                if (!!track.album) {
                    tags.album = track.album;
                }
                if (!!track.artist) {
                    tags.artist  = track.artist;
                }
                if (!!track.title) {
                    tags.title  = track.title;
                }
                if (!!track.picture) {
                    tags.cover  = track.picture;
                }
                return tags;
            };
            var init = function() {
                dom_cache.fileList.on('click', 'input[type="checkbox"]', function (e) {
                    e.stopPropagation();
                });
                dom_cache.fileList.on('change', 'input[type="checkbox"]', function (e) {
                    e.preventDefault();
                    var $this = $(this);
                    var checked = $this.prop('checked');
                    if (checked) {
                        $this.parent().addClass('selected');
                    } else {
                        $this.parent().removeClass('selected');
                    }
                    var count = dom_cache.fileList.find('input:checked').length;
                    if (count > 0) {
                        dom_cache.playSelected.prop('disabled', 0);
                    } else {
                        dom_cache.playSelected.prop('disabled', 1);
                    }
                });
                dom_cache.fileList.on('click', '> div', function(e) {
                    e.preventDefault();
                    var $this = $(this);
                    var index = $this.data("index");
                    var folder_id = undefined;
                    if (index === -2) {
                        return;
                    }
                    if (index === -1) {
                        $this.data("index", -2);
                        folder_id = pathList.splice(-2)[0];
                    } else {
                        var item = cacheList.data[index];
                        var is_dir = (item.type === 'folder' || item.type === 'album');
                        if (is_dir) {
                            folder_id = item.id;
                        } else {
                            var inp = $this.children('input');
                            inp[0].checked = !inp[0].checked;
                            inp.trigger('change');
                            return;
                        }
                    }
                    _send('player', function(window) {
                        window.engine.cloud.od.getFileList(folder_id, function(list) {
                            writeFileList(list, folder_id);
                        });
                    });
                });
                dom_cache.fileList.on('click', 'div > .play', function(e) {
                    e.stopPropagation();
                    var $this = $(this);
                    var index = $this.parent().data("index");
                    var item = cacheList.data[index];
                    var folder_id = item.id;
                    var _window = window;
                    var pl_name = item.name || "OneDrive";
                    _send('player', function(window) {
                        window.engine.cloud.od.getFileList(folder_id, function(list) {
                            var collection = {title: pl_name, trackList: [], cloud: {type: 'od'}};
                            list.data.forEach(function(item) {
                                var is_dir = (item.type === 'folder' || item.type === 'album');
                                if (is_dir) {
                                    return 1;
                                }
                                var name = item.name;
                                var type = name.substr(name.lastIndexOf('.') + 1).toLowerCase();
                                if (isAllowFile(type) === false) {
                                    return 1;
                                }
                                collection.trackList.push({url: item.link.replace('/redir.', '/download.'), type: type, tags: {default: readTags(item)}, cloud: {type: 'od'}});
                            });
                            if (collection.trackList.length === 0) {
                                return;
                            }
                            _config.cb(collection);
                            _window.close();
                        });
                    });
                });
                dom_cache.playSelected.on('click', function(e) {
                    e.preventDefault();
                    var pl_name = "OneDrive";
                    var collection = {title: pl_name, trackList: [], cloud: {type: "od"}};
                    var items = $.makeArray(dom_cache.fileList.find('input[type="checkbox"]:checked'));
                    items.forEach(function(item) {
                        var index = $(item).data('index');
                        item = cacheList.data[index];
                        var is_dir = (item.type === 'folder' || item.type === 'album');
                        if (is_dir) {
                            return 1;
                        }
                        var type = item._type;
                        collection.trackList.push({url: item.link.replace('/redir.', '/download.'), type: type, tags: {default: readTags(item)}, cloud: {type: 'od'}});
                    });
                    if (collection.trackList.length === 0) {
                        return;
                    }
                    _config.cb(collection);
                    window.close();
                });
            };
            return {
                writeFileList: writeFileList,
                init: init
            }
        }();
        return {
            db: db,
            gd: gd,
            od: od
        }
    }();
    var dialogRender = function(type) {
        if (type === 'menu') {
            var list = [];
            for (var key in _config.list) {
                var item = _config.list[key];
                if (item.hide || item.action === undefined || item.contexts.indexOf('page') === -1) {
                    continue;
                }
                var dom = undefined;
                list.push( dom = $('<li>', {text: item.title}).data('id', item.id || key) );
                if (item.checked) {
                    dom.addClass('active');
                }
            }
            dom_cache.body.append(
                $('<ul>', {'class': 'menu customScroll'}).append(list).on('click', 'li', function(e) {
                    e.preventDefault();
                    var $this = $(this);
                    var id = $this.data('id');
                    _config.list[id].action();
                    chrome.app.window.current().close();
                })
            );
            return;
        }
        if (type === 'm3u') {
            var list = [];
            for (var i = 0, item; item = _config.collectionList[i]; i++) {
                list.push( $('<li>', {class: (item.id !== undefined && item.id === _config.id)?'active':undefined }).data('index', i).append(
                    $('<div>', {'class': 'playlist icon'}),
                    $('<span>', {text: item.title})
                ) );
            }
            dom_cache.body.append(
                $('<ul>', {'class': 'collectionList customScroll'+( (_config.join)?' join':'' )}).append(list).on('click', 'li', function(e) {
                    e.preventDefault();
                    var $this = $(this);
                    var index = $this.data('index');
                    _config.onclose = undefined;
                    _config.cb( index );
                    chrome.app.window.current().close();
                }),
                _config.join && $('<div>', {'class': 'join_body'}).append(
                    $('<input>', {type: 'button', name: 'join', value: chrome.i18n.getMessage('btnJoinPlaylistList') }).on('click', function(e) {
                        e.preventDefault();
                        var collectionList = _config.collectionList.splice(0);
                        _config.collectionList.push({title: chrome.i18n.getMessage('playlist'), trackList: []});
                        collectionList.forEach(function(collection) {
                            if (collection.trackList === undefined) {
                                return 1;
                            }
                            _config.collectionList[0].trackList = _config.collectionList[0].trackList.concat(collection.trackList);
                        });
                        _config.onclose = undefined;
                        _config.cb( 0 );
                        chrome.app.window.current().close();
                    })
                )
            );
            if (_config.onclose !== undefined) {
                chrome.app.window.current().onClosed.addListener(function () {
                    _config.onclose && _config.onclose();
                });
            }
            return;
        }
        if (type === 'url') {
            dom_cache.body.append(
                $('<fieldset>', {'class': 'url'}).append(
                    $('<form>').append(
                        $('<div>', {'class': 'urlForm'}).append(
                            dom_cache.url = $('<input>', {type: 'text', placeholder: 'http://', text: _config.url}),
                            $('<input>', {type: 'submit', value: chrome.i18n.getMessage('open')})
                        ),
                        $('<div>').append(
                            $('<div>', {'class': 'radioItem'}).append(
                                dom_cache.audio = $('<input>', {type: 'radio', name: 'media', value: 'audio', checked: true}),
                                $('<label>', {text: chrome.i18n.getMessage('audio')})
                            ),
                            $('<div>', {'class': 'radioItem'}).append(
                                $('<input>', {type: 'radio', name: 'media', value: 'video'}),
                                $('<label>', {text: chrome.i18n.getMessage('video')})
                            )
                        )
                    ).on('submit', function(e) {
                        e.preventDefault();
                        var url = dom_cache.url.val();
                        if (url.length === 0) {
                            return;
                        }
                        var type = dom_cache.audio.prop('checked')?'.mp3':'.mp4';
                        var track = {url: url, type: type, tags: {default: {title: url}} };
                        var collection = { title: chrome.i18n.getMessage('playlist'), trackList: [] };
                        collection.trackList.push(track);
                        _config.cb(collection);
                        chrome.app.window.current().close();
                    }).on('click', '.radioItem', function(e) {
                        if (e.target.tagName === 'INPUT') {
                            return;
                        }
                        e.preventDefault();
                        var $this = $(this);
                        $this.children('input').prop('checked', true);
                    })
                )
            );
            dom_cache.url.focus();
        }
        if (_config.filelist !== undefined) {
            dom_cache.body.append(
                $('<fieldset>', {'class': 'fl_body'}).append(
                    $('<legend>', {text: chrome.i18n.getMessage("fl_label")}),
                    dom_cache.fileList = $('<div>', {'class': 'fl_list customScroll'}),
                    dom_cache.playSelected = $('<input>', {'type': 'button', value: chrome.i18n.getMessage('fl_playSelected')})
                )
            );
            _send('player', function(window) {
                var_cache.allow_ext = window.engine.player.allow_ext;
                cloud[_config.type].writeFileList(_config.filelist);
            });
            cloud[_config.type].init();
        }
    };
    return {
        show: function() {
            dom_cache.body = $(document.body);
            dom_cache.body.append(
                $('<div>', {'class': 'close t_btn', title: chrome.i18n.getMessage("btnClose") }).on('click', function (e) {
                    e.preventDefault();
                    window.close();
                })
            );
            var_cache.is_winamp = _settings.is_winamp;
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
            dialogRender(_config.type);
            $(document).on('keydown', function(event) {
                if (event.ctrlKey || event.metaKey) {
                    return;
                } else {
                    if (event.keyCode === 27) {
                        window.close();
                    }
                }
            });
        }
    }
}();
$(function(){
    dialog.show();
});