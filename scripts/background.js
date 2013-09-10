var wm = function() {
	var app_windows = [];
	var create_player_window = function() {
		var create_window = function(p_l, p_t) {
			chrome.app.window.create('index.html', {
				bounds: {
					width: 335,
					height: 114,
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
		var create_window = function(p_l, p_t) {
			chrome.app.window.create('index.html', {
				bounds: {
					width: 335,
					height: 400,
					left: p_l,
					top: p_t
				},
				frame: "none",
				resizable: false
			}, function(win) {
				win.contentWindow.window.wm_id = wm_id;
				app_windows[wm_id].playlist = win;
			});
		};
		chrome.storage.local.get(function(storage) {
			if ('pl_pos_left' in storage && 'pl_pos_top' in storage) {
				create_window(storage.pl_pos_left, storage.pl_pos_top);
			} else {
				create_window(30, 30);
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
				if (wm_id !== undefined && wm_id === item.player.contentWindow.window.wm_id) {
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
		create_playlist: create_playlist_window
	};
}();
chrome.app.runtime.onLaunched.addListener(function() {
	wm.get_player();
});