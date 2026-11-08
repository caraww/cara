/* دستبند چشم برای هیرو — فقط به <canvas id="braceletCanvas"> نیاز داره */
(()=>{
const cv0=document.getElementById("braceletCanvas");if(!cv0)return;
const cv=cv0,g=cv.getContext("2d");if(!g)return;const TAU=Math.PI*2,RM=matchMedia("(prefers-reduced-motion: reduce)").matches;
/* رنگ‌های پالت خودت: مشکی براق DB0010، سفید DB0200، سرخابی DB0654 */
const HEX=["#171717","#F0EDF2","#791D27"];
const N=120,W=13,PER=30,CC=6;
/* الگوی چشم، همون عکس: لنز سفید، حلقه‌ی سرخابی، مشکی، یه نقطه‌ی سفید وسط */
const PAT=Array.from({length:PER},(_,r)=>Array.from({length:W},(_,j)=>{
  const dr=r-9,dj=j-CC;let c=0,e=0;
  if(r<=18){
    const t=dr/9,hw=5.4*(1-Math.pow(Math.abs(t),1.8));
    if(Math.abs(dj)<=Math.round(hw)){c=1;e=3}
    if(Math.abs(dj)<=hw-1.5)c=0;
    if((dj/3.6)**2+(dr/5.4)**2<=1)c=2;
    if((dj/1.8)**2+(dr/2.8)**2<=1)c=0;
    if(dj===0&&dr===0)c=1;
  }
  return (!e&&Math.abs(dj)>3)?-1:c+e; /* نوار مشکی ۷ خونه، فقط چشم‌ها پهن‌تر (۱۱ خونه) از لبه‌ها بیرون می‌زنن */
}));
const mix=(h,k)=>{const n=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));return"rgb("+n.map(v=>Math.round(k>0?v+(255-v)*k:v*(1+k))).join(",")+")"};
/* منجوق برجسته: شیب نور، هایلایت، لبه‌ی تیره */
function roundedRect(ctx,x,y,w,h,r){r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
function sprite(hex,dark){
  /* High-resolution Miyuki Delica cylinder: crisp cut edges, a recessed
     thread channel, glass depth and two restrained studio reflections. */
  const c=document.createElement("canvas");c.width=c.height=96;const x=c.getContext("2d");
  const k=dark?-.34:0;
  const body=x.createLinearGradient(6,0,90,0);
  body.addColorStop(0,mix(hex,-.56+k));
  body.addColorStop(.10,mix(hex,-.34+k));
  body.addColorStop(.25,mix(hex,-.08+k));
  body.addColorStop(.43,mix(hex,.24+k));
  body.addColorStop(.56,mix(hex,.08+k));
  body.addColorStop(.76,mix(hex,-.10+k));
  body.addColorStop(.91,mix(hex,-.32+k));
  body.addColorStop(1,mix(hex,-.58+k));
  x.save();
  x.shadowColor="rgba(0,0,0,"+(dark?.38:.26)+")";
  x.shadowBlur=dark?6:8;x.shadowOffsetY=4;
  roundedRect(x,6,10,84,76,15);x.fillStyle=body;x.fill();
  x.restore();
  x.save();roundedRect(x,6,10,84,76,15);x.clip();
  const face=x.createLinearGradient(0,10,0,86);
  face.addColorStop(0,"rgba(255,255,255,"+(dark?.28:.46)+")");
  face.addColorStop(.12,"rgba(255,255,255,"+(dark?.10:.20)+")");
  face.addColorStop(.48,"rgba(255,255,255,0)");
  face.addColorStop(.84,"rgba(0,0,0,.10)");
  face.addColorStop(1,"rgba(0,0,0,.42)");
  x.fillStyle=face;x.fillRect(0,0,96,96);
  const edge=x.createLinearGradient(7,0,25,0);
  edge.addColorStop(0,"rgba(255,255,255,0)");
  edge.addColorStop(.45,"rgba(255,255,255,"+(dark?.18:.40)+")");
  edge.addColorStop(1,"rgba(255,255,255,0)");
  x.fillStyle=edge;x.fillRect(7,9,19,78);
  const glint=x.createLinearGradient(64,0,82,0);
  glint.addColorStop(0,"rgba(255,255,255,0)");
  glint.addColorStop(.5,"rgba(255,255,255,"+(dark?.10:.22)+")");
  glint.addColorStop(1,"rgba(255,255,255,0)");
  x.fillStyle=glint;x.fillRect(62,10,20,76);
  /* Recessed bore and a fine thread glint, rather than a painted dot. */
  x.beginPath();x.ellipse(48,50,7.2,10.2,0,0,TAU);
  x.fillStyle="rgba(0,0,0,"+(dark?.74:.52)+")";x.fill();
  x.beginPath();x.ellipse(47,48,3.4,5.5,-.12,0,TAU);
  x.fillStyle="rgba(12,10,16,"+(dark?.48:.28)+")";x.fill();
  x.beginPath();x.ellipse(45.5,45.5,2.1,3.1,-.2,0,TAU);
  x.fillStyle="rgba(255,255,255,"+(dark?.16:.50)+")";x.fill();
  x.restore();
  roundedRect(x,6,10,84,76,15);
  x.strokeStyle="rgba(255,255,255,"+(dark?.16:.30)+")";x.lineWidth=1.6;x.stroke();
  x.beginPath();x.moveTo(15,17);x.quadraticCurveTo(48,7,81,17);
  x.strokeStyle="rgba(255,255,255,"+(dark?.20:.48)+")";x.lineWidth=2;x.stroke();
  x.beginPath();x.moveTo(13,82);x.quadraticCurveTo(48,91,83,82);
  x.strokeStyle="rgba(0,0,0,.22)";x.lineWidth=2;x.stroke();
  return c;
}
const SP=HEX.map(h=>[sprite(h,true),sprite(h,false)]);
const SH=(()=>{const c=document.createElement("canvas");c.width=c.height=48;const x=c.getContext("2d"),r=x.createRadialGradient(24,20,2,24,24,26);r.addColorStop(0,"rgba(255,246,220,.75)");r.addColorStop(1,"rgba(255,246,220,0)");roundedRect(x,2,2,44,44,15);x.fillStyle=r;x.fill();return c})();
const SHD=(()=>{const c=document.createElement("canvas");c.width=c.height=48;const x=c.getContext("2d"),r=x.createRadialGradient(24,24,4,24,24,24);r.addColorStop(0,"rgba(0,0,0,.85)");r.addColorStop(1,"rgba(0,0,0,0)");x.fillStyle=r;x.fillRect(0,0,48,48);return c})();
let w=0,h=0,mx=0,my=0,frame=0,inViewport=false;
const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>1-Math.pow(1-x,3);
function fit(){const r=cv.getBoundingClientRect(),p=cv.parentElement?.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,3),fallback=Math.max(1,Math.min(p?.width||innerWidth,innerWidth<=820?innerWidth*.82:620,innerHeight*.78));if(!r.width)cv.style.width=fallback+"px";else if(cv.style.width)cv.style.width="";if(!r.height&&!r.width)cv.style.height=fallback+"px";else if(cv.style.height)cv.style.height="";const box=cv.getBoundingClientRect();w=box.width||fallback;h=box.height||w;cv.width=Math.max(1,Math.round(w*d));cv.height=Math.max(1,Math.round(h*d));g.setTransform(d,0,0,d,0,0);render(performance.now())}
fit();
if(window.ResizeObserver){const ro=new ResizeObserver(fit);ro.observe(cv);if(cv.parentElement)ro.observe(cv.parentElement);}
addEventListener("resize",fit,{passive:true});
addEventListener("load",()=>{requestAnimationFrame(()=>requestAnimationFrame(()=>{fit();inViewport=true;syncAnimation()}))},{once:true});
addEventListener("pointermove",e=>{mx=e.clientX/innerWidth-.5;my=e.clientY/innerHeight-.5});
function render(t){
  g.clearRect(0,0,w,h);
  const s=w/560,cx=w/2,cy=h/2+14*s,R=215*s,Ry=(80+my*45)*s,bs=TAU*R/N;
  const rot=Math.PI/2-9.5/N*TAU+(RM?0:t*.00011+Math.sin(t/2800)*.12+mx*.7),la=RM?0:t*.0012;
  g.fillStyle="rgba(0,0,0,.35)";g.filter="blur("+10*s+"px)";g.beginPath();g.ellipse(cx,cy+Ry+bs*8,R*.9,22*s,0,0,TAU);g.fill();g.filter="none";
  for(const pass of [0,1]){
    const ey=[];
    for(let i=0;i<N;i++){
      const th=i/N*TAU+rot,z=Math.sin(th);
      if((z>=0?1:0)!==pass)continue;
      const d=RM?1:ease(clamp((t-i*14)/650));
      if(d<=0)continue;
      const sc=1+.2*z,bw=bs*sc*(.3+.7*Math.abs(z))+.8,bh=bs*sc+.8,x=cx+R*Math.cos(th),row=PAT[i%PER];
      const lit=pass?Math.pow(Math.max(0,Math.cos(th-la)),12):0;
      g.globalAlpha=d;
      for(let j=0;j<W;j++){
        const y=cy+Ry*z+(j-CC)*bs*sc-(1-d)*240*s;
        if(row[j]<0)continue;
        if(row[j]>2){ey.push([x,y,bw,bh,row[j]-3,lit,d]);continue}
        g.drawImage(SP[row[j]][pass],x-bw/2,y-bh/2,bw,bh);
        if(lit>.1){g.globalAlpha=d*lit;g.drawImage(SH,x-bw/2,y-bh/2,bw,bh);g.globalAlpha=d}
      }
    }
    /* چشم‌ها بعد از بقیه کشیده می‌شن: بزرگ‌تر، با سایه‌ی زیرشون و برق بیشتر، پس از زمینه می‌زنن بیرون */
    for(const [x,y,bw,bh,c,lit,d] of ey){
      const W2=bw*1.24,H2=bh*1.24;
      g.globalAlpha=d*(pass?.7:.35);g.drawImage(SHD,x-W2*.62+bs*.12,y-H2*.55+bs*.3,W2*1.3,H2*1.3);
      g.globalAlpha=d;g.drawImage(SP[c][pass],x-W2/2,y-H2/2-bs*.1,W2,H2);
      if(pass){g.globalAlpha=d*(.22+lit*.6);g.drawImage(SH,x-W2/2,y-H2/2-bs*.1,W2,H2)}
    }
  }
  g.globalAlpha=1;
}

/* Animate only while the hero is visible and the tab is active. */
function tick(t){
  frame=0;
  render(t);
  if(inViewport&&!document.hidden&&!RM) frame=requestAnimationFrame(tick);
}
function syncAnimation(){
  const shouldAnimate=inViewport&&!document.hidden&&!RM&&w>0&&h>0;
  if(shouldAnimate&&!frame) frame=requestAnimationFrame(tick);
  else if(!shouldAnimate){
    if(frame){cancelAnimationFrame(frame);frame=0}
    render(performance.now());
  }
}
document.addEventListener("visibilitychange",syncAnimation);
if("IntersectionObserver" in window){
  const observer=new IntersectionObserver(entries=>{
    inViewport=entries.some(entry=>entry.isIntersecting);
    syncAnimation();
  },{rootMargin:"120px 0px"});
  observer.observe(cv);
}else{
  inViewport=true;
  syncAnimation();
}
})();
