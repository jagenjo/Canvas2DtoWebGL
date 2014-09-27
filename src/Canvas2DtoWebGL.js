//replaces the Canvas2D functions by WebGL functions, the behaviour is not 100% the same but it kind of works in many cases
//not all functions have been implemented

if(typeof(GL) == "undefined")
	throw("litegl.js must be included to use enableWebGLCanvas");

function enableWebGLCanvas( canvas )
{
	if(!canvas.is_webgl)
	{
		var gl = canvas.getContext("webgl");
		if(!gl)
			throw("This canvas cannot be used as WebGL, maybe WebGL is not supported or this canvas has already a 2D context associated");
		GL.create({canvas: canvas});
	}

	//settings
	var curveSubdivisions = 50;
	var max_points = 10000; //max amount of vertex allowed to have in a single primitive


	//get the context	
	var gl = canvas.getContext("webgl");
	if(canvas.canvas2DtoWebGL_enabled)
		return gl;

	//flag it for future uses
	canvas.canvas2DtoWebGL_enabled = true;

	var prev_gl = null;

	var ctx = canvas.ctx = gl;
	canvas.ctx.textures = {};
	var white = vec4.fromValues(1,1,1,1);

	//some generic shaders
	var	flat_shader = new GL.Shader( Shader.QUAD_VERTEX_SHADER, Shader.SCREEN_FLAT_FRAGMENT_SHADER );
	var	texture_shader = new GL.Shader( Shader.QUAD_VERTEX_SHADER, Shader.SCREEN_FRAGMENT_SHADER );
	var circle = GL.Mesh.circle({size:1});

	//reusing same buffer
	var global_index = 0;
	var global_vertices = new Float32Array( max_points * 3 );
	var global_mesh = new GL.Mesh();
	var global_buffer = global_mesh.addVertexBuffer("vertices", null, null, global_vertices, gl.STREAM_DRAW );
	var quad_mesh = GL.Mesh.getScreenQuad();
	var is_rect = false;

	var uniforms = {
		u_texture: 0
	};

	var vertex_shader = "\n\
			precision highp float;\n\
			attribute vec3 a_vertex;\n\
			uniform vec2 u_viewport;\n\
			uniform mat3 u_transform;\n\
			varying float v_visible;\n\
			void main() { \n\
				vec3 pos = a_vertex;\n\
				v_visible = pos.z;\n\
				pos = u_transform * vec3(pos.xy,1.0);\n\
				pos.z = 0.0;\n\
				//normalize\n\
				pos.x = (2.0 * pos.x / u_viewport.x) - 1.0;\n\
				pos.y = -((2.0 * pos.y / u_viewport.y) - 1.0);\n\
				gl_Position = vec4(pos, 1.0); \n\
			}\n\
			";

	var	flat_primitive_shader = new GL.Shader(vertex_shader,"\n\
			precision highp float;\n\
			varying float v_visible;\n\
			uniform vec4 u_color;\n\
			void main() {\n\
				if (v_visible == 0.0)\n\
					discard;\n\
				gl_FragColor = u_color;\n\
			}\n\
		");

	var	textured_primitive_shader = new GL.Shader(vertex_shader,"\n\
			precision highp float;\n\
			varying float v_visible;\n\
			uniform vec4 u_color;\n\
			uniform sampler2D u_texture;\n\
			uniform vec2 u_itexture_size;\n\
			uniform vec2 u_viewport;\n\
			uniform mat3 u_itransform;\n\
			void main() {\n\
				vec2 pos = (u_itransform * vec3( gl_FragCoord.s, u_viewport.y - gl_FragCoord.t,1.0)).xy;\n\
				pos *= vec2( (u_viewport.x * u_itexture_size.x), (u_viewport.y * u_itexture_size.y) );\n\
				vec2 uv = fract(pos / u_viewport);\n\
				uv.y = 1.0 - uv.y;\n\
				gl_FragColor = u_color * texture2D( u_texture, uv);\n\
			}\n\
		");

	//STACK and TRANSFORM
	ctx._matrix = mat3.create();
	var tmp_mat3 = mat3.create();
	var tmp_vec2 = vec2.create();
	var tmp_vec2b = vec2.create();
	ctx._stack = [];
	var viewport = vec2.fromValues(1,1);

	ctx.translate = function(x,y)
	{
		tmp_vec2[0] = x;
		tmp_vec2[1] = y;
		mat3.translate( this._matrix, this._matrix, tmp_vec2 );
	}

	ctx.rotate = function(angle)
	{
		mat3.rotate( this._matrix, this._matrix, angle );
	}


	ctx.scale = function(x,y)
	{
		tmp_vec2[0] = x;
		tmp_vec2[1] = y;
		mat3.scale( this._matrix, this._matrix, tmp_vec2 );
	}

	ctx.save = function() {
		if(this._stack.length < 32)
			this._stack.push( mat3.clone( this._matrix ) );
	}

	ctx.restore = function() {
		if(this._stack.length)
			this._matrix.set( this._stack.pop() );
		else
			mat3.identity( this._matrix );
	}

	ctx.transform = function(a,b,c,d,e,f) {
		var m = tmp_mat3;
		m[0] = a;
		m[1] = c;
		m[2] = e;
		m[3] = b;
		m[4] = d;
		m[5] = f;
		m[6] = 0;
		m[7] = 0;
		m[8] = 1;

		mat3.multiply( this._matrix, this._matrix, m );
	}

	ctx.setTransform = function(a,b,c,d,e,f) {
		var m = this._matrix;
		m[0] = a;
		m[1] = c;
		m[2] = e;
		m[3] = b;
		m[4] = d;
		m[5] = f;
		m[6] = 0;
		m[7] = 0;
		m[8] = 1;
		//this._matrix.set([a,c,e,b,d,f,0,0,1]);
	}

	//Images
	var last_uid = 1;

	function getTexture( img )
	{
		var tex = null;
		if(img.constructor === GL.Texture)
		{
			return img;
		}
		else
		{
			if(img.src)
			{
				var wrap = gl.REPEAT;
				tex = gl.textures[ img.src ];
				if(!tex)
					return gl.textures[ img.src ] = GL.Texture.fromImage(img, { magFilter: gl.LINEAR, minFilter: gl.LINEAR_MIPMAP_LINEAR, wrap: wrap, ignore_pot:true, premultipliedAlpha: true } );
				return tex;
			}
			else //no src
			{
				var uid = img._uid;
				if(!uid)
					uid = img._uid = last_uid++;
				tex = gl.textures["canvas_" + uid];
				if(!tex)
					 tex = gl.textures["canvas_" + uid] = GL.Texture.fromImage(img, { minFilter: gl.LINEAR, magFilter: gl.LINEAR });
				else
					gl.textures["canvas_" + uid].uploadImage( img );
				return tex;
			}
		}

		return null;
	}

	ctx.drawImage = function( img, x, y, w, h )
	{
		if(!img || img.width == 0 || img.height == 0) return;

		var tex = getTexture(img);
		if(!tex) return;

		tmp_vec2[0] = x; tmp_vec2[1] = y;
		tmp_vec2b[0] = w === undefined ? tex.width : w;
		tmp_vec2b[1] = h === undefined ? tex.height : h;

		tex.bind(0);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, this.imageSmoothingEnabled ? gl.LINEAR : gl.NEAREST );

		uniforms.u_color = this.tintImages ? this._fillColor : white;
		uniforms.u_position = tmp_vec2;
		uniforms.u_size = tmp_vec2b;
		uniforms.u_transform = this._matrix;
		uniforms.u_viewport = viewport;

		texture_shader.uniforms(uniforms).draw(quad_mesh);
	}

	ctx.createPattern = function( img )
	{
		return getTexture( img );
	}

	//Primitives

	ctx.beginPath = function()
	{
		global_index = 0;
		is_rect = false;
	}

	ctx.closePath = function()
	{
		if(global_index < 3)
			return;
		global_vertices[ global_index ] = global_vertices[0];
		global_vertices[ global_index + 1] = global_vertices[1];
		global_vertices[ global_index + 2] = 1;
		global_index += 3;
		is_rect = false;
	}

	ctx.moveTo = function(x,y)
	{
		//not the first line
		if(global_index == 0)
		{
			global_vertices[ global_index ] = x;
			global_vertices[ global_index + 1] = y;
			global_vertices[ global_index + 2] = 1;
			global_index += 3;
		}
		else
		{
			global_vertices[ global_index ] = global_vertices[ global_index - 3];
			global_vertices[ global_index + 1] = global_vertices[ global_index - 2];
			global_vertices[ global_index + 2] = 0;
			global_index += 3;
			global_vertices[ global_index ] = x;
			global_vertices[ global_index + 1] = y;
			global_vertices[ global_index + 2] = 0;
			global_index += 3;
		}

		is_rect = false;
	}

	ctx.lineTo = function(x,y)
	{
		global_vertices[ global_index ] = x;
		global_vertices[ global_index + 1] = y;
		global_vertices[ global_index + 2] = 1;
		global_index += 3;
		is_rect = false;
	}

	ctx.bezierCurveTo = function(m1x,m1y, m2x,m2y, ex,ey)
	{
		if(global_index < 3) return;
		is_rect = false;

		var last = [ global_vertices[ global_index - 3 ], global_vertices[ global_index - 2 ] ];
		cp = [ last, [m1x, m1y], [m2x, m2y], [ex, ey] ];
		for(var i = 0; i <= curveSubdivisions; i++)
		{
			var t = i/curveSubdivisions;
			var ax, bx, cx;
			var ay, by, cy;
			var tSquared, tCubed;

			/* cálculo de los coeficientes polinomiales */
			cx = 3.0 * (cp[1][0] - cp[0][0]);
			bx = 3.0 * (cp[2][0] - cp[1][0]) - cx;
			ax = cp[3][0] - cp[0][0] - cx - bx;

			cy = 3.0 * (cp[1][1] - cp[0][1]);
			by = 3.0 * (cp[2][1] - cp[1][1]) - cy;
			ay = cp[3][1] - cp[0][1] - cy - by;

			/* calculate the curve point at parameter value t */
			tSquared = t * t;
			tCubed = tSquared * t;

			var x = (ax * tCubed) + (bx * tSquared) + (cx * t) + cp[0][0];
			var y = (ay * tCubed) + (by * tSquared) + (cy * t) + cp[0][1];
			global_vertices[ global_index ] = x;
			global_vertices[ global_index + 1] = y;
			global_vertices[ global_index + 2] = 1;
			global_index += 3;
		}
	}

	ctx.quadraticCurveTo = function(mx,my,ex,ey)
	{
		if(global_index < 3) return;
		is_rect = false;

		var sx = global_vertices[ global_index - 3 ];
		var sy = global_vertices[ global_index - 2 ];
		
		for(var i = 0; i <= curveSubdivisions; i++)
		{
			var f = i/curveSubdivisions;
			var nf = 1-f;

			var m1x = sx * nf + mx * f;
			var m1y = sy * nf + my * f;

			var m2x = mx * nf + ex * f;
			var m2y = my * nf + ey * f;

			global_vertices[ global_index ] = m1x * nf + m2x * f;
			global_vertices[ global_index + 1] = m1y * nf + m2y * f;
			global_vertices[ global_index + 2] = 1;
			global_index += 3;
		}
	}


	ctx.fill = function()
	{
		if(global_index < 3)
			return;

		//if(is_rect)
		//	return this.fillRect();

		//update buffer
		//global_buffer.upload( gl.STREAM_DRAW );
		global_buffer.uploadRange(0, global_index * 4); //4 bytes per float

		var shader = flat_primitive_shader;

		uniforms.u_color = this._fillcolor;
		uniforms.u_transform = this._matrix;
		uniforms.u_viewport = viewport;

		//pattern
		if( this.fillStyle.constructor == GL.Texture )
		{
			var tex = this.fillStyle;
			uniforms.u_color = [1,1,1, this.globalAlpha]; 
			uniforms.u_texture = 0;
			uniforms.u_itexture_size = [1/tex.width, 1/tex.height];
			uniforms.u_itransform = mat3.invert( tmp_mat3, this._matrix );
			tex.bind(0);
			shader = textured_primitive_shader;
		}

		//render
		shader.uniforms(uniforms).drawRange(global_mesh, gl.TRIANGLE_FAN, 0, global_index / 3);
	}

	//basic stroke using gl.LINES
	ctx.strokeThin = function()
	{
		if(global_index < 3)
			return;

		//update buffer
		global_buffer.uploadRange(0, global_index * 4); //4 bytes per float
		//global_buffer.upload( gl.STREAM_DRAW );

		gl.setLineWidth( this.lineWidth );
		uniforms.u_color = this._strokecolor;
		uniforms.u_transform = this._matrix;
		uniforms.u_viewport = viewport;
		flat_primitive_shader.uniforms(uniforms).drawRange(global_mesh, gl.LINE_STRIP, 0, global_index / 3);
	}

	//advanced stroke (it takes width into account)
	var lines_vertices = new Float32Array( max_points * 3 );
	var lines_mesh = new GL.Mesh();
	var lines_buffer = lines_mesh.addVertexBuffer("vertices", null, null, lines_vertices, gl.STREAM_DRAW );

	ctx.stroke = function()
	{
		if(global_index < 3)
			return;

		if( (this.lineWidth * this._matrix[0]) <= 1.0 )
			return this.strokeThin();

		var num_points = global_index / 3;
		var vertices = lines_vertices;
		var l = global_index;

		var points = global_vertices;

		var delta_x = 0;
		var delta_y = 0;
		var prev_delta_x = 0;
		var prev_delta_y = 0;
		var average_x = 0;
		var average_y = 0;

		var line_width = this.lineWidth * 0.5;

		var i, pos = 0;
		for(i = 0; i < l-3; i+=3)
		{
			prev_delta_x = delta_x;
			prev_delta_y = delta_y;

			delta_x = points[i+3] - points[i];
			delta_y = points[i+4] - points[i+1];
			var dist = Math.sqrt( delta_x*delta_x + delta_y*delta_y );
			if(dist != 0)
			{
				delta_x = (delta_x / dist) * line_width;
				delta_y = (delta_y / dist) * line_width;
			}

			average_x = delta_x + prev_delta_x;
			average_y = delta_y + prev_delta_y;

			var dist = Math.sqrt( average_x*average_x + average_y*average_y );
			if(dist != 0)
			{
				average_x = (average_x / dist) * line_width;
				average_y = (average_y / dist) * line_width;
			}

			vertices[ pos+0 ] = points[i] - average_y;
			vertices[ pos+1 ] = points[i+1] + average_x;
			vertices[ pos+2 ] = 1;
			vertices[ pos+3 ] = points[i] + average_y;
			vertices[ pos+4 ] = points[i+1] - average_x;
			vertices[ pos+5 ] = 1;

			pos += 6;
		}

		var dist = Math.sqrt( delta_x*delta_x + delta_y*delta_y );
		if(dist != 0)
		{
			delta_x = (delta_x / dist) * line_width;
			delta_y = (delta_y / dist) * line_width;
		}

		vertices[ pos+0 ] = points[i] - delta_y + delta_x;
		vertices[ pos+1 ] = points[i+1] + delta_x + delta_y;
		vertices[ pos+2 ] = 1;
		vertices[ pos+3 ] = points[i] + delta_y + delta_x;
		vertices[ pos+4 ] = points[i+1] - delta_x + delta_y;
		vertices[ pos+5 ] = 1;
		pos += 6;

		lines_buffer.upload(gl.STREAM_DRAW);
		lines_buffer.uploadRange(0, pos * 4); //4 bytes per float

		//gl.setLineWidth( this.lineWidth );
		uniforms.u_color = this._strokecolor;
		uniforms.u_transform = this._matrix;
		uniforms.u_viewport = viewport;
		flat_primitive_shader.uniforms(uniforms).drawRange(lines_mesh, gl.TRIANGLE_STRIP, 0, pos / 3 );
	}


	ctx.rect = function(x,y,w,h)
	{
		global_vertices[ global_index ] = x;
		global_vertices[ global_index + 1] = y;
		global_vertices[ global_index + 2] = 1;

		global_vertices[ global_index + 3] = x+w;
		global_vertices[ global_index + 4] = y;
		global_vertices[ global_index + 5] = 1;

		global_vertices[ global_index + 6] = x+w;
		global_vertices[ global_index + 7] = y+h;
		global_vertices[ global_index + 8] = 1;

		global_vertices[ global_index + 9] = x;
		global_vertices[ global_index + 10] = y+h;
		global_vertices[ global_index + 11] = 1;

		global_vertices[ global_index + 12] = x;
		global_vertices[ global_index + 13] = y;
		global_vertices[ global_index + 14] = 1;

		global_index += 15;

		if(global_index == 15)
			is_rect = true;
	}

	//roundRect is a function I use sometimes, but here we dont have it
	ctx.roundRect = ctx.rect;

	ctx.arc = function(x,y,radius, start_ang, end_ang)
	{
		num = Math.ceil(radius*2*this._matrix[0]+1);
		if(num<1)
			return;

		start_ang = start_ang === undefined ? 0 : start_ang;
		end_ang = end_ang === undefined ? Math.PI * 2 : end_ang;

		var delta = (end_ang - start_ang) / num;

		for(var i = 0; i <= num; i++)
		{
			var f = start_ang + i*delta;
			this.lineTo(x + Math.cos(f) * radius, y + Math.sin(f) * radius);
		}
		is_rect = false;
	}

	ctx.strokeRect = function(x,y,w,h)
	{
		this.beginPath();
		this.rect(x,y,w,h);//[x,y,1, x+w,y,1, x+w,y+h,1, x,y+h,1, x,y,1 ];
		this.stroke();
	}
	
	ctx.fillRect = function(x,y,w,h)
	{
		global_index = 0;

		//fill using a texture
		if( this.fillStyle.constructor == GL.Texture )
		{
			this.beginPath();
			this.rect(x,y,w,h);
			this.fill();
			return;
		}

		uniforms.u_color = this._fillcolor;
		tmp_vec2[0] = x; tmp_vec2[1] = y;
		tmp_vec2b[0] = w; tmp_vec2b[1] = h;
		uniforms.u_position = tmp_vec2;
		uniforms.u_size = tmp_vec2b;
		uniforms.u_transform = this._matrix;
		uniforms.u_viewport = viewport

		flat_shader.uniforms(uniforms).draw(quad_mesh);
	}

	//other functions
	ctx.clearRect = function(x,y,w,h)
	{
		if(x != 0 || y != 0 || w != canvas.width || h != canvas.height )
			gl.scissor(x,y,w,h);

		//gl.clearColor( 0.0,0.0,0.0,0.0 );
		gl.clear( gl.COLOR_BUFFER_BIT );
		var v = gl.viewport_data;
		gl.scissor(v[0],v[1],v[2],v[3]);
	}

	//control funcs: used to set flags at the beginning and the end of the render
	ctx.start = function()
	{
		prev_gl = window.gl;
		window.gl = this;

		viewport = gl.getViewport().subarray(2,4);
		gl.disable( gl.CULL_FACE );
		gl.disable( gl.DEPTH_TEST );
		gl.enable( gl.BLEND );
		gl.blendFunc( gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA );
		gl.lineWidth = 1;
		global_index = 0;
		is_rect = false;
	}

	ctx.finish = function()
	{
		global_index = 0;
		gl.lineWidth = 1;
		window.gl = prev_gl;
	}


	//to change the color
	var string_colors = {
		white:[1,1,1],
		black:[0,0,0],
		red:[1,0,0],
		green:[0,1,0],
		blue:[0,0,1],
		cyan:[0,1,1],
		yellow:[1,1,0]
	};

	ctx.updateColor = function(hex, color)
	{
		if(typeof(hex) != "string")
			return;

		//for those hardcoded colors
		var col = string_colors[hex];
		if( col )
		{
			color.set( col );
			color[3] = this.globalAlpha;
			return;
		}
	
		//rgba colors
		var pos = hex.indexOf("rgba(");
		if(pos != -1)
		{
			var str = hex.substr(5);
			str = str.split(",");
			color[0] = parseInt( str[0] ) / 255;
			color[1] = parseInt( str[1] ) / 255;
			color[2] = parseInt( str[2] ) / 255;
			color[3] = parseFloat( str[3] ) * this.globalAlpha;
			return;
		}

		color[3] = this.globalAlpha;

		//rgb colors
		var pos = hex.indexOf("rgb(");
		if(pos != -1)
		{
			var str = hex.substr(3);
			str = str.split(",");
			color[0] = parseInt( str[0] ) / 255;
			color[1] = parseInt( str[1] ) / 255;
			color[2] = parseInt( str[2] ) / 255;
			return;
		}

		//the rest
		// Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
		var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
		hex = hex.replace(shorthandRegex, function(m, r, g, b) {
			return r + r + g + g + b + b;
		});

		var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		if(!result)
			return;

		color[0] = parseInt(result[1], 16) / 255;
		color[1] = parseInt(result[2], 16) / 255;
		color[2] = parseInt(result[3], 16) / 255;
	}

	//extra
	var TEXT_VERTEX_SHADER = "\n\
			precision highp float;\n\
			attribute vec3 a_vertex;\n\
			attribute vec2 a_coord;\n\
			varying vec2 v_coord;\n\
			uniform vec2 u_viewport;\n\
			uniform mat3 u_transform;\n\
			uniform float u_pointSize;\n\
			void main() { \n\
				vec3 pos = a_vertex;\n\
				pos = u_transform * pos;\n\
				pos.z = 0.0;\n\
				//normalize\n\
				pos.x = (2.0 * pos.x / u_viewport.x) - 1.0;\n\
				pos.y = -((2.0 * pos.y / u_viewport.y) - 1.0);\n\
				gl_Position = vec4(pos, 1.0); \n\
				gl_PointSize = u_pointSize;\n\
				v_coord = a_coord;\n\
			}\n\
			";

	var TEXT_FRAGMENT_SHADER = "\n\
			precision highp float;\n\
			uniform sampler2D u_texture;\n\
			uniform float u_iCharSize;\n\
			uniform vec4 u_color;\n\
			varying vec2 v_coord;\n\
			void main() {\n\
				vec2 uv = v_coord - vec2(1.0 - gl_PointCoord.s, 1.0 - gl_PointCoord.t) * u_iCharSize + u_iCharSize*0.5;\n\
				uv.y = 1.0 - uv.y;\n\
				gl_FragColor = u_color * texture2D(u_texture, uv, -1.0  );\n\
			}\n\
			";

	//text rendering
	var max_characters = 1000;
	var	text_shader = new GL.Shader( TEXT_VERTEX_SHADER, TEXT_FRAGMENT_SHADER );
	var text_vertices = new Float32Array( max_characters * 3 );
	var text_coords = new Float32Array( max_characters * 2 );
	var text_mesh = new GL.Mesh();
	var text_vertices_buffer = text_mesh.addVertexBuffer("vertices", null, null, text_vertices, gl.STREAM_DRAW );
	var text_coords_buffer = text_mesh.addVertexBuffer("coords", null, null, text_coords, gl.STREAM_DRAW );

	ctx.fillText = ctx.strokeText = function(text,startx,starty)
	{
		var atlas = this.createFontAtlas( this._font_family );
		var info = atlas.info;

		var points = text_vertices;
		var coords = text_coords;
		var point_size = this._font_size * 1.1;

		if(point_size < 10)
			point_size = 10;
		var char_size = info.char_size;

		var x = 0;
		var y = 0;
		var l = text.length;
		var spacing = point_size * info.spacing / info.char_size - 1 ;
		var kernings = info.kernings;
		var scale_factor = info.font_size / this._font_size;

		var vertices_index = 0, coords_index = 0;
		
		for(var i = 0; i < l; i++)
		{
			var char_code = text.charCodeAt(i);
			var c = info[ char_code ]; //info
			if(!c)
			{
				if(text.charCodeAt(i) == 10) //break line
				{
					x = 0;
					y -= point_size;
				}
				else
					x += point_size * 0.5;
				continue;
			}

			var kern = kernings[ text[i] ];
			if(i == 0)
				x -= point_size * info.space * 2;


			points[vertices_index+0] = startx + x + point_size * 0.5;
			points[vertices_index+1] = starty + y - point_size*0.25;
			points[vertices_index+2] = 1;
			vertices_index += 3;

			coords[coords_index+0] = c[1];
			coords[coords_index+1] = c[2];
			coords_index += 2;

			var pair_kern = kern[ text[i+1] ];
			if(!pair_kern)
				x += point_size * info.space;
			else
				x += point_size * pair_kern;
		}

		var offset = 0;
		if(this.textAlign == "right")
			offset = x;
		else if(this.textAlign == "center")
			offset = x * 0.5;
		if(offset)
			for(var i = 0; i < points.length; i += 3)
				points[i] -= offset;
		
		//render
		atlas.bind(0);

		//var mesh = GL.Mesh.load({ vertices: points, coords: coords });
		text_vertices_buffer.uploadRange(0,vertices_index*4);
		text_coords_buffer.uploadRange(0,coords_index*4);

		uniforms.u_color = this._fillcolor;
		uniforms.u_pointSize = point_size * this._matrix[0];
		uniforms.u_iCharSize = info.char_size / atlas.width;
		uniforms.u_transform = this._matrix;
		uniforms.u_viewport = viewport;

		text_shader.uniforms(uniforms).drawRange(text_mesh, gl.POINTS, 0, vertices_index / 3 );
	}

	ctx.measureText = function(text)
	{
		var atlas = this.createFontAtlas( this._font_family );
		var spacing = point_size * atlas.info.spacing / atlas.info.char_size - 1 ;
		return { width: text.length * spacing };
	}

	ctx.createFontAtlas = function(fontname)
	{
		var texture = this.textures[":font_" + fontname];
		if(texture)
			return texture;

		fontname = fontname || "monospace";
		var fontmode = "normal";//"bold";
		var canvas = createCanvas(512,512);
		//document.body.appendChild(canvas);
		var font_size = (canvas.width * 0.09)|0;
		var char_size = (canvas.width * 0.1)|0;

		var ctx = canvas.getContext("2d");
		ctx.fillStyle = "white";
		//ctx.fillRect(0,0,canvas.width,canvas.height);
		ctx.clearRect(0,0,canvas.width,canvas.height);
		ctx.font = fontmode + " " + font_size + "px " + fontname;
		ctx.textAlign = "center";
		var x = 0;
		var y = 0;
		var xoffset = 0.5, yoffset = font_size * -0.3;
		var info = {
			font_size: font_size,
			char_size: char_size, //in pixels
			spacing: char_size * 0.6, //in pixels
			space: (ctx.measureText(" ").width / font_size)
		};

		//compute individual char width
		var kernings = info.kernings = {};
		for(var i = 0; i < 100; i++)
		{
			var character = String.fromCharCode(i+33);
			var char_width = ctx.measureText(character).width;
			kernings[character] = { "width": char_width };
		}

		for(var i = 0; i < 100; i++)//valid characters from 33 to 133
		{
			var character = String.fromCharCode(i+33);
			info[i+33] = [character, (x + char_size*0.5)/canvas.width, (y + char_size*0.5) / canvas.height];
			ctx.fillText(character,Math.floor(x+char_size*xoffset),Math.floor(y+char_size+yoffset),char_size);
			x += char_size;
			if((x + char_size) > canvas.width)
			{
				x = 0;
				y += char_size;
			}

			//compute kernings
			var char_width = kernings[character].width;
			for(var j = 0; j < 100; j++)
			{
				var other = String.fromCharCode(j+33);
				var other_width = kernings[other].width;
				var total_width = ctx.measureText(character + other).width;
				kernings[character][other] = (total_width * 1.45 - char_width - other_width) / font_size;
			}
		}

		/* try to put white the color layers, but doesnt work
		var imgd = ctx.getImageData(0, 0, canvas.width, canvas.height);
		var pix = imgd.data;
		for (var i = 0, n = pix.length; i < n; i += 4) {
			pix[i  ] = 255; // red
			pix[i+1] = 255; // green
			pix[i+2] = 255; // blue
			// i+3 is alpha (the fourth element)
		}
		ctx.putImageData(imgd, 0, 0);
		*/

		texture = GL.Texture.fromImage(canvas, {magFilter: gl.LINEAR, minFilter: gl.LINEAR_MIPMAP_LINEAR, premultiply_alpha: false} );
		texture.info = info; //font generation info
		this.textures[":font_" + fontname] = texture;
		return texture;
	}

	//NOT TESTED
	ctx.getImageData = function(x,y,w,h)
	{
		var buffer = new Uint8Array(w*h*4);
		gl.readPixels(x,y,w,h,gl.RGBA,gl.UNSIGNED_BYTE,buffer);
		return { data: buffer, width: w, height: h, resolution: 1 };
	}

	ctx.putImageData = function( imagedata, x, y )
	{
		var tex = new GL.Texture( imagedata.width, imagedata.height, { filter: gl.NEAREST, pixel_data: imagedata.data } );
		tex.renderQuad(x,y,tex.width, tex.height);
	}

	Object.defineProperty(gl, "fillStyle", {
		get: function() { return this._fillStyle; },
		set: function(v) { 
			this._fillStyle = v; 
			this.updateColor(v, this._fillcolor); 
		}
	});

	Object.defineProperty(gl, "strokeStyle", {
		get: function() { return this._strokeStyle; },
		set: function(v) { 
			this._strokeStyle = v; 
			this.updateColor( v, this._strokecolor );
		}
	});

	Object.defineProperty(gl, "globalAlpha", {
		get: function() { return this._globalAlpha; },
		set: function(v) { 
			this._globalAlpha = v; 
			this._strokecolor[3] = this._fillcolor[3] = v;
		}
	});

	Object.defineProperty(gl, "font", {
		get: function() { return this._font; },
		set: function(v) { 
			this._font = v;
			var t = v.split(" ");
			if(t.length == 2)
			{
				this._font_size = parseInt(t[0]);
				if(this._font_size < 10) 
					this._font_size = 10;
				this._font_family = t[1];
			}
			else
				this._font_family = t[0];
		}
	});

	ctx._fillcolor = vec4.fromValues(0,0,0,1);
	ctx._strokecolor = vec4.fromValues(0,0,0,1);
	ctx._globalAlpha = 1;
	ctx._font = "14px monospace";
	ctx._font_family = "monospace";
	ctx._font_size = "14px";

	//STATE
	ctx.strokeStyle = "rgba(0,0,0,1)";
	ctx.fillStyle = "rgba(0,0,0,1)";
	ctx.globalAlpha = 1;
	ctx.setLineWidth = ctx.lineWidth; //save the webgl function
	ctx.lineWidth = 4; //set lineWidth as a number
	ctx.imageSmoothingEnabled = true;
	ctx.tintImages = false; //my own parameter


	//empty functions: this is used to create null functions in those Canvas2D funcs not implemented here
	var names = ["clip","arcTo","isPointInPath","createImageData"]; //all functions have been implemented
	var null_func = function() {};
	for(var i in names)
		ctx[ names[i] ] = null_func;

	return ctx;
};