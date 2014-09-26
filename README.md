Canvas2DtoWebGL.js
==================

Canvas2DtoWebGL.js ports almost all the methods from the regular Canvas2D context of HTML5 to WebGL calls, this improves performance in some cases and allows to mix 3D in your 2D Canvas.
It used [https://github.com/jagenjo/litegl.js/(litegl.js) as the base WebGL library.

 * Supports rendering images and other canvas
 * Stroke lines with any width
 * Patterns created using images with createPattern
 * BezierCurves
 * It doesnt generate garbage (reuses the same containers)

Partially supported:
 * Text rendering (it used a monospace font)

Not supported (yet):
 * Quadratic Curves
 * Concave polygon shapes
 * Gradients
 * drawImage using 6 parameters(x,y, startx,starty,endx,endy)
 * Shadows

Demos & Benchmark
-----------------
Demos are included in demo folder, you can [http://tamats.com/projects/canvas2DtoWebGL](test it here)

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
