var dialog = function() {
    var allow_ext = undefined;
    var video_ext = undefined;
    var var_cache = {};
    var dom_cache = {};
    var settings = undefined;
    var isAllowFile = function (filename) {
        var ext = filename.substr(filename.lastIndexOf('.') + 1).toLowerCase();
        return allow_ext.indexOf(ext) !== -1;
    }
    var isVideoFile = function (filename) {
        var ext = filename.substr(filename.lastIndexOf('.') + 1).toLowerCase();
        return video_ext.indexOf(ext) !== -1;
    };
    var createURLform = function() {
        /*
         * Создает форму для ввода URL
         */
        $('.url_dialog').show();
        $('.url_dialog input[name=open_btn]').on('click', function() {
            var text = $(this).parent().children('input[name=url]').get(0);
            _send('player', function(window) {
                window.engine.open([{url: text.value}], {name: "URL"});
            });
            window.close();
        });
        $('.url_dialog input[name=url]').on('keyup', function(event) {
            if (event.keyCode === 13) {
                $(this).parent().children('input[name=open_btn]').trigger('click');
            } else
            if (event.keyCode === 27) {
                window.close();
            }
        }).get(0).focus();
    };
    var playlistChiser = function() {
        /*
         * Создает форму выбора m3u файла
         */
        $('.playlist_chiser').show();
        var pl = $('.playlists').children("ul");
        var arr = window.options.playlists;
        arr.forEach(function(item) {
            pl.append($('<li>', {'class': 'pl_file', 'data-id': item.id}).append($('<div>', {'class': 'gr_line'}), $('<span>', {title: item.name, text: item.name})));
        });
        $('body').on('click', 'li.pl_file', function() {
            var id = $(this).data("id");
            _send('player', function(window) {
                window.engine.playlist.selectPlaylist(id);
            });
            window.close();
        });
    };
    var db_writefilelist = function(list) {
        dom_cache.dropbox_button.attr('disabled', 'disabled');
        var fl = dom_cache.dropbox_ul;
        fl.empty();
        if (list.path.length > 1) {
            fl.append($('<li>', {'class': 'db_file', 'data-id': -1}).append($('<span>', {title: _lang.dialog.back, text: _lang.dialog.back})));
        }
        var n = -1;
        list.contents.forEach(function(item) {
            /**
             * @namespace item.is_dir
             */
            n++;
            var filename = item.path.split('/').slice(-1)[0];
            var action = '';
            if (item.is_dir) {
                action = $('<div>', {'class': 'play', title: _lang.dialog.play_folder});
            } else {
                action = $('<input>', {name: 'id' + n, type: 'checkbox'});
            }
            if (item.is_dir === false && isAllowFile(filename) === false) {
                return 1;
            }
            fl.append($('<li>', {'class': 'db_file', 'data-id': n}).append($('<span>', {title: filename, text: filename}), action));
        });
        var_cache.db_list = list;
    };
    var dropboxChoice = function() {
        /*
         * Создает форму выбора папок иди файлов для Dropbox
         */
        dom_cache.dropbox = $('.dropbox_choice');
        dom_cache.dropbox.show();
        dom_cache.dropbox_button = dom_cache.dropbox.find('input[type="button"]').eq(0);
        dom_cache.dropbox_ul = dom_cache.dropbox.find("ul").eq(0);
        db_writefilelist(window.options.filelist);
        dom_cache.dropbox.on('click', 'li.db_file', function(e) {
            if (e.target.nodeName === "INPUT") {
                return;
            }
            var id = parseInt($(this).data("id"));
            var path = undefined;
            var root = undefined;
            if (id === -1) {
                path = var_cache.db_list.path + '/..';
                root = var_cache.db_list.root;
            } else {
                var item = var_cache.db_list.contents[id];
                if (item.is_dir) {
                    path = item.path;
                    root = item.root;
                } else {
                    var ch_box = $(this).children('input');
                    ch_box.get(0).checked = !ch_box.get(0).checked;
                    ch_box.trigger('change');
                    return;
                }
            }
            _send('player', function(window) {
                window.engine.cloud.db.getFilelist(function(list) {
                    db_writefilelist(list);
                }, root, path);
            });
        });
        dom_cache.dropbox.on('change', 'input[type="checkbox"]', function(e) {
            e.preventDefault();
            e.stopPropagation();
            var checked = this.checked;
            if (checked) {
                $(this).parent().addClass('selected');
            } else {
                $(this).parent().removeClass('selected');
            }
            var count = dom_cache.dropbox.find('input[type="checkbox"]:checked').length;
            if (count > 0) {
                dom_cache.dropbox_button.removeAttr('disabled');
            } else {
                dom_cache.dropbox_button.attr('disabled', 'disabled');
            }
        });
        dom_cache.dropbox.on('click', 'li > .play', function(e) {
            e.preventDefault();
            e.stopPropagation();
            var id = parseInt($(this).parent().data("id"));
            var item = var_cache.db_list.contents[id];
            if (!item.is_dir) {
                return;
            }
            var path = item.path;
            var root = item.root;
            var _window = window;
            _send('player', function(window) {
                window.engine.cloud.db.getFilelist(function(list) {
                    var pl_name = list.path.split('/').slice(-1)[0] || "Dropbox";
                    var playlist = {name: pl_name, id: 0, type: "db", tracks: []};
                    list.contents.forEach(function(item) {
                        var filename = item.path.split('/').slice(-1)[0];
                        if (item.is_dir || isAllowFile(filename) === false) {
                            return 1;
                        }
                        var isVideo = isVideoFile(filename);
                        playlist.tracks.push({id: -1, file: {name: filename, url: undefined, isVideo: isVideo}, tags: {}, duration: 0, cloud: {type: "db", root: item.root, path: item.path}});
                    });
                    if (playlist.tracks.length === 0) {
                        return;
                    }
                    _send('player', function(window) {
                        window.engine.playlist.setM3UPlaylists([playlist]);
                        window.engine.playlist.selectPlaylist(0);
                    });
                    _window.close();
                }, root, path);
            });
        });
        dom_cache.dropbox_button.on('click', function(e) {
            e.preventDefault();
            var pl_name = var_cache.db_list.path.split('/').slice(-1)[0] || "Dropbox";
            var playlist = {name: pl_name, id: 0, type: "db", tracks: []};
            var items = $.makeArray(dom_cache.dropbox.find('input[type="checkbox"]:checked'));
            items.forEach(function(item) {
                var id = $(item).parent().data('id');
                item = var_cache.db_list.contents[id];
                if (item.is_dir) {
                    return 1;
                }
                var filename = item.path.split('/').slice(-1)[0];
                var isVideo = isVideoFile(filename);
                playlist.tracks.push({id: -1, file: {name: filename, url: undefined, isVideo: isVideo}, tags: {}, duration: 0, cloud: {type: "db", root: item.root, path: item.path}});
            });
            if (playlist.tracks.length === 0) {
                return;
            }
            _send('player', function(window) {
                window.engine.playlist.setM3UPlaylists([playlist]);
                window.engine.playlist.selectPlaylist(0);
            });
            window.close();
        });
    };
    var gd_writefilelist = function(list, folder_id) {
        var_cache.gd_path.push(folder_id || 'root');
        dom_cache.drive_button.attr('disabled', 'disabled');
        var fl = dom_cache.drive_ul;
        fl.empty();
        if (var_cache.gd_path.length > 1) {
            fl.append($('<li>', {'class': 'gd_file', 'data-id': -1}).append($('<span>', {title: _lang.dialog.back, text: _lang.dialog.back})));
        }
        var n = -1;
        list.items.reverse();
        list.items.forEach(function(item) {
            /**
             * @namespace item.downloadUrl
             */
            n++;
            var filename = item.title;
            var is_dir = (item.mimeType.indexOf('.folder') !== -1);
            if (!is_dir && (item.downloadUrl === undefined || (item.mimeType.indexOf('audio/') === -1 && item.mimeType.indexOf('video/') === -1))) {
                return 1;
            }
            var action = '';
            if (is_dir) {
                action = $('<div>', {'class': 'play', title: _lang.dialog.play_folder});
            } else {
                action = $('<input>', {name: 'id' + n, type: 'checkbox'});
            }
            fl.append($('<li>', {'class': 'gd_file', 'data-id': n}).append($('<span>', {title: filename, text: filename}), action));
        });
        var_cache.gd_list = list;
    };
    var driveChoice = function() {
        /*
         * Создает форму выбора папок иди файлов
         */
        dom_cache.drive = $('.drive_choice');
        dom_cache.drive.show();
        dom_cache.drive_button = dom_cache.drive.find('input[type="button"]').eq(0);
        dom_cache.drive_ul = dom_cache.drive.find("ul").eq(0);
        var_cache.gd_path = [];
        gd_writefilelist(window.options.filelist);
        dom_cache.drive.on('click', 'li.gd_file', function(e) {
            if (e.target.nodeName === "INPUT") {
                return;
            }
            var id = parseInt($(this).data("id"));
            var folder_id = undefined;
            if (id === -1) {
                folder_id = var_cache.gd_path.splice(-2)[0];
            } else {
                var item = var_cache.gd_list.items[id];
                var is_dir = (item.mimeType.indexOf('.folder') !== -1);
                if (is_dir) {
                    folder_id = item.id;
                } else {
                    var ch_box = $(this).children('input');
                    ch_box.get(0).checked = !ch_box.get(0).checked;
                    ch_box.trigger('change');
                    return;
                }
            }
            _send('player', function(window) {
                window.engine.cloud.gd.getFilelist(folder_id, function(list) {
                    gd_writefilelist(list, folder_id);
                });
            });
        });
        dom_cache.drive.on('change', 'input[type="checkbox"]', function(e) {
            e.preventDefault();
            e.stopPropagation();
            var checked = this.checked;
            if (checked) {
                $(this).parent().addClass('selected');
            } else {
                $(this).parent().removeClass('selected');
            }
            var count = dom_cache.drive.find('input[type="checkbox"]:checked').length;
            if (count > 0) {
                dom_cache.drive_button.removeAttr('disabled');
            } else {
                dom_cache.drive_button.attr('disabled', 'disabled');
            }
        });
        dom_cache.drive.on('click', 'li > .play', function(e) {
            e.preventDefault();
            e.stopPropagation();
            var id = parseInt($(this).parent().data("id"));
            var item = var_cache.gd_list.items[id];
            var is_dir = (item.mimeType.indexOf('.folder') !== -1);
            if (!is_dir) {
                return;
            }
            var folder_id = item.id;
            var _window = window;
            var pl_name = item.title || "Google Drive";
            _send('player', function(window) {
                window.engine.cloud.gd.getFilelist(folder_id, function(list) {
                    var playlist = {name: pl_name, id: 0, type: "gd", tracks: []};
                    list.items.reverse();
                    list.items.forEach(function(item) {
                        var is_dir = (item.mimeType.indexOf('.folder') !== -1);
                        if (is_dir || item.downloadUrl === undefined || (item.mimeType.indexOf('audio/') === -1 && item.mimeType.indexOf('video/') === -1)) {
                            return 1;
                        }
                        var filename = item.title;
                        var isVideo = isVideoFile(filename);
                        playlist.tracks.push({id: -1, file: {name: filename, url: item.downloadUrl, isVideo: isVideo}, tags: {}, duration: 0, cloud: {type: 'gd'}});
                    });
                    if (playlist.tracks.length === 0) {
                        return;
                    }
                    _send('player', function(window) {
                        window.engine.playlist.setM3UPlaylists([playlist]);
                        window.engine.playlist.selectPlaylist(0);
                    });
                    _window.close();
                });
            });
        });
        dom_cache.drive_button.on('click', function(e) {
            e.preventDefault();
            var pl_name = "Google Drive";
            var playlist = {name: pl_name, id: 0, type: "gd", tracks: []};
            var items = $.makeArray(dom_cache.drive.find('input[type="checkbox"]:checked'));
            items.forEach(function(item) {
                var id = $(item).parent().data('id');
                item = var_cache.gd_list.items[id];
                var is_dir = (item.mimeType.indexOf('.folder') !== -1);
                if (is_dir) {
                    return 1;
                }
                var filename = item.title;
                var isVideo = isVideoFile(filename);
                playlist.tracks.push({id: -1, file: {name: filename, url: item.downloadUrl, isVideo: isVideo}, tags: {}, duration: 0, cloud: {type: 'gd'}});
            });
            if (playlist.tracks.length === 0) {
                return;
            }
            _send('player', function(window) {
                window.engine.playlist.setM3UPlaylists([playlist]);
                window.engine.playlist.selectPlaylist(0);
            });
            window.close();
        });
    };
    var box_writefilelist = function(list) {
        dom_cache.box_button.attr('disabled', 'disabled');
        var fl = dom_cache.box_ul;
        fl.empty();
        if (var_cache.box_parent !== undefined && var_cache.box_parent.length > 0) {
            var prew_folder = var_cache.box_parent.slice(-1)[0].id;
            if (prew_folder !== 0) {
                fl.append($('<li>', {'class': 'box_file', 'data-id': -1, 'data-parent': prew_folder}).append($('<span>', {title: _lang.dialog.back, text: _lang.dialog.back})));
            }
        }
        var n = -1;
        /**
         * @namespace  list.entries
         */
        list.entries.forEach(function(item) {
            n++;
            var action = '';
            if (item.type === "folder") {
                action = $('<div>', {'class': 'play', title: _lang.dialog.play_folder});
            } else {
                action = $('<input>', {name: 'id' + n, type: 'checkbox'});
            }
            if (item.type !== "folder" && isAllowFile(item.name) === false) {
                return 1;
            }
            fl.append($('<li>', {'class': 'box_file', 'data-id': n}).append($('<span>', {title: item.name, text: item.name}), action));
        });
        var_cache.box_list = list;
    };
    var boxChoice = function() {
        /*
         * Создает форму выбора папок иди файлов для box
         */
        dom_cache.box = $('.box_choice');
        dom_cache.box.show();
        dom_cache.box_button = dom_cache.box.find('input[type="button"]').eq(0);
        dom_cache.box_ul = dom_cache.box.find("ul").eq(0);
        dom_cache.box_folder = 0;
        box_writefilelist(window.options.filelist);
        dom_cache.box.on('click', 'li.box_file', function(e) {
            if (e.target.nodeName === "INPUT") {
                return;
            }
            var id = parseInt($(this).data("id"));
            var folder_id = undefined;
            if (id === -1) {
                folder_id = parseInt($(this).data('parent'));
                var_cache.box_parent = var_cache.box_parent.slice(0, -1);
            } else {
                var item = var_cache.box_list.entries[id];
                if (item.type === "folder") {
                    folder_id = item.id;
                    /**
                     * @namespace item.path_collection
                     */
                    var_cache.box_parent = item.path_collection.entries;
                } else {
                    var ch_box = $(this).children('input');
                    ch_box.get(0).checked = !ch_box.get(0).checked;
                    ch_box.trigger('change');
                    return;
                }
            }
            _send('player', function(window) {
                window.engine.cloud.box.getFilelist(function(list) {
                    box_writefilelist(list);
                }, folder_id);
            });
        });
        dom_cache.box.on('change', 'input[type="checkbox"]', function(e) {
            e.preventDefault();
            e.stopPropagation();
            var checked = this.checked;
            if (checked) {
                $(this).parent().addClass('selected');
            } else {
                $(this).parent().removeClass('selected');
            }
            var count = dom_cache.box.find('input[type="checkbox"]:checked').length;
            if (count > 0) {
                dom_cache.box_button.removeAttr('disabled');
            } else {
                dom_cache.box_button.attr('disabled', 'disabled');
            }
        });
        dom_cache.box.on('click', 'li > .play', function(e) {
            e.preventDefault();
            e.stopPropagation();
            var id = parseInt($(this).parent().data("id"));
            var item = var_cache.box_list.entries[id];
            if (item.type !== "folder") {
                return;
            }
            var folder_id = item.id;
            var folder_name = item.name;
            var _window = window;
            _send('player', function(window) {
                window.engine.cloud.box.getFilelist(function(list) {
                    var playlist = {name: folder_name, id: 0, type: "box", tracks: []};
                    list.entries.forEach(function(item) {
                        if (item.type === "folder" || isAllowFile(item.name) === false) {
                            return 1;
                        }
                        var isVideo = isVideoFile(item.name);
                        playlist.tracks.push({id: -1, file: {name: item.name, url: undefined, isVideo: isVideo}, tags: {}, duration: 0, cloud: {type: "box", file_id: item.id}});
                    });
                    if (playlist.tracks.length === 0) {
                        return;
                    }
                    _send('player', function(window) {
                        window.engine.playlist.setM3UPlaylists([playlist]);
                        window.engine.playlist.selectPlaylist(0);
                    });
                    _window.close();
                }, folder_id);
            });
        });
        dom_cache.box_button.on('click', function(e) {
            e.preventDefault();
            var pl_name = "Box";
            var playlist = {name: pl_name, id: 0, type: "box", tracks: []};
            var items = $.makeArray(dom_cache.box.find('input[type="checkbox"]:checked'));
            items.forEach(function(item) {
                var id = $(item).parent().data('id');
                item = var_cache.box_list.entries[id];
                if (item.type === "folder") {
                    return 1;
                }
                var isVideo = isVideoFile(item.name);
                playlist.tracks.push({id: -1, file: {name: item.name, url: undefined, isVideo: isVideo}, tags: {}, duration: 0, cloud: {type: "box", file_id: item.id}});
            });
            if (playlist.tracks.length === 0) {
                return;
            }
            _send('player', function(window) {
                window.engine.playlist.setM3UPlaylists([playlist]);
                window.engine.playlist.selectPlaylist(0);
            });
            window.close();
        });
    };
    var sd_writefilelist = function(list, folder_id) {
        var_cache.sd_path.push(folder_id || 'me/skydrive');
        dom_cache.skydrive_button.attr('disabled', 'disabled');
        var fl = dom_cache.skydrive_ul;
        fl.empty();
        if (var_cache.sd_path.length > 1) {
            fl.append($('<li>', {'class': 'sd_file', 'data-id': -1}).append($('<span>', {title: _lang.dialog.back, text: _lang.dialog.back})));
        }
        var n = -1;
        list.data.forEach(function(item) {
            n++;
            var filename = item.name;
            var is_dir = (item.type === 'folder' || item.type === 'album');
            if (!is_dir && isAllowFile(filename) === false) {
                return 1;
            }
            var action = '';
            if (is_dir) {
                action = $('<div>', {'class': 'play', title: _lang.dialog.play_folder});
            } else {
                action = $('<input>', {name: 'id' + n, type: 'checkbox'});
            }
            fl.append($('<li>', {'class': 'sd_file', 'data-id': n}).append($('<span>', {title: filename, text: filename}), action));
        });
        var_cache.sd_list = list;
    };
    var skydriveChoice = function() {
        var read_tags = function(item) {
            var tags = {};
            if (item.album !== undefined && item.album !== null) {
                tags.album = item.album;
            }
            /**
             * @namespace item.album_artist
             */
            if ((item.artist !== undefined && item.artist !== null) || (item.album_artist !== undefined && item.album_artist !== null)) {
                tags.artist = item.artist || item.album_artist;
            }
            tags.title = item.title || item.name;
            if (item.picture !== undefined && item.picture !== null) {
                tags.artwork = item.picture;
            }
            return tags;
        };
        /*
         * Создает форму выбора папок иди файлов
         */
        dom_cache.skydrive = $('.drive_choice');
        dom_cache.skydrive.show();
        dom_cache.skydrive_button = dom_cache.skydrive.find('input[type="button"]').eq(0);
        dom_cache.skydrive_ul = dom_cache.skydrive.find("ul").eq(0);
        var_cache.sd_path = [];
        sd_writefilelist(window.options.filelist);
        dom_cache.skydrive.on('click', 'li.sd_file', function(e) {
            if (e.target.nodeName === "INPUT") {
                return;
            }
            var id = parseInt($(this).data("id"));
            var folder_id = undefined;
            if (id === -1) {
                folder_id = var_cache.sd_path.splice(-2)[0];
            } else {
                var item = var_cache.sd_list.data[id];
                var is_dir = (item.type === 'folder' || item.type === 'album');
                if (is_dir) {
                    folder_id = item.id;
                } else {
                    var ch_box = $(this).children('input');
                    ch_box.get(0).checked = !ch_box.get(0).checked;
                    ch_box.trigger('change');
                    return;
                }
            }
            _send('player', function(window) {
                window.engine.cloud.sd.getFilelist(folder_id, function(list) {
                    sd_writefilelist(list, folder_id);
                });
            });
        });
        dom_cache.skydrive.on('change', 'input[type="checkbox"]', function(e) {
            e.preventDefault();
            e.stopPropagation();
            var checked = this.checked;
            if (checked) {
                $(this).parent().addClass('selected');
            } else {
                $(this).parent().removeClass('selected');
            }
            var count = dom_cache.skydrive.find('input[type="checkbox"]:checked').length;
            if (count > 0) {
                dom_cache.skydrive_button.removeAttr('disabled');
            } else {
                dom_cache.skydrive_button.attr('disabled', 'disabled');
            }
        });
        dom_cache.skydrive.on('click', 'li > .play', function(e) {
            e.preventDefault();
            e.stopPropagation();
            var id = parseInt($(this).parent().data("id"));
            var item = var_cache.sd_list.data[id];
            var is_dir = (item.type === 'folder' || item.type === 'album');
            if (!is_dir) {
                return;
            }
            var folder_id = item.id;
            var _window = window;
            var pl_name = item.name || "SkyDrive";
            _send('player', function(window) {
                window.engine.cloud.sd.getFilelist(folder_id, function(list) {
                    var playlist = {name: pl_name, id: 0, type: "sd", tracks: []};
                    list.data.forEach(function(item) {
                        var is_dir = (item.type === 'folder' || item.type === 'album');
                        var tags = read_tags(item);
                        if (is_dir || isAllowFile(item.name) === false) {
                            return 1;
                        }
                        var isVideo = isVideoFile(tags.title);
                        playlist.tracks.push({id: -1, file: {name: tags.title, url: item.link.replace('/redir.', '/download.'), isVideo: isVideo}, tags: undefined, duration: 0, cloud: {meta: tags, type: 'sd'}});
                    });
                    if (playlist.tracks.length === 0) {
                        return;
                    }
                    _send('player', function(window) {
                        window.engine.playlist.setM3UPlaylists([playlist]);
                        window.engine.playlist.selectPlaylist(0);
                    });
                    _window.close();
                });
            });
        });
        dom_cache.skydrive_button.on('click', function(e) {
            e.preventDefault();
            var pl_name = "SkyDrive";
            var playlist = {name: pl_name, id: 0, type: "sd", tracks: []};
            var items = $.makeArray(dom_cache.skydrive.find('input[type="checkbox"]:checked'));
            items.forEach(function(item) {
                var id = $(item).parent().data('id');
                item = var_cache.sd_list.data[id];
                var is_dir = (item.type === 'folder' || item.type === 'album');
                if (is_dir) {
                    return 1;
                }
                var tags = read_tags(item);
                var isVideo = isVideoFile(tags.title);
                playlist.tracks.push({id: -1, file: {name: tags.title, url: item.link.replace('/redir.', '/download.'), isVideo: isVideo}, tags: undefined, duration: 0, cloud: {meta: tags, type: 'sd'}});
            });
            if (playlist.tracks.length === 0) {
                return;
            }
            _send('player', function(window) {
                window.engine.playlist.setM3UPlaylists([playlist]);
                window.engine.playlist.selectPlaylist(0);
            });
            window.close();
        });
    };
    var menuChiser = function() {
        /*
         * Создает форму меню
         */
        var context_menu = window.options.list;
        var webui_state = window.options.webui_state;
        $('.menu_choice').show();
        var pl = $('.menu').children("ul");
        $.each(context_menu, function(key, item) {
            if (item.hide) {
                return 1;
            }
            if (item.action === undefined) {
                return 1;
            }
            if (item.contexts.indexOf('page') === -1) {
                return 1;
            }
            var dom_item = $('<li>', {'class': 'item', 'data-id': key, text: item.title});
            if (item.id === 'webUI' && webui_state) {
                dom_item.addClass('is_active');
            }
            pl.append(dom_item);
        });
        $('body').on('click', 'li.item', function() {
            var id = $(this).data("id");
            _send('player', function() {
                context_menu[id].action();
            });
            window.close();
        });
    };
    var write_language = function() {
        $('.t_btn.close').attr('title', _lang.close);
        $('div[data-lang=e_url]').text(_lang.dialog.e_url);
        $('div[data-lang=e_pl]').text(_lang.dialog.e_pl);
        $('div[data-lang=e_folder]').text(_lang.dialog.e_folder);
        $('input[data-lang=e_ps]').val(_lang.dialog.e_ps);
        $('input[data-lang=open]').val(_lang.dialog.open);
    };
    return {
        run: function() {
            _send('player', function(window) {
                settings = window._settings;
            });
            if (settings.is_winamp) {
                $('body').addClass('winamp');
                $('body').append(
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
            write_language();
            _send('player', function(window) {
                window.engine.setHotkeys(document);
                allow_ext = window.engine.player.allow_ext;
                video_ext = window.engine.player.video_ext;
            });
            $('.close').on('click', function() {
                window.close();
            });
            $(document).on('keydown', function(event) {
                if (event.ctrlKey || event.metaKey) {
                    return;
                } else {
                    if (event.keyCode === 27) {
                        window.close();
                    }
                }
            });
            if (window.options === undefined) {
                return;
            } else
            if (window.options.type === "url") {
                createURLform();
            } else
            if (window.options.type === "m3u") {
                playlistChiser();
            } else
            if (window.options.type === "db") {
                dropboxChoice();
            } else
            if (window.options.type === "gd") {
                driveChoice();
            } else
            if (window.options.type === "box") {
                boxChoice();
            } else
            if (window.options.type === "sd") {
                skydriveChoice();
            } else
            if (window.options.type === "menu") {
                menuChiser();
            }
        }
    };
}();
$(function() {
    dialog.run();
});