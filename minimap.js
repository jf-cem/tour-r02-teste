(function () {
  'use strict';
  const panel=document.getElementById('mini-map-panel');
  const launch=document.getElementById('map-launch');
  const caption=document.getElementById('map-caption');
  const sizeButton=document.getElementById('map-size');
  function size(expanded,save=true) {
    panel.classList.toggle('expanded',expanded);
    if(expanded){document.getElementById('map-resize-tools').hidden=true;document.getElementById('map-resize').setAttribute('aria-expanded','false');}
    document.body.classList.toggle('map-expanded',expanded&&!panel.hidden);
    sizeButton.textContent=expanded?'↙':'↗';
    sizeButton.setAttribute('aria-expanded',String(expanded));
    sizeButton.setAttribute('aria-label',expanded?'Reduzir mapa':'Ampliar mapa');
    sizeButton.title=expanded?'Reduzir mapa':'Ampliar mapa';
    if(save){try{localStorage.setItem('tour-r02-map-expanded',String(expanded));}catch(_){}}
    if(map)requestAnimationFrame(()=>{map.invalidateSize({pan:false});if(position)map.setView(position,20,{animate:false});else if(expanded)map.fitBounds(nodes.map(n=>[n.lat,n.lng]),{padding:[14,14],maxZoom:19,animate:false});else if(nodes.length)map.setView([nodes[0].lat,nodes[0].lng],20,{animate:false});});
  }
  let map, nodes=[], markers=new Map(), walker, accuracyRing, trail, position=null, points=[], lastPosition=null, heading=0;
  function visibility(show, save=true) {
    panel.hidden=!show; launch.hidden=show;
    document.body.classList.toggle('map-open',show);
    document.getElementById('route-map-toggle').setAttribute('aria-pressed',String(show));
    document.body.classList.toggle('map-expanded',show&&panel.classList.contains('expanded'));
    if(save) {try {localStorage.setItem('tour-r02-map-visible-v6',String(show));}catch (_) {}}
    if(map && show) requestAnimationFrame(()=>{map.invalidateSize(); if(position)map.setView(position,20,{animate:false});else if(nodes.length)map.setView([nodes[0].lat,nodes[0].lng],20,{animate:false});});
  }
  document.getElementById('map-close').onclick=()=>visibility(false);
  launch.onclick=()=>visibility(true);
  const resizeButton=document.getElementById('map-resize');
  const resizeTools=document.getElementById('map-resize-tools');
  const widthInput=document.getElementById('map-width');
  function resizeMap(value,save=true){
    const width=Math.max(160,Math.min(280,Number(value)||160));
    panel.style.setProperty('--map-width',width+'px');
    panel.style.setProperty('--map-height',Math.round(width*0.55)+'px');
    widthInput.value=String(width);
    document.getElementById('map-width-value').textContent=width+' px';
    if(save){try{localStorage.setItem('tour-r02-map-width-v72',String(width));}catch(_){}}
    if(map)requestAnimationFrame(()=>{map.invalidateSize({pan:false});if(position)map.setView(position,20,{animate:false});});
  }
  let storedWidth=160;try{storedWidth=localStorage.getItem('tour-r02-map-width-v72')||160;}catch(_){}
  resizeMap(storedWidth,false);
  widthInput.oninput=()=>resizeMap(widthInput.value);
  resizeButton.onclick=()=>{
    if(panel.classList.contains('expanded'))size(false);
    resizeTools.hidden=!resizeTools.hidden;
    resizeButton.setAttribute('aria-expanded',String(!resizeTools.hidden));
  };
  let initial=false;
  try {initial=localStorage.getItem('tour-r02-map-visible-v6')==='true';}catch (_) {}
  visibility(initial,false);
  let expanded=false;try{expanded=localStorage.getItem('tour-r02-map-expanded')==='true';}catch(_){}
  size(expanded,false);
  sizeButton.onclick=()=>size(!panel.classList.contains('expanded'));
  function init(data) {
    window.TourRoute?.init(data);
    nodes=data.nodes;
    if(!window.L){caption.textContent='O mapa não carregou. A caminhada continua disponível.';return;}
    try {
      map=L.map('mini-map',{zoomControl:false,attributionControl:true,maxZoom:20});
      map.attributionControl.setPrefix(false);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
        maxNativeZoom:19,maxZoom:20,attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',keepBuffer:0,updateWhenIdle:true
      }).on('tileerror',()=>{caption.textContent='Sem mapa de fundo. Os pontos e a posição continuam visíveis.';}).addTo(map);
      L.polyline(nodes.map(n=>[n.lat,n.lng]),{color:'#658875',weight:3,opacity:0.7,interactive:false}).addTo(map);
      nodes.forEach(node=>{
        const marker=L.circleMarker([node.lat,node.lng],{radius:4,color:'#fff',weight:1.5,fillColor:'#607d6b',fillOpacity:1}).addTo(map);
        marker.bindTooltip(node.title,{direction:'top'});
        markers.set(node.id,marker);
      });
      accuracyRing=L.circle([nodes[0].lat,nodes[0].lng],{radius:0,color:'#1c76dc',weight:1,fillOpacity:0.08,interactive:false});
      trail=L.polyline([],{color:'#1c76dc',weight:2,opacity:0.85,interactive:false}).addTo(map);
      walker=L.marker([nodes[0].lat,nodes[0].lng],{icon:L.divIcon({className:'walker-icon',html:'<span class="walker-arrow"></span><span class="walker-dot"></span>',iconSize:[28,28],iconAnchor:[14,14]}),interactive:false,zIndexOffset:1000});
      map.setView([nodes[0].lat,nodes[0].lng],20,{animate:false});
      new ResizeObserver(()=>map.invalidateSize({pan:false})).observe(document.getElementById('mini-map'));
      setActive(data.start);
      caption.textContent='Pontos: imagens da visita · azul: a tua posição';
    } catch (_) {caption.textContent='O mapa não carregou. A caminhada continua disponível.';}
  }
  function setActive(id) {
    window.TourRoute?.setActive(id);
    markers.forEach((marker,key)=>marker.setStyle({radius:key===id?7:4,fillColor:key===id?'#17674e':'#607d6b',color:key===id?'#f7cf52':'#fff',weight:key===id?3:1.5}));
    panel.dataset.activeNode=id;
  }
  function reset() {
    window.TourRoute?.reset();
    points=[];position=null;lastPosition=null;heading=0;
    if(map){trail.setLatLngs([]);map.removeLayer(walker);map.removeLayer(accuracyRing);if(!panel.hidden)map.setView([nodes[0].lat,nodes[0].lng],20,{animate:false});}
    delete panel.dataset.latitude;delete panel.dataset.longitude;
    caption.textContent='A aguardar a tua posição…';
  }
  function update(coords, accuracy, virtual) {
    window.TourRoute?.update(coords,accuracy,virtual);
    if(!map)return;
    const next=L.latLng(coords.lat,coords.lng);
    if(lastPosition && TourGeo.distance(lastPosition,coords)>0.7)heading=TourGeo.bearing(lastPosition,coords);
    if(!lastPosition || TourGeo.distance(lastPosition,coords)>0.4){points.push(next);if(points.length>600)points.shift();lastPosition={...coords};}
    position=next;
    panel.dataset.latitude=String(coords.lat);panel.dataset.longitude=String(coords.lng);
    walker.setLatLng(next).addTo(map);
    walker.getElement()?.style.setProperty('--heading',heading+'deg');
    trail.setLatLngs(points);
    accuracyRing.setLatLng(next).setRadius(Number.isFinite(accuracy)?Math.max(0,accuracy):0).addTo(map);
    walker.bringToFront?.();
    caption.textContent=virtual?'Azul: posição no teste · verde: imagem atual':'Azul: a tua posição · verde: imagem atual';
    if(!panel.hidden){map.setView(next,20,{animate:false});}
  }
  function pause(){window.TourRoute?.pause();if(position)caption.textContent='Última posição · caminhada parada';}
  window.TourMap={init,setActive,reset,update,pause};
})();
