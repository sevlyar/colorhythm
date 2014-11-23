Colorhythm(function($) {
	function Render(conf) {	}
	Render.prototype = {
		type: $.RENDER,
		name: 'github.com/sevlyar/organ#',
		draw: function(cx, canvas, samples) {
			var w = canvas.width,
				h = canvas.height;
			var sqw = w / samples.length / 2;	
			// уровень насыщения, указывает при каком значении уровня сигнала
			//  происходит насыщение до полного цвета, далее идет выцветание
			var scale = 0.3; 

			function parseColor(str) {
				var r = parseInt(str.slice(1, 3), 16);
				var g = parseInt(str.slice(3, 5), 16);
				var b = parseInt(str.slice(5, 7), 16);
				return {r:r, g:g, b:b, a:1};
			}

			function formatColor(c) {
				return 'rgba('+c.r+','+c.g+','+c.b+','+c.a+')';
			}

			function saturate(v, sat) {
				v += Math.ceil(sat * (255 - v));
				if (v > 255) v = 255;
				return v;
			}

			var x = 0;
			function drawFlash(i) {
				var color = parseColor($.RingColors[i]);
				var sat = samples[i] / scale;
				if (sat > 1) {
					color.a = 1;
					sat -= 1;			
					color.r = saturate(color.r, sat);
					color.g = saturate(color.g, sat);
					color.b = saturate(color.b, sat);
				} else {
					color.a = sat;
				}

				var peak = h*samples[i];
				var grad = cx.createLinearGradient(0, h - peak, 0, h);
				var cl = parseColor($.RingColors[i]);
				cl.a = 0;
				if (peak > (h-2)) {
					cl.a = 1;
				}

				grad.addColorStop(0, formatColor(cl));
				var cl2 = formatColor(color);
				grad.addColorStop(1, cl2);
				cx.fillStyle = grad;

				cx.beginPath();
				cx.rect(x+2, h - peak, sqw-4, peak);
				cx.closePath();
				cx.fill();
				
				x += sqw;		
			}

			for (var i = 0; i < samples.length; i++) {
				drawFlash(i);
			}
			for (var i = samples.length-1; i >= 0; i--) {
				drawFlash(i);
			}
		}
	};
	$.registerComponent(Render);	
});