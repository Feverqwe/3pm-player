var wm = function() {
    var app_windows = [];
    var create_player_window = function() {
        var create_window = function(p_l, p_t) {
            chrome.app.window.create('index.html', {
                bounds: {
                    width: 335,
                    height: 113,
                    left: p_l,
                    top: p_t
                },
                frame: "none",
                resizable: false
            }, function(win) {
                win.contentWindow.window.wm_id = app_windows.length;
                app_windows.push({player: win, playlist: null});
            });
        };
        chrome.storage.local.get(function(storage) {
            if ('pos_left' in storage && 'pos_top' in storage) {
                create_window(storage.pos_left, storage.pos_top);
            } else {
                create_window(30, 30);
            }
        });
    };
    var create_playlist_window = function(wm_id) {
        wm_id = check(wm_id);
        if (app_windows[wm_id] === undefined || app_windows[wm_id].player === null) {
            return;
        }
        if (app_windows[wm_id].playlist !== null) {
            app_windows[wm_id].playlist.focus();
            return;
        }
        var create_window = function(p_l, p_t, pl_w, pl_h) {
            chrome.app.window.create('playlist.html', {
                bounds: {
                    width: pl_w || 335,
                    height: pl_h || 400,
                    left: p_l,
                    top: p_t
                },
                frame: "none"
            }, function(win) {
                win.contentWindow.window.wm_id = wm_id;
                app_windows[wm_id].playlist = win;
            });
        };
        chrome.storage.local.get(function(storage) {
            if ('pl_pos_left' in storage && 'pl_pos_top' in storage) {
                var pl_w = ('pl_w' in storage) ? storage.pl_w : null;
                var pl_h = ('pl_h' in storage) ? storage.pl_h : null;
                create_window(storage.pl_pos_left, storage.pl_pos_top, pl_w, pl_h);
            } else {
                create_window(30, 30, null, null);
            }
        });
    };
    var check = function(wm_id) {
        app_windows.forEach(function(item) {
            if (item.player !== null && item.player.contentWindow.window === null) {
                item.player = null;
            }
            if (item.playlist !== null) {
                if (item.playlist.contentWindow.window === null) {
                    item.playlist = null;
                } else
                if (item.player === null && item.playlist.contentWindow.window !== null) {
                    item.playlist.contentWindow.close();
                    item.playlist = null;
                }
            }
        });
        var count = app_windows.length;
        var num = 0;
        while (count > 0) {
            if (app_windows[num] === undefined) {
                num++;
            } else {
                if (app_windows[num].player === null) {
                    app_windows.splice(num, 1);
                } else {
                    num++;
                }
                count--;
            }
        }
        for (var i = 0; i < app_windows.length; i++) {
            var item = app_windows[i];
            if (item.player !== null) {
                if (wm_id !== undefined && i !== wm_id && wm_id === item.player.contentWindow.window.wm_id) {
                    wm_id = i;
                }
                item.player.contentWindow.window.wm_id = i;
            }
            if (item.playlist !== null) {
                item.playlist.contentWindow.window.wm_id = i;
            }
        }
        return wm_id;
    };
    var web_socket = function() {
        var server_socketId = null;
        var WebsocketFrameString = function(str) {
            var length = str.length;
            var buffer = new ArrayBuffer(length);
            var bv = new Uint8Array(buffer);
            for (var i = 0; i < str.length; i++) {
                bv[i] = str.charCodeAt(i);
            }
            return buffer;
        };
        var arrayBufferToString = function(buffer) {
            var array = new Uint8Array(buffer);
            var str = '';
            for (var i = 0; i < array.length; ++i) {
                str += String.fromCharCode(array[i]);
            }
            return str;
        };

        var response_ = function(socketId, headerMap, code, content) {
            var header = WebsocketFrameString("HTTP/1.1 " + code + "\n" + "Content-Length: " + content.byteLength + "\n" + "\n");

            chrome.socket.write(socketId, header, function(e) {
                //console.log(e);
            });

            chrome.socket.write(socketId, content, function(e) {
                //console.log(e);
            });

            var keepAlive = ('Connection' in headerMap && headerMap['Connection'] === 'keep-alive');
            if (keepAlive) {
                chrome.socket.setKeepAlive(socketId, true, 60, function(e) {
                    //console.log(e);
                });
                readRequestFromSocket_(socketId);
            }
            else {
                chrome.socket.disconnect(socketId);
                chrome.socket.destroy(socketId);
            }
        };

        var readUrl = function(headerMap, socketId) {
            if (!'url' in headerMap) {
                return response_(socketId, headerMap, "200", WebsocketFrameString("Don't have url!"));
            }
            var player = wm.getPlayer(0);
            if (player === null) {
                return response_(socketId, headerMap, "200", WebsocketFrameString("Player don't run!"));
            }
            if (headerMap.url === '/') {
                headerMap.url = '/index.html';
            } else
            if (headerMap.url === '/favicon.ico') {
                headerMap.url = '/../icon_16.png';
            } else
            if (headerMap.url === '/js/jquery-2.0.3.min.js') {
                headerMap.url = '/../scripts/jquery-2.0.3.min.js';
            }
            if (headerMap.url.substr(0, 8) === '/images/') {
                headerMap.url = '/..' + headerMap.url;
            }

            var is_xhr = false;
            if (headerMap.url.substr(0, 4) === '/pl/') {
                var id = headerMap.url.substr(4);
                player.engine.open_id(id);
                return response_(socketId, headerMap, "200 OK\nLocation: /\nCache-Control: no-cache\nContent-Type: application/json", WebsocketFrameString(player.engine.APIstatus()));
            } else
            if (headerMap.url === '/playlist') {
                return response_(socketId, headerMap, "200 OK\nLocation: /\nCache-Control: no-cache\nContent-Type: text/html", WebsocketFrameString(player.engine.APIplaylist()));
            } else
            if (headerMap.url === '/status') {
                return response_(socketId, headerMap, "200 OK\nLocation: /\nCache-Control: no-cache\nContent-Type: application/json", WebsocketFrameString(player.engine.APIstatus()));
            } else
            if (headerMap.url === '/play') {
                player.engine.play();
                return response_(socketId, headerMap, "200 OK\nLocation: /\nCache-Control: no-cache\nContent-Type: application/json", WebsocketFrameString(player.engine.APIstatus()));
            } else
            if (headerMap.url === '/pause') {
                player.engine.pause();
                return response_(socketId, headerMap, "200 OK\nLocation: /\nCache-Control: no-cache\nContent-Type: application/json", WebsocketFrameString(player.engine.APIstatus()));
            } else
            if (headerMap.url === '/next') {
                player.engine.next();
                return response_(socketId, headerMap, "200 OK\nLocation: /\nCache-Control: no-cache\nContent-Type: application/json", WebsocketFrameString(player.engine.APIstatus()));
            } else
            if (headerMap.url === '/preview') {
                player.engine.preview();
                return response_(socketId, headerMap, "200 OK\nLocation: /\nCache-Control: no-cache\nContent-Type: application/json", WebsocketFrameString(player.engine.APIstatus()));
            } else {
                is_xhr = true;
                var xhr = new XMLHttpRequest();
                xhr.open('GET', '/www' + headerMap.url, true);
                xhr.responseType = 'arraybuffer';
                xhr.onreadystatechange = function() {
                    if (xhr.readyState === 4 && xhr.status === 200) {
                        var resp = this.response;
                        response_(socketId, headerMap, xhr.status + " " + xhr.statusText, resp);
                    }
                };
                xhr.onerror = function() {
                    if (xhr.readyState === 4 && xhr.status !== 200) {
                        response_(socketId, headerMap, "500", WebsocketFrameString('Nothing'));
                    }
                };
                xhr.timeout = 100;
                xhr.send(null);
            }
            if (is_xhr === false) {
                response_(socketId, headerMap, "200", WebsocketFrameString('Do it more!'));
            }
        };
        var readRequestFromSocket_ = function(socketId) {
            var requestData = '';
            var endIndex = 0;
            var onDataRead = function(readInfo) {
                if (readInfo.resultCode <= 0) {
                    chrome.socket.disconnect(socketId);
                    chrome.socket.destroy(socketId);
                    console.log('break');
                    return;
                }
                requestData += arrayBufferToString(readInfo.data).replace(/\r\n/g, '\n');
                endIndex = requestData.indexOf('\n\n', endIndex);
                if (endIndex === -1) {
                    endIndex = requestData.length - 1;
                    chrome.socket.read(socketId, onDataRead);
                    return;
                }

                var headers = requestData.substring(0, endIndex).split('\n');
                var headerMap = {};
                // headers[0] should be the Request-Line
                var requestLine = headers[0].split(' ');
                headerMap['method'] = requestLine[0];
                headerMap['url'] = requestLine[1];
                headerMap['Http-Version'] = requestLine[2];
                for (var i = 1; i < headers.length; i++) {
                    requestLine = headers[i].split(':', 2);
                    if (requestLine.length === 2)
                        headerMap[requestLine[0]] = requestLine[1].trim();
                }

                //console.log(headerMap)

                readUrl(headerMap, socketId);


            };
            chrome.socket.read(socketId, onDataRead);
        };
        var onConnection_ = function(acceptInfo) {
            readRequestFromSocket_(acceptInfo.socketId);
        };
        var acceptConnection_ = function(socketId) {
            chrome.socket.accept(socketId, function(acceptInfo) {
                onConnection_(acceptInfo);
                acceptConnection_(socketId);
            });
        };
        var start = function() {
            chrome.socket.create("tcp", {}, function(createInfo) {
                server_socketId = createInfo.socketId;
                chrome.socket.listen(server_socketId, '0.0.0.0', 9898, 50, function(e) {
                    acceptConnection_(server_socketId);
                });
            });
        };
        var write = function(data) {
            data += '\n\n';
            var client_socketId = null;
            var binary = WebsocketFrameString(data);
            chrome.socket.create("tcp", {}, function(createInfo) {
                client_socketId = createInfo.socketId;
                chrome.socket.connect(client_socketId, '127.0.0.1', 9898, function(e) {
                    chrome.socket.write(client_socketId, binary, function(e) {
                        //console.log(e);
                    });
                });
            });
        };
        var getInfo = function() {
            chrome.socket.getInfo(server_socketId, function(e) {
                console.log(e);
            });
        };
        return {
            start: start,
            write: write,
            info: getInfo,
            stop: function() {
                chrome.socket.disconnect(server_socketId);
                chrome.socket.destroy(server_socketId);
            }
        };
    }();
    return {
        get_player: function() {
            check();
            if (app_windows.length === 0) {
                create_player_window();
            } else {
                app_windows.forEach(function(item) {
                    if (item.playlist !== null) {
                        item.playlist.focus();
                    }
                    if (item.player !== null) {
                        item.player.focus();
                    }
                });
            }
        },
        create_player: create_player_window,
        create_playlist: create_playlist_window,
        toggle_playlist: function(wm_id) {
            wm_id = check(wm_id);
            if (app_windows[wm_id] !== undefined && app_windows[wm_id].playlist !== null) {
                app_windows[wm_id].playlist.contentWindow.close();
            } else {
                create_playlist_window(wm_id);
            }
        },
        getPlayer: function(wm_id) {
            if (app_windows[wm_id] === undefined ||
                    app_windows[wm_id].player === null ||
                    app_windows[wm_id].player.contentWindow.window === null) {
                return null;
            }
            return app_windows[wm_id].player.contentWindow.window;
        },
        getPlaylist: function(wm_id) {
            if (app_windows[wm_id] === undefined ||
                    app_windows[wm_id].playlist === null ||
                    app_windows[wm_id].playlist.contentWindow.window === null) {
                return null;
            }
            return app_windows[wm_id].playlist.contentWindow.window;
        },
        ws: web_socket
    };
}();
chrome.app.runtime.onLaunched.addListener(function() {
    wm.get_player();
});