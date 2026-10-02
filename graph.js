// =====================================================================
//  graph.js — tide graph (GeoGebra-clean, not sketch)
//  Constituents tuned to the Llantwit Major / Nash Point predictions
//  (Bristol Channel, macrotidal). Fitted from published HW/LW heights:
//    spring range ~9.5 m, neap range ~4.3 m  ->  M2 ~3.5 m, S2 ~1.3 m.
//    M2 = 3.52 m ; S2 = 1.30 m ; M4 = 0.28 m   (illustrative, not official
//    UKHO harmonic constants). Diurnals (K1/O1) omitted — small here.
//  Y-axis = displacement from mean sea level, in metres (NOT chart datum,
//  so absolute heights differ from above-CD tide tables; shape matches).
//  Month view spans full-moon -> full-moon of the CURRENT month.
//  Waves shown: Moon (M2), Sun (S2), and the Resultant.
// =====================================================================
(function(){
'use strict';
const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));

let cv,gx,GW=0,GH=0,DPR=1;

// ---- constituents (amplitude m, angular speed rad/hr) ----
// S2 raised to 1.30 m to match the real Llantwit/Nash spring-neap contrast
// (spring ~9.5 m, neap ~4.3 m). M2 angular speed 28.984°/hr, S2 30.000°/hr.
const A_M2=3.52, A_S2=1.30, A_M4=0.28;
const W2=0.50586, WS=0.52360, W4=1.01159;     // per hour -> beat = exact 14.77-day spring-neap
const M4P=1.40;                               // overtide phase → short FAST flood, long slow ebb
const BEAT=WS-W2;                             // spring–neap beat

// ---- lunar month, dynamic: full moon on/before today → next full moon ----
const SYN=29.530588;
const FM_EPOCH=Date.UTC(2000,0,21,4,40);      // a known full moon (21 Jan 2000)
function monthStartMs(){const k=Math.floor((Date.now()-FM_EPOCH)/(SYN*86400000));return FM_EPOCH+k*SYN*86400000;}
let MS0=monthStartMs();
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtDate(dayOffset){const d=new Date(MS0+dayOffset*86400000);return d.getUTCDate()+' '+MONTHS[d.getUTCMonth()];}
const PHASES=[{d:0,n:'Full Moon'},{d:SYN*0.25,n:'Last ¼'},{d:SYN*0.5,n:'New Moon'},{d:SYN*0.75,n:'First ¼'},{d:SYN,n:'Full Moon'}];

// waves are defined in hours from month start (full moon = spring, in phase)
const moonWave=t=>A_M2*Math.cos(W2*t);
const sunWave =t=>A_S2*Math.cos(WS*t);
const m4Wave  =t=>A_M4*Math.cos(W4*t+M4P);
function resultant(t,P){return moonWave(t)*P.kMoon + sunWave(t)*P.kSun + m4Wave(t)*P.kM4;}

function drawMoonGlyph(cx,cy,r,dayOffset,alpha){
  // day 0 = full moon, day SYN/2 = new moon (verified parametrization)
  const d=dayOffset;
  const age=((((d-SYN/2)%SYN)+SYN)%SYN), p=age/SYN, ca=Math.cos(p*TAU), mir=(p<0.5)?1:-1;
  gx.save();gx.translate(cx,cy);gx.globalAlpha=alpha;
  gx.beginPath();gx.arc(0,0,r,0,TAU);gx.fillStyle='#5a6b7b';gx.fill();           // dark disc
  gx.beginPath();const N=24;
  for(let i=0;i<=N;i++){const f=-Math.PI/2+(i/N)*Math.PI;const x=mir*r*Math.cos(f),y=r*Math.sin(f);i===0?gx.moveTo(x,y):gx.lineTo(x,y);}
  for(let i=N;i>=0;i--){const f=-Math.PI/2+(i/N)*Math.PI;gx.lineTo(mir*r*ca*Math.cos(f),r*Math.sin(f));}
  gx.closePath();gx.fillStyle='#f1f6fa';gx.fill();                                // lit part
  gx.lineWidth=1;gx.strokeStyle='rgba(70,90,110,.5)';gx.beginPath();gx.arc(0,0,r,0,TAU);gx.stroke();
  gx.restore();gx.globalAlpha=1;
}

function size(){
  DPR=Math.min(devicePixelRatio,2);
  GW=cv.clientWidth; GH=cv.clientHeight;
  cv.width=GW*DPR; cv.height=GH*DPR; gx.setTransform(DPR,0,0,DPR,0,0);
  MS0=monthStartMs();
}

function render(P){
  gx.clearRect(0,0,GW,GH);
  const padL=(P.hideAxis?22:64),padR=16,padTop=24,moonRowH=(P.moonRowOp>0.02)?32:8;
  const x0=padL,x1=GW-padR,plotTop=padTop,plotBot=GH-moonRowH;
  const yc=(plotTop+plotBot)*0.5,half=(plotBot-plotTop)*0.5;
  const MAXM=P.maxM||5;                          // ± metres shown
  const unit=half/MAXM;
  const dC=P.viewCenter,dW=Math.max(P.viewDays,0.3),tA=(dC-dW/2)*24,tB=(dC+dW/2)*24,monthly=dW>6;
  const X=t=>x0+(t-tA)/(tB-tA)*(x1-x0), Y=h=>yc-h*unit;

  // ---- y axis (displacement, metres) ----
  if(!P.hideAxis){
  gx.strokeStyle='rgba(39,49,59,0.45)';gx.lineWidth=1.4;
  gx.beginPath();gx.moveTo(x0,plotTop-2);gx.lineTo(x0,plotBot+2);gx.stroke();
  gx.beginPath();gx.moveTo(x0,plotTop-9);gx.lineTo(x0-4,plotTop-1);gx.lineTo(x0+4,plotTop-1);gx.closePath();gx.fillStyle='rgba(39,49,59,0.6)';gx.fill();
  gx.font='500 10px Inter';gx.textAlign='right';gx.textBaseline='middle';
  const ticks=(MAXM>=10)?[-10,-5,0,5,10]:(MAXM>=6)?[-8,-4,0,4,8]:[-4,-2,0,2,4];
  ticks.forEach(v=>{const y=Y(v);gx.strokeStyle='rgba(39,49,59,0.28)';gx.lineWidth=1;gx.beginPath();gx.moveTo(x0-4,y);gx.lineTo(x0,y);gx.stroke();gx.fillStyle='rgba(80,98,118,0.85)';gx.fillText((v>0?'+':'')+v+' m',x0-7,y);});
  gx.save();gx.translate(16,yc);gx.rotate(-Math.PI/2);gx.textAlign='center';gx.fillStyle='rgba(40,60,80,0.9)';gx.font='600 12px Inter';gx.fillText('displacement (m)',0,0);gx.restore();
  }

  // ---- mean sea-level baseline ----
  gx.strokeStyle='rgba(39,49,59,0.22)';gx.lineWidth=1;gx.setLineDash([2,3]);
  gx.beginPath();gx.moveTo(x0,yc);gx.lineTo(x1,yc);gx.stroke();gx.setLineDash([]);
  gx.fillStyle='rgba(90,108,128,0.7)';gx.font='500 9.5px Inter';gx.textAlign='left';gx.textBaseline='bottom';
  gx.fillText('mean sea level',x0+4,yc-2);

  // ---- day gridlines (month) ----
  if(monthly){gx.strokeStyle='rgba(31,75,125,0.05)';gx.lineWidth=1;for(let d=Math.ceil(tA/24);d<=Math.floor(tB/24);d++){const xx=X(d*24);gx.beginPath();gx.moveTo(xx,plotTop);gx.lineTo(xx,plotBot);gx.stroke();}}

  // ---- waves ----
  function plot(fn,col,w,alpha,dash){
    if(alpha<0.01)return;
    gx.strokeStyle=col;gx.lineWidth=w;gx.globalAlpha=alpha;gx.lineJoin='round';if(dash)gx.setLineDash(dash);
    gx.beginPath();
    for(let px=x0;px<=x1;px+=1){const t=tA+(px-x0)/(x1-x0)*(tB-tA);const y=Y(fn(t));px===x0?gx.moveTo(px,y):gx.lineTo(px,y);}
    gx.stroke();gx.setLineDash([]);gx.globalAlpha=1;
  }
  plot(moonWave,'#1f6fb2',1.5,P.showMoon,[5,5]);
  plot(sunWave,'#d68a2b',1.5,P.showSun,[5,5]);
  if(P.showRes>0.01){
    gx.globalAlpha=P.showRes;
    const grad=gx.createLinearGradient(0,plotTop,0,plotBot);grad.addColorStop(0,'rgba(31,111,178,0.28)');grad.addColorStop(0.5,'rgba(31,111,178,0.06)');grad.addColorStop(1,'rgba(31,111,178,0.20)');
    gx.beginPath();gx.moveTo(x0,Y(resultant(tA,P)));
    for(let px=x0;px<=x1;px+=1){const t=tA+(px-x0)/(x1-x0)*(tB-tA);gx.lineTo(px,Y(resultant(t,P)));}
    gx.lineTo(x1,yc);gx.lineTo(x0,yc);gx.closePath();gx.fillStyle=grad;gx.fill();
    plot(t=>resultant(t,P),'#0f477a',2.6,P.showRes);
    gx.globalAlpha=1;
  }

  // short flood / long ebb note (zoomed, M4 on)
  if(P.kM4>0.5 && !monthly){gx.fillStyle='rgba(15,71,122,0.95)';gx.font='italic 600 12px Inter';gx.textAlign='right';gx.textBaseline='top';gx.fillText('short flood · long ebb',x1,plotTop+10);}

  // ---- red-dot tracer: the point on the tide curve right now ----
  if(P.markerT!=null && P.showRes>0.05){
    const t=P.markerT;
    if(t>=tA && t<=tB){
      const mx=X(t), my=Y(resultant(t,P));
      gx.strokeStyle='rgba(201,59,59,0.4)';gx.lineWidth=1;gx.setLineDash([2,3]);
      gx.beginPath();gx.moveTo(mx,yc);gx.lineTo(mx,my);gx.stroke();gx.setLineDash([]);
      const pr=4+1.6*Math.sin((P.markerPulse||0)*TAU);
      gx.beginPath();gx.arc(mx,my,7+pr*0.4,0,TAU);gx.fillStyle='rgba(201,59,59,0.16)';gx.fill();
      gx.beginPath();gx.arc(mx,my,5,0,TAU);gx.fillStyle='#c93b3b';gx.fill();
      gx.lineWidth=2;gx.strokeStyle='#fff';gx.stroke();
      if(P.markerLabel){gx.fillStyle='rgba(150,40,40,0.95)';gx.font='600 10px Inter';gx.textAlign=(mx>x1-70?'right':'left');gx.textBaseline='bottom';gx.fillText(P.markerLabel,mx+(mx>x1-70?-9:9),my-7);}
    }
  }

  // ---- moon-phase row ----
  if(P.moonRowOp>0.02 && monthly){
    const a=P.moonRowOp,spacing=(x1-x0)/Math.max(dW,1),r=clamp(spacing*0.30,3.4,7);
    gx.fillStyle='rgba(31,75,125,0.08)';gx.fillRect(x0,plotBot+1,x1-x0,moonRowH-1);
    for(let d=Math.ceil(tA/24);d<=Math.floor(tB/24);d++){if(d<0||d>SYN+0.5)continue;drawMoonGlyph(X(d*24),GH-moonRowH*0.45,r,d,a);}
    gx.textAlign='center';gx.textBaseline='alphabetic';
    PHASES.forEach(ph=>{const xx=X(ph.d*24);if(xx<x0-6||xx>x1+6)return;gx.globalAlpha=a;gx.fillStyle='rgba(31,75,125,0.85)';gx.font='600 10px Inter';gx.fillText(ph.n,xx,plotBot-6);gx.fillStyle='rgba(90,110,130,0.7)';gx.font='500 9px Inter';gx.fillText(fmtDate(ph.d),xx,GH-4);gx.globalAlpha=1;});
    gx.textAlign='left';
  }

  // ---- legend + caption ----
  gx.textBaseline='middle';gx.font='600 11px Inter';
  const chips=[];
  if(P.showMoon>0.05)chips.push(['#1f6fb2','Moon',true]);
  if(P.showSun>0.05)chips.push(['#d68a2b','Sun',true]);
  if(P.showRes>0.05)chips.push(['#0f477a','Resultant tide',false]);
  let lx=padL+4;
  chips.forEach(([c,t,dash])=>{gx.strokeStyle=c;gx.lineWidth=dash?1.5:2.6;if(dash)gx.setLineDash([4,3]);gx.beginPath();gx.moveTo(lx,plotTop+3);gx.lineTo(lx+16,plotTop+3);gx.stroke();gx.setLineDash([]);gx.fillStyle='rgba(40,60,80,0.92)';gx.textAlign='left';gx.fillText(t,lx+21,plotTop+3);lx+=gx.measureText(t).width+44;});
  gx.textAlign='right';gx.fillStyle='rgba(80,98,118,0.72)';gx.font='500 10px Inter';
  if(monthly)gx.fillText(fmtDate(0)+' → '+fmtDate(SYN)+' · full moon to full moon',x1,plotTop+3);
  else gx.fillText('≈ '+dW.toFixed(1)+' days',x1,plotTop+3);
  gx.textAlign='left';
}

function init(canvas){cv=canvas;gx=cv.getContext('2d');size();}
// expose the tide height (m, from mean) + amplitude bound so other modules can sync to the curve
function height(t,P){return resultant(t,(P||{kMoon:1,kSun:1,kM4:1}));}
function ampBound(P){P=P||{kMoon:1,kSun:1,kM4:1};return A_M2*(P.kMoon||0)+A_S2*(P.kSun||0)+A_M4*(P.kM4||0);}
window.TideGraph={init,size,render,height,ampBound};
})();
