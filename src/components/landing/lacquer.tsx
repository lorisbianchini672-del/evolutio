"use client";

import { useEffect, useRef } from "react";

// Fond du héros : des volumes de laque noire aux reflets ambre et bleus, calculés en temps réel par la carte graphique.
// La lumière suit doucement le pointeur. Sans WebGL ou avec les animations réduites, une image fixe reste affichée.
const FRAG = `precision highp float;
uniform vec2 R;uniform float T;uniform vec2 M;uniform float S;uniform float V;
float rnd(float n){return fract(sin(n*91.345)*47453.21);}
void main(){vec2 uv=gl_FragCoord.xy/R;vec2 p=(gl_FragCoord.xy-.5*R)/R.y;
 vec2 c=vec2(-2.1+V*.5,-2.4-V*.3);vec2 q=p-c;float a=atan(q.y,q.x);
 float d=length(q)+.05*sin(a*3.5+T*.21+S*1.4)+.02*sin(a*8.-T*.16+length(q)*2.5);
 float fr=3.1+V*.7;float r=d*fr+S*.35;float id=floor(r);float x=fract(r)*2.-1.;
 float w=.9+.1*rnd(id);x=clamp(x/w,-1.,1.);
 vec2 g=normalize(q);
 float z=sqrt(max(0.,1.-x*x));vec3 n=normalize(vec3(g*x*1.15,z+.001));
 float tone=.45+.55*rnd(id+7.);
 float sweep=a*3.4-T*.11+id*.7;
 vec3 L=normalize(vec3(cos(sweep)*.6+.3+M.x*.6,sin(sweep*1.3)*.45+.15+M.y*.5,.55));
 vec3 Vd=vec3(0.,0.,1.),H=normalize(L+Vd);
 float dx=.075;
 float sr=pow(max(dot(normalize(vec3(g*(x+dx)*1.15,z)),H),0.),46.);
 float sg=pow(max(dot(n,H),0.),52.);
 float sb=pow(max(dot(normalize(vec3(g*(x-dx)*1.15,z)),H),0.),46.);
 float broad=pow(max(dot(n,H),0.),7.);
 float lane=pow(.5+.5*sin(a*7.-T*.28+id*2.1+S*.8),5.);
 float hot=mix(.08,1.25,lane)*tone;
 vec3 col=vec3(.010,.011,.014);
 col+=vec3(.09,.09,.1)*z*tone;
 col+=vec3(.55,.40,.26)*broad*.9*hot+vec3(.12,.11,.12)*broad*tone;
 vec3 ir=vec3(sr*1.15+sg*.25,sg*1.05,sb*1.45+sg*.2);
 col+=ir*1.9*hot;
 col+=mix(vec3(.95,.7,.45),vec3(.55,.7,1.),.5+.5*x)*sg*sg*1.2*hot;
 float edge=smoothstep(.86,.985,abs(x))*(1.-smoothstep(.985,1.,abs(x)));col+=vec3(.8,.85,.95)*edge*.22*tone*(.4+.6*lane);
 col*=smoothstep(1.,.93,abs(x))*.85+.15;
 col*=1.-.6*smoothstep(.3,1.2,length((uv-vec2(.64,.52))*vec2(1.25,1.)));
 col=1.-exp(-col*1.25);
 float gr=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233))+T)*43758.5453);col+=(gr-.5)*.016;
 gl_FragColor=vec4(col,1.);}`;

const VERT = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";

export function Lacquer({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "high-performance" });
    if (!gl) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const shader = (type: number, source: string) => {
      const s = gl.createShader(type);
      if (!s) return null;
      gl.shaderSource(s, source);
      gl.compileShader(s);
      return s;
    };
    const program = gl.createProgram();
    const vs = shader(gl.VERTEX_SHADER, VERT);
    const fs = shader(gl.FRAGMENT_SHADER, FRAG);
    if (!program || !vs || !fs) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, "a");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = {
      R: gl.getUniformLocation(program, "R"),
      T: gl.getUniformLocation(program, "T"),
      M: gl.getUniformLocation(program, "M"),
      S: gl.getUniformLocation(program, "S"),
      V: gl.getUniformLocation(program, "V"),
    };

    let mx = 0;
    let my = 0;
    let tx = 0;
    let ty = 0;
    let raf = 0;
    let visible = true;
    const start = performance.now() - 4000;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };
    const draw = (now: number) => {
      resize();
      tx += (mx - tx) * 0.045;
      ty += (my - ty) * 0.045;
      gl.uniform2f(u.R, canvas.width, canvas.height);
      gl.uniform1f(u.T, reduced ? 4 : (now - start) / 1000);
      gl.uniform2f(u.M, tx, ty);
      gl.uniform1f(u.S, window.scrollY / window.innerHeight);
      gl.uniform1f(u.V, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const loop = (now: number) => {
      raf = 0;
      if (!visible) return;
      draw(now);
      if (!reduced) raf = requestAnimationFrame(loop);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(loop);
    });
    observer.observe(canvas);
    const onMove = (event: PointerEvent) => {
      const r = host.getBoundingClientRect();
      mx = ((event.clientX - r.left) / r.width) * 2 - 1;
      my = -(((event.clientY - r.top) / r.height) * 2 - 1);
    };
    const onLeave = () => {
      mx = 0;
      my = 0;
    };
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerleave", onLeave);
    const onResize = () => {
      if (reduced) draw(performance.now());
    };
    window.addEventListener("resize", onResize);
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}

export default Lacquer;
