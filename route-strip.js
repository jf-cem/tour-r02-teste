(function(){
  'use strict';
  const svg=document.getElementById('route-line'),label=document.getElementById('route-position');
  let data,lengths=[],total=1,active;
  const ns='http://www.w3.org/2000/svg';
  function element(type,attrs){const el=document.createElementNS(ns,type);for(const [key,value]of Object.entries(attrs))el.setAttribute(key,String(value));svg.append(el);return el;}
  function x(meters){return 14+Math.max(0,Math.min(1,meters/total))*272;}
  let dot,uncertainty;
  function init(tour){
    data=tour;const route=TourGeo.routePosition(tour.nodes[0],tour.nodes);lengths=route.cumulative;total=route.total||1;
    element('line',{x1:14,x2:286,y1:20,y2:20,stroke:'#ffffff66','stroke-width':4,'stroke-linecap':'round'});
    uncertainty=element('line',{x1:14,x2:14,y1:20,y2:20,stroke:'#75c6ff55','stroke-width':13,'stroke-linecap':'round',visibility:'hidden'});
    tour.nodes.forEach((node,i)=>{
      const circle=element('circle',{cx:x(lengths[i]),cy:20,r:3.3,fill:'#d6e5df','data-node':node.id});
      const title=document.createElementNS(ns,'title');title.textContent=node.title;circle.append(title);
      if(i===0||i===4||i===9||i===tour.nodes.length-1){const text=element('text',{x:x(lengths[i]),y:42,'text-anchor':i===0?'start':i===tour.nodes.length-1?'end':'middle',fill:'#e7f0ed','font-size':10});text.textContent='P'+String(i+1).padStart(2,'0');}
    });
    dot=element('circle',{cx:14,cy:20,r:5,fill:'#4ab7ff',stroke:'#fff','stroke-width':2,visibility:'hidden'});
    setActive(tour.start);
  }
  function setActive(id){active=id;if(!data)return;svg.querySelectorAll('[data-node]').forEach(el=>{const current=el.dataset.node===id;el.setAttribute('r',current?'5':'3.3');el.setAttribute('fill',current?'#74e3a7':'#d6e5df');});}
  function reset(){if(dot)dot.setAttribute('visibility','hidden');if(uncertainty)uncertainty.setAttribute('visibility','hidden');label.textContent='A aguardar caminhada';}
  function update(coords,accuracy,virtual){
    if(!data)return;
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
