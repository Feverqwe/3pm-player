var dialog = function() {
    var allow_ext = ['mp3', 'mp4', 'm4a', 'm4v', 'ogg', 'oga', 'spx', 'webm', 'webma', 'wav', 'fla', 'rtmpa', 'ogv', '3gp'];
    var var_cache = {};
    var dom_cache = {};
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
    var createURLform = function() {
        /*
         * Создает форму для ввода URL
         */
        $('.url_dialog').show();
        $('.url_dialog input[name=open_btn]').on('click', function() {
            var text = $(this).parent().children('input[name=url]').get(0);
            sendPlayer(function(window) {
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
            sendPlayer(function(window) {
                window.engine.select_playlist(id);
            });
            window.close();
        });
    };
    var db_writefilelist = function(list) {
        dom_cache.dropbox_button.attr('disabled', 'disabled');
        var fl = dom_cache.dropbox_ul;
        fl.empty();
        if (list.path.length > 1) {
            fl.append($('<li>', {'class': 'db_file', 'data-id': -1}).append($('<span>', {title: "Go Back", text: "Go Back"})));
        }
        var n = -1;
        list.contents.forEach(function(item) {
            n++;
            var filename = item.path.split('/').slice(-1)[0];
            var action = '';
            if (item.is_dir) {
                action = $('<div>', {'class': 'play', title: 'Play folder'});
            } else {
                action = $('<input>', {name: 'id' + n, type: 'checkbox'});
            }
            var ext = filename.split('.').slice(-1)[0].toLowerCase();
            if (item.is_dir === false && allow_ext.indexOf(ext) === -1) {
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
            sendPlayer(function(window) {
                window.engine.db.getFilelist(function(list) {
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
            sendPlayer(function(window) {
                window.engine.db.getFilelist(function(list) {
                    var pl_name = list.path.split('/').slice(-1)[0] || "Dropbox";
                    var playlist = {name: pl_name, id: 0, type: "db", tracks: []};
                    list.contents.forEach(function(item) {
                        var filename = item.path.split('/').slice(-1)[0];
                        var ext = filename.split('.').slice(-1)[0].toLowerCase();
                        if (item.is_dir || allow_ext.indexOf(ext) === -1) {
                            return 1;
                        }
                        playlist.tracks.push({id: -1, file: {name: filename, url: undefined}, tags: {}, duration: 0, type: "db", root: item.root, path: item.path});
                    });
                    if (playlist.tracks.length === 0) {
                        return;
                    }
                    sendPlayer(function(window) {
                        window.engine.setM3UPlaylists({list: [playlist]});
                        window.engine.select_playlist(0);
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
                playlist.tracks.push({id: -1, file: {name: filename, url: undefined}, tags: {}, duration: 0, type: "db", root: item.root, path: item.path});
            });
            if (playlist.tracks.length === 0) {
                return;
            }
            sendPlayer(function(window) {
                window.engine.setM3UPlaylists({list: [playlist]});
                window.engine.select_playlist(0);
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
            fl.append($('<li>', {'class': 'gd_file', 'data-id': -1}).append($('<span>', {title: "Go Back", text: "Go Back"})));
        }
        var n = -1;
        list.items.forEach(function(item) {
            n++;
            var filename = item.title;
            var is_dir = (item.mimeType.indexOf('.folder') !== -1);
            if (!is_dir && (item.downloadUrl === undefined || item.mimeType.indexOf('audio/') === -1)) {
                return 1;
            }
            var action = '';
            if (is_dir) {
                action = $('<div>', {'class': 'play', title: 'Play folder'});
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
            sendPlayer(function(window) {
                window.engine.gd.getFilelist(folder_id, function(list) {
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
            sendPlayer(function(window) {
                window.engine.gd.getFilelist(folder_id, function(list) {
                    var playlist = {name: pl_name, id: 0, type: "gd", tracks: []};
                    list.items.forEach(function(item) {
                        var is_dir = (item.mimeType.indexOf('.folder') !== -1);
                        if (is_dir || item.downloadUrl === undefined || item.mimeType.indexOf('audio/') === -1) {
                            return 1;
                        }
                        var filename = item.title;
                        playlist.tracks.push({id: -1, file: {name: filename, url: item.downloadUrl}, tags: {}, duration: 0, type: 'gd'});
                    });
                    if (playlist.tracks.length === 0) {
                        return;
                    }
                    sendPlayer(function(window) {
                        window.engine.setM3UPlaylists({list: [playlist]});
                        window.engine.select_playlist(0);
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
                playlist.tracks.push({id: -1, file: {name: filename, url: item.downloadUrl}, tags: {}, duration: 0, type: 'gd'});
            });
            if (playlist.tracks.length === 0) {
                return;
            }
            sendPlayer(function(window) {
                window.engine.setM3UPlaylists({list: [playlist]});
                window.engine.select_playlist(0);
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
                fl.append($('<li>', {'class': 'box_file', 'data-id': -1, 'data-parent': prew_folder}).append($('<span>', {title: "Go Back", text: "Go Back"})));
            }
        }
        var n = -1;
        list.entries.forEach(function(item) {
            n++;
            var action = '';
            if (item.type === "folder") {
                action = $('<div>', {'class': 'play', title: 'Play folder'});
            } else {
                action = $('<input>', {name: 'id' + n, type: 'checkbox'});
            }
            var ext = item.name.split('.').slice(-1)[0].toLowerCase();
            if (item.type !== "folder" && allow_ext.indexOf(ext) === -1) {
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
                    var_cache.box_parent = item.path_collection.entries;
                } else {
                    var ch_box = $(this).children('input');
                    ch_box.get(0).checked = !ch_box.get(0).checked;
                    ch_box.trigger('change');
                    return;
                }
            }
            sendPlayer(function(window) {
                window.cloud.box.getFilelist(function(list) {
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
            sendPlayer(function(window) {
                window.cloud.box.getFilelist(function(list) {
                    var playlist = {name: folder_name, id: 0, type: "box", tracks: []};
                    list.entries.forEach(function(item) {
                        var ext = item.name.split('.').slice(-1)[0].toLowerCase();
                        if (item.type === "folder" || allow_ext.indexOf(ext) === -1) {
                            return 1;
                        }
                        playlist.tracks.push({id: -1, file: {name: item.name, url: undefined}, tags: {}, duration: 0, type: "box", file_id: item.id});
                    });
                    if (playlist.tracks.length === 0) {
                        return;
                    }
                    sendPlayer(function(window) {
                        window.engine.setM3UPlaylists({list: [playlist]});
                        window.engine.select_playlist(0);
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
                playlist.tracks.push({id: -1, file: {name: item.name, url: undefined}, tags: {}, duration: 0, type: "box", file_id: item.id});
            });
            if (playlist.tracks.length === 0) {
                return;
            }
            sendPlayer(function(window) {
                window.engine.setM3UPlaylists({list: [playlist]});
                window.engine.select_playlist(0);
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
            fl.append($('<li>', {'class': 'sd_file', 'data-id': -1}).append($('<span>', {title: "Go Back", text: "Go Back"})));
        }
        var n = -1;
        list.data.forEach(function(item) {
            n++;
            var filename = item.name;
            var is_dir = (item.type === 'folder');
            if (!is_dir && item.type !== 'audio') {
                return 1;
            }
            var action = '';
            if (is_dir) {
                action = $('<div>', {'class': 'play', title: 'Play folder'});
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
            if ('album' in item && item.album !== null) {
                tags.album = item.album;
            }
            if (('artist' in item && item.artist !== null) || ('album_artist' in item && item.album_artist !== null)) {
                tags.artist = item.artist || item.album_artist;
            }
            tags.title = item.title || item.name;
            if ('picture' in item && item.picture !== null) {
                tags.artwork = item.picture;
            }
            return tags;
        }
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
                var is_dir = (item.type === 'folder');
                if (is_dir) {
                    folder_id = item.id;
                } else {
                    var ch_box = $(this).children('input');
                    ch_box.get(0).checked = !ch_box.get(0).checked;
                    ch_box.trigger('change');
                    return;
                }
            }
            sendPlayer(function(window) {
                window.cloud.sd.getFilelist(folder_id, function(list) {
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
            var is_dir = (item.type === 'folder');
            if (!is_dir) {
                return;
            }
            var folder_id = item.id;
            var _window = window;
            var pl_name = item.name || "SkyDrive";
            sendPlayer(function(window) {
                window.cloud.sd.getFilelist(folder_id, function(list) {
                    var playlist = {name: pl_name, id: 0, type: "sd", tracks: []};
                    list.data.forEach(function(item) {
                        var is_dir = (item.type === 'folder');
                        if (is_dir || item.type !== 'audio') {
                            return 1;
                        }
                        var filename = item.name;
                        var tags = read_tags(item);
                        playlist.tracks.push({id: -1, file: {name: tags.title, url: item.link.replace('/redir.', '/download.')}, tags: undefined, meta: tags, duration: 0, type: 'sd'});
                    });
                    if (playlist.tracks.length === 0) {
                        return;
                    }
                    sendPlayer(function(window) {
                        window.engine.setM3UPlaylists({list: [playlist]});
                        window.engine.select_playlist(0);
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
                var is_dir = (item.type === 'folder');
                if (is_dir) {
                    return 1;
                }
                var filename = item.name;
                var tags = read_tags(item);
                playlist.tracks.push({id: -1, file: {name: tags.title, url: item.link.replace('/redir.', '/download.')}, tags: undefined, meta: tags, duration: 0, type: 'sd'});
            });
            if (playlist.tracks.length === 0) {
                return;
            }
            sendPlayer(function(window) {
                window.engine.setM3UPlaylists({list: [playlist]});
                window.engine.select_playlist(0);
            });
            window.close();
        });
    };
    return {
        run: function() {
            $('.close').on('click', function() {
                window.close();
            });
            sendPlayer(function(window) {
                window.engine.set_hotkeys(document);
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
            }
        }
    };
}();

$(function() {
    dialog.run();
});