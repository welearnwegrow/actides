// =====================================================================
//  tides.js — scroll controller + keyframes for the whole story.
//  Maps scroll → beat segment (by section centre), lerps a parameter
//  object, and drives the sketch scenes, photos and tide graph.
// =====================================================================
(function(){
'use strict';
const TAU=Math.PI*2, PI=Math.PI;
const lerp=(a,b,t)=>a+(b-a)*t;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const $=s=>document.querySelector(s);

const sketchCv=$('#sketch'), graphCv=$('#graph');
Sketch.init(sketchCv); TideGraph.init(graphCv);

const SYN=29.53, W2=0.506;          // W2 matches graph.js (rad/hr)

// ---- parameter superset ----
const DFLT={
  // photo layers
  opHero:0, opPlatform:0, opMoonrise:0, opPair:0, opSun:0, opSpring:0, opNeap:0, opLargest:0, opFlats:0, opSummary:0, opModel:0,
  // sketch scenes
  opIntro:0, opNewton:0, opTidal:0, opSystem:0, opChannel:0, opSlipway:0,
  introZoom:0, camX:0, camScale:95, originX:0.5, originY:0.5,
  moonAngle:0, moonDist:2.6, bulge:1.5, sysSun:0, sunCompact:0, revolveMoon:0, moonCreep:0,
  showArrows:0, showClock:0, showObserver:0, showTideState:0, phaseShadowOp:0, rotateEarth:0,
  tidal:0, markPositions:0, slipLevel:0,
  channelAmp:0,
  // graph
  graphOp:0, viewDays:2, viewCenter:1, kMoon:1, kSun:0, kM4:0,
  showMoon:0, showSun:0, showRes:0, moonRowOp:0, hideAxis:0, maxM:5
};
const K=o=>Object.assign({},DFLT,o);
const CO=0.62;                       // diagram origin x (right region; text on left)
const KF=[
  /*0  hero*/         K({opHero:1}),
  /*0b PHOTO platform*/K({opPlatform:1}),
  /*1  moon detail*/  K({opIntro:1, introZoom:0, originX:0.5, originY:0.60}),
  /*2  Newton eqn*/   K({opNewton:1, originX:0.5}),
  /*3  PHOTO moonrise*/K({opMoonrise:1}),
  /*4  tidal force*/  K({opTidal:1, originX:0.5, originY:0.62, tidal:1, textFirst:1}),
  /*5  PHOTO pair*/   K({opPair:1}),
  /*6  lunar-day*/    K({opSystem:1, originX:0.5, originY:0.64, camScale:88, moonDist:2.3, moonAngle:0, bulge:1.6, moonCreep:1,
                        rotateEarth:1, showObserver:1, showArrows:0.5, showTideState:1,
                        graphOp:1, viewDays:2.4, viewCenter:1.2, kMoon:1, kSun:0, showRes:1, hideAxis:1}),
  /*7  equal-peaks*/  K({opSystem:1, originX:0.5, originY:0.64, camScale:88, moonDist:2.3, moonAngle:0, bulge:1.55, moonCreep:1,
                        rotateEarth:1, showObserver:1, showTideState:1,
                        graphOp:1, viewDays:2.4, viewCenter:1.2, kMoon:1, kSun:0, showRes:1, hideAxis:1}),
  /*8  PHOTO sun*/    K({opSun:1}),
  /*9  sun (revolve)*/K({opSystem:1, originX:0.5, originY:0.62, camScale:58, moonDist:2.8, moonAngle:0, bulge:1.5,
                        sysSun:1, sunCompact:1, showClock:0.6, phaseShadowOp:1, revolveMoon:1,
                        rotateEarth:1, showObserver:0.9, showTideState:1,
                        graphOp:1, viewDays:SYN, viewCenter:SYN/2, kMoon:1, kSun:1, showMoon:1, showSun:1, showRes:1, moonRowOp:1, hideAxis:1}),
  /*10 spring*/       K({opSystem:1, originX:0.5, originY:0.62, camScale:58, moonDist:2.8, moonAngle:PI, bulge:1.8, markPositions:'spring',
                        sysSun:1, sunCompact:1, showClock:0.6, phaseShadowOp:1, revolveMoon:1,
                        rotateEarth:1, showObserver:0.9, showTideState:1,
                        graphOp:1, viewDays:SYN, viewCenter:SYN/2, kMoon:1, kSun:1, showMoon:1, showSun:1, showRes:1, moonRowOp:1, hideAxis:1}),
  /*11 PHOTO spring*/ K({opSpring:1}),
  /*12 neap*/         K({opSystem:1, originX:0.5, originY:0.62, camScale:58, moonDist:2.8, moonAngle:PI/2, bulge:1.34, markPositions:'neap',
                        sysSun:1, sunCompact:1, showClock:0.6, phaseShadowOp:1, revolveMoon:1,
                        rotateEarth:1, showObserver:0.9, showTideState:1,
                        graphOp:1, viewDays:SYN, viewCenter:SYN/2, kMoon:1, kSun:1, showMoon:1, showSun:1, showRes:1, moonRowOp:1, hideAxis:1}),
  /*13 PHOTO neap*/   K({opNeap:1}),
  /*14 channel map*/  K({opChannel:1, originX:0.5, originY:0.60, channelAmp:0, graphOp:0}),
  /*15 resonance*/    K({opChannel:1, originX:0.5, originY:0.60, channelAmp:1, graphOp:0}),
  /*16 PHOTO largest*/K({opLargest:1}),
  /*17 slipway*/      K({opSlipway:1, originX:0.5,
                        graphOp:1, viewDays:1.5, viewCenter:0.75, kMoon:1, kSun:1, kM4:3.0,
                        showMoon:0.4, showSun:0.4, showRes:1, moonRowOp:0, hideAxis:0, maxM:10}),
  /*18 PHOTO flats*/  K({opFlats:1}),
  /*19 composite*/    K({opSystem:0.2, originX:0.5, originY:0.62, camScale:58, moonDist:2.8, moonAngle:0, bulge:1.45,
                        sysSun:0.5, sunCompact:1, showClock:0.45, phaseShadowOp:1, rotateEarth:1, showObserver:0.6, revolveMoon:1,
                        graphOp:1, viewDays:SYN, viewCenter:SYN/2, kMoon:1, kSun:1, kM4:1,
                        showMoon:1, showSun:1, showRes:1, moonRowOp:1, hideAxis:0, maxM:5}),
  /*20 SUMMARY*/      K({opSummary:1, graphOp:0}),
  /*21 MODEL LIMITS*/ K({opModel:1, graphOp:0})
];
const CONFIG_LABEL=[null,null,null,null,null,null,null,
  'St Donat\u2019s sweeps through both bulges', 'every high reaches the same height',
  null, 'the Moon orbits Earth — about every 29.5 days', 'spring — Sun, Earth & Moon in line',
  null, 'neap — Sun at a right angle', null,null,null,null,null,null,'one revolution — the resultant tide',null];
// red-dot marker behaviour per beat: 'trace' sweeps; 'moonsync' tracks the revolving Moon; number = static day
const MARK={7:'trace', 8:'trace', 10:'moonsync', 11:'moonsync', 13:'moonsync', 18:'slip', 20:'moonsync'};
const MARK_LABEL={};

// ---- DOM ----
const beats=[...document.querySelectorAll('[data-beat]')];
const cards=[...document.querySelectorAll('.txt')];
const railFill=$('#railFill'), graphWrap=$('#graphWrap');
const photoEls={hero:$('#ph-hero'), platform:$('#ph-platform'), moonrise:$('#ph-moonrise'), pair:$('#ph-pair'), sun:$('#ph-sun'),
  spring:$('#ph-spring'), neap:$('#ph-neap'), largest:$('#ph-largest'), flats:$('#ph-flats'), summary:$('#ph-summary'), model:$('#ph-model')};

let centers=[];
function measure(){const sy=window.scrollY;centers=beats.map(b=>{const r=b.getBoundingClientRect();return r.top+sy+r.height/2;});}

let cur=0,target=0,last=performance.now(),clock=0,spin=0,slipStart=null;
function onScroll(){const d=Math.max(1,document.documentElement.scrollHeight-innerHeight);target=clamp(window.scrollY/d,0,1);}

function render(){
 try{
  const vpC=window.scrollY+innerHeight/2;
  let i=0; while(i<centers.length-2 && vpC>centers[i+1]) i++;
  let t=(centers.length<2)?0:(vpC-centers[i])/Math.max(1,(centers[i+1]-centers[i]));
  if(vpC<centers[0]){i=0;t=0;} if(vpC>centers[centers.length-1]){i=centers.length-2;t=1;}
  const te=smooth(clamp(t,0,1));
  const a=KF[i], b=KF[Math.min(i+1,KF.length-1)], P={};
  for(const k in DFLT) P[k]=lerp(a[k],b[k],te);
  const di=(te<0.5?i:Math.min(i+1,KF.length-1));     // dominant beat

  // ---- sharpen opacity crossfades so two scenes never overlap mid-scroll ----
  const teSharp=clamp((te-0.5)/0.16+0.5,0,1);
  const SKETCH_KEYS=['opIntro','opNewton','opTidal','opSystem','opChannel','opSlipway'];
  ['opHero','opPlatform','opMoonrise','opPair','opSun','opSpring','opNeap','opLargest','opFlats','opSummary','opModel',
   ...SKETCH_KEYS].forEach(k=>{P[k]=lerp(a[k],b[k],teSharp);});
  const primary=kf=>{const keys=['opHero','opIntro','opNewton','opTidal','opSystem','opChannel','opSlipway','opPlatform','opMoonrise','opPair','opSun','opSpring','opNeap','opLargest','opFlats','opSummary','opModel'];let bk='',bv=-1;keys.forEach(k=>{if((kf[k]||0)>bv){bv=kf[k]||0;bk=k;}});return bk;};
  const pa=primary(a), pb=primary(b);
  const sceneChange=pa!==pb;
  // sketch→sketch scene change: render ONLY one diagram and SWIPE the canvas
  // (content swaps while the canvas is off-screen, so the two never overlap)
  const sketchSwipe = sceneChange && SKETCH_KEYS.includes(pa) && SKETCH_KEYS.includes(pb);
  if(sketchSwipe){ SKETCH_KEYS.forEach(k=>{P[k]= (te<0.5? a[k] : b[k]);}); }
  // text-first beats: hold the incoming diagram back until the TEXT is readable,
  // then let the animation fade in. Gating on the card's own opacity guarantees
  // the words lead regardless of section height / scroll speed.
  const nb=Math.min(i+1,KF.length-1);
  let enterGate=1;
  if(KF[nb].textFirst && SKETCH_KEYS.includes(pb) && !sketchSwipe){
    const card=beats[nb].querySelector('.txt');
    const cardOp=card?(parseFloat(card.style.opacity)||0):1;   // prev-frame opacity (1-frame lag is fine)
    enterGate=clamp((cardOp-0.5)/0.35,0,1);                    // diagram only once text >50% in
    P[pb]=P[pb]*enterGate;
  }

  // ---- photos: distinct directional SWIPE per layer (not a uniform fade) ----
  const SWIPE={hero:[0,0], platform:[0,1], moonrise:[0,-1], pair:[-1,0], sun:[1,0], spring:[0,-1],
               neap:[0,1], largest:[-1,0], flats:[1,0], summary:[0,-1], model:[0,1]};
  for(const key in photoEls){
    const op=P['op'+key.charAt(0).toUpperCase()+key.slice(1)];
    const el=photoEls[key];
    el.style.opacity=op;
    el.style.visibility=op>0.01?'visible':'hidden';
    if(op>0.01){
      const k=1-op, d=SWIPE[key]||[0,0];
      const dx=(d[0]*k*9).toFixed(2), dy=(d[1]*k*9).toFixed(2);
      el.style.transform='translate('+dx+'vw,'+dy+'vh) scale('+(1+k*0.03).toFixed(3)+')';
    }
  }
  // ---- sketch canvas transition ----
  if(sketchCv){
    if(sketchSwipe){
      // 0→0.5 : slide current diagram out to the left (0 → -100vw)
      // 0.5→1 : bring next diagram in from the right (+100vw → 0)
      const txv = te<0.5 ? (-te*2*100) : ((1-te)*2*100);
      sketchCv.style.opacity='1';
      sketchCv.style.transform='translateX('+txv.toFixed(1)+'vw)';
    } else if(sceneChange){
      // sketch↔photo: brief opacity dip, no slide (photo handles its own swipe)
      const k=Math.abs(te-0.5)*2;
      sketchCv.style.opacity=clamp(k,0,1).toFixed(3);
      sketchCv.style.transform='none';
    } else {
      sketchCv.style.opacity='1';
      sketchCv.style.transform='none';
    }
  }

  // ---- sketch params ----
  // moon revolution (sun-intro, spring, neap, composite): drive the Moon all the way round.
  // Slowed so the SYNCED Earth spin (29.53 turns / lunar month) is watchable, not a blur.
  const RV=0.13;
  const revolveAng=(clock*RV)%TAU;
  // lunar-day beat: the Moon creeps forward ~12°/day (one orbit per 29.53 Earth
  // rotations), in the SAME direction the Earth spins — so the observer must
  // over-rotate ~50 min each day to face it again. spin advances 2π per day.
  let moonAng = (P.revolveMoon>0.5) ? revolveAng : P.moonAngle;
  if(P.moonCreep>0.5) moonAng = P.moonAngle + spin/SYN;
  const phase=((moonAng/TAU)%1+1)%1;
  // Earth: 29.53 rotations per Moon revolution → one rotation = one day = dot advances 1/29.53 of the month
  const daySpin = clock*RV*SYN;
  const spinUse = (P.revolveMoon>0.5) ? daySpin : spin;
  const mobile = innerWidth < 860;
  const SP={
    opIntro:P.opIntro, opNewton:P.opNewton, opTidal:P.opTidal, opSystem:P.opSystem,
    opChannel:P.opChannel, opSlipway:P.opSlipway, opCompass:0,
    introZoom:P.introZoom, camX:P.camX, camScale:P.camScale*(mobile?0.9:1),
    originX:mobile?0.5:P.originX, originY:(P.originY!=null?P.originY:(mobile?0.34:0.5)),
    moonAngle:moonAng, moonDist:P.moonDist, phase:phase, spin:spinUse, earthSpin:spinUse, rotateEarth:P.rotateEarth>0.5,
    bulge:P.bulge, bulgeOp:0.92, phaseShadowOp:P.phaseShadowOp,
    showSun:P.sysSun, sunCompact:P.sunCompact>0.5, showArrows:P.showArrows, showClock:P.showClock,
    showObserver:P.showObserver, showTideState:P.showTideState>0.5, obsPulse:(clock*0.5)%1,
    markPositions:(KF[di].markPositions)||0,
    tidal:P.tidal, clockT:clock,
    slipLevel:P.slipLevel, slipPhase:(clock*0.25)%1, slipState:null,
    configLabel:(te<0.5?CONFIG_LABEL[i]:CONFIG_LABEL[Math.min(i+1,KF.length-1)]),
    configLabelOp:1, channelAmp:P.channelAmp, channelPhase:(clock*0.05)%1
  };
  // tidal-force ring morph is driven one-way inside the scene (via clockT)
  // slipway + graph share ONE tide clock; it STARTS at high water and ebbs down (reset on entry)
  let slipMarkerT=null;
  if(P.opSlipway>0.5){
    if(slipStart==null) slipStart=clock;            // reset so it always begins at high tide
    const SPEED=2.2;                                // hours of tide per second
    const winLo=(P.viewCenter-P.viewDays/2)*24, winHi=(P.viewCenter+P.viewDays/2)*24; // [0,36]h, t=0 = high
    slipMarkerT=winLo+(((clock-slipStart)*SPEED)%(winHi-winLo));
    const kp={kMoon:P.kMoon,kSun:P.kSun,kM4:P.kM4};
    const Hnow=TideGraph.height(slipMarkerT,kp), Hprev=TideGraph.height(slipMarkerT-0.15,kp);
    const bound=TideGraph.ampBound(kp)||1;
    SP.slipLevel=clamp((Hnow+bound)/(2*bound),0,1);
    SP.slipState=(Hnow>=Hprev)?'flooding — fast':'ebbing — slow';
  } else { slipStart=null; }

  // ---- keep diagrams clear of the bottom tide graph (and the top text card) ----
  // The system orbit and the slipway ruler are tall; when the graph occupies the
  // bottom band they must be centred in the space ABOVE it. We measure the live
  // bottom of this beat's text card and the graph height (which fades smoothly),
  // then centre + shrink-to-fit so nothing overlaps on any viewport.
  {
    const Ww=innerWidth, Hh=innerHeight, mob=Ww<860;
    const graphH=Math.min(mob?168:200, Hh*0.20)*clamp(P.graphOp,0,1);
    const pad=mob?10:16;
    const dcard=beats[di] && beats[di].querySelector('.txt');
    let textBot=Hh*0.16;
    if(dcard){ const rr=dcard.getBoundingClientRect();
      if(rr.height>4 && (parseFloat(dcard.style.opacity)||0)>0.25) textBot=rr.bottom; }
    const topLimit=clamp(textBot+(mob?16:24), Hh*0.12, Hh*0.5);
    const botLimit=Hh-graphH-pad;
    if(P.opSystem>0.12 && botLimit>topLimit){
      // No zoom/shrink — keep the diagram at its authored size and shift it
      // VERTICALLY so its bottom never reaches the graph. The diagram is
      // asymmetric: compact on top (globe + spin axis) but tall below (the
      // config label sits well under the globe, plus the orbit ring on the
      // Sun-group beats), so we measure each extent separately and clamp the
      // bottom against the graph, only centring when the band has slack.
      const scalePx=SP.camScale*Math.min(Ww,Hh)/680;   // px per world unit (matches Sketch.render)
      const eR=scalePx, orbit=(SP.moonDist||2.6)*scalePx, mR=0.5*scalePx;
      const ring=SP.showClock>0.01, sdown=Math.sin(SP.moonAngle||0);
      const halfBelow=Math.max(eR+10,
                               SP.configLabel?eR*1.85+38:0,
                               ring?orbit+mR+22:Math.max(0,sdown)*orbit+mR+22);
      // the orbit ring is a faint dashed circle — allow it to sit behind the
      // haloed text, so the TOP extent counts only the solid globe/axis (and the
      // Moon if it rides high), keeping the meaningful diagram clear of the text.
      const halfAbove=Math.max(eR+14, Math.max(0,-sdown)*orbit+mR+16);
      const center=(topLimit+botLimit)/2;
      let cy=Math.min(center, botLimit-halfBelow);  // keep the bottom off the graph
      cy=Math.max(cy, topLimit+halfAbove);          // and try to keep the top under the text
      cy=Math.min(cy, botLimit-halfBelow);          // graph clearance is the hard limit
      SP.originY=cy/Hh;
    }
    if(P.opSlipway>0.12 && botLimit>topLimit){
      SP.fitTop=clamp(textBot+(mob?16:24), Hh*0.18, Hh*0.44);
      SP.fitBot=botLimit;
    }
  }

  Sketch.render(SP);

  // ---- graph + red-dot marker ----
  graphWrap.style.opacity=P.graphOp;
  if(P.graphOp>0.01){
    const G={viewDays:P.viewDays, viewCenter:P.viewCenter, kMoon:P.kMoon, kSun:P.kSun, kM4:P.kM4,
      showMoon:P.showMoon, showSun:P.showSun, showRes:P.showRes, moonRowOp:P.moonRowOp,
      hideAxis:P.hideAxis>0.5, maxM:P.maxM,
      markerT:null, markerPulse:(clock*0.6)%1};
    const mk=MARK[di];
    if(mk!=null && P.graphOp>0.55){
      const winH=P.viewDays*24, tAh=(P.viewCenter-P.viewDays/2)*24;
      if(mk==='slip'){
        G.markerT=(slipMarkerT!=null)?slipMarkerT:tAh;     // locked to the slipway water level
      } else if(mk==='moonsync'){
        // dot locked to the Moon's phase: full moon → graph day 0 (a spring peak)
        G.markerT=(((phase+0.5)%1)+1)%1*SYN*24;
      } else if(mk==='trace'){
        let mt;
        if(di===7 || di===8){ mt=(2*spin-PI)/W2; }     // lunar-day: lock to Earth's spin
        else { mt=clock*(SYN*24/16); }
        G.markerT=tAh+(((mt-tAh)%winH)+winH)%winH;
      } else {
        G.markerT=mk*24;                                // static day-of-month
        G.markerLabel=MARK_LABEL[di]||null;
      }
    }
    TideGraph.render(G);
  }

  // ---- text cards: fade by distance from centre ----
  const mid=innerHeight/2;
  cards.forEach(c=>{
    let cc;
    if(c.classList.contains('topfade')){const sr=c.closest('section').getBoundingClientRect();cc=sr.top+sr.height/2;}
    else {const r=c.getBoundingClientRect();cc=r.top+r.height/2;}
    const d=(cc-mid)/innerHeight;
    c.style.opacity=clamp(1-Math.abs(d)*2.1,0,1).toFixed(3);
    c.style.transform='translateY('+(d*30).toFixed(1)+'px)';});

  railFill.style.width=(cur*100).toFixed(1)+'%';
 }catch(e){ window.__err=(e&&e.stack)||String(e); }
}

function loop(now){
  const dt=Math.min((now-last)/1000,0.05); last=now;
  cur+=(target-cur)*0.10; clock+=dt; spin+=dt*0.9;     // Earth rotation rate
  render();
  requestAnimationFrame(loop);
}
function resize(){ Sketch.size(); TideGraph.size(); measure(); render(); }
window.addEventListener('scroll',()=>{onScroll();cur+=(target-cur)*0.5;render();},{passive:true});
window.addEventListener('resize',resize);
window.addEventListener('load',()=>{resize();onScroll();render();});
window.__render=render;
measure(); onScroll(); render(); requestAnimationFrame(loop);
setTimeout(resize,400); setTimeout(resize,1200);
})();
