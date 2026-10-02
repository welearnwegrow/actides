// =====================================================================
//  sketch.js — hand-drawn (rough.js) celestial diagram renderer
//  GeoGebra-precise construction, MinutePhysics sketch styling.
//  One full-stage canvas. Draw is driven by a parameter object P.
// =====================================================================
(function(){
'use strict';
const TAU=Math.PI*2;
const lerp=(a,b,t)=>a+(b-a)*t;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));

const INK='#27313b', INK2='#5a6b7b', OCEAN='#1f6fb2', OCEANF='rgba(31,111,178,0.13)',
      AMBER='#d68a2b', LAND='#7ba572', MOONLIT='#eef1f4';

let cv, ctx, RC, W=0, H=0, DPR=1;
// pre-rendered sprites
const sprites={};

// ---- sprite builders (rendered once, then drawImage each frame) ----
function makeSprite(size, draw){
  const c=document.createElement('canvas');
  c.width=size*DPR; c.height=size*DPR;
  const x=c.getContext('2d'); x.scale(DPR,DPR);
  const rc=rough.canvas(c);
  draw(x, rc, size);
  return c;
}
function buildSprites(){
  // ---------- MOON (detailed sketch) ----------
  sprites.moon=makeSprite(360,(x,rc,s)=>{
    const c=s/2, r=s/2-14;
    rc.circle(c,c,r*2,{roughness:1.0,bowing:0.7,stroke:INK,strokeWidth:2.2,fill:'#e9edf1',fillStyle:'solid',seed:11});
    // maria (dark patches) — sketched
    const maria=[[ -0.28,-0.22,0.30],[0.22,-0.05,0.22],[-0.05,0.30,0.26],[0.34,0.30,0.16],[-0.40,0.18,0.14]];
    maria.forEach((m,i)=>rc.circle(c+m[0]*r,c+m[1]*r,m[2]*r*2,{roughness:1.5,bowing:1.2,stroke:'rgba(120,130,142,0.0)',fill:'rgba(120,131,143,0.30)',fillStyle:'solid',seed:20+i}));
    // craters — rough rings
    const cr=[[0.10,-0.42,0.10],[-0.46,-0.30,0.07],[0.46,-0.18,0.06],[0.05,0.04,0.07],[-0.20,0.50,0.06],[0.40,0.50,0.05],[0.52,0.10,0.05],[-0.54,0.02,0.05],[0.20,-0.20,0.05]];
    cr.forEach((m,i)=>{rc.circle(c+m[0]*r,c+m[1]*r,m[2]*r*2,{roughness:1.3,stroke:'rgba(110,121,134,0.7)',strokeWidth:1.2,seed:40+i});});
  });

  // ---------- EARTH (sketch, oceans + continents) ----------
  sprites.earth=makeSprite(300,(x,rc,s)=>{
    const c=s/2, r=s/2-12;
    rc.circle(c,c,r*2,{roughness:0.9,bowing:0.6,stroke:INK,strokeWidth:2.4,fill:'rgba(64,150,205,0.5)',fillStyle:'solid',seed:5});
    // continents — blobby rough polygons
    const blob=(pts,seed)=>rc.polygon(pts.map(p=>[c+p[0]*r,c+p[1]*r]),{roughness:1.4,bowing:1.1,stroke:'rgba(70,110,60,0.0)',fill:'rgba(123,165,114,0.85)',fillStyle:'solid',seed});
    blob([[-0.5,-0.35],[-0.1,-0.5],[0.15,-0.2],[-0.15,0.0],[-0.45,0.05]],51);
    blob([[0.1,0.05],[0.45,-0.05],[0.5,0.35],[0.2,0.5],[0.0,0.3]],52);
    blob([[-0.55,0.2],[-0.3,0.25],[-0.25,0.5],[-0.5,0.45]],53);
    rc.circle(c,c,r*2,{roughness:0.9,stroke:'rgba(255,255,255,0.4)',strokeWidth:1,seed:5});
  });

  // ---------- SUN (sketch with rays) ----------
  sprites.sun=makeSprite(420,(x,rc,s)=>{
    const c=s/2, r=s/2-70;
    // glow
    const g=x.createRadialGradient(c,c,r*0.6,c,c,r+64);
    g.addColorStop(0,'rgba(255,206,114,0.45)');g.addColorStop(1,'rgba(255,206,114,0)');
    x.fillStyle=g; x.beginPath(); x.arc(c,c,r+64,0,TAU); x.fill();
    // rays
    for(let i=0;i<16;i++){const a=i/16*TAU; rc.line(c+Math.cos(a)*(r+8),c+Math.sin(a)*(r+8),c+Math.cos(a)*(r+40),c+Math.sin(a)*(r+40),{roughness:1.3,stroke:AMBER,strokeWidth:2,seed:60+i});}
    rc.circle(c,c,r*2,{roughness:0.9,bowing:0.5,stroke:'#c07d22',strokeWidth:2.4,fill:'rgba(255,201,99,0.9)',fillStyle:'solid',seed:7});
  });
}

// ---- handwriting label ----
function label(text, sx, sy, opt={}){
  ctx.save();
  ctx.font=(opt.size||22)+"px 'Caveat', cursive";
  ctx.fillStyle=opt.color||INK;
  ctx.textAlign=opt.align||'center';
  ctx.textBaseline=opt.baseline||'middle';
  ctx.globalAlpha=opt.alpha==null?1:opt.alpha;
  ctx.fillText(text,sx,sy);
  ctx.restore();
}

// ---- moon phase shadow overlay (p: 0 new .. 0.5 full .. 1 new) ----
function drawPhaseShadow(sx,sy,r,phase,op){
  const p=((phase%1)+1)%1;
  const ca=Math.cos(p*TAU);        // +1 new, -1 full
  const mir=(p<0.5)?1:-1;          // waxing lit on right
  ctx.save();
  ctx.globalAlpha=(op==null?1:op);
  ctx.translate(sx,sy);
  ctx.beginPath();
  const N=40;
  // dark (unlit) region = complement of lit
  // lit boundary: semicircle on lit side + terminator ellipse
  for(let i=0;i<=N;i++){const f=-Math.PI/2+(i/N)*Math.PI;ctx.lineTo(-mir*r*Math.cos(f),r*Math.sin(f));}
  for(let i=N;i>=0;i--){const f=-Math.PI/2+(i/N)*Math.PI;ctx.lineTo(mir*r*ca*Math.cos(f),r*Math.sin(f));}
  ctx.closePath();
  ctx.fillStyle='rgba(34,42,52,0.62)';
  ctx.fill();
  ctx.restore();
}

// =====================================================================
//  CAMERA + WORLD
//  Earth at world origin. 1 world unit = Earth radius (not to scale).
// =====================================================================
const WORLD={ moonOrbit:4.0, moonR:0.5, earthR:1.0, sunX:15, sunR:2.4 };
let cam={x:2,y:0,scale:90,ox:0.5,oy:0.5};   // scale = px per world unit; ox/oy = screen origin fraction
function px(wx){ return W*cam.ox + (wx-cam.x)*cam.scale; }
function py(wy){ return H*cam.oy + (wy-cam.y)*cam.scale; }
function pscale(u){ return u*cam.scale; }
// observer geometry (rotating-Earth model)
const OBS_LAT=0.60, AX_TILT=0.42, AX_ROLL=0.41;   // AX_ROLL = visible 23.5° obliquity (sideways lean)
function projObs(lat,lon){
  // unit sphere: x right, y up, z toward viewer; axis tilted toward viewer by AX_TILT
  const x=Math.cos(lat)*Math.sin(lon), y=Math.sin(lat), z=Math.cos(lat)*Math.cos(lon);
  const yt=y*Math.cos(AX_TILT)-z*Math.sin(AX_TILT);
  const zt=y*Math.sin(AX_TILT)+z*Math.cos(AX_TILT);
  // roll: lean the spin axis sideways in the screen plane so the tilt is visible
  const xr=x*Math.cos(AX_ROLL)-yt*Math.sin(AX_ROLL);
  const yr=x*Math.sin(AX_ROLL)+yt*Math.cos(AX_ROLL);
  return {x:xr, y:yr, z:zt, front:zt>=0};
}

// ---- procedural rotating Earth (continents scroll by longitude) ----
const LANDPTS=(function(){
  const pts=[]; let s=20260608;
  const rnd=()=>{s=(s*1103515245+12345)&0x7fffffff;return s/0x7fffffff;};
  // continent clusters: [lonDeg, latDeg, spreadLon, spreadLat, count]
  const cl=[[15,28,46,34,46],[6,-26,34,30,32],[122,34,48,28,44],[112,-26,30,26,24],[-58,5,30,46,34],[-104,42,34,26,30]];
  cl.forEach(c=>{for(let i=0;i<c[4];i++){const lon=(c[0]+(rnd()-0.5)*c[2])*Math.PI/180;const lat=(c[1]+(rnd()-0.5)*c[3])*Math.PI/180;pts.push([lon,lat,2.6+rnd()*4]);}});
  return pts;
})();
function drawRotatingEarth(eS,eY,eR,spin){
  ctx.save();
  ctx.beginPath();ctx.arc(eS,eY,eR,0,TAU);ctx.fillStyle='rgba(64,150,205,0.55)';ctx.fill();
  ctx.clip();
  LANDPTS.forEach(p=>{
    const lon=p[0]+spin, lat=p[1];
    const x=Math.cos(lat)*Math.sin(lon), y=Math.sin(lat), z=Math.cos(lat)*Math.cos(lon);
    const yt=y*Math.cos(AX_TILT)-z*Math.sin(AX_TILT), zt=y*Math.sin(AX_TILT)+z*Math.cos(AX_TILT);
    if(zt<0) return;
    // same sideways roll as projObs so the globe leans on its tilted axis
    const xr=x*Math.cos(AX_ROLL)-yt*Math.sin(AX_ROLL);
    const yr=x*Math.sin(AX_ROLL)+yt*Math.cos(AX_ROLL);
    const sx=eS+xr*eR, sy=eY-yr*eR;
    const r=Math.max(2, p[2]*(eR/150)*(0.6+0.4*zt));
    ctx.beginPath();ctx.arc(sx,sy,r,0,TAU);ctx.fillStyle='rgba(123,165,114,0.92)';ctx.fill();
  });
  ctx.restore();
  ctx.beginPath();ctx.arc(eS,eY,eR,0,TAU);ctx.lineWidth=2.4;ctx.strokeStyle=INK;ctx.stroke();
  ctx.beginPath();ctx.arc(eS,eY,eR,0,TAU);ctx.lineWidth=1;ctx.strokeStyle='rgba(255,255,255,0.4)';ctx.stroke();
}
// ---- clean formula text ----
function formula(text, sx, sy, size, color, alpha){
  ctx.save();ctx.globalAlpha=alpha==null?1:alpha;ctx.fillStyle=color||INK;
  ctx.font='italic '+(size||26)+"px Georgia, 'Times New Roman', serif";
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,sx,sy);ctx.restore();
}

// ---------------------------------------------------------------------
//  SCENE: detailed Moon intro + zoom-to-scale
//  P.introZoom 0 = full-screen moon ; 1 = zoomed out (tiny Earth visible)
// ---------------------------------------------------------------------
function sceneIntro(P){
  const z=P.introZoom;
  const centered = Math.abs((cam.ox==null?0.5:cam.ox)-0.5)<0.06;
  // when centred, the Moon sits in the middle with text above; otherwise reserve the left
  const textRight = centered? W*0.05 : W*0.46;
  const regionCx = (textRight + W*0.95)/2;
  const cx0 = centered? W*0.5 : regionCx;
  const cyc = H*(cam.oy==null?0.54:cam.oy);
  const moonSize=lerp(Math.min(Math.min(W,H)*0.62, (W*0.95-textRight)*0.92), Math.min(W,H)*0.12, z);
  const span=Math.min(W*0.2,240);
  const moonX=lerp(cx0, cx0+span, z);
  const moonY=cyc;
  if(z<0.04) label('the Moon', cx0, cyc+moonSize*0.5+34, {size:28,color:INK,alpha:clamp((0.15-z)/0.15,0,1)});

  if(z>0.2){
    const a=clamp((z-0.2)/0.6,0,1);
    const earthSize=Math.min(moonSize*3.67, Math.min(W,H)*0.5);
    const earthX=cx0-span, earthY=cyc;
    drawSpriteImg(sprites.earth, earthX, earthY, earthSize, a);
    label('Earth', earthX, earthY+earthSize*0.5+28, {size:24,color:INK,alpha:a});
    label('the Moon', moonX, moonY+moonSize*0.5+26, {size:21,color:INK2,alpha:a});
    // distance bracket between the two bodies
    const x1=earthX+earthSize*0.5+8, x2=moonX-moonSize*0.5-8, my=cyc;
    ctx.save();ctx.globalAlpha=a*0.85;ctx.strokeStyle=INK2;ctx.lineWidth=1.3;
    ctx.beginPath();ctx.moveTo(x1,my);ctx.lineTo(x2,my);ctx.stroke();
    [x1,x2].forEach(x=>{ctx.beginPath();ctx.moveTo(x,my-7);ctx.lineTo(x,my+7);ctx.stroke();});
    ctx.restore();
    label('about 30 × Earth\u2019s width apart', (x1+x2)/2, my-15, {size:19,color:INK2,alpha:a});
  }
  // draw Moon last so it sits above the bracket line
  drawSpriteImg(sprites.moon, moonX, moonY, moonSize);
}
function drawSpriteImg(spr, cx, cy, size, alpha=1){
  ctx.save(); ctx.globalAlpha=alpha;
  ctx.drawImage(spr, cx-size/2, cy-size/2, size, size);
  ctx.restore();
}

// ---------------------------------------------------------------------
//  SCENE: Earth–Moon(–Sun) system (not to scale)
// ---------------------------------------------------------------------
let _seedShift=0;
function sceneSystem(P){
  const eR=pscale(WORLD.earthR);
  const eS=px(0), eY=py(0);
  const moonDist=(P.moonDist||WORLD.moonOrbit);
  const orbit=pscale(moonDist);
  const ma=P.moonAngle;                         // radians, 0 = +x (3 o'clock)

  // ---- Sun ----
  if(P.showSun>0.01){
    if(P.sunCompact){
      // compact: a small Sun just beyond the Moon's orbit, with a "to the Sun" cue
      const sgx=px(moonDist+1.15), sgy=eY, ss=pscale(0.62);
      ctx.save();ctx.globalAlpha=P.showSun*0.5;ctx.strokeStyle=AMBER;ctx.setLineDash([2,7]);ctx.lineWidth=1.4;
      ctx.beginPath();ctx.moveTo(eS,eY);ctx.lineTo(sgx-ss*0.6,sgy);ctx.stroke();ctx.setLineDash([]);ctx.restore();
      drawSpriteImg(sprites.sun, sgx, sgy, ss*2.4, P.showSun);
      label('to the Sun', sgx, sgy+ss*1.5, {size:18,color:'#c07d22',alpha:P.showSun});
    } else {
      const sx=px(WORLD.sunX), sy=py(0), ss=pscale(WORLD.sunR)*2;
      drawSpriteImg(sprites.sun, sx, sy, ss*1.5, P.showSun);
      ctx.save();ctx.globalAlpha=P.showSun*0.5;ctx.strokeStyle=AMBER;ctx.setLineDash([2,7]);ctx.lineWidth=1.4;
      ctx.beginPath();ctx.moveTo(eS,eY);ctx.lineTo(sx,sy);ctx.stroke();ctx.setLineDash([]);ctx.restore();
      label('Sun', sx, sy+ss*0.78, {size:24,color:'#c07d22',alpha:P.showSun});
      label('not to scale', sx, sy+ss*0.78+22, {size:17,color:INK2,alpha:P.showSun*0.8});
    }
  }

  // ---- bulge axis (toward Moon; pulled toward Sun when present) ----
  let axis=ma, stretch=P.bulge;
  if(P.showSun>0.4){
    const rx=Math.cos(ma)+0.46*P.showSun, ry=Math.sin(ma);
    axis=Math.atan2(ry,rx);
    const align=Math.abs(Math.cos(ma));         // 1 aligned (spring), 0 perpendicular (neap)
    stretch=lerp(P.bulge*0.80, P.bulge*1.20, align);
  }
  // bulge sits behind the globe (shows around the rim)
  drawBulge(eS,eY,eR,axis,stretch,P.bulgeOp==null?0.9:P.bulgeOp);

  // ---- rotating-Earth observer: BACK half (behind globe), drawn before Earth ----
  const showObs=(P.showObserver==null?0:P.showObserver);
  const lon=P.spin||0;
  let obs=null;
  if(showObs>0.01){
    drawLatPath(eS,eY,eR,false,showObs);
    obs=projObs(OBS_LAT,lon);
    if(!obs.front) drawObserver(eS,eY,eR,obs,ma,showObs,P,false);
  }

  // ---- Earth (rotating globe when spinning) ----
  if(P.rotateEarth) drawRotatingEarth(eS, eY, eR, P.earthSpin||0);
  else drawSpriteImg(sprites.earth, eS, eY, eR*2, 1);

  // ---- spin axis over the globe ----
  if(showObs>0.01) drawAxis(eS,eY,eR,showObs);

  // ---- orbit path (with clock / month) ----
  if(P.showClock>0.01){
    ctx.save();ctx.globalAlpha=0.45*P.showClock;ctx.strokeStyle='rgba(39,49,59,0.35)';ctx.setLineDash([2,8]);ctx.lineWidth=1.3;
    ctx.beginPath();ctx.arc(eS,eY,orbit,0,TAU);ctx.stroke();ctx.setLineDash([]);ctx.restore();
  }

  // ---- spring / neap position indicators on the orbit (no phase-name labels) ----
  if(P.markPositions){
    const isSpring=P.markPositions==='spring';
    const angs = isSpring?[0,Math.PI]:[Math.PI/2,-Math.PI/2];
    const dotR=Math.max(5.5,pscale(0.17));
    angs.forEach((ang)=>{
      const mx2=eS+Math.cos(ang)*orbit, my2=eY+Math.sin(ang)*orbit;
      const dd=Math.abs(((ma-ang+Math.PI)%TAU+TAU)%TAU-Math.PI);
      const near=dd<0.4;
      ctx.save();
      // soft red halo when the Moon is passing through this spring/neap position
      if(near){ctx.beginPath();ctx.arc(mx2,my2,dotR+11,0,TAU);ctx.fillStyle='rgba(208,52,52,0.16)';ctx.fill();}
      ctx.beginPath();ctx.arc(mx2,my2,dotR,0,TAU);
      ctx.fillStyle='rgba(208,52,52,0.96)';ctx.fill();
      ctx.lineWidth=2;ctx.strokeStyle='rgba(255,255,255,0.92)';ctx.stroke();
      ctx.restore();
    });
  }

  // ---- observer FRONT half (over globe) ----
  if(showObs>0.01){
    drawLatPath(eS,eY,eR,true,showObs);
    if(obs.front) drawObserver(eS,eY,eR,obs,ma,showObs,P,true);
  }

  // ---- Moon at orbit position, always visible, with phase ----
  const mx=eS+Math.cos(ma)*orbit, my=eY+Math.sin(ma)*orbit;
  const mR=pscale(WORLD.moonR);
  ctx.save();ctx.globalAlpha=0.4;ctx.strokeStyle=INK2;ctx.setLineDash([2,7]);ctx.lineWidth=1.2;
  ctx.beginPath();ctx.moveTo(eS,eY);ctx.lineTo(mx,my);ctx.stroke();ctx.setLineDash([]);ctx.restore();
  drawSpriteImg(sprites.moon, mx, my, mR*2, 1);
  if(P.phaseShadowOp>0.01) drawPhaseShadow(mx,my,mR*0.95,P.phase,P.phaseShadowOp);
  label('Moon', mx, my+mR+15, {size:16,color:INK2,alpha:0.8});

  // ---- force vectors (tidal field) ----
  if(P.showArrows>0.01) drawTidalArrows(eS,eY,eR,ma,P.showArrows);

  // ---- config label (kept close under the globe) ----
  if(P.configLabel) label(P.configLabel, eS, eY+eR*1.85+22, {size:22,color:INK2,alpha:P.configLabelOp==null?1:P.configLabelOp});
}

// rotating-Earth helpers -------------------------------------------------
function drawAxis(eS,eY,eR,alpha){
  const top=projObs(Math.PI/2,0), bot=projObs(-Math.PI/2,0);
  const tx=eS+top.x*eR, ty=eY-top.y*eR, bx=eS+bot.x*eR, by=eY-bot.y*eR;
  ctx.save();ctx.globalAlpha=alpha*0.7;ctx.strokeStyle='rgba(39,49,59,0.55)';ctx.lineWidth=1.4;ctx.setLineDash([4,4]);
  ctx.beginPath();ctx.moveTo(tx,ty-12);ctx.lineTo(bx,by+12);ctx.stroke();ctx.setLineDash([]);
  // spin-direction arc near north pole
  ctx.strokeStyle='rgba(39,49,59,0.5)';ctx.lineWidth=1.6;
  ctx.beginPath();ctx.arc(tx,ty-2,12,0.2,2.5);ctx.stroke();
  const ax=tx+Math.cos(2.5)*12, ay=(ty-2)+Math.sin(2.5)*12;
  ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(ax-6,ay-3);ctx.lineTo(ax-2,ay+5);ctx.closePath();ctx.fillStyle='rgba(39,49,59,0.5)';ctx.fill();
  ctx.restore();
}
function drawLatPath(eS,eY,eR,front,alpha){
  ctx.save();ctx.globalAlpha=alpha*(front?0.5:0.22);
  ctx.strokeStyle=front?'rgba(31,111,178,0.6)':'rgba(31,111,178,0.4)';
  ctx.lineWidth=1.3;ctx.setLineDash([3,4]);ctx.beginPath();
  let started=false; const N=84;
  for(let i=0;i<=N;i++){
    const lon=i/N*TAU, p=projObs(OBS_LAT,lon);
    if(p.front!==front){started=false;continue;}
    const sx=eS+p.x*eR, sy=eY-p.y*eR;
    if(!started){ctx.moveTo(sx,sy);started=true;}else ctx.lineTo(sx,sy);
  }
  ctx.stroke();ctx.setLineDash([]);ctx.restore();
}
function drawObserver(eS,eY,eR,obs,ma,alpha,P,front){
  const sx=eS+obs.x*eR, sy=eY-obs.y*eR;
  const cg=obs.x*Math.cos(ma)+obs.y*Math.sin(ma);   // alignment with Moon direction
  const high=(3*cg*cg-1)>0.7;
  ctx.save();
  if(!front){
    ctx.globalAlpha=alpha*0.3;
    ctx.beginPath();ctx.arc(sx,sy,4.5,0,TAU);ctx.fillStyle='#c93b3b';ctx.fill();
    ctx.restore();return;
  }
  ctx.globalAlpha=alpha;
  const pr=6+2*Math.sin((P.obsPulse||0)*TAU);
  ctx.beginPath();ctx.arc(sx,sy,13+pr*0.5,0,TAU);ctx.fillStyle='rgba(201,59,59,0.14)';ctx.fill();
  ctx.beginPath();ctx.arc(sx,sy,9,0,TAU);ctx.fillStyle='rgba(201,59,59,0.22)';ctx.fill();
  ctx.beginPath();ctx.arc(sx,sy,5.5,0,TAU);ctx.fillStyle='#c93b3b';ctx.fill();ctx.lineWidth=2;ctx.strokeStyle='#fff';ctx.stroke();
  // little flag = the observer standing there
  ctx.strokeStyle='#0f477a';ctx.lineWidth=1.8;ctx.beginPath();ctx.moveTo(sx,sy-5);ctx.lineTo(sx,sy-20);ctx.stroke();
  ctx.beginPath();ctx.moveTo(sx,sy-20);ctx.lineTo(sx+12,sy-16.5);ctx.lineTo(sx,sy-13);ctx.closePath();ctx.fillStyle='#c93b3b';ctx.fill();
  ctx.restore();
  const lx=sx+(obs.x>=0?16:-16), align=obs.x>=0?'left':'right';
  label("St Donat's", lx, sy+2, {size:19,color:'#0f477a',align,alpha});
  if(P.showTideState) label(high?'HIGH tide':'low tide', lx, sy+22, {size:17,color:high?OCEAN:INK2,align,alpha});
}

function drawBulge(cx,cy,eR,axis,stretch,op){
  ctx.save();ctx.globalAlpha=op;
  ctx.translate(cx,cy);ctx.rotate(axis);
  ctx.beginPath();
  const rx=eR*Math.max(stretch,1.05), ry=eR*Math.max(1.03, 1.95-stretch);
  ctx.ellipse(0,0,rx,ry,0,0,TAU);
  ctx.fillStyle=OCEANF;ctx.fill();
  ctx.setLineDash([5,6]);ctx.lineWidth=1.6;ctx.strokeStyle='rgba(31,111,178,0.55)';ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}
function drawTidalArrows(cx,cy,eR,ma,op){
  // Correct differential (tidal) acceleration field:  a = 3(r̂·m̂) m̂ − r̂
  //   sub-lunar & anti-lunar points → outward (mag 2, longest)
  //   quadrature (sides)           → inward  (mag 1, shortest)
  // Arrow LENGTH encodes magnitude, so this is a true vector field.
  ctx.save();ctx.globalAlpha=op;ctx.strokeStyle=OCEAN;ctx.fillStyle=OCEAN;ctx.lineWidth=2;
  const N=16, mhx=Math.cos(ma), mhy=Math.sin(ma), MAX=2;
  for(let i=0;i<N;i++){
    const th=i/N*TAU, rx=Math.cos(th), ry=Math.sin(th);
    const dot=rx*mhx+ry*mhy;
    const ax=3*dot*mhx-rx, ay=3*dot*mhy-ry;          // tidal field vector
    const mag=Math.hypot(ax,ay)||1e-6, ux=ax/mag, uy=ay/mag;
    const L=4+(mag/MAX)*22;                           // length ∝ magnitude
    const outward=(ax*rx+ay*ry)>=0;                   // arrow base just outside / inside rim
    const ox=cx+rx*(eR+ (outward?2:0)), oy=cy+ry*(eR+(outward?2:0));
    ctx.globalAlpha=op*(0.5+0.5*mag/MAX);
    arrow(ox,oy,ox+ux*L,oy+uy*L);
  }
  ctx.restore();
}
function arrow(x1,y1,x2,y2){
  ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
  const a=Math.atan2(y2-y1,x2-x1),h=5;
  ctx.beginPath();ctx.moveTo(x2,y2);ctx.lineTo(x2-h*Math.cos(a-0.5),y2-h*Math.sin(a-0.5));
  ctx.lineTo(x2-h*Math.cos(a+0.5),y2-h*Math.sin(a+0.5));ctx.closePath();ctx.fill();
}

// =====================================================================
//  SCENE: Bristol Channel map (sketch) — zoom to St Donat's
// =====================================================================
function sceneChannel(P){
  // map drawn in a fixed framed box, centred on the origin offset
  const mw=Math.min(W*0.66,900), mh=mw*0.56;
  const ox=W*(cam.ox==null?0.5:cam.ox)-mw/2, oy=H*(cam.oy==null?0.5:cam.oy)-mh/2;
  const X=u=>ox+u*mw, Y=v=>oy+v*mh;
  // sea
  ctx.save();
  ctx.fillStyle='rgba(31,111,178,0.10)';ctx.fillRect(ox,oy,mw,mh);
  // North shore — South Wales coast (funnel narrows to the right / east)
  const wales=[[0,0],[1,0],[1,0.42],[0.80,0.415],[0.60,0.385],[0.42,0.345],[0.22,0.315],[0,0.30]];
  rcPoly(wales.map(p=>[X(p[0]),Y(p[1])]),0,'rgba(205,191,158,0.94)',71);
  // South shore — North Devon & Somerset coast
  const devon=[[0,1],[1,1],[1,0.55],[0.80,0.56],[0.58,0.605],[0.40,0.66],[0.20,0.74],[0,0.80]];
  rcPoly(devon.map(p=>[X(p[0]),Y(p[1])]),0,'rgba(205,191,158,0.94)',72);

  // coastline midline helpers (water gap top/bottom at fractional x)
  const topY=x=>lerp(0.30,0.42,x), botY=x=>lerp(0.80,0.55,x);

  // marching, bunching tidal crests travelling up-channel (Atlantic → Severn)
  const phase=P.channelPhase||0;
  for(let i=0;i<8;i++){
    let u=((i/8)+phase)%1; const e=u*u;            // crowd toward the narrow east end
    const x=lerp(0.03,0.93,e);
    const yt=Y(topY(x)+0.012), yb=Y(botY(x)-0.012);
    ctx.strokeStyle='rgba(47,134,198,'+(0.22+0.6*e)+')';ctx.lineWidth=1.3+4.2*e;
    ctx.beginPath();ctx.moveTo(X(x),yt);ctx.quadraticCurveTo(X(x)+(8+24*e),(yt+yb)/2,X(x),yb);ctx.stroke();
  }
  // flow direction arrow
  ctx.globalAlpha=0.5;ctx.strokeStyle='rgba(15,71,122,0.6)';ctx.setLineDash([2,8]);ctx.lineWidth=2;
  arrowOn(X(0.10),Y((topY(0.10)+botY(0.10))/2),X(0.80),Y((topY(0.80)+botY(0.80))/2));ctx.setLineDash([]);ctx.globalAlpha=1;

  // tide-range bars growing up the funnel (appear with channelAmp)
  const amp=clamp(P.channelAmp||0,0,1);
  if(amp>0.01){
    const stations=[[0.10,2,'≈ 2 m'],[0.42,9,'≈ 9 m'],[0.86,14,'14.5 m']];
    stations.forEach(([x,val,txt],k)=>{
      const cxp=X(x), midV=(topY(x)+botY(x))/2, cyp=Y(midV);
      const barH=(val/14)*(mh*0.30)*amp;
      ctx.strokeStyle='#1f6fb2';ctx.fillStyle='#1f6fb2';ctx.lineWidth=2.4;ctx.globalAlpha=amp;
      ctx.beginPath();ctx.moveTo(cxp,cyp+barH/2);ctx.lineTo(cxp,cyp-barH/2);ctx.stroke();
      [cyp-barH/2,cyp+barH/2].forEach(yy=>{ctx.beginPath();ctx.moveTo(cxp-5,yy);ctx.lineTo(cxp+5,yy);ctx.stroke();});
      label(txt,cxp,cyp-barH/2-12,{size:18,color:'#0f477a',alpha:amp});
      ctx.globalAlpha=1;
    });
  }

  // St Donat's marker — on the Welsh coastline
  const sx=X(0.42), sy=Y(topY(0.42));
  ctx.beginPath();ctx.arc(sx,sy,6,0,TAU);ctx.fillStyle='#c93b3b';ctx.fill();ctx.lineWidth=2;ctx.strokeStyle='#fff';ctx.stroke();
  label("St Donat's · Atlantic College", sx, sy-16, {size:20,color:'#0f477a'});

  // place labels
  label('SOUTH WALES', X(0.16), Y(0.13), {size:22,color:'#8a7c52',align:'left'});
  label('DEVON & SOMERSET', X(0.16), Y(0.93), {size:20,color:'#8a7c52',align:'left'});
  label('ATLANTIC', X(0.045), Y(0.50), {size:17,color:'rgba(15,71,122,0.65)',align:'left'});
  label('BRISTOL CHANNEL', X(0.50), Y(0.50), {size:18,color:'rgba(15,71,122,0.7)'});
  label('SEVERN →', X(0.90), Y(0.49), {size:17,color:'rgba(15,71,122,0.65)'});
  ctx.restore();
}
function rcPoly(pts,stroke,fill,seed){
  RC.polygon(pts,{roughness:1.3,bowing:0.9,stroke:'rgba(120,104,70,0.7)',strokeWidth:1.6,fill,fillStyle:'solid',seed});
}
function arrowOn(x1,y1,x2,y2){
  ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
  const a=Math.atan2(y2-y1,x2-x1),h=9;ctx.setLineDash([]);
  ctx.beginPath();ctx.moveTo(x2,y2);ctx.lineTo(x2-h*Math.cos(a-0.4),y2-h*Math.sin(a-0.4));ctx.lineTo(x2-h*Math.cos(a+0.4),y2-h*Math.sin(a+0.4));ctx.closePath();ctx.fillStyle='rgba(15,71,122,0.6)';ctx.fill();
}

// =====================================================================
//  SCENE: Windy-style compass / azimuth dial — Sun & Moon bearings
//  P.sunAz, P.moonAz in degrees (0=N, 90=E). P.moonPhase for glyph.
// =====================================================================
function sceneCompass(P){
  const cx=W/2, cy=H/2-6, R=Math.min(W,H)*0.30;
  ctx.save();
  // dial
  RC.circle(cx,cy,R*2,{roughness:0.7,stroke:INK,strokeWidth:2.2,fill:'rgba(255,255,255,0.5)',fillStyle:'solid',seed:80});
  RC.circle(cx,cy,R*2*0.7,{roughness:0.9,stroke:'rgba(39,49,59,0.3)',strokeWidth:1.2,seed:81});
  // ticks + cardinal labels
  const dirs=[['N',0],['E',90],['S',180],['W',270]];
  for(let d=0;d<360;d+=30){
    const a=(d-90)*Math.PI/180;
    const r1=R*(d%90===0?0.86:0.92), r2=R;
    ctx.strokeStyle='rgba(39,49,59,0.5)';ctx.lineWidth=d%90===0?2:1;
    ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*r1,cy+Math.sin(a)*r1);ctx.lineTo(cx+Math.cos(a)*r2,cy+Math.sin(a)*r2);ctx.stroke();
  }
  dirs.forEach(([t,d])=>{const a=(d-90)*Math.PI/180;label(t,cx+Math.cos(a)*(R+22),cy+Math.sin(a)*(R+22),{size:24,color:INK});});
  label('horizon — view from St Donat\u2019s', cx, cy+R+52, {size:21,color:INK2});

  // bearing pointer helper
  function bearing(az,col,r,drawBody){
    const a=(az-90)*Math.PI/180;
    const ex=cx+Math.cos(a)*r, ey=cy+Math.sin(a)*r;
    ctx.strokeStyle=col;ctx.lineWidth=2.4;ctx.setLineDash([3,5]);
    ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(ex,ey);ctx.stroke();ctx.setLineDash([]);
    drawBody(ex,ey);
  }
  // Sun
  bearing(P.sunAz==null?135:P.sunAz, AMBER, R*0.82, (x,y)=>{
    drawSpriteImg(sprites.sun,x,y,64,1);
    label('Sun', x, y-40, {size:20,color:'#c07d22'});
  });
  // Moon
  bearing(P.moonAz==null?95:P.moonAz, INK2, R*0.62, (x,y)=>{
    drawSpriteImg(sprites.moon,x,y,46,1);
    drawPhaseShadow(x,y,21,P.moonPhase==null?0.5:P.moonPhase);
    label('Moon', x, y-32, {size:20,color:INK2});
  });
  ctx.restore();
}
function size(){
  DPR=Math.min(devicePixelRatio,2);
  W=cv.clientWidth; H=cv.clientHeight;
  cv.width=W*DPR; cv.height=H*DPR;
  ctx.setTransform(DPR,0,0,DPR,0,0);
}
function render(P){
  ctx.clearRect(0,0,W,H);
  // camera from P
  cam.x=P.camX; cam.y=0; cam.scale=P.camScale*Math.min(W,H)/680;
  cam.ox=(P.originX==null?0.5:P.originX); cam.oy=(P.originY==null?0.5:P.originY);
  if(P.opIntro>0.01){ ctx.save();ctx.globalAlpha=P.opIntro; sceneIntro(P); ctx.restore(); }
  if(P.opSystem>0.01){ ctx.save();ctx.globalAlpha=P.opSystem; sceneSystem(P); ctx.restore(); }
  if(P.opChannel>0.01){ ctx.save();ctx.globalAlpha=P.opChannel; sceneChannel(P); ctx.restore(); }
  if(P.opCompass>0.01){ ctx.save();ctx.globalAlpha=P.opCompass; sceneCompass(P); ctx.restore(); }
  if(P.opNewton>0.01){ ctx.save();ctx.globalAlpha=P.opNewton; sceneNewton(P); ctx.restore(); }
  if(P.opTidal>0.01){ ctx.save();ctx.globalAlpha=P.opTidal; sceneTidal(P); ctx.restore(); }
  if(P.opSlipway>0.01){ ctx.save();ctx.globalAlpha=P.opSlipway; sceneSlipway(P); ctx.restore(); }
}

// =====================================================================
//  SCENE: Newton — two bodies, equal & opposite forces, + the equation
// =====================================================================
// thin, slightly-curved annotation leader with an arrowhead at (x2,y2)
function annoArrow(x1,y1,x2,y2,bend){
  ctx.save();ctx.strokeStyle=INK2;ctx.fillStyle=INK2;ctx.lineWidth=1.6;ctx.globalAlpha=0.8;
  const mx=(x1+x2)/2+(bend||0), my=(y1+y2)/2;
  ctx.beginPath();ctx.moveTo(x1,y1);ctx.quadraticCurveTo(mx,my,x2,y2);ctx.stroke();
  const a=Math.atan2(y2-my,x2-mx),h=8;
  ctx.beginPath();ctx.moveTo(x2,y2);
  ctx.lineTo(x2-h*Math.cos(a-0.5),y2-h*Math.sin(a-0.5));
  ctx.lineTo(x2-h*Math.cos(a+0.5),y2-h*Math.sin(a+0.5));
  ctx.closePath();ctx.fill();ctx.restore();
}

function sceneNewton(P){
  // centred composition — text sits in the top band, diagram fills below.
  const cx=W*(cam.ox==null?0.5:cam.ox);
  const S=Math.min(W,H);
  // vertical anchors as fractions of the viewport height
  const imgY=H*0.47;          // Earth–Moon image
  const eqY =H*0.70;          // hero equation
  const boxY=H*0.89;          // constant box

  // ===================================================================
  //  EARTH–MOON IMAGE — Earth 4× the Moon, equal & opposite attraction
  // ===================================================================
  const eR=S*0.075, mR=eR/4;          // Earth radius = 4 × Moon radius
  const span=S*0.20;                   // half the centre-to-centre distance
  const eX=cx-span, mX=cx+span;
  // distance bracket above the pair
  const by=imgY-eR-18;
  ctx.save();ctx.globalAlpha=0.85;ctx.strokeStyle=INK2;ctx.lineWidth=1.3;
  ctx.beginPath();ctx.moveTo(eX,by);ctx.lineTo(mX,by);ctx.stroke();
  [eX,mX].forEach(x=>{ctx.beginPath();ctx.moveTo(x,by-6);ctx.lineTo(x,by+6);ctx.stroke();});
  ctx.restore();
  label('r', (eX+mX)/2, by-13, {size:21,color:INK2});
  // bodies
  drawSpriteImg(sprites.earth, eX, imgY, eR*2, 1);
  drawSpriteImg(sprites.moon,  mX, imgY, mR*2, 1);
  // equal & opposite attraction arrows, pointing toward each other
  const aL=span*0.40;
  ctx.save();ctx.lineWidth=3.6;ctx.strokeStyle=OCEAN;ctx.fillStyle=OCEAN;
  thickArrow(eX+eR+10, imgY, eX+eR+10+aL, imgY, 8);
  thickArrow(mX-mR-10, imgY, mX-mR-10-aL, imgY, 8);
  ctx.restore();
  label('m\u2081', eX, imgY+eR+17, {size:20,color:INK});
  label('m\u2082', mX, imgY+mR+15, {size:18,color:INK2});
  label('Fg', eX+eR+10+aL/2, imgY-14, {size:18,color:OCEAN});
  label('Fg', mX-mR-10-aL/2, imgY-14, {size:18,color:OCEAN});

  // ===================================================================
  //  HERO EQUATION:  F_g = G · m₁m₂ / r²
  // ===================================================================
  const fs=Math.max(36, S*0.084);
  const serif="px Georgia, 'Times New Roman', serif";
  const sub=fs*0.6, subSerif='italic '+sub+serif, mainSerif='italic '+fs+serif;
  ctx.save();ctx.textBaseline='middle';ctx.fillStyle=INK;
  // measure parts
  ctx.font=mainSerif;
  const wF=ctx.measureText('F').width, wEq=ctx.measureText(' = ').width, wG=ctx.measureText('G').width, wm=ctx.measureText('m').width, wr=ctx.measureText('r').width;
  ctx.font=subSerif;
  const wSub=ctx.measureText('g').width, wd=ctx.measureText('2').width;
  const numW=wm+wd+wm+wd, denW=wr+wd;          // m1 m2  over  r2 (digits drawn small)
  const gap=fs*0.34, fracW=Math.max(numW,denW)+fs*0.3;
  const total=wF+wSub+wEq+wG+gap+fracW;
  let x=cx-total/2;
  // F with subscript g
  ctx.textAlign='left';ctx.font=mainSerif;ctx.fillText('F',x,eqY);
  ctx.font=subSerif;ctx.fillText('g',x+wF,eqY+fs*0.22);
  // = G
  ctx.font=mainSerif;ctx.fillText(' = ',x+wF+wSub,eqY);
  const gX=x+wF+wSub+wEq+wG/2;
  ctx.fillText('G',x+wF+wSub+wEq,eqY);
  // fraction
  const fxc=x+wF+wSub+wEq+wG+gap+fracW/2;
  const numY=eqY-fs*0.42, denY=eqY+fs*0.5;
  // numerator: m1 m2 (drawn as m + small subscript 1, m + small subscript 2)
  let nx=fxc-numW/2;
  ctx.font=mainSerif;ctx.fillText('m',nx,numY);nx+=wm;
  ctx.font=subSerif;ctx.fillText('1',nx,numY+fs*0.18);nx+=wd;
  ctx.font=mainSerif;ctx.fillText('m',nx,numY);nx+=wm;
  ctx.font=subSerif;ctx.fillText('2',nx,numY+fs*0.18);
  // denominator: r squared
  let dx2=fxc-denW/2;
  ctx.font=mainSerif;ctx.fillText('r',dx2,denY);dx2+=wr;
  ctx.font=subSerif;ctx.fillText('2',dx2,denY-fs*0.28);
  // fraction bar
  ctx.strokeStyle=INK;ctx.lineWidth=Math.max(2.4,fs*0.05);
  ctx.beginPath();ctx.moveTo(fxc-fracW/2,eqY);ctx.lineTo(fxc+fracW/2,eqY);ctx.stroke();
  ctx.restore();

  // ===================================================================
  //  ANNOTATIONS — handwritten labels + leaders to each part
  // ===================================================================
  const an=Math.max(15,S*0.024), lh=an*1.15;
  // (1) the gravitational constant → G  (above-left)
  const gLabY=eqY-fs*1.05;
  label('the gravitational', gX, gLabY-lh*0.5, {size:an,color:INK2});
  label('constant', gX, gLabY+lh*0.5, {size:an,color:INK2});
  annoArrow(gX, gLabY+lh*0.5+8, gX, eqY-fs*0.52, 0);
  // (2) mass of the two bodies → m₁m₂  (right of the fraction)
  const mLabX=fxc+fracW/2+26;
  label('mass of the two', mLabX, numY-lh*0.5, {size:an,color:INK2,align:'left'});
  label('objects, in kg', mLabX, numY+lh*0.5, {size:an,color:INK2,align:'left'});
  annoArrow(mLabX-8, numY+2, fxc+numW/2+6, numY, 0);
  // (3) distance between centres → r²  (below)
  const dLabY=eqY+fs*1.18;
  label('distance between the', fxc, dLabY-lh*0.5, {size:an,color:INK2});
  label('centres, in metres', fxc, dLabY+lh*0.5, {size:an,color:INK2});
  annoArrow(fxc, dLabY-lh*0.5-8, fxc, denY+fs*0.34, 0);

  // ===================================================================
  //  CONSTANT VALUE — boxed, at the foot
  // ===================================================================
  const boxFs=Math.max(17,S*0.027);
  const boxTxt='G = 6.67 \u00D7 10\u207B\u00B9\u00B9 N\u00B7m\u00B2/kg\u00B2';
  ctx.save();ctx.font=boxFs+serif;ctx.textAlign='center';ctx.textBaseline='middle';
  const tw=ctx.measureText(boxTxt).width, padX=boxFs*0.9, padY=boxFs*0.55;
  const bw=tw+padX*2, bh=boxFs+padY*2, bx=cx-bw/2;
  if(ctx.roundRect){ctx.beginPath();ctx.roundRect(bx,boxY-bh/2,bw,bh,7);}
  else{ctx.beginPath();ctx.rect(bx,boxY-bh/2,bw,bh);}
  ctx.fillStyle='rgba(255,255,255,0.55)';ctx.fill();
  ctx.strokeStyle=INK;ctx.lineWidth=1.8;ctx.stroke();
  ctx.fillStyle=INK;ctx.fillText(boxTxt,cx,boxY+1);
  ctx.restore();
}
function thickArrow(x1,y1,x2,y2,h){
  ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
  const a=Math.atan2(y2-y1,x2-x1);
  ctx.beginPath();ctx.moveTo(x2,y2);
  ctx.lineTo(x2-h*Math.cos(a-0.5),y2-h*Math.sin(a-0.5));
  ctx.lineTo(x2-h*Math.cos(a+0.5),y2-h*Math.sin(a+0.5));
  ctx.closePath();ctx.fill();
}

// =====================================================================
//  SCENE: Tidal force — a ring of particles, one-way circle → ellipse.
//  Per the model: everything accelerates toward the Moon (to the right),
//  but the nearer points move more. With the Moon at 3 o'clock:
//    3 o'clock (near): +10 right         9 o'clock (far): +6 right
//    12 o'clock: +8 right, +2 down       6 o'clock: +8 right, +2 up
//  → the circle shifts right AND stretches into an ellipse.
// =====================================================================
function sceneTidal(P){
  const cx=W*(cam.ox||0.56), cy=H*(cam.oy==null?0.46:cam.oy), R=Math.min(W,H)*0.15;
  // one-way progress: grow 0→1, hold, then reset (NOT oscillating)
  const u=(P.tidal!=null && P.tidal>1)?1:(((P.clockT||0)/5)%1);
  const prog=clamp(u<0.72?(u/0.72):1,0,1);
  const ease=prog*prog*(3-2*prog);
  const unit=R*0.085;                       // 1 "point" in px

  // Moon to the right
  const moonX=W*0.93, moonY=cy;
  drawSpriteImg(sprites.moon, moonX, moonY, Math.min(W,H)*0.085, 0.95);
  label('Moon', moonX, moonY+Math.min(W,H)*0.058, {size:18,color:INK2});

  // displacement field (screen coords, y down): dx=(8+2cosθ)·unit·ease, dy=(-2 sinθ)·unit·ease
  const disp=(th)=>({dx:(8+2*Math.cos(th))*unit*ease, dy:(-2*Math.sin(th))*unit*ease});

  // faint original circle (start state)
  ctx.save();ctx.globalAlpha=0.5;ctx.setLineDash([4,5]);ctx.strokeStyle=INK2;ctx.lineWidth=1.3;
  ctx.beginPath();ctx.arc(cx,cy,R,0,TAU);ctx.stroke();ctx.setLineDash([]);ctx.restore();

  // deformed ring outline (the ellipse), built from the same field
  ctx.save();ctx.strokeStyle=OCEAN;ctx.lineWidth=2.4;ctx.beginPath();
  const M=72;
  for(let i=0;i<=M;i++){const th=i/M*TAU;const d=disp(th);const x=cx+Math.cos(th)*R+d.dx,y=cy+Math.sin(th)*R+d.dy;i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}
  ctx.closePath();ctx.stroke();ctx.restore();

  // the four model points + their motion vectors (length shows acceleration)
  const pts=[{th:0},{th:-Math.PI/2},{th:Math.PI},{th:Math.PI/2}];
  pts.forEach(p=>{
    const bx=cx+Math.cos(p.th)*R, by=cy+Math.sin(p.th)*R;
    const d=disp(p.th); const x=bx+d.dx, y=by+d.dy;
    // motion arrow base→displaced (amber); near point gets the longest arrow
    if(ease>0.04){ctx.save();ctx.strokeStyle=AMBER;ctx.fillStyle=AMBER;ctx.lineWidth=2.4;ctx.globalAlpha=0.9;thickArrow(bx,by,x,y,5.5);ctx.restore();}
    // ghost of start position
    ctx.beginPath();ctx.arc(bx,by,3.5,0,TAU);ctx.fillStyle='rgba(90,107,123,0.4)';ctx.fill();
    // current point
    ctx.beginPath();ctx.arc(x,y,6.5,0,TAU);ctx.fillStyle='#c93b3b';ctx.fill();ctx.lineWidth=2;ctx.strokeStyle='#fff';ctx.stroke();
  });
  // a small fixed-direction cue (all accelerate toward the Moon)
  label('all accelerate toward the Moon →', cx, cy-R-26, {size:16,color:INK2,alpha:clamp(1-ease*0.6,0.4,1)});
}

// =====================================================================
//  SCENE: Slipway cross-section — fast flood / slow ebb + 0–10 m ruler
// =====================================================================
function sceneSlipway(P){
  const baseY=(P.fitBot!=null?P.fitBot:H*0.86), leftX=W*0.16, rightX=W*0.86, topY=(P.fitTop!=null?P.fitTop:H*0.34), maxM=10;
  const lvl=clamp(P.slipLevel==null?0:P.slipLevel,0,1);
  const waterTopY=lerp(baseY, topY+18, lvl);
  ctx.save();
  // water
  ctx.fillStyle='rgba(31,111,178,0.30)';
  ctx.fillRect(leftX, waterTopY, rightX-leftX, baseY-waterTopY);
  ctx.strokeStyle='rgba(220,240,255,0.85)';ctx.lineWidth=2;
  ctx.beginPath();
  for(let x=leftX;x<=rightX;x+=8){const yy=waterTopY+Math.sin((x*0.05)+(P.slipPhase||0)*TAU)*2.2;x===leftX?ctx.moveTo(x,yy):ctx.lineTo(x,yy);}
  ctx.stroke();
  // slipway ramp
  const rampTopX=rightX, rampTopY=topY+8, rampBotX=leftX+W*0.10, rampBotY=baseY;
  ctx.fillStyle='rgba(150,150,158,0.92)';
  ctx.beginPath();ctx.moveTo(rampBotX,rampBotY);ctx.lineTo(rampTopX,rampTopY);ctx.lineTo(rampTopX,rampTopY+26);ctx.lineTo(rampBotX+30,rampBotY);ctx.closePath();ctx.fill();
  ctx.strokeStyle='rgba(90,95,102,0.9)';ctx.lineWidth=2;ctx.stroke();
  ctx.strokeStyle='rgba(110,114,120,0.7)';ctx.lineWidth=1.3;
  for(let i=1;i<10;i++){const f=i/10;const x=lerp(rampBotX,rampTopX,f),y=lerp(rampBotY,rampTopY,f);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+10,y+9);ctx.stroke();}
  label('slipway', lerp(rampBotX,rampTopX,0.55)+24, lerp(rampBotY,rampTopY,0.55)-12, {size:20,color:'#5a5f66',align:'left'});
  // seabed
  ctx.strokeStyle='rgba(120,104,70,0.8)';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(leftX,baseY);ctx.lineTo(rightX,baseY);ctx.stroke();
  // ruler 0..10 m
  const rx=leftX-6;
  ctx.strokeStyle=INK2;ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(rx,baseY);ctx.lineTo(rx,topY+12);ctx.stroke();
  for(let m=0;m<=maxM;m+=2){const y=lerp(baseY,topY+18,m/maxM);ctx.beginPath();ctx.moveTo(rx-6,y);ctx.lineTo(rx,y);ctx.stroke();label(m+' m', rx-12, y, {size:16,color:INK2,align:'right'});}
  const metres=(lvl*maxM);
  ctx.fillStyle='#c93b3b';ctx.beginPath();ctx.arc(rx,waterTopY,4,0,TAU);ctx.fill();
  label(metres.toFixed(1)+' m', rx+10, waterTopY-2, {size:20,color:'#0f477a',align:'left'});
  if(P.slipState) label(P.slipState, (leftX+rightX)/2, topY-2, {size:22,color:P.slipState.indexOf('flood')>=0?OCEAN:INK2});
  ctx.restore();
}

function init(canvas){
  cv=canvas; ctx=cv.getContext('2d'); RC=rough.canvas(cv);
  size(); buildSprites();
}
window.Sketch={init,size,render,WORLD};
})();
