var engine = function() {
	var playlist = [];
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
			open: function(files) {
				if (files.length === 0)
					return;
				playlist = [];
				for (var i = 0; i < files.length; i++) {
					if ( $.inArray( files[i].name.split('.').slice(-1)[0].toLowerCase() , ['mp3', 'm4a', 'mp4', 'ogg']) === -1 ) {
						continue;
					}
					playlist.push({id: playlist.length, file: files[i], tags: null, duration: null});
				}
				if (playlist.length > 0) {
					player.play_file(0);
				} else {
					audio.pause();
					view.state("emptied");
				}
			},
			play_file: function(id) {
				current_id = id;
				$('audio').children('source').remove();
				if (playlist[id].tags === null) {
					read_tags(playlist[id].file, function(tags) {
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
						playlist[id].tags = obj;
					});
				}
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
				if (playlist.length <= current_id + 1) {
					var id = 0;
				} else {
					var id = current_id + 1;
				}
				player.play_file(id);
			},
			preview: function() {
				if (current_id - 1 <= 0) {
					var id = 0;
				} else {
					var id = current_id - 1;
				}
				player.play_file(id);
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
				console.log(status);
				return status;
			},
			volume: function() {

			},
			position: function(persent) {
				audio.currentTime = audio.duration/100*persent;
			},
			loop: function() {

			},
			init: function(audio_el) {
				$('.engine').append('<audio/>');
				audio = $('.engine > audio').get(0);
				$(audio).on('loadstart', function(e) {
					console.log("loadstart");
					view.state("loadstart");
				});
				$(audio).on('progress', function(e) {
					console.log("progress");
					view.state("progress");
				});
				$(audio).on('suspend', function(e) {
					console.log("suspend");
					view.state("suspend");
				});
				$(audio).on('abort', function(e) {
					console.log("abort");
					view.state("abort");
				});
				$(audio).on('error', function(e) {
					console.log("error");
					view.state("error");
				});
				$(audio).on('emptied', function(e) {
					console.log("emptied");
					view.state("emptied");
				});
				$(audio).on('stalled', function(e) {
					console.log("stalled");
					view.state("stalled");
				});
				$(audio).on('play', function(e) {
					console.log("play");
					view.state("play");
				});
				$(audio).on('pause', function(e) {
					console.log("pause");
					view.state("pause");
				});
				$(audio).on('loadedmetadata', function(e) {
					playlist[current_id].duration = this.duration;
					console.log("loadedmetadata");
					view.state("loadedmetadata");
				});
				$(audio).on('loadeddata', function(e) {
					view.setTags(playlist[current_id].tags);
					console.log("loadeddata");
					view.state("loadeddata");
				});
				$(audio).on('waiting', function(e) {
					console.log("waiting");
					view.state("waiting");
				});
				$(audio).on('playing', function(e) {
					console.log("playing");
					view.state("playing");
				});
				$(audio).on('canplay', function(e) {
					console.log("canplay");
					view.state("canplay");
				});
				$(audio).on('canplaythrough', function(e) {
					console.log("canplaythrough");
					view.state("canplaythrough");
				});
				$(audio).on('seeking', function(e) {
					console.log("seeking");
					view.state("seeking");
				});
				$(audio).on('seeked', function(e) {
					console.log("seeked");
					view.state("seeked");
				});
				$(audio).on('timeupdate', function(e) {
					view.setProgress(this.duration, this.currentTime);
					//console.log("timeupdate")
					//console.log(this.currentTime)
					//console.log(this.duration)
				});
				$(audio).on('ended', function(e) {
					if ( current_id !== playlist.length -1 ) {
						player.next();
					}
					console.log("ended");
					view.state("ended");
				});
				$(audio).on('ratechange', function(e) {
					console.log("ratechange");
					view.state("ratechange");
				});
				$(audio).on('durationchange', function(e) {
					console.log("durationchange");
					view.state("durationchange");
				});
				$(audio).on('volumechange', function(e) {
					console.log("volumechange");
					view.state("volumechange");
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
		status: function() {

		},
		get_filename: player.get_filename,
		open: player.open,
		play: player.play,
		pause: player.pause,
		next: player.next,
		preview: player.preview,
		position: player.position
	}
}();
$(function() {
	engine.run();
});