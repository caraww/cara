/* Original, procedural Miyuki Delica beadwork for the cara homepage hero. Gallery photos are never rendered here. */
(() => {
  const root = document.getElementById("heroShowcase");
  const slidesRoot = document.getElementById("heroShowcaseSlides");
  const dotsRoot = document.getElementById("heroShowcaseDots");
  const title = document.getElementById("heroShowcaseTitle");
  const count = document.getElementById("heroShowcaseCount");
  if (!root || !slidesRoot || !dotsRoot || !title || !count) return;

  const palette = window.CARA?.palette || [];
  const colors = Object.fromEntries(palette.map((p) => [p.code, p.hex]));
  const c = (code, fallback) => colors[code] || fallback;
  const models = [
    { id:"waterfall", title:"آبشار رنگی", speed:.000024, rows:6, beads:42,
      pattern(x,y) {
        const flow=["DB2359","DB0654","DB2116","DB1582","DB0721","DB0725","DB0724","DB0726","DB1832","DB0785"];
        const stripe=((Math.floor((x+Math.sin(x*.31)*2)/4)%flow.length)+flow.length)%flow.length;
        return c(y===0||y===5 ? (stripe%2?"DB1832":"DB0157") : flow[stripe],"#c58aa8");
      }},
    { id:"duck", title:"اردک تک‌تک", speed:.000019, rows:6, beads:42,
      pattern(x,y) {
        const xx=x%14, motif=["..............",".....YYY......","....YYYYY..O..","...YYYYYYYOO..","...YYYYYYYY...","....YYYYYY...."][y][xx];
        if(motif==="Y") return c("DB0721","#f4d629");
        if(motif==="O") return c("DB2103","#f49a21");
        if((xx===6||xx===7)&&y===2) return c("DB0010","#211c26");
        return c(y===0||y===5?"DB0725":"DB0628","#55a5bd");
      }},
    { id:"peacock", title:"طاووس", speed:.000029, rows:6, beads:42,
      pattern(x,y) {
        const xx=x%12, dx=Math.min(xx,12-xx), dy=Math.abs(y-2.5);
        if(dx<=1&&dy<=1.2) return c("DB1832","#c79b4b");
        if(dx<=2&&dy<=1.8) return c("DB0725","#45a4b1");
        if(dx<=3&&dy<=2.5) return c("DB0724","#2e8b68");
        return c(y===0||y===5?"DB1832":"DB0726",y===0||y===5?"#c79b4b":"#173d68");
      }}
  ];

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const slides=[], dots=[], canvases=[];
  let active=0, startX=0, startY=0, pointerId=null, autoplay=0, paused=false, raf=0, lastFrame=0;

  function drawBead(ctx,x,y,w,h,fill,angle,depth,shine) {
    ctx.save(); ctx.translate(x,y); ctx.rotate(angle);
    ctx.globalAlpha=.68+depth*.32;
    const side=ctx.createLinearGradient(-w/2,0,w/2,0);
    side.addColorStop(0,"rgba(15,12,24,.62)"); side.addColorStop(.22,fill);
    side.addColorStop(.52,"rgba(255,255,255,.32)"); side.addColorStop(.78,fill);
    side.addColorStop(1,"rgba(12,9,20,.58)");
    ctx.shadowColor="rgba(5,3,12,.35)"; ctx.shadowBlur=5*depth; ctx.shadowOffsetY=3*depth;
    ctx.fillStyle=side; ctx.beginPath(); ctx.roundRect(-w/2,-h/2,w,h,Math.min(3.5,w*.22)); ctx.fill();
    ctx.shadowColor="transparent";
    ctx.fillStyle="rgba(255,255,255,.34)"; ctx.beginPath(); ctx.ellipse(0,-h*.27,w*.39,h*.18,0,0,Math.PI*2); ctx.fill();
    /* The Delica tube opening sits on the bead's top face, not through its visible center. */
    ctx.fillStyle="rgba(22,17,29,.62)"; ctx.beginPath(); ctx.ellipse(0,-h*.27,w*.105,h*.055,0,0,Math.PI*2); ctx.fill();
    if(shine>.72) { ctx.strokeStyle="rgba(255,255,255,"+((shine-.72)*.9)+")"; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(-w*.24,-h*.02); ctx.lineTo(w*.18,-h*.02); ctx.stroke(); }
    ctx.restore();
  }

  function draw(ctx,model,time) {
    const W=ctx.canvas.width,H=ctx.canvas.height;
    ctx.clearRect(0,0,W,H);
    const glow=ctx.createRadialGradient(280,260,25,280,280,260);
    glow.addColorStop(0,"rgba(239,218,185,.15)"); glow.addColorStop(.62,"rgba(111,76,137,.09)"); glow.addColorStop(1,"rgba(30,20,43,0)");
    ctx.fillStyle=glow; ctx.fillRect(0,0,W,H);
    const rotation=reduced?0:time*model.speed, rx=194, ry=91, cx=W/2, cy=H/2+5, beads=[];
    for(let x=0;x<model.beads;x++) {
      const t=x/model.beads*Math.PI*2+rotation, depth=(Math.sin(t)+1)/2;
      for(let y=0;y<model.rows;y++) {
        const band=(y-(model.rows-1)/2)*12;
        beads.push({
          x:cx+Math.cos(t)*rx, y:cy+Math.sin(t)*ry+Math.cos(t)*band,
          angle:Math.atan2(Math.cos(t)*ry,-Math.sin(t)*rx),
          w:16.1*(.76+depth*.24), h:14.8*(.8+depth*.2), depth,
          shine:(Math.sin(t*2.3+y*.8+time*.001)+1)/2, fill:model.pattern(x,y)
        });
      }
    }
    beads.sort((a,b)=>a.y-b.y);
    beads.forEach(b=>drawBead(ctx,b.x,b.y,b.w,b.h,b.fill,b.angle,b.depth,b.shine));
    ctx.save(); ctx.strokeStyle="rgba(255,239,203,.18)"; ctx.lineWidth=1.2;
    ctx.beginPath(); ctx.ellipse(cx,cy,rx+3,ry+3,0,0,Math.PI*2); ctx.stroke(); ctx.restore();
  }

  models.forEach((model,index)=>{
    const slide=document.createElement("figure"); slide.className="hero-showcase__slide";
    slide.dataset.motion=String(index); slide.setAttribute("aria-hidden","true");
    const canvas=document.createElement("canvas"); canvas.className="hero-showcase__beadwork";
    canvas.width=560; canvas.height=560; canvas.setAttribute("role","img");
    canvas.setAttribute("aria-label","مدل سه‌بعدی دستبند میوکی دلیکا: "+model.title);
    slide.append(canvas); slidesRoot.append(slide); slides.push(slide); canvases.push({canvas,model});
    const dot=document.createElement("button"); dot.type="button"; dot.className="hero-showcase__dot";
    dot.setAttribute("aria-label","نمایش دستبند "+model.title); dot.addEventListener("click",()=>show(index,true));
    dotsRoot.append(dot); dots.push(dot);
  });

  function show(next,userInitiated=false) {
    active=(next+models.length)%models.length;
    slides.forEach((s,i)=>{const on=i===active;s.classList.toggle("is-active",on);s.setAttribute("aria-hidden",on?"false":"true");});
    dots.forEach((d,i)=>{const on=i===active;d.classList.toggle("is-active",on);d.setAttribute("aria-current",on?"true":"false");});
    title.textContent=models[active].title;
    count.textContent=(active+1).toLocaleString("fa-IR")+" از "+models.length.toLocaleString("fa-IR");
    draw(canvases[active].canvas.getContext("2d"),models[active],performance.now());
    if(userInitiated) restartAutoplay();
  }
  function animate(t) {
    if(!paused&&!document.hidden&&!reduced&&t-lastFrame>32) {
      const item=canvases[active]; draw(item.canvas.getContext("2d"),item.model,t); lastFrame=t;
    }
    raf=window.requestAnimationFrame(animate);
  }
  function stopAutoplay(){if(autoplay)window.clearInterval(autoplay);autoplay=0;}
  function restartAutoplay(){stopAutoplay();if(!reduced&&!paused&&!document.hidden)autoplay=window.setInterval(()=>show(active+1),7200);}
  root.querySelector(".hero-showcase__arrow--prev")?.addEventListener("click",()=>show(active-1,true));
  root.querySelector(".hero-showcase__arrow--next")?.addEventListener("click",()=>show(active+1,true));
  root.addEventListener("keydown",e=>{if(e.key==="ArrowLeft"){e.preventDefault();show(active+1,true);}if(e.key==="ArrowRight"){e.preventDefault();show(active-1,true);}});
  root.addEventListener("pointerdown",e=>{if(e.target.closest("button"))return;pointerId=e.pointerId;startX=e.clientX;startY=e.clientY;});
  root.addEventListener("pointerup",e=>{
    if(pointerId!==e.pointerId)return;const dx=e.clientX-startX,dy=e.clientY-startY;pointerId=null;
    if(Math.abs(dx)<42||Math.abs(dx)<Math.abs(dy)*1.15)return;show(active+(dx<0?1:-1),true);
  });
  root.addEventListener("pointercancel",()=>{pointerId=null;});
  root.addEventListener("mouseenter",()=>{paused=true;stopAutoplay();});
  root.addEventListener("mouseleave",()=>{paused=false;restartAutoplay();});
  root.addEventListener("focusin",()=>{paused=true;stopAutoplay();});
  root.addEventListener("focusout",e=>{if(!root.contains(e.relatedTarget)){paused=false;restartAutoplay();}});
  document.addEventListener("visibilitychange",restartAutoplay);
  window.addEventListener("pagehide",()=>{stopAutoplay();if(raf)window.cancelAnimationFrame(raf);},{once:true});
  show(0); restartAutoplay(); if(!reduced)raf=window.requestAnimationFrame(animate);
})();