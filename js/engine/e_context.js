engine.context = function() {
    var custom_menu = {
        track: {}
    };
    var context_menu = {
        openFiles: {
            title: chrome.i18n.getMessage("ctx_open_files"),
            contexts: ['page', 'launcher'],
            action: function () {
                var accepts = [
                    {
                        extensions: ['m3u'].concat( engine.player.allow_ext ),
                        mimeTypes: ['audio/*', 'video/*']
                    }
                ];
                chrome.fileSystem.chooseEntry({type: 'openFile', accepts: accepts, acceptsAllTypes: true, acceptsMultiple: true}, function (entryList) {
                    engine.files.readAnyFiles(entryList, function(collections) {
                        if (collections === undefined) {
                            return;
                        }
                        engine.wm.createWindow({type: 'm3u', config: {type: 'm3u', collectionList: collections, join: 1, cb: function(index) {
                            engine.playlist.emptyPlaylist(function(){
                                engine.playlist.appendPlaylist(collections, function() {
                                    engine.playlist.selectPlaylist(collections[index].id);
                                });
                            });
                        }}});
                    });
                });
            }
        },
        openDirectory: {
            title: chrome.i18n.getMessage("ctx_open_folder"),
            contexts: ['page', 'launcher'],
            action: function () {
                chrome.fileSystem.chooseEntry({type: 'openDirectory'}, function (entry) {
                    engine.files.readAnyFiles([entry], function(collections) {
                        engine.wm.createWindow({type: 'm3u', config: {type: 'm3u', collectionList: collections, join: 1, cb: function(index) {
                            engine.playlist.emptyPlaylist(function(){
                                engine.playlist.appendPlaylist(collections, function() {
                                    engine.playlist.selectPlaylist(collections[index].id);
                                });
                            });
                        }}});
                    });
                });
            }
        },
        openURL: {
            title: chrome.i18n.getMessage("ctx_open_url"),
            contexts: ['page', 'launcher'],
            action: function (url) {
                engine.wm.createWindow({type: 'url', config: {type: "url", url: url, cb: function(collection) {
                    var collections = [collection];
                    engine.playlist.emptyPlaylist(function(){
                        engine.playlist.appendPlaylist(collections, function() {
                            engine.playlist.selectPlaylist(collections[0].id);
                        });
                    });
                }}});
            }
        },
        selectPlaylist: {
            title: chrome.i18n.getMessage("playlist_select"),
            contexts: ['page', 'launcher'],
            action: function () {
                var collections = engine.playlist.memory.collectionList;
                if (collections.length < 2) {
                    return;
                }
                var id = undefined;
                if (engine.playlist.memory.collection !== undefined) {
                    id = engine.playlist.memory.collection.id;
                }
                engine.wm.createWindow({type: 'm3u', config: {type: 'm3u', collectionList: collections, id: id, cb: function(index) {
                    engine.playlist.selectPlaylist(collections[index].id);
                }}});
            }
        },
        webUI: {
            type: "checkbox",
            title: chrome.i18n.getMessage("ctx_webui"),
            contexts: ['page', 'launcher'],
            checked: false,
            action: function () {
                var state = engine.webui.active();
                if (state === false) {
                    engine.webui.start();
                } else {
                    engine.webui.stop();
                }
            }
        },
        viz: {
            title: chrome.i18n.getMessage("ctx_viz"),
            contexts: ['page', 'launcher'],
            action: function () {
                var adapter = engine.player.getAdapter();
                engine.wm.createWindow({type: 'viz', config: {adapter: adapter}});
            }
        },
        cloud: {
            title: chrome.i18n.getMessage("ctx_cloud"),
            contexts: ['page']
        },
        vk: {
            parentId: "cloud",
            title: "vk.com",
            contexts: ['page', 'launcher'],
            action: function () {
                engine.cloud.vk.makeAlbums(function (collections) {
                    engine.wm.createWindow({type: 'm3u', config: {type: 'm3u', collectionList: collections, cb: function(index) {
                        engine.playlist.emptyPlaylist(function(){
                            engine.playlist.appendPlaylist(collections, function() {
                                engine.playlist.selectPlaylist(collections[index].id);
                            });
                        });
                    }}});
                });
            }
        },
        sc: {
            parentId: "cloud",
            title: "soundcloud.com",
            contexts: ['page', 'launcher'],
            action: function () {
                engine.cloud.sc.makeAlbums(function (collections) {
                    engine.wm.createWindow({type: 'm3u', config: {type: 'm3u', collectionList: collections, cb: function(index) {
                        engine.playlist.emptyPlaylist(function(){
                            engine.playlist.appendPlaylist(collections, function() {
                                engine.playlist.selectPlaylist(collections[index].id);
                            });
                        });
                    }}});
                });
            }
        },
        gd: {
            parentId: "cloud",
            title: "drive.google.com",
            contexts: ['page', 'launcher'],
            action: function () {
                engine.cloud.gd.getFileList(undefined, function (list) {
                    engine.wm.createWindow({type: 'filelist', config: {type: "gd", filelist: list, cb: function(collection) {
                        var collections = [collection];
                        engine.playlist.emptyPlaylist(function(){
                            engine.playlist.appendPlaylist(collections, function() {
                                engine.playlist.selectPlaylist(collections[0].id);
                            });
                        });
                    }}});
                });
            }
        },
        db: {
            parentId: "cloud",
            title: "dropbox.com",
            contexts: ['page', 'launcher'],
            action: function () {
                engine.cloud.db.getFileList(function (list) {
                    engine.wm.createWindow({type: 'filelist', config: {type: "db", filelist: list, cb: function(collection) {
                        var collections = [collection];
                        engine.playlist.emptyPlaylist(function(){
                            engine.playlist.appendPlaylist(collections, function() {
                                engine.playlist.selectPlaylist(collections[0].id);
                            });
                        });
                    }}});
                });
            }
        },
        sd: {
            parentId: "cloud",
            title: "onedrive.com",
            contexts: ['page', 'launcher'],
            action: function () {
                engine.cloud.od.getFileList(undefined, function (list) {
                    engine.wm.createWindow({type: 'filelist', config: {type: "od", filelist: list, cb: function(collection) {
                        var collections = [collection];
                        engine.playlist.emptyPlaylist(function(){
                            engine.playlist.appendPlaylist(collections, function() {
                                engine.playlist.selectPlaylist(collections[0].id);
                            });
                        });
                    }}});
                });
            }
        },
        p_play_pause: {
            title: chrome.i18n.getMessage("btnPlayPause"),
            contexts: ['launcher'],
            action: function () {
                engine.player.playToggle();
            }
        },
        p_next: {
            title: chrome.i18n.getMessage("btnNextTrack"),
            contexts: ['launcher'],
            action: function () {
                engine.playlist.next();
            }
        },
        p_previous: {
            title: chrome.i18n.getMessage("btnPreviousTrack"),
            contexts: ['launcher'],
            action: function () {
                engine.playlist.preview();
            }
        },
        options: {
            title: chrome.i18n.getMessage("ctx_options"),
            contexts: ['page', 'launcher'],
            action: function () {
                engine.wm.createWindow({type: 'options', config: {def_settings: engine.settings.def_settings}});
            }
        }
    };
    chrome.contextMenus.onClicked.addListener(function (info) {
        if (custom_menu.track[info.menuItemId] !== undefined) {
            return custom_menu.track[info.menuItemId].action(info);
        }
        if (context_menu[info.menuItemId] !== undefined &&
            context_menu[info.menuItemId].action !== undefined) {
            context_menu[info.menuItemId].action(info);
        }
    });
    var update = function (id, updateProperties, cb) {
        // добавить ту часть, где обновляется запись в context_menu
        $.extend(context_menu[id], updateProperties);
        chrome.contextMenus.update(id, updateProperties, cb);
    };
    var create = function() {
        chrome.contextMenus.removeAll(function () {
            // создает контекстное меню
            $.each(context_menu, function (k, v) {
                if (v.hide === 1) {
                    return 1;
                }
                var item = {
                    id: v.id || k,
                    title: v.title,
                    contexts: v.contexts
                };
                if (v.parentId !== undefined) {
                    item.parentId = v.parentId;
                }
                if (v.type !== undefined) {
                    item.type = v.type;
                }
                chrome.contextMenus.create(item);
            });
            $.each(custom_menu.track, function(k, v) {
                var item = {
                    id: v.id || k,
                    title: v.title,
                    contexts: v.contexts
                };
                if (v.parentId !== undefined) {
                    item.parentId = v.parentId;
                }
                if (v.type !== undefined) {
                    item.type = v.type;
                }
                chrome.contextMenus.create(item);
            });
        });
    };
    create();
    var showMenu = function() {
        engine.wm.createWindow({type: 'menu', config: {
            type: "menu",
            list: $.extend({},context_menu, custom_menu.track)
        }});
    };
    return {
        custom_menu: custom_menu,
        menu: context_menu,
        update: update,
        create: create,
        showMenu: showMenu,
        empty: function() {
            // удаляет кастомные пункты из контекстного меню
            $.each(custom_menu.track, function(k) {
                chrome.contextMenus.remove(k);
            });
            engine.context.custom_menu.track = {};
        }
    };
}();