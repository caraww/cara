/* Four photo-guided Miyuki Delica bracelet reconstructions for the cara hero. */
(() => {
  const cards = [...document.querySelectorAll(".cara-bracelet-card")];
  if (!cards.length) return;

  const palette = {
    black: "#17151a", white: "#f4f1e9", burgundy: "#781b2d",
    yellow: "#f2ca18", orange: "#e97818", red: "#c9362d",
    navy: "#202b52", pale: "#d9d9d2", teal: "#3d9ca4",
    blue: "#7db9bb", silver: "#c9c9c4", darkTeal: "#174c55"
  };
  const models = {
    "thousand-eyes": {
      color(x,y) {
        const centers=[7,20,33], cx=centers.reduce((best,v)=>Math.abs(v-x)<Math.abs(best-x)?v:best,centers[0]);
        const dx=Math.abs(x-cx), dy=Math.abs(y-2.5);
        if(dx<.6 && dy<.6) return palette.white;
        if(dx<=1.2 && dy<=1.2) return palette.black;
        if(dx<=2.1 && dy<=2.1) return palette.burgundy;
        if(dx<=2.9 && dy<=2.8) return palette.white;
        return palette.black;
      }
    },
    waterfall: {
      color(x,y) {
        const wave=Math.floor((x + Math.sin(x*.38)*2.8 + Math.sin(y*.8)*1.4)/4);
        const colors=[palette.yellow,palette.orange,palette.red,palette.navy,palette.red,palette.orange,palette.yellow,palette.navy];
        if(y===0 || y===5) return wave%2 ? palette.red : palette.orange;
        return colors[((wave%colors.length)+colors.length)%colors.length];
      }
    },
    duck: {
      color(x,y) {
        const xx=x%12;
        const ducks=["............",".....Y......","....YYY.....","...YYYYY..O.","...YYYYYYOO.","....YYYYY..."];
        const mark=ducks[y][xx];
        if(mark==="Y") return palette.yellow;
        if(mark==="O") return palette.orange;
        if((xx===5||xx===6)&&y===2) return palette.black;
        return palette.pale;
      }
    },
    peacock: {
      color(x,y) {
        const xx=x%14, center=7, dx=Math.abs(xx-center), dy=Math.abs(y-2.5);
        if(dx<=.7&&dy<=.7) return palette.black;
        if(dx<=1.5&&dy<=1.5) return palette.teal;
        if(dx<=2.3&&dy<=2.2) return palette.blue;
        if(dx<=3.2&&dy<=2.8) return palette.silver;
        return (y===0||y===5) ? palette.silver : (x%7===0 ? palette.darkTeal : palette.white);
      }
    }
  };

  function bead(ctx,x,y,angle,color,shine) {
    ctx.save();
    ctx.translate(x,y);
    ctx.rotate(angle);
    const w=8.1,h=8.5;
    const side=ctx.createLinearGradient(-w/2,0,w/2,0);
    side.addColorStop(0,"rgba(12,10,16,.48)");
    side.addColorStop(.2,color);
    side.addColorStop(.5,"rgba(255,255,255,.34)");
    side.addColorStop(.78,color);
    side.addColorStop(1,"rgba(12,10,16,.42)");
    ctx.fillStyle=side;
    ctx.shadowColor="rgba(0,0,0,.3)";
    ctx.shadowBlur=2.8;
    ctx.shadowOffsetY=1.8;
    ctx.beginPath();
    ctx.roundRect(-w/2,-h/2,w,h,1.8);
    ctx.fill();
    ctx.shadowColor="transparent";
    ctx.fillStyle="rgba(255,255,255,.23)";
    ctx.beginPath();
    ctx.ellipse(0,-h*.27,w*.37,h*.16,0,0,Math.PI*2);
    ctx.fill();
    /* Delica thread opening is on the top rim; the bead's center stays solid. */
    ctx.fillStyle="rgba(24,19,23,.7)";
    ctx.beginPath();
    ctx.ellipse(0,-h*.31,w*.12,h*.055,0,0,Math.PI*2);
    ctx.fill();
    if(shine>.1) {
      ctx.strokeStyle="rgba(255,255,255,"+(shine*.65)+")";
      ctx.lineWidth=.75;
      ctx.beginPath();
      ctx.moveTo(-w*.22,.1);
      ctx.lineTo(w*.22,.1);
      ctx.stroke();
    }
    ctx.restore();
  }

  function draw(canvas,model,time) {
    const ctx=canvas.getContext("2d");
    const W=canvas.width,H=canvas.height;
    ctx.clearRect(0,0,W,H);
    const glow=ctx.createRadialGradient(210,82,8,210,100,210);
    glow.addColorStop(0,"rgba(234,213,176,.16)");
    glow.addColorStop(1,"rgba(234,213,176,0)");
    ctx.fillStyle=glow;
    ctx.fillRect(0,0,W,H);

    const cols=38, rows=6, beads=[];
    const point=t=>({x:54+t*312,y:150-105*Math.sin(Math.PI*t)});
    for(let x=0;x<cols;x++) {
      const t=x/(cols-1), p=point(t), before=point(Math.max(0,t-.003)), after=point(Math.min(1,t+.003));
      const angle=Math.atan2(after.y-before.y,after.x-before.x);
      const nx=-Math.sin(angle), ny=Math.cos(angle);
      for(let y=0;y<rows;y++) {
        const offset=(y-(rows-1)/2)*8.1;
        const shimmer=.08+.2*(.5+.5*Math.sin(time*.0018+x*.47+y*.91));
        beads.push({x:p.x+nx*offset,y:p.y+ny*offset,angle,color:model.color(x,y),shine:shimmer});
      }
    }
    beads.sort((a,b)=>a.y-b.y);
    ctx.save();
    ctx.strokeStyle="rgba(0,0,0,.28)";
    ctx.lineWidth=15;
    ctx.lineCap="round";
    ctx.beginPath();
    ctx.moveTo(54,150);ctx.quadraticCurveTo(210,238,366,150);ctx.stroke();
    ctx.restore();
    beads.forEach(b=>bead(ctx,b.x,b.y,b.angle,b.color,b.shine));

    /* Slim metal end bars and adjustable cord echo the photographed bracelets. */
    const left=point(0),right=point(1);
    [left,right].forEach(p=>{
      ctx.save();
      ctx.translate(p.x,p.y);
      ctx.rotate(p===left?-1.1:1.1);
      const metal=ctx.createLinearGradient(0,-27,0,27);
      metal.addColorStop(0,"#777875");metal.addColorStop(.35,"#f0e9d8");metal.addColorStop(.7,"#99978e");metal.addColorStop(1,"#4c4b4a");
      ctx.fillStyle=metal;
      ctx.fillRect(-5,-27,10,54);
      ctx.strokeStyle="rgba(255,255,255,.55)";
      ctx.lineWidth=1;
      ctx.strokeRect(-3.5,-25.5,7,51);
      ctx.restore();
    });
    ctx.strokeStyle="rgba(28,24,28,.9)";
    ctx.lineWidth=2.4;
    ctx.beginPath();
    ctx.moveTo(left.x,left.y+7);ctx.bezierCurveTo(40,195,95,201,153,190);
    ctx.moveTo(right.x,right.y+7);ctx.bezierCurveTo(380,195,325,201,267,190);
    ctx.stroke();
    ctx.fillStyle="#17151a";
    ctx.beginPath();ctx.roundRect(188,184,44,12,6);ctx.fill();
  }

  const entries=cards.map(card=>({
    card,
    canvas:card.querySelector("canvas"),
    model:models[card.dataset.bracelet]
  })).filter(entry=>entry.canvas&&entry.model);
  const root=document.getElementById("caraBraceletLineup");
  const title=root.querySelector(".cara-bracelet-lineup__title");
  const count=root.querySelector(".cara-bracelet-lineup__count");
  const dotsRoot=root.querySelector(".cara-bracelet-lineup__dots");
  const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let active=0, frame=0, visible=true, startX=0, startY=0, pointerId=null;
  const dots=entries.map((entry,index)=>{
    const dot=document.createElement("button");
    dot.type="button";
    dot.className="cara-bracelet-lineup__dot";
    dot.setAttribute("aria-label","نمایش دستبند "+entry.card.querySelector("figcaption").textContent);
    dot.addEventListener("click",()=>show(index));
    dotsRoot.append(dot);
    return dot;
  });
  function render(t) {
    entries.forEach(({canvas,model},i)=>{
      if(i===active) draw(canvas,model,reduced?0:t);
    });
  }
  function show(next) {
    active=(next+entries.length)%entries.length;
    entries.forEach(({card},i)=>{
      const on=i===active;
      card.classList.toggle("is-active",on);
      card.setAttribute("aria-hidden",on?"false":"true");
    });
    dots.forEach((dot,i)=>{
      const on=i===active;
      dot.classList.toggle("is-active",on);
      dot.setAttribute("aria-current",on?"true":"false");
    });
    title.textContent=entries[active].card.querySelector("figcaption").textContent;
    count.textContent=(active+1).toLocaleString("fa-IR")+" از "+entries.length.toLocaleString("fa-IR");
    render(performance.now());
  }
  function tick(t) {
    frame=0;
    if(visible&&!document.hidden&&!reduced) render(t);
    if(visible&&!document.hidden&&!reduced) frame=requestAnimationFrame(tick);
  }
  function sync() {
    if(visible&&!document.hidden&&!reduced&&!frame) frame=requestAnimationFrame(tick);
    else if((!visible||document.hidden||reduced)&&frame){cancelAnimationFrame(frame);frame=0;}
  }
  root.querySelector(".cara-bracelet-lineup__arrow--prev").addEventListener("click",()=>show(active-1));
  root.querySelector(".cara-bracelet-lineup__arrow--next").addEventListener("click",()=>show(active+1));
  root.addEventListener("keydown",e=>{
    if(e.key==="ArrowLeft"){e.preventDefault();show(active+1);}
    if(e.key==="ArrowRight"){e.preventDefault();show(active-1);}
  });
  root.addEventListener("pointerdown",e=>{
    if(e.target.closest("button"))return;
    pointerId=e.pointerId;startX=e.clientX;startY=e.clientY;
  });
  root.addEventListener("pointerup",e=>{
    if(pointerId!==e.pointerId)return;
    const dx=e.clientX-startX,dy=e.clientY-startY;pointerId=null;
    if(Math.abs(dx)<42||Math.abs(dx)<Math.abs(dy)*1.15)return;
    show(active+(dx<0?1:-1));
  });
  root.addEventListener("pointercancel",()=>{pointerId=null;});
  if("IntersectionObserver" in window) {
    const observer=new IntersectionObserver(items=>{
      visible=items.some(item=>item.isIntersecting);sync();
    },{rootMargin:"100px"});
    observer.observe(root);
  } else {visible=true;sync();}
  document.addEventListener("visibilitychange",sync);
  window.addEventListener("pagehide",()=>{if(frame)cancelAnimationFrame(frame);},{once:true});
  show(0);sync();
})();