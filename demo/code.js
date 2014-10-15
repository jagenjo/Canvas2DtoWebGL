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
		tag.innerHTML = "<pre>" + current_demo.toString() + "</pre>";
	});

	changeMode.call(go_webgl);
	loop();

	function loop()
	{
		requestAnimationFrame(loop);

		time = (Date.now() - start_time) * 0.001;

		if(!ctx)
			return;

		if(ctx.start)
			ctx.start();

		if (current_demo)
			current_demo(canvas, ctx);

		if(ctx.finish)
			ctx.finish();
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
	ctx.scale(0.1,0.1);
	ctx.fillRect( canvas.width * 0.5 + Math.sin(time) * 100 - 250, 10, 5000,5000);
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

	ctx.strokeStyle = "black";
	ctx.beginPath();
	ctx.moveTo( w*(Math.sin(time)*0.5+0.5) , h*0.2 );
	ctx.quadraticCurveTo( w*0.5, h*0.5, w*0.8, h*0.9 );
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
	ctx.fillText("measureText: " + (ctx.measureText("one little sentence").width).toFixed(2), w * 0.5, h * 0.5 + 50);

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

function render_clip(canvas, ctx)
{
	ctx.clearRect(0,0,canvas.width,canvas.height);
	var w = canvas.width;
	var h = canvas.height;
	ctx.fillStyle = "black";
	ctx.save();
	ctx.translate(w*0.5,h*0.5);


	ctx.beginPath();
	ctx.arc(0,0,100,0,2*Math.PI);
	ctx.clip();
	ctx.fillRect(Math.sin(time)*100-50,0,100,100);

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