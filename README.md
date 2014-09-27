Canvas2DtoWebGL.js
==================

Canvas2DtoWebGL.js ports almost all the methods from the regular Canvas2D context of HTML5 to WebGL calls, this allows to mix 3D in your 2D Canvas and in some cases it could even improve the performance of your regular Canvas2D.
It used [litegl.js](https://github.com/jagenjo/litegl.js) as the base WebGL library.
To improve performance it doesn't generate garbage (reuses the same containers).

Fully supported functions:

 * translate, rotate, scale, transform, setTransform, save, restore
 * clearRect
 * drawImage (not the 9 params version), you can use images or canvas (video not tested)
 * beginPath, lineTo, moveTo, closePath, stroke, rect, strokeRect, fillRect, arc
 * fill (limited to convex shapes)
 * createPattern with images
 * bezierCurveTo and quadraticCurveTo
 * fillText (it creates a texture atlas with all the characters)
 * lineWidth (only one mode supported)
 * strokeStyle, fillStyle, globalAlpha
 * imageSmoothingEnabled
 * getImageData and putImageData (not fully tested)

Not supported (yet):
 * clip
 * globalCompositeOperation
 * concave polygon shapes
 * createLinearGradient
 * drawImage using 9 parameters(img,sx,sy,swidth,sheight,x,y,width,height)
 * shadows

Demos & Benchmark
-----------------
Demos are included in demo folder, you can [test it here](http://tamats.com/projects/canvas2DtoWebGL/demo)

Usage
-----

Include the library and dependencies
```html
<script src="js/gl-matrix-min.js"></script>
<script src="js/litegl.min.js"></script>
<script src="js/Canvas2DtoWebGL.js"></script>
```

Once you have your Canvas created (and before a context2D has been obtained), call this function:
```js
var ctx = enableWebGLCanvas( mycanvas );
```

During your rendering you must call this two functions, it helps set the flags accordingly.
```js
ctx.start();

//your rendering code
//...

ctx.finish();
```

Feedback
--------

You can write any feedback to javi.agenjo@gmail.com
