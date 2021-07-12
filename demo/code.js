var canvas = null;
var ctx = null;
var current_demo = render_drawImage;
var start_time = Date.now();
var time = (Date.now() - start_time) * 0.001;
var img = new Image();
img.src = "html5.png";
var go_canvas = null;
var go_webgl = null;

function init()
{
	var select = document.querySelector("select");
	go_canvas = document.getElementById("go_canvas");
	go_webgl = document.getElementById("go_webgl");
	var watch_code = document.getElementById("watch_code");
	watch_code.addEventListener("click", watchCode );
	go_canvas.addEventListener("click", changeMode );
	go_webgl.addEventListener("click", changeMode );
	select.addEventListener("change", function() {
		var option = this.options[this.selectedIndex];
		console.log( option.value, option.dataset["demo"] );
		current_demo = window[ option.dataset["demo"] ];
		var tag = document.getElementById("code");
		if(current_demo)
			tag.innerHTML = "<pre>" + current_demo.toString() + "</pre>";
		else
			console.error("demo not found: " + option.dataset["demo"]);
	});

	changeMode.call(go_webgl);
	loop();

	function loop()
	{
		requestAnimationFrame(loop);

		time = (Date.now() - start_time) * 0.001;

		if(!ctx)
			return;

		if(ctx.start2D)
			ctx.start2D();

		if (current_demo)
			current_demo(canvas, ctx);

		if(ctx.finish2D)
			ctx.finish2D();
	}
}

function changeMode()
{
	if(canvas)
		canvas.parentNode.removeChild(canvas);

	canvas = document.createElement("canvas");
	canvas.width = document.body.offsetWidth;
	canvas.height = document.body.offsetHeight;
	document.body.appendChild(canvas);

	go_canvas.className = (this == go_canvas ? "selected" : "");
	go_webgl.className = (this == go_webgl ? "selected" : "");

	ctx = null;
	if(this.dataset["mode"] == "webgl")
		ctx = enableWebGLCanvas(canvas);
	else
		ctx = canvas.getContext("2d");
}

function watchCode()
{
	if(!current_demo)
		return;
	var tag = document.getElementById("code");
	tag.style.display = (tag.style.display != "block" ? "block" : "none");
}

//DEMOS


function render_drawImage(canvas, ctx)
{
	ctx.clearRect(0,0,canvas.width,canvas.height);
	ctx.save();
	ctx.translate( ( canvas.width - img.width*2 ) * 0.5, 0.5 * (canvas.height - img.height*2 ) );
	ctx.scale( 2, 2);
	ctx.drawImage(img, 0,0);
	ctx.drawImage(img, 50,50);
	ctx.restore();
}

function render_drawImage_partial(canvas, ctx)
{
	ctx.clearRect(0,0,canvas.width,canvas.height);
	ctx.save();
	ctx.translate( ( canvas.width - img.width*2 ) * 0.5, 0.5 * (canvas.height - img.height*2 ) );
	ctx.scale( 2, 2);
	ctx.drawImage(img, Math.sin(time*1.2) * 50, Math.sin(time) * 50,100,100,0,0,100,100 );
	ctx.restore();
}

function render_drawImage_transformed(canvas, ctx)
{
	ctx.clearRect(0,0,canvas.width,canvas.height);

	var num = 100;
	for(var i = 0; i < num; i++)
	{
		var x = (i / num) * canvas.width;
		ctx.save();
		ctx.translate(x, (Math.sin(x + time) * 0.5 + 0.5) * canvas.height);
		ctx.rotate( time * 0.1);
		ctx.scale( Math.sin(time + i) * 2, Math.sin(time + i) * 2);
		ctx.drawImage(img, 0,0);
		ctx.restore();
	}
}

function render_smoothing(canvas, ctx)
{
	ctx.clearRect(0,0,canvas.width,canvas.height);

	ctx.imageSmoothingEnabled = false;
	ctx.save();
	ctx.translate( ( canvas.width - img.width*3 ) * 0.5, 0.5 * (canvas.height - img.height*3 ) );
	ctx.scale( 3, 3);
	ctx.drawImage(img, 0,0);
	ctx.restore();
	ctx.imageSmoothingEnabled = true;
}

function render_pattern(canvas, ctx)
{
	ctx.clearRect(0,0,canvas.width,canvas.height);
	
	var pattern = ctx.createPattern(img,"repeat");
	ctx.fillStyle = pattern;
	ctx.save();
	ctx.translate( canvas.width * 0.5, canvas.height * 0.5 );
	ctx.scale(0.1,0.1);
	ctx.rotate( time * 0.1 );
	ctx.fillRect( canvas.width * -5 + Math.sin(time) * 1000, canvas.height * -5, canvas.width * 5,canvas.height * 5);
	ctx.restore();
}

function render_gradient( canvas, ctx )
{
	ctx.clearRect(0,0,canvas.width,canvas.height);
	
	var gradient = ctx.createLinearGradient(0,canvas.height * 0.5,canvas.width,canvas.height *0.5 + 500*Math.sin(time*0.5));
	gradient.addColorStop(0.0,"red");
	gradient.addColorStop(0.5,"blue");
	gradient.addColorStop(1,"green");
	ctx.fillStyle = gradient;
	ctx.save();
	ctx.translate( Math.sin(time) * 200, 0 );
	ctx.fillRect( 100,100, canvas.width - 200, canvas.height - 200);
	ctx.restore();
}

function render_lines1(canvas, ctx)
{
	ctx.clearRect(0,0,canvas.width,canvas.height);
	ctx.strokeStyle = "black";

	var num = canvas.width * 0.25;
	for(var i = 0; i < num; i++)
	{
		var x = (i / num) * canvas.width;
		ctx.beginPath();
		ctx.moveTo( x , canvas.height * 0.5 );
		ctx.lineTo( x, canvas.height * 0.5 + canvas.height * 0.5 * (Math.sin(((i/num)) * 10 + time) * 0.5 ));
		ctx.stroke();
	}
}

function render_lines2(canvas, ctx)
{
	ctx.clearRect(0,0,canvas.width,canvas.height);
	ctx.strokeStyle = "black";

	var num = canvas.width * 0.25;
	ctx.beginPath();
	for(var i = 0; i < num; i++)
	{
		var x = (i / num) * canvas.width;
		ctx.moveTo( x , canvas.height * 0.5 );
		ctx.lineTo( x, canvas.height * 0.5 + canvas.height * 0.5 * (Math.sin(((i/num)) * 10 + time) * 0.5 ));
	}
	ctx.stroke();
}

function render_roundRect(canvas, ctx)
{
	ctx.clearRect(0,0,canvas.width,canvas.height);
	ctx.strokeStyle = "black";

	var w = canvas.width;
	var h = canvas.height;

	ctx.beginPath();
	ctx.roundRect( w * 0.5 - 250, h * 0.5 - 250, 200,200, [20] )
	ctx.fill();

	ctx.beginPath();
	ctx.roundRect( w * 0.5 + 50, h * 0.5 - 250, 200,200, [20,0] )
	ctx.fill();

	ctx.beginPath();
	ctx.roundRect( w * 0.5 - 250, h * 0.5 + 50, 200,200, [20,5] )
	ctx.fill();

	ctx.beginPath();
	ctx.roundRect( w * 0.5 + 50, h * 0.5 + 50, 200,200, [20,5,10,10] )
	ctx.fill();
}

function render_shape(canvas, ctx)
{
	ctx.clearRect(0,0,canvas.width,canvas.height);

	var w = canvas.width;
	var h = canvas.height;

	ctx.fillStyle = "black";
	var delta = Math.PI * 2 / 10;
	ctx.beginPath();
	for(var i = 0; i < 10; ++i)
		ctx.lineTo( w*0.5 + (Math.sin(time + i * delta) * 200), h*0.5 + (Math.cos(time + i * delta) * 200) );
	ctx.fill();
}

function render_save_restore(canvas, ctx)
{
	ctx.clearRect(0,0,canvas.width,canvas.height);

	var w = canvas.width;
	var h = canvas.height;

	ctx.save();
	ctx.translate(w*0.5,h*0.5);

	ctx.fillStyle = "blue";
	ctx.beginPath();
	ctx.arc(0,0,100,0,Math.PI*2);
	ctx.closePath();
	ctx.fill();

	ctx.save();
	ctx.fillStyle = "red";
	ctx.translate(200,0);
	ctx.beginPath();
	ctx.arc(0,0,100,0,Math.PI*2);
	ctx.closePath();
	ctx.fill();
	ctx.restore();

	ctx.translate(0,200);
	ctx.beginPath();
	ctx.arc(0,0,100,0,Math.PI*2);
	ctx.closePath();
	ctx.fill();

	ctx.restore();
}


function render_bezierCurveTo(canvas, ctx)
{
	ctx.clearRect(0,0,canvas.width,canvas.height);

	var w = canvas.width;
	var h = canvas.height;

	ctx.strokeStyle = "black";
	ctx.beginPath();
	ctx.moveTo( w*(Math.sin(time)*0.5+0.5) , h*0.2 );
	ctx.bezierCurveTo( w*0.4, h*0.9, w*0.8, h*0.3, w*0.8, h*0.8 );
	ctx.stroke();
}

function render_quadraticCurveTo(canvas, ctx)
{
	ctx.clearRect(0,0,canvas.width,canvas.height);

	var w = canvas.width;
	var h = canvas.height;

	ctx.fillStyle = "gray";
	ctx.strokeStyle = "black";
	ctx.beginPath();
	ctx.moveTo( w*(Math.sin(time)*0.5+0.5) , h*0.2 );
	ctx.quadraticCurveTo( w*0.5, h*0.5, w*0.8, h*0.9 );
	ctx.fill();
	ctx.stroke();
}

function render_arc(canvas, ctx)
{
	ctx.clearRect(0,0,canvas.width,canvas.height);

	ctx.strokeStyle = "black";
	ctx.beginPath();
	ctx.arc( canvas.width * 0.5, canvas.height * 0.5, 100, 0, Math.PI + (Math.sin(time) * Math.PI) );
	ctx.stroke();
}

function render_arc_width(canvas, ctx)
{
	ctx.clearRect(0,0,canvas.width,canvas.height);

	ctx.strokeStyle = "black";
	ctx.lineWidth = 4;
	ctx.beginPath();
	ctx.arc( canvas.width * 0.5, canvas.height * 0.5, 100, 0, Math.PI + (Math.sin(time) * Math.PI) );
	ctx.stroke();
	ctx.lineWidth = 1;
}

function render_benchmark_fillRect(canvas, ctx)
{
	ctx.clearRect(0,0,canvas.width,canvas.height);

	var w = canvas.width;
	var h = canvas.height;

	for(var i = 0; i < 1000; i++)
	{
		ctx.fillStyle = "rgba(" + 
							(Math.random() * 255).toFixed(0) + "," + 
							(Math.random() * 255).toFixed(0) + "," + 
							(Math.random() * 255).toFixed(0) + ",1)";

		ctx.fillRect( w * Math.random(), h * Math.random(), 200 * Math.random(), 100 * Math.random() );
	}
}


function render_benchmark_drawImage(canvas, ctx)
{
	ctx.clearRect(0,0,canvas.width,canvas.height);

	var w = canvas.width;
	var h = canvas.height;

	for(var i = 0; i < 1000; i++)
		ctx.drawImage(img, w * Math.random(), h * Math.random() );
}

function render_fillText(canvas, ctx)
{
	ctx.clearRect(0,0,canvas.width,canvas.height);

	var w = canvas.width;
	var h = canvas.height;

	ctx.fillStyle = "black";
	ctx.font = "bold 80px Arial";
	ctx.textAlign = "left";
	ctx.fillText("Left", 0,100 );
	ctx.textAlign = "right";
	ctx.fillText("Right", w, 100 );


	var fontsize = 40 + (Math.sin(time) * 20);
	ctx.font = fontsize + "px Arial";
	ctx.textAlign = "center";
	var text = time.toFixed(2) + " seconds elapsed"
	ctx.fillText(text, w * 0.5, h * 0.5 );

	ctx.font = "40px Arial";
	var text = "measureText";
	ctx.fillText(text, w * 0.5, h * 0.5 + 60);
	var tw = ctx.measureText(text).width;
	ctx.fillRect( w*0.5 - tw*0.5,h*0.5 + 70, tw, 4 );

	ctx.textAlign = "left";
	ctx.fillText("multiline1\nmultiline2\nmultiline3", w * 0.5, h * 0.5 + 200);
}

function render_concaveShapes(canvas, ctx)
{
	ctx.clearRect(0,0,canvas.width,canvas.height);
	var w = canvas.width;
	var h = canvas.height;
	ctx.fillStyle = "black";
	ctx.save();
	ctx.translate(w*0.5,h*0.5);

	ctx.beginPath();
	ctx.moveTo(-100,-100);
	ctx.lineTo(0,-50 + Math.sin(time)*100);
	ctx.lineTo(100,-100);
	ctx.lineTo(100,100);
	ctx.lineTo(-100,100);
	ctx.closePath();
	ctx.fill();

	ctx.restore();
}

function render_rotatedStroke(canvas, ctx)
{
	ctx.clearRect(0,0,canvas.width,canvas.height);

	var w = canvas.width;
	var h = canvas.height;

	ctx.save();
	ctx.translate(w * 0.5, h * 0.5);
	ctx.rotate( time );
	ctx.lineWidth = 10;
	ctx.beginPath();
	ctx.rect(-50,-50,100,100);
	ctx.stroke();
	ctx.strokeRect(-100,-100,200,200);
	ctx.restore();
}

function render_clip(canvas, ctx)
{
	ctx.clearRect(0,0,canvas.width,canvas.height);
	var w = canvas.width;
	var h = canvas.height;
	ctx.save();
	ctx.translate(w*0.5,h*0.5);

	var offset = Math.sin(time)*100-50;

	ctx.beginPath();
	ctx.arc(offset,0,100,0,2*Math.PI);
	ctx.clip();

	ctx.save();
	ctx.fillStyle = "red";
	ctx.fillRect(-50,0,100,100);

	ctx.beginPath();
	ctx.arc(-offset,0,100,0,2*Math.PI);
	ctx.clip();

	ctx.fillStyle = "green";
	ctx.fillRect(-50,0,100,100);

	ctx.restore();

	ctx.fillStyle = "blue";
	ctx.fillRect(-50,40,100,20);

	ctx.restore();
}

function render_rotatedText(canvas, ctx)
{
	ctx.clearRect(0,0,canvas.width,canvas.height);

	var w = canvas.width;
	var h = canvas.height;

	var fontsize = 50;
	ctx.font = fontsize + "px Arial";
	ctx.textAlign = "center";
	var text = "Rotated text";
	ctx.save();
	ctx.translate(w * 0.5, h * 0.5);
	ctx.rotate( time );
	ctx.fillText(text, 0,0 );
	ctx.restore();
}

function render_colors(canvas, ctx)
{
	ctx.clearRect(0,0,canvas.width,canvas.height);
	var w = canvas.width;
	var h = canvas.height;
	var rh = h / 6;

	var colors = ["hsla(0,30%,10%,1)","hsla(60,60%,70%,1)","hsla(120,10%,30%,1)","hsla(180,90%,40%,1)","hsla(240,50%,50%,1)","hsla(300,50%,50%,0.6)"];

	for(var i = 0; i < 6; ++i)
	{
		ctx.fillStyle = colors[i];
		ctx.fillRect( 0,rh*i, w, rh );
	}

	ctx.restore();
}

function render_benchmark_fillText(canvas, ctx)
{
	ctx.clearRect(0,0,canvas.width,canvas.height);

	var w = canvas.width;
	var h = canvas.height;

	var fontsize = 20;
	ctx.font = fontsize + "px Arial";
	ctx.textAlign = "center";

	for(var i = 0; i < canvas.width; i += canvas.width / 50)
	{
		for(var j = 0; j < canvas.height; j += canvas.height / 50)
		{
			var text = "Text";
			ctx.save();
			ctx.translate(i,j);
			ctx.rotate( time );
			ctx.fillText(text, 0,0 );
			ctx.restore();
		}
	}
}

