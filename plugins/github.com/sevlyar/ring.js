Colorhythm(function($) {
	function Render(conf) {	}
	Render.prototype = {
		type: $.RENDER,
		name: 'github.com/sevlyar/ring.js#',
		angle: 0,
		draw: function(cx, canvas, samples) {
			var w = canvas.width,
				h = canvas.height;
			var sqw = 10;	

			function drawFlash(i) {
				var peak = h*samples[i]/2;
				// cx.fillStyle = $.RingColors[i];
				// cx.beginPath();
				// cx.rect(-sqw/2, sqw, sqw, peak);
				// cx.closePath();
				// cx.fill();
				cx.beginPath();
				cx.arc(0, 0, peak, 0, 2*Math.PI/samples.length, false);
				cx.lineWidth = 50;
				cx.strokeStyle = $.RingColors[i];
				cx.stroke();				
			}

			var angle = 2*Math.PI/samples.length;
			cx.save();
			cx.translate(w/2, h/2);
			cx.rotate(this.angle);
			for (var i = 0; i < samples.length; i++) {
				drawFlash(i);
				cx.rotate(-angle);
			}
			cx.restore();
			this.angle += 0.03;
		}
	};
	$.registerComponent(Render);	
});