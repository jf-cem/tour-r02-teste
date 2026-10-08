(function(){
  'use strict';
  const svg=document.getElementById('route-line'),label=document.getElementById('route-position');
  let data,lengths=[],total=1,active;
  const ns='http://www.w3.org/2000/svg';
  function element(type,attrs){const el=document.createElementNS(ns,type);for(const [key,value]of Object.entries(attrs))el.setAttribute(key,String(value));svg.append(el);return el;}
  function x(meters){return 6+Math.max(0,Math.min(1,meters/total))*(width-12);}
  let dot,uncertainty,track,width=300;
  function init(tour){
    data=tour;const route=TourGeo.routePosition(tour.nodes[0],tour.nodes);lengths=route.cumulative;total=route.total||1;
    track=element('line',{x1:6,x2:width-6,y1:9,y2:9,stroke:'#ffffff88','stroke-width':2,'stroke-linecap':'round'});
    uncertainty=element('line',{x1:6,x2:6,y1:9,y2:9,stroke:'#75c6ff55','stroke-width':10,'stroke-linecap':'round',visibility:'hidden'});
    tour.nodes.forEach((node,i)=>{
      const circle=element('circle',{cx:x(lengths[i]),cy:9,r:2.5,fill:'#d6e5df','data-node':node.id});
      const title=document.createElementNS(ns,'title');title.textContent=node.title;circle.append(title);
      if(i===0||i===4||i===9||i===tour.nodes.length-1){const text=document.createElement('span');text.dataset.index=i;text.className=i===0?'first':i===tour.nodes.length-1?'last':'';text.textContent='P'+String(i+1).padStart(2,'0');document.getElementById('route-labels').append(text);}
    });
    dot=element('circle',{cx:6,cy:9,r:4,fill:'#4ab7ff',stroke:'#fff','stroke-width':2,visibility:'hidden'});
    resize();setActive(tour.start);
  }
  function resize(){
    width=Math.max(24,svg.getBoundingClientRect().width);
    svg.setAttribute('viewBox',`0 0 ${width} 18`);
    if(!data)return;
    track.setAttribute('x2',width-6);
    svg.querySelectorAll('[data-node]').forEach((el,i)=>el.setAttribute('cx',x(lengths[i])));
    document.querySelectorAll('#route-labels span').forEach(el=>el.style.left=x(lengths[Number(el.dataset.index)])+'px');
    if(lastUpdate)update(...lastUpdate);
  }
  let lastUpdate;
  new ResizeObserver(resize).observe(svg);
  function setActive(id){active=id;if(!data)return;svg.querySelectorAll('[data-node]').forEach(el=>{const current=el.dataset.node===id;el.setAttribute('r',current?'4':'2.5');el.setAttribute('fill',current?'#74e3a7':'#d6e5df');});}
  function reset(){lastUpdate=null;if(dot)dot.setAttribute('visibility','hidden');if(uncertainty)uncertainty.setAttribute('visibility','hidden');label.textContent='A aguardar caminhada';}
  function update(coords,accuracy,virtual){
    if(!data)return;
    lastUpdate=[coords,accuracy,virtual];
    const position=TourGeo.routePosition(coords,data.nodes);
    if(position.meters>100){reset();label.textContent='Fora do percurso';return;}
    dot.setAttribute('cx',x(position.along));dot.setAttribute('visibility','visible');
    const radius=Number.isFinite(accuracy)?accuracy:0;
    uncertainty.setAttribute('x1',x(position.along-radius));uncertainty.setAttribute('x2',x(position.along+radius));uncertainty.setAttribute('visibility','visible');
    label.textContent=`${virtual?'Teste':'Posição'}: ${Math.round(position.along)} / ${Math.round(total)} m${Number.isFinite(accuracy)?' · ±'+Math.round(accuracy)+' m':''}`;
    svg.setAttribute('aria-label',`${label.textContent}. Verde: panorama atual. Azul: posição ao longo do percurso.`);
  }
  function pause(){if(dot?.getAttribute('visibility')==='visible')label.textContent+=' · parado';}
  document.getElementById('route-map-toggle').onclick=()=>document.getElementById('mini-map-panel').hidden?document.getElementById('map-launch').click():document.getElementById('map-close').click();
  window.TourRoute={init,setActive,reset,update,pause};
})();
