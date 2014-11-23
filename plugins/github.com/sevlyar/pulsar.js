Colorhythm(function($) {
	function Render(conf) {	}
	Render.prototype = {
		type: $.RENDER,
		name: 'github.com/sevlyar/pulsar#',
		angle: 0,
		draw: function(cx, canvas, samples) {
			var w = canvas.width,
				h = canvas.height;
			var sqw = 10;	
			
			var fitness = 3;
			var arcWd = 2*Math.PI/samples.length/fitness;
			function drawFlash(i) {
				var peak = h*samples[i]/2;
				var start = Math.random()*arcWd*(fitness);
				cx.beginPath();
				cx.arc(0, 0, peak, start, start+arcWd, false);
				cx.lineWidth = peak;
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
			cx.beginPath();
			cx.arc(0, 0, 90, 0, 2 * Math.PI, false);
			cx.fillStyle = 'rgba(0,0,0,0.95)';
			cx.fill();
			cx.restore();
			this.angle += 0.03;
		}
	};
	$.registerComponent(Render);	
});