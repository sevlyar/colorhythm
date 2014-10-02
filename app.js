Colorhythm.onerror = function(e) {
	$('.error-msg')
		.show()
		.html(e.message);
};

$('.screen').each(function(i, el) {
	var canvas = $(el);
	var scr = Colorhythm.Screen();
	scr.canvas(el);
	Colorhythm.loadVisualization(canvas.data('visualization'), scr);

	var fullscreen = $('<a class="button light">enter fullscreen</a>');
	var onoff = $('<a class="button light">visualization off</a>');
	canvas.parent().after(fullscreen);
	fullscreen.after(onoff);
	fullscreen.after(' ');

	fullscreen.click(function() {
		$('body').css('overflow', 'hidden');
		canvas.attr('id', 'fullscreen');
	});

	$(window).keyup(function(e) {
		if (e.keyCode == 27) {
			canvas.removeAttr('id');
			$('body').css('overflow', 'auto');
		}
	});

	onoff.click(function() {
		if (scr._active) {
			scr.off();
			onoff.html('visualization on');
			onoff.toggleClass('light');
			onoff.toggleClass('dark');
		} else {
			scr.on();
			onoff.html('visualization off');
			onoff.toggleClass('light');
			onoff.toggleClass('dark');
		}
	});
});