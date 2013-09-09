chrome.app.runtime.onLaunched.addListener(function() {

	chrome.storage.local.get(function(storage) {
		if ('pos_left' in storage && 'pos_top' in storage) {
			create_window(storage.pos_left, storage.pos_top);
		} else {
			create_window(30, 30);
		}
	});
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
		});
	};
});
