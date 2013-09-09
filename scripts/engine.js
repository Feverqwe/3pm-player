var _debug = false;
var engine = function() {
	var playlist = [];
	var covers = []
	var add_cover = function(len, bin, type) {
		covers.forEach(function(item) {
			if ( item.len === len && item.type === type ) {
				return item.id;
			}
		});
		var id = covers.length;
		covers.push({id: id, len: len, data: bin, type: type});
		return id;
	}
	var player = function() {
		var audio = null;
		var current_id = null;
		var read_tags = function(file, m_cb) {
			if (file.size > 31457280) {
				return;
			}
			function loadUrl(url, callback, reader) {
				ID3.loadTags(url, function() {
					var tags = ID3.getAllTags(url);

					if ("picture" in tags) {
						var image = tags.picture;
						var binary = image.data.reduce(function(str, charIndex) {
							return str += String.fromCharCode(charIndex);
						}, '');
						tags.picture = null;
						var index = binary.indexOf('JFIF');
						var type = "jpeg"
						var pos = 6;
						if (index === -1) {
							index = binary.indexOf('PNG');
							type = "png"
							pos = 1;
						}
						if (index === -1) {
							var bin = String.fromCharCode.apply(null, [255, 216, 255, 225]);
							index = binary.indexOf(bin);
							type = "jpeg"
							pos = 0;
						}
						if (index !== -1) {
							binary = binary.substr(index - pos);
							tags.picture = add_cover(binary.length, binary, type);
						} else {
							if (_debug) {
								console.log('Can\'t show image!');
							}
							delete tags.picture
						}
					}
					$.each(tags, function(key) {
						if ($.inArray(key, ["artist", "title", "album", "picture"]) === -1) {
							delete tags[key]
						}
					});

					m_cb(tags);
					view.setTags(tags);
				},
						{tags: ["artist", "title", "album", "picture"], dataReader: reader});
			}
			var url = file.urn || file.name;
			var t = FileAPIReader(file);
			loadUrl(url, null, t);
		};
		var getType = function(filename) {
			var types = ["audio/mp3", "audio/mp4", "audio/ogg"];
			var ext = filename.split('.').slice(-1)[0].toLowerCase();
			var type = types[0];
			if (ext === "mp4") {
				type = types[1];
			} else
			if (ext === "m4a") {
				type = types[1];
			} else
			if (ext === "ogg") {
				type = types[2];
			}
		};
		return {
			open: function(id) {
				if (playlist[id] === undefined) {
					return;
				}
				current_id = id;
				audio.type = getType(playlist[id].file.name);
				audio.src = window.URL.createObjectURL(playlist[id].file);
			},
			get_filename: function() {
				return playlist[current_id].file.name;
			},
			play: function() {
				audio.play();
			},
			pause: function() {
				audio.pause();
			},
			next: function() {
				var id = current_id + 1;
				if (playlist.length <= id) {
					id = 0;
				}
				player.open(id);
			},
			preview: function() {
				var id = current_id - 1;
				if (id < 0) {
					id = playlist.length - 1;
				}
				player.open(id);
			},
			status: function() {
				var status = {};
				status['paused'] = audio.paused;
				status['muted'] = audio.muted;
				status['volume'] = audio.volume;
				status['duration'] = audio.duration;
				status['currentTime'] = audio.currentTime;
				status['ended '] = audio.ended;
				status['seeking '] = audio.seeking;
				status['seekable '] = audio.seekable;
				if (_debug) {
					console.log(status);
				}
				return status;
			},
			volume: function(persent) {
				if (persent === undefined) {
					view.setVolume(audio.volume);
					return;
				}
				if (audio.muted) {
					audio.muted = false;
				}
				audio.volume = 1.0 / 100 * persent;
			},
			position: function(persent) {
				if (isNaN(audio.duration))
					return;
				audio.currentTime = audio.duration / 100 * persent;
			},
			loop: function() {

			},
			mute: function() {
				audio.muted = !audio.muted;
			},
			getMute: function() {
				return audio.muted;
			},
			init: function(audio_el) {
				$('.engine').append('<audio/>');
				audio = $('.engine > audio').get(0);
				$(audio).on('loadstart', function(e) {
					view.setTags(playlist[current_id].tags || {});
					view.state("loadstart");
				});
				$(audio).on('progress', function(e) {
					view.state("progress");
				});
				$(audio).on('suspend', function(e) {
					view.state("suspend");
				});
				$(audio).on('abort', function(e) {
					view.state("abort");
				});
				$(audio).on('error', function(e) {
					view.state("error");
				});
				$(audio).on('emptied', function(e) {
					view.state("emptied");
				});
				$(audio).on('stalled', function(e) {
					view.state("stalled");
				});
				$(audio).on('play', function(e) {
					view.state("play");
				});
				$(audio).on('pause', function(e) {
					view.state("pause");
				});
				$(audio).on('loadedmetadata', function(e) {
					playlist[current_id].duration = this.duration;
					view.state("loadedmetadata");
				});
				$(audio).on('loadeddata', function(e) {
					if (playlist[current_id].tags === null) {
						read_tags(playlist[current_id].file, function(tags) {
							var obj = {};
							if ("title" in tags) {
								obj['title'] = tags.title;
							}
							if ("artist" in tags) {
								obj['artist'] = tags.artist;
							}
							if ("album" in tags) {
								obj['album'] = tags.album;
							}
							if ("picture" in tags) {
								obj['picture'] = tags.picture;
							}
							playlist[current_id].tags = obj;
						});
					} else {
						view.setTags(playlist[current_id].tags);
					}
					view.state("loadeddata");
				});
				$(audio).on('waiting', function(e) {
					view.state("waiting");
				});
				$(audio).on('playing', function(e) {
					view.state("playing");
				});
				$(audio).on('canplay', function(e) {
					view.state("canplay");
					view.setVolume(audio.volume);
				});
				$(audio).on('canplaythrough', function(e) {
					view.state("canplaythrough");
				});
				$(audio).on('seeking', function(e) {
					view.state("seeking");
				});
				$(audio).on('seeked', function(e) {
					view.state("seeked");
				});
				$(audio).on('timeupdate', function(e) {
					view.setProgress(this.duration, this.currentTime);
				});
				$(audio).on('ended', function(e) {
					if (current_id !== playlist.length - 1) {
						player.next();
					}
					view.state("ended");
				});
				$(audio).on('ratechange', function(e) {
					view.state("ratechange");
				});
				$(audio).on('durationchange', function(e) {
					view.state("durationchange");
				});
				$(audio).on('volumechange', function(e) {
					view.state("volumechange");
					view.setVolume(audio.volume);
				});
			}
		}
	}();
	return {
		run: function() {
			$('.engine').remove();
			$('body').append('<div class="engine"/>');
			player.init();
		},
		get_filename: player.get_filename,
		open: function(files) {
			if (files.length === 0) {
				return;
			}
			playlist = [];
			covers = [];
			for (var i = 0; i < files.length; i++) {
				if ($.inArray(files[i].name.split('.').slice(-1)[0].toLowerCase(), ['mp3', 'm4a', 'mp4', 'ogg']) === -1) {
					continue;
				}
				playlist.push({id: playlist.length, file: files[i], tags: null, duration: null});
			}
			if (playlist.length > 0) {
				view.state("playlist_not_empty");
				player.open(0);
			} else {
				player.pause();
				view.state("emptied");
				view.state("playlist_is_empty");
			}
		},
		play: player.play,
		pause: player.pause,
		next: player.next,
		preview: player.preview,
		position: player.position,
		volume: player.volume,
		mute: player.mute,
		getMute: player.getMute,
		getCover: function(id) {
			return covers[id];
		}
	}
}();
$(function() {
	engine.run();
});