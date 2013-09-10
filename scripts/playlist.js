var _player = null;
var playlist = function() {
	var engine = null;
	var dom_cache = {};
	var var_cache = {};
	var sendPlayer = function(callback) {
		if (_player === null || _player.window === null) {
			chrome.runtime.getBackgroundPage(function(bg) {
				_player = bg.wm.getPlayer(wm_id);
				if (_player !== null) {
					callback();
				}
			});
		} else {
			callback();
		}
	};
	var item_read = function(item) {
		var title = '';
		var info = '';
		var pic = 'none';
		var tags = item.tags;
		if (item.tags === null) {
			title = item.file.name;
		} else {
			if ("title" in tags) {
				title = item.tags.title;
			} else {
				title = item.file.name;
			}
			if ("album" in tags && "artist" in tags) {
				info = tags.artist + ' - ' + tags.album;
			} else
			if ("artist" in tags) {
				info = tags.artist;
			} else
			if ("album" in tags) {
				info = tags.album;
			}
			if ("picture" in tags) {
				pic = tags.picture;
			}
		}
		return {title: title, info: info, pic: pic};
	};
	var add_image = function(id) {
		if (id === "none") {
			return;
		}
		sendPlayer(function() {
			var cover = _player.engine.getCover(id);
			var img = "data:image/" + cover.type + ";base64," + btoa(cover.data);
			$('body').remove('style.pic_' + id).append('<style class="pic_' + id + '">.pic_' + id + '{background-image:url(' + img + ');}</style>');
		});
	};
	var write_playlist = function(items) {
		dom_cache.playlist_ul.empty();
		var n = 0;
		items.forEach(function(item) {
			item = item_read(item);
			add_image(item.pic);
			dom_cache.playlist_ul.append('<li data-id="' + n + '"><div class="cover ' + 'pic_' + item.pic + '"></div><span class="name">' + item.title + '</span><span class="info">' + item.info + '</span></li>');
			n++;
		});
	};
	var update_playlist_item = function(id, item) {
		var itm = $('li[data-id=' + id + ']');
		item = item_read(item);
		add_image(item.pic);
		itm.children('.cover').attr('class', 'cover pic_' + item.pic);
		itm.children('.name').text(item.title);
		itm.children('.info').text(item.info);
	};
	return {
		show: function() {
			dom_cache = {
				playlist: $('div.playlist'),
				playlist_ul: $('div.playlist ul'),
				shuffle: $('.shuffle.btn')
			};
			$('.close').on('click', function() {
				window.close();
			});
			$('.mini').on('click', function() {
				chrome.app.window.current().minimize();
			});
			sendPlayer(function() {
				if (_player.engine !== null) {
					write_playlist(_player.engine.getPlaylist());
				}
			});
			dom_cache.playlist_ul.on('click', 'li', function() {
				var id = $(this).attr('data-id');
				sendPlayer(function() {
					_player.engine.open_id(id);
				});
			});
			dom_cache.shuffle.on('click', function() {
				sendPlayer(function() {
					_player.engine.shuffle();
				});
			});
			sendPlayer(function() {
				_player.engine.shuffle(null);
			});
			window.onresize = function() {
				dom_cache.playlist.css('height', (window.innerHeight - 45) + "px");
			};
			$(window).trigger('resize');
			var save_pos = function() {
				var wl = window.screenLeft;
				var wr = window.screenTop;
				if (var_cache['wl'] !== wl || var_cache['wr'] !== wr) {
					var_cache['wl'] = wl;
					var_cache['wr'] = wr;
					chrome.storage.local.set({'pl_pos_left': wl, 'pl_pos_top': wr});
				}
			};
			setInterval(save_pos, 1000);
		},
		setPlaylist: function(items) {
			write_playlist(items);
		},
		updPlaylistItem: function(id, item) {
			update_playlist_item(id, item);
		},
		selected: function(id) {
			$('li.selected').removeClass('selected');
			$('li[data-id=' + id + ']').addClass('selected');
		},
		setShuffle: function(status) {
			chrome.storage.local.set({'shuffle': status});
			if (status) {
				dom_cache.shuffle.css('background-image', 'url(images/shuffle_on.png)');
			} else {
				dom_cache.shuffle.css('background-image', 'url(images/shuffle.png)');
			}
		}
	};
}();
$(function() {
	playlist.show();
});