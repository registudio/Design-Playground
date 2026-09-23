/**
 * A small WebGL runtime for ShaderGradient-style mesh gradients.
 *
 * ShaderGradient (https://shadergradient.co/, MIT, ruucm) is a React Three Fiber
 * library: its gradients are a subdivided mesh displaced in z by Perlin noise, whose
 * displaced position then drives a three-colour ramp. Installing it here would mean
 * pulling in @react-three/fiber, drei, react-spring/three and three@0.169 — and this
 * project already pins three@0.134 because Vanta needs it, so that upgrade would break
 * four working cards to add eight.
 *
 * The technique needs none of that. A displaced surface shaded by its own displacement
 * is the same picture whether the displacement moves vertices or is evaluated per
 * pixel, so this does it per pixel on a single full-screen triangle: no mesh, no
 * dependency, and one bundle for all eight cards.
 *
 * The runtime underneath is therefore plain WebGL, which is what `elementOrigin`
 * reports — the engine entry names ShaderGradient as where the look comes from, not as
 * code that ships here. The noise function below is the one ShaderGradient itself uses,
 * taken verbatim from glsl-noise (MIT, Hugh Kennedy / Stefan Gustavson); both licences
 * are written into public/engine-demos/LICENSES.txt.
 */
import { readFileSync } from 'node:fs';

const CNOISE = readFileSync(new URL('./shader-cnoise.glsl', import.meta.url), 'utf8');

const VERTEX = `attribute vec2 aPos;
void main(){gl_Position=vec4(aPos,0.0,1.0);}`;

/**
 * Three surfaces, matching ShaderGradient's own `type` control: plane, sphere and
 * waterPlane. They differ only in how a fragment is mapped onto the noise field and
 * onto the colour ramp, so they share everything else.
 */
const FRAGMENT = `precision highp float;

uniform vec2 uRes;
uniform float uTime;
uniform vec3 uC1;
uniform vec3 uC2;
uniform vec3 uC3;
uniform float uDensity;
uniform float uAmplitude;
uniform float uGrain;
uniform float uShape;
uniform float uBrightness;
uniform float uContrast;
uniform vec2 uPointer;
uniform float uPointerAmount;

${CNOISE}

float hash21(vec2 p){return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);}

void main(){
  vec2 frag = gl_FragCoord.xy;
  vec2 uv = frag / uRes;
  // Aspect-corrected and centred, so a sphere stays round in any card.
  vec2 centred = (frag - 0.5 * uRes) / min(uRes.x, uRes.y);
  vec2 drift = uPointer * uPointerAmount;

  vec3 field;   // where this fragment samples the noise
  vec2 ramp;    // where it sits on the colour ramp
  float facing = 1.0;
  float alpha = 1.0;

  if (uShape < 0.5) {
    // plane
    field = vec3((centred + drift) * uDensity, uTime);
    ramp = uv;
  } else if (uShape < 1.5) {
    // sphere: project the disc back onto a unit ball and sample in 3D, so the noise
    // wraps over the surface instead of being painted flat across it.
    float radius = 0.6;
    float d = length(centred) / radius;
    float z = sqrt(max(0.0, 1.0 - d * d));
    vec3 normal = vec3(centred / radius, z);
    field = vec3((normal.xy + drift) * uDensity * 1.3, normal.z * uDensity * 0.8 + uTime);
    ramp = normal.xy * 0.5 + 0.5;
    facing = z;
    alpha = smoothstep(1.01, 0.97, d);
  } else {
    // waterPlane: one over depth, so rows compress towards the horizon. The divisor
    // never reaches zero, which keeps the near edge finite.
    float perspective = 1.0 / (0.2 + uv.y * 1.5);
    field = vec3((centred.x + drift.x) * perspective * 0.55 * uDensity,
                 (uv.y * 2.4 + drift.y) * uDensity,
                 uTime);
    ramp = vec2(clamp((uv.x - 0.5) * perspective * 0.5 + 0.5, 0.0, 1.0), uv.y);
  }

  // Two octaves: the first is the shape of the gradient, the second keeps it from
  // reading as a single smooth blob at low density.
  float height = cnoise(field) * uAmplitude + cnoise(field * 2.07 + 11.3) * uAmplitude * 0.4;

  float stop = clamp(ramp.x * 0.62 + ramp.y * 0.52 + height * 0.45, 0.0, 1.0);
  vec3 colour = stop < 0.5 ? mix(uC1, uC2, stop * 2.0) : mix(uC2, uC3, (stop - 0.5) * 2.0);

  // Shading from the displacement itself, which is what gives the flat ramp its folds.
  float lift = clamp(height * 0.5 + 0.5, 0.0, 1.0);
  colour *= 0.74 + 0.52 * lift;
  colour += vec3(pow(lift, 8.0)) * 0.22;
  // A rim light, on the sphere only.
  colour += uC3 * pow(1.0 - facing, 3.0) * 0.35 * step(0.5, uShape) * step(uShape, 1.5);

  colour = clamp((colour - 0.5) * uContrast + 0.5, 0.0, 1.0) * uBrightness;
  colour += (hash21(frag + fract(uTime) * 97.0) - 0.5) * uGrain;

  gl_FragColor = vec4(clamp(colour, 0.0, 1.0), alpha);
}`;

/**
 * Emitted once at the top of the shader bundle, so the shader source and the setup
 * around it are shared by all eight demos rather than inlined into each.
 *
 * Every demo then reads `gradient(root, options)`, whose options are named after
 * ShaderGradient's own controls.
 */
export const SHADER_RUNTIME = `const SG_VERTEX=${JSON.stringify(VERTEX)};
const SG_FRAGMENT=${JSON.stringify(FRAGMENT)};
const SG_SHAPES={plane:0,sphere:1,water:2};

function gradient(root,options){
  const canvas=root.querySelector('canvas.sg-canvas');
  const status=root.querySelector('.engine-status');
  const say=text=>{if(status)status.textContent=text};
  if(!canvas)return;
  const context=canvas.getContext('webgl',{alpha:true,antialias:false,depth:false,powerPreference:'low-power'})
    ||canvas.getContext('experimental-webgl');
  // Every card carries a CSS gradient of the same colours underneath, so a machine
  // without WebGL sees the palette rather than a hole.
  if(!context){say('WebGL unavailable here · flat gradient shown');return}
  const gl=context;
  let loop=0,onScreen=true,watcher=null;
  try{
    const compile=(type,source)=>{
      const shader=gl.createShader(type);
      gl.shaderSource(shader,source);gl.compileShader(shader);
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader)||'shader');
      return shader;
    };
    const program=gl.createProgram();
    gl.attachShader(program,compile(gl.VERTEX_SHADER,SG_VERTEX));
    gl.attachShader(program,compile(gl.FRAGMENT_SHADER,SG_FRAGMENT));
    gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program)||'link');
    gl.useProgram(program);

    // One triangle large enough to cover the clip cube — cheaper than a quad and with
    // no seam down the diagonal.
    gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    const position=gl.getAttribLocation(program,'aPos');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);

    const at=name=>gl.getUniformLocation(program,name);
    const settings={colors:['#ff5005','#dbba95','#d0bce1'],density:1.4,amplitude:1,speed:0.18,
      grain:0.05,shape:'plane',brightness:1.05,contrast:1,pointer:0,...options};
    const rgb=hex=>{const n=parseInt(hex.slice(1),16);return[(n>>16&255)/255,(n>>8&255)/255,(n&255)/255]};
    gl.uniform3fv(at('uC1'),rgb(settings.colors[0]));
    gl.uniform3fv(at('uC2'),rgb(settings.colors[1]));
    gl.uniform3fv(at('uC3'),rgb(settings.colors[2]));
    gl.uniform1f(at('uDensity'),settings.density);
    gl.uniform1f(at('uAmplitude'),settings.amplitude);
    gl.uniform1f(at('uGrain'),settings.grain);
    gl.uniform1f(at('uShape'),SG_SHAPES[settings.shape]??0);
    gl.uniform1f(at('uBrightness'),settings.brightness);
    gl.uniform1f(at('uContrast'),settings.contrast);
    gl.uniform1f(at('uPointerAmount'),settings.pointer);
    const uTime=at('uTime'),uRes=at('uRes'),uPointer=at('uPointer');

    let width=0,height=0;
    const resize=()=>{
      // Eight of these can be alive at once, so the buffer is capped well below a
      // retina backing store: this is a soft gradient, and it does not miss the pixels.
      const ratio=Math.min(devicePixelRatio||1,1.25);
      const w=Math.max(1,Math.round(root.clientWidth*ratio)),h=Math.max(1,Math.round(root.clientHeight*ratio));
      if(w===width&&h===height)return false;
      width=w;height=h;canvas.width=w;canvas.height=h;
      gl.viewport(0,0,w,h);gl.uniform2f(uRes,w,h);
      return true;
    };
    const pointer={x:0,y:0};
    if(settings.pointer)root.addEventListener('pointermove',event=>{
      const box=root.getBoundingClientRect();
      pointer.x=(event.clientX-box.left)/box.width-0.5;
      pointer.y=0.5-(event.clientY-box.top)/box.height;
    });
    const draw=seconds=>{
      gl.uniform1f(uTime,seconds*settings.speed);
      gl.uniform2f(uPointer,pointer.x,pointer.y);
      gl.drawArrays(gl.TRIANGLES,0,3);
    };
    resize();

    if(matchMedia('(prefers-reduced-motion:reduce)').matches){
      // Not blank: the same gradient, held at one moment of its drift.
      say('Reduced motion · one still frame');
      draw(64);
      addEventListener('resize',()=>{if(resize())draw(64)});
      return;
    }
    say('');
    const started=performance.now();
    const tick=now=>{
      loop=requestAnimationFrame(tick);
      if(!onScreen||document.hidden)return;
      resize();
      draw((now-started)/1000);
    };
    loop=requestAnimationFrame(tick);
    // A card scrolled past keeps its context but stops drawing, which is what makes a
    // grid of these affordable.
    watcher=new IntersectionObserver(entries=>{onScreen=entries[0].isIntersecting},{threshold:0});
    watcher.observe(root);
    addEventListener('pagehide',()=>{
      cancelAnimationFrame(loop);watcher?.disconnect();
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    });
  }catch(error){
    cancelAnimationFrame(loop);watcher?.disconnect();
    say('WebGL unavailable here · flat gradient shown');
    console.error('shader gradient',error);
  }
}`;
