Colorhythm.onerror = function(e) {
	$('.error-msg')
		.show()
		.html(e.message);
};

$('.screen').each(function(i, el) {
	var canvas = $(el);
	var scene = null;

	$(window).keyup(function(e) {
		if (e.keyCode == 27) {
			canvas.removeAttr('id');
			$('body').css('overflow', 'auto');
		}
	});

	var fullscreen = $('<a class="button light">enter fullscreen</a>');
	var onoff = $('<a class="button light">visualization off</a>');
	canvas.parent().after(fullscreen);
	fullscreen.after(onoff);
	fullscreen.after(' ');

	fullscreen.click(function() {
		$('body').css('overflow', 'hidden');
		canvas.attr('id', 'fullscreen');
	});

	function loadScene() {
		var name = window.location.hash && window.location.hash.slice(1) || canvas.data('visualization');
		$.getJSON(name, jsonLoaded)
			.fail(function(err){
				var reason = (err.status!=404)?': invalid file':': not found';
				Colorhythm.error('', 'unable load visualization '+name+reason);
				console.log(err);
			});
	}

	function jsonLoaded(data) {
		var promise = new Colorhythm.Scene(data);
		promise.done(sceneCreated);
	}

	function sceneCreated(s) {
		if (scene) {
			scene.powerOff();
		}
		s.screen.canvas(el);
		s.powerOn();
		scene = s;
	}

	$(window).on('hashchange', function() {
		loadScene();
	});

	loadScene();

	// onoff.click(function() {
	// 	if (scr._active) {
	// 		scr.off();
	// 		onoff.html('visualization on');
	// 		onoff.toggleClass('light');
	// 		onoff.toggleClass('dark');
	// 	} else {
	// 		scr.on();
	// 		onoff.html('visualization off');
	// 		onoff.toggleClass('light');
	// 		onoff.toggleClass('dark');
	// 	}
	// });
});