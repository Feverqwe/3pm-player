var web_socket = function() {
    var active = false;
    var not_found = [];
    var cache = {};
    var server_socketId = null;
    var timeout = null;
    var empty_timer = function() {
        clearTimeout(timeout);
        if (!active) {
            return;
        }
        timeout = setTimeout(function() {
            wm.ws.stop();
            wm.ws.start();
        }, 5000);
    };
    var stringToArrayBuffer = function(string) {
        var buffer = new ArrayBuffer(string.length);
        var bufferView = new Uint8Array(buffer);
        for (var i = 0; i < string.length; i++) {
            bufferView[i] = string.charCodeAt(i);
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

    var readUrl = function(headerMap, socketId) {
        if (!'url' in headerMap) {
            return response_(socketId, headerMap, stringToArrayBuffer("Don't have url!"), ['404 Not Found']);
        }
        var player = wm.getPlayer();
        if (player === null) {
            return response_(socketId, headerMap, stringToArrayBuffer("Player don't run!"), ['200 OK']);
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
        if (not_found.indexOf(headerMap.url) >= 0) {
            return response_(socketId, headerMap, stringToArrayBuffer(''), ['404 Not Found']);
        } else
        if (headerMap.url in cache) {
            var data = cache[headerMap.url].data;
            if (headerMap["If-None-Match"] === String(data.byteLength)) {
                return response_(socketId, headerMap, stringToArrayBuffer(''), ["304 Not Modified"]);
            } else {
                var head = JSON.parse(JSON.stringify(cache[headerMap.url].head));
                return response_(socketId, headerMap, data, head);
            }
        } else
        if (headerMap.url.substr(0, 4) === '/pl/') {
            var id = headerMap.url.substr(4);
            player.engine.open_id(id);
            return response_(socketId, headerMap, stringToArrayBuffer(player.engine.APIstatus()), ['200 OK', 'Location: /', 'Cache-Control: no-cache', 'Content-Type: application/json']);
        } else
        if (headerMap.url === '/playlist') {
            return response_(socketId, headerMap, stringToArrayBuffer(player.engine.APIplaylist()), ['200 OK', 'Location: /', 'Cache-Control: no-cache', 'Content-Type: : text/html']);
        } else
        if (headerMap.url === '/status') {
            return response_(socketId, headerMap, stringToArrayBuffer(player.engine.APIstatus()), ['200 OK', 'Location: /', 'Cache-Control: no-cache', 'Content-Type: application/json']);
        } else
        if (headerMap.url === '/play') {
            player.engine.play();
            return response_(socketId, headerMap, stringToArrayBuffer(player.engine.APIstatus()), ['200 OK', 'Location: /', 'Cache-Control: no-cache', 'Content-Type: application/json']);
        } else
        if (headerMap.url === '/pause') {
            player.engine.pause();
            return response_(socketId, headerMap, stringToArrayBuffer(player.engine.APIstatus()), ['200 OK', 'Location: /', 'Cache-Control: no-cache', 'Content-Type: application/json']);
        } else
        if (headerMap.url === '/next') {
            player.engine.next();
            return response_(socketId, headerMap, stringToArrayBuffer(player.engine.APIstatus()), ['200 OK', 'Location: /', 'Cache-Control: no-cache', 'Content-Type: application/json']);
        } else
        if (headerMap.url === '/preview') {
            player.engine.preview();
            return response_(socketId, headerMap, stringToArrayBuffer(player.engine.APIstatus()), ['200 OK', 'Location: /', 'Cache-Control: no-cache', 'Content-Type: application/json']);
        } else
        if (headerMap.url.substr(0, 11) === '/volume_up/') {
            player.engine.volume(headerMap.url.substr(11));
            return response_(socketId, headerMap, stringToArrayBuffer(player.engine.APIstatus()), ['200 OK', 'Location: /', 'Cache-Control: no-cache', 'Content-Type: application/json']);
        } else
        if (headerMap.url.substr(0, 13) === '/volume_down/') {
            player.engine.volume(headerMap.url.substr(13));
            return response_(socketId, headerMap, stringToArrayBuffer(player.engine.APIstatus()), ['200 OK', 'Location: /', 'Cache-Control: no-cache', 'Content-Type: application/json']);
        } else
        if (headerMap.url === '/shuffle') {
            player.engine.shuffle();
            return response_(socketId, headerMap, stringToArrayBuffer(player.engine.APIstatus()), ['200 OK', 'Location: /', 'Cache-Control: no-cache', 'Content-Type: application/json']);
        } else
        if (headerMap.url === '/loop') {
            player.engine.loop();
            return response_(socketId, headerMap, stringToArrayBuffer(player.engine.APIstatus()), ['200 OK', 'Location: /', 'Cache-Control: no-cache', 'Content-Type: application/json']);
        } else {
            is_xhr = true;
            var ext = headerMap.url.substr(headerMap.url.lastIndexOf('.') + 1).toLowerCase();
            var ext_content_type = {
                'png': 'image/png',
                'js': 'application/javascript',
                'css': 'text/css',
                'html': 'text/html; charset=UTF-8'
            };
            var ext = (ext in ext_content_type) ? 'Content-Type: ' + ext_content_type[ext] : '';
            var xhr = new XMLHttpRequest();
            xhr.open('GET', '/www' + headerMap.url, true);
            xhr.responseType = 'arraybuffer';
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4 && xhr.status === 200) {
                    var resp = this.response;
                    var header = ["200 Ok"];
                    if (ext.length > 0) {
                        header.push(ext);
                    }
                    header.push("Cache-control: max-age=172800");
                    header.push("ETag: " + resp.byteLength);
                    cache[headerMap.url] = {data: resp, head: JSON.parse(JSON.stringify(header))};
                    if (headerMap["If-None-Match"] === String(resp.byteLength)) {
                        response_(socketId, headerMap, stringToArrayBuffer(''), ["304 Not Modified"]);
                    } else {
                        response_(socketId, headerMap, resp, header);
                    }
                }
            };
            xhr.onerror = function() {
                if (xhr.readyState === 4 && xhr.status !== 200) {
                    not_found.push(headerMap.url);
                    response_(socketId, headerMap, stringToArrayBuffer(''), ['404 Not Found']);
                }
            };
            xhr.timeout = 100;
            xhr.send(null);
        }
        if (is_xhr === false) {
            response_(socketId, headerMap, stringToArrayBuffer('Do it more!'), ['200 OK']);
        }
    };
    var response_ = function(socketId, headerMap, content, headers) {
        if (headers[0].substr(0, 3) === "304") {
            var head = "HTTP/1.1 " + headers.join('\n');
            var header = stringToArrayBuffer(head + '\n\n');
            chrome.socket.write(socketId, header, function(writeInfo) {
                var keepAlive = headerMap['Connection'] === 'keep-alive';
                if (keepAlive) {
                    empty_timer();
                    readRequestFromSocket_(socketId);
                } else {
                    chrome.socket.destroy(socketId);
                }
            });
            return;
        }
        headers.push("Content-Length: " + content.byteLength);
        headers.push("Connection: keep-alive");
        var head = "HTTP/1.1 " + headers.join('\n');
        var header = stringToArrayBuffer(head + '\n\n');
        chrome.socket.write(socketId, header, function(writeInfo) {
            if (writeInfo.bytesWritten === header.byteLength) {
                chrome.socket.write(socketId, content, function(e) {
                    if (writeInfo.bytesWritten === header.byteLength) {
                        var keepAlive = headerMap['Connection'] === 'keep-alive';
                        if (keepAlive) {
                            empty_timer();
                            readRequestFromSocket_(socketId);
                        }
                    }
                });
            }
        });
    };
    var readRequestFromSocket_ = function(socketId) {
        var requestData = '';
        var endIndex = 0;
        var onDataRead = function(readInfo) {
            empty_timer();
            if (readInfo.resultCode <= 0) {
                chrome.socket.disconnect(socketId);
                chrome.socket.destroy(socketId);
                empty_timer();
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

            return readUrl(headerMap, socketId);


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
        active = true;
        chrome.socket.create("tcp", {}, function(createInfo) {
            server_socketId = createInfo.socketId;
            chrome.socket.listen(createInfo.socketId, '0.0.0.0', 9898, 1, function(e) {
                acceptConnection_(server_socketId);
            });
        });
    };
    var Info = function() {
        chrome.socket.getInfo(server_socketId, function(e) {
            console.log(e);
        });
    };
    var stop = function() {
        active = false;
        chrome.socket.disconnect(server_socketId);
        chrome.socket.destroy(server_socketId);
    };
    return {
        start: start,
        info: Info,
        stop: stop,
        active: function() {
            return active;
        }
    };
}();
var wm = function() {
    var windows = {};
    var screen = [window.screen.width, window.screen.height];
    var win_top_left_pos = function(l, t) {
        if (l === undefined || l > screen[0]) {
            l = 30;
        }
        if (t === undefined || t > screen[1] - 30) {
            t = 30;
        }
        if (l < 0) {
            l = 0;
        }
        if (t < 0) {
            t = 0;
        }
        return [l, t];
    };
    var win_w_h_pos = function(w, h) {
        if (w !== undefined && (w < 50 || w > screen[0])) {
            w = undefined;
        }
        if (h !== undefined && (h < 50 || h > screen[1])) {
            h = undefined;
        }
        return [w, h];
    };
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
                windows.player = win;
            });
        };
        chrome.storage.local.get(function(storage) {
            var lt = win_top_left_pos(storage.pos_left, storage.pos_top);
            create_window(lt[0], lt[1]);
        });
    };
    var create_playlist_window = function() {
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
                windows.playlist = win;
            });
        };
        chrome.storage.local.get(function(storage) {
            var lt = win_top_left_pos(storage.pl_pos_left, storage.pl_pos_top);
            var wh = win_w_h_pos(storage.pl_w, storage.pl_h);
            create_window(lt[0], lt[1], wh[0], wh[1]);
        });
    };
    var create_dialog_window = function(options) {
        if ("dialog" in windows) {
            if (windows.dialog.contentWindow.window === null) {
                delete windows.dialog;
            } else {
                windows.dialog.contentWindow.close();
            }
        }
        var w = options.w || 400;
        var h = options.h || 120;
        var create_window = function(p_l, p_t) {
            chrome.app.window.create('dialog.html', {
                bounds: {
                    width: w,
                    height: h,
                    left: p_l,
                    top: p_t
                },
                resizable: false
            }, function(win) {
                win.contentWindow.options = options;
                windows.dialog = win;
            });
        };
        chrome.storage.local.get(function(storage) {
            var lt = win_top_left_pos(screen[0] / 2 - parseInt(w / 2), screen[1] / 2 - parseInt(h / 2));
            create_window(lt[0], lt[1]);
        });
    };
    var check = function() {
        var player_off = true;
        if ("player" in windows) {
            if (windows.player.contentWindow.window === null) {
                delete windows.player;
            } else {
                player_off = false;
            }
        }
        if ("playlist" in windows) {
            if (player_off) {
                windows.playlist.contentWindow.close();
            }
            if (windows.playlist.contentWindow.window === null) {
                delete windows.playlist;
            }
        }
        return 1;
    };
    return {
        run_player: function() {
            if (check() && "player" in windows === false) {
                create_player_window();
            } else {
                if ("playlist" in windows) {
                    windows.playlist.focus();
                }
                windows.player.focus();
            }
        },
        toggle_playlist: function() {
            if (check() && "playlist" in windows) {
                windows.playlist.contentWindow.close();
            } else {
                create_playlist_window();
            }
        },
        getPlayer: function() {
            return (check() && "player" in windows) ? windows.player.contentWindow.window : null;
        },
        getPlaylist: function() {
            return (check() && "playlist" in windows) ? windows.playlist.contentWindow.window : null;
        },
        showDialog: function(options) {
            create_dialog_window(options);
        },
        ws: web_socket
    };
}();
chrome.app.runtime.onLaunched.addListener(function() {
    wm.run_player();
});
