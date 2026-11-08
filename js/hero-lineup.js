/* Four photo-guided bracelet patterns rendered with the original Thousand Eyes 3D Delica engine. */
(() => {
  const root=document.getElementById("caraBraceletLineup");
  if(!root)return;
  const entries=[...root.querySelectorAll(".cara-bracelet-card")].map(card=>({
    card,canvas:card.querySelector("canvas"),title:card.querySelector("figcaption")?.textContent?.trim()||"دستبند cara"
  })).filter(x=>x.canvas);
  if(!entries.length)return;

  const TAU=Math.PI*2,N=120,W=13,PER=30,CC=6;
  const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const palettes={
    "thousand-eyes":["#171717","#F0EDF2","#791D27"],
    waterfall:["#102D50","#159EAE","#55C8B5","#F1C84A","#EF8150","#D94E70","#F5EFE3"],
    duck:["#F8F5EC","#F2C52F","#E99A28","#26242A","#F7E7C4"],
    peacock:["#12334C","#087F82","#20A9A4","#65C9B2","#D9B64D","#F1E8D4"]
  };
  const models={
    "thousand-eyes":(r,j)=>{
      const dr=r-9,dj=j-CC;let c=0,e=0;
      if(r<=18){
        const t=dr/9,hw=5.4*(1-Math.pow(Math.abs(t),1.8));
        if(Math.abs(dj)<=Math.round(hw)){c=1;e=3}
        if(Math.abs(dj)<=hw-1.5)c=0;
        if((dj/3.6)**2+(dr/5.4)**2<=1)c=2;
        if((dj/1.8)**2+(dr/2.8)**2<=1)c=0;
        if(dj===0&&dr===0)c=1;
      }
      return (!e&&Math.abs(dj)>3)?-1:c+e;
    },
    waterfall:(r,j)=>{
      const flow=r*.62+j*1.9+Math.sin(r*.19)*3.2+Math.sin(j*.8+r*.08)*1.4;
      const band=Math.floor(flow/3.1);
      const seq=[0,1,2,1,3,4,5,4,2,1,6,2,3,5];
      return seq[(band%seq.length+seq.length)%seq.length];
    },
    duck:(r,j)=>{
      const x=r%30;
      if(x>=15)return 0;
      const rows=[
        "...............",
        "......111......",
        ".....11111.....",
        "....1111111....",
        "...111111111...",
        "...111111131...",
        "...1111111144..",
        "...111111111...",
        "....1111111....",
        ".....11111.....",
        "......111......",
        "...............",
        "..............."
      ];
      const mark=rows[j]?.[x]||".";
      return mark==="1"?1:mark==="2"?2:mark==="3"?3:mark==="4"?2:0;
    },
    peacock:(r,j)=>{
      const x=r%30,dx=Math.min(x,30-x),dy=j;
      const featherWidth=1+dy*.47;
      if(dy<=11&&dx<=featherWidth){
        if(dy<=1&&dx===0)return 5;
        if(dy<=3&&dx<=1)return 0;
        if(dy<=4&&dx<=2)return 3;
        if(dy<=6&&dx<=3)return 1;
        if(dy<=8&&dx<=4)return 2;
        return 4;
      }
      return (j===12&&r%5===0)?5:0;
    }
  };
  const sprites=new Map();
  const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>1-Math.pow(1-x,3);
  const mix=(hex,k)=>{
    const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
    return "rgb("+rgb.map(v=>Math.round(k>0?v+(255-v)*k:v*(1+k))).join(",")+")";
  };
  function rounded(ctx,x,y,w,h,r){
    r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);
    ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);
    ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();
  }
  function sprite(hex,dark){
    const key=hex+":"+dark;if(sprites.has(key))return sprites.get(key);
    const c=document.createElement("canvas");c.width=c.height=48;const x=c.getContext("2d"),k=dark?-.5:0;
    const wall=x.createLinearGradient(4,0,44,0);
    wall.addColorStop(0,mix(hex,-.48+k));wall.addColorStop(.2,mix(hex,.08+k));
    wall.addColorStop(.5,mix(hex,k));wall.addColorStop(.82,mix(hex,.16+k));wall.addColorStop(1,mix(hex,-.5+k));
    rounded(x,5,13,38,30,7);x.fillStyle=wall;x.fill();
    x.save();rounded(x,5,13,38,30,7);x.clip();
    const side=x.createLinearGradient(0,13,0,43);
    side.addColorStop(0,"rgba(255,255,255,.16)");side.addColorStop(.48,"rgba(255,255,255,0)");
    side.addColorStop(1,"rgba(0,0,0,.34)");x.fillStyle=side;x.fillRect(5,13,38,30);x.restore();
    x.beginPath();x.ellipse(24,14,19,8,0,0,TAU);
    const cap=x.createLinearGradient(0,6,0,22);
    cap.addColorStop(0,mix(hex,.34+k));cap.addColorStop(.55,mix(hex,.08+k));cap.addColorStop(1,mix(hex,-.22+k));
    x.fillStyle=cap;x.fill();x.strokeStyle="rgba(255,255,255,.24)";x.lineWidth=1.2;x.stroke();
    /* Miyuki Delica thread opening is on the top rim; the visible center stays solid. */
    x.beginPath();x.ellipse(24,9.5,3.3,1.8,0,0,TAU);x.fillStyle="rgba(20,15,18,.78)";x.fill();
    x.beginPath();x.ellipse(24,9.1,2.1,.8,0,Math.PI,TAU);
    x.strokeStyle="rgba(255,255,255,.3)";x.lineWidth=.7;x.stroke();
    x.beginPath();x.moveTo(10,19);x.quadraticCurveTo(8,29,10,37);
    x.strokeStyle="rgba(255,255,255,"+(dark?.12:.3)+")";x.lineWidth=1.5;x.lineCap="round";x.stroke();
    x.beginPath();x.moveTo(6,41);x.quadraticCurveTo(24,46,42,41);
    x.strokeStyle="rgba(0,0,0,.3)";x.lineWidth=1.2;x.stroke();
    sprites.set(key,c);return c;
  }
  const shineCanvas=document.createElement("canvas");shineCanvas.width=shineCanvas.height=48;
  const sg=shineCanvas.getContext("2d"),grad=sg.createRadialGradient(24,20,2,24,24,26);
  grad.addColorStop(0,"rgba(255,246,220,.75)");grad.addColorStop(1,"rgba(255,246,220,0)");
  rounded(sg,2,2,44,44,15);sg.fillStyle=grad;sg.fill();
  const shadowCanvas=document.createElement("canvas");shadowCanvas.width=shadowCanvas.height=48;
  const shg=shadowCanvas.getContext("2d"),sh=shg.createRadialGradient(24,24,4,24,24,24);
  sh.addColorStop(0,"rgba(0,0,0,.85)");sh.addColorStop(1,"rgba(0,0,0,0)");shg.fillStyle=sh;shg.fillRect(0,0,48,48);

  let active=0,frame=0,visible=false,mx=0,my=0,w=0,h=0,dpr=1,startX=0,startY=0,pointerId=null;
  const title=root.querySelector(".cara-bracelet-lineup__title");
  const count=root.querySelector(".cara-bracelet-lineup__count");
  const dotsRoot=root.querySelector(".cara-bracelet-lineup__dots");
  const dots=entries.map((entry,i)=>{
    const b=document.createElement("button");b.type="button";b.className="cara-bracelet-lineup__dot";
    b.setAttribute("aria-label","نمایش دستبند "+entry.title);b.addEventListener("click",()=>show(i));
    dotsRoot.append(b);return b;
  });
  function fit(entry){
    const c=entry.canvas,rect=c.getBoundingClientRect(),box=rect.width||Math.min(innerWidth<=820?innerWidth*.82:620,innerHeight*.78);
    const size=Math.max(1,box);dpr=Math.min(devicePixelRatio||1,2);
    const pixelSize=Math.round(size*dpr);
    if(c.width!==pixelSize||c.height!==pixelSize){c.width=pixelSize;c.height=pixelSize;}
    const ctx=c.getContext("2d");ctx.setTransform(dpr,0,0,dpr,0,0);
    return {ctx,w:size,h:size};
  }
  function render(entry,t){
    const {ctx,w:width,h:height}=fit(entry);w=width;h=height;
    const id=entry.card.dataset.bracelet,palette=palettes[id]||palettes["thousand-eyes"],pattern=models[id]||models["thousand-eyes"];
    ctx.clearRect(0,0,w,h);
    const s=w/560,cx=w/2,cy=h/2,R=215*s,Ry=(80+my*45)*s,bs=TAU*R/N;
    const rot=Math.PI/2-9.5/N*TAU+(reduced?0:t*.00011+Math.sin(t/2800)*.12+mx*.7),lightAngle=reduced?0:t*.0012;
    ctx.fillStyle="rgba(0,0,0,.35)";ctx.filter="blur("+(10*s)+"px)";
    ctx.beginPath();ctx.ellipse(cx,cy+Ry+bs*8,R*.9,22*s,0,0,TAU);ctx.fill();ctx.filter="none";
    for(const pass of [0,1]){
      const raised=[];
      for(let i=0;i<N;i++){
        const theta=i/N*TAU+rot,z=Math.sin(theta);if((z>=0?1:0)!==pass)continue;
        const depth=reduced?1:ease(clamp((t-i*14)/650));if(depth<=0)continue;
        const scale=1+.2*z,bw=bs*scale*(.3+.7*Math.abs(z))+.8,bh=bs*scale+.8;
        const x=cx+R*Math.cos(theta),row=Array.from({length:W},(_,j)=>pattern(i%PER,j));
        const lit=pass?Math.pow(Math.max(0,Math.cos(theta-lightAngle)),12):0;
        ctx.globalAlpha=depth;
        for(let j=0;j<W;j++){
          const y=cy+Ry*z+(j-CC)*bs*scale-(1-depth)*240*s,code=row[j];
          if(code<0)continue;
          if(id==="thousand-eyes"&&code>2){raised.push([x,y,bw,bh,code-3,lit,depth]);continue;}
          const color=palette[code]||palette[0],dark=sprite(color,true),light=sprite(color,false);
          ctx.drawImage(pass?light:dark,x-bw/2,y-bh/2,bw,bh);
          const shimmer=reduced?0:.08+.24*(.5+.5*Math.sin(t*.0017-i*.41-j*.83));
          if(shimmer>.02){ctx.globalAlpha=depth*shimmer;ctx.drawImage(shineCanvas,x-bw/2,y-bh/2,bw,bh);ctx.globalAlpha=depth;}
          if(lit>.1){ctx.globalAlpha=depth*lit;ctx.drawImage(shineCanvas,x-bw/2,y-bh/2,bw,bh);ctx.globalAlpha=depth;}
        }
      }
      for(const [x,y,bw,bh,code,lit,depth] of raised){
        const color=palette[code]||palette[1],dark=sprite(color,true),light=sprite(color,false),bw2=bw*1.24,bh2=bh*1.24;
        ctx.globalAlpha=depth*(pass?.7:.35);ctx.drawImage(shadowCanvas,x-bw2*.62+bs*.12,y-bh2*.55+bs*.3,bw2*1.3,bh2*1.3);
        ctx.globalAlpha=depth;ctx.drawImage(pass?light:dark,x-bw2/2,y-bh2/2-bs*.1,bw2,bh2);
        if(pass){ctx.globalAlpha=depth*(.22+lit*.6);ctx.drawImage(shineCanvas,x-bw2/2,y-bh2/2-bs*.1,bw2,bh2);}
      }
    }
    ctx.globalAlpha=1;
  }
  function show(next){
    active=(next+entries.length)%entries.length;
    entries.forEach((entry,i)=>{const on=i===active;entry.card.classList.toggle("is-active",on);entry.card.setAttribute("aria-hidden",on?"false":"true");});
    dots.forEach((dot,i)=>{const on=i===active;dot.classList.toggle("is-active",on);dot.setAttribute("aria-current",on?"true":"false");});
    if(title)title.textContent=entries[active].title;
    if(count)count.textContent=(active+1).toLocaleString("fa-IR")+" از "+entries.length.toLocaleString("fa-IR");
    render(entries[active],performance.now());
  }
  function tick(t){frame=0;if(visible&&!document.hidden&&!reduced){render(entries[active],t);frame=requestAnimationFrame(tick);}}
  function sync(){if(visible&&!document.hidden&&!reduced&&!frame)frame=requestAnimationFrame(tick);else if((!visible||document.hidden||reduced)&&frame){cancelAnimationFrame(frame);frame=0;}}
  root.querySelector(".cara-bracelet-lineup__arrow--prev")?.addEventListener("click",()=>show(active-1));
  root.querySelector(".cara-bracelet-lineup__arrow--next")?.addEventListener("click",()=>show(active+1));
  root.addEventListener("keydown",e=>{if(e.key==="ArrowLeft"){e.preventDefault();show(active+1);}if(e.key==="ArrowRight"){e.preventDefault();show(active-1);}});
  root.addEventListener("pointerdown",e=>{if(e.target.closest("button"))return;pointerId=e.pointerId;startX=e.clientX;startY=e.clientY;});
  root.addEventListener("pointerup",e=>{if(pointerId!==e.pointerId)return;const dx=e.clientX-startX,dy=e.clientY-startY;pointerId=null;if(Math.abs(dx)<42||Math.abs(dx)<Math.abs(dy)*1.15)return;show(active+(dx<0?1:-1));});
  root.addEventListener("pointercancel",()=>{pointerId=null;});
  root.addEventListener("pointermove",e=>{mx=e.clientX/innerWidth-.5;my=e.clientY/innerHeight-.5;},{passive:true});
  if("IntersectionObserver"in window){const observer=new IntersectionObserver(items=>{visible=items.some(x=>x.isIntersecting);sync();},{rootMargin:"120px 0px"});observer.observe(root);}
  else{visible=true;sync();}
  document.addEventListener("visibilitychange",sync);
  window.addEventListener("resize",()=>render(entries[active],performance.now()),{passive:true});
  window.addEventListener("pagehide",()=>{if(frame)cancelAnimationFrame(frame);},{once:true});
  show(0);sync();
})();