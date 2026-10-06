(function () {
  'use strict';
  const panel=document.getElementById('mini-map-panel');
  const checkbox=document.getElementById('show-map');
  const launch=document.getElementById('map-launch');
  const caption=document.getElementById('map-caption');
  let map, nodes=[], markers=new Map(), walker, accuracyRing, trail, position=null, points=[], following=true, lastPosition=null, heading=0;
  function visibility(show, save=true) {
    checkbox.checked=show; panel.hidden=!show; launch.hidden=show;
    document.body.classList.toggle('map-open',show);
    if(save) {try {localStorage.setItem('tour-r02-map-visible',String(show));}catch (_) {}}
    if(map && show) requestAnimationFrame(()=>{map.invalidateSize(); if(position && following) map.panTo(position,{animate:false});else if(!position)map.fitBounds(nodes.map(n=>[n.lat,n.lng]),{padding:[18,18],maxZoom:19});});
  }
  checkbox.onchange=()=>visibility(checkbox.checked);
  document.getElementById('map-close').onclick=()=>visibility(false);
  launch.onclick=()=>visibility(true);
  document.getElementById('map-center').onclick=()=>{
    following=true;
    if(!map)return;
    if(position)map.panTo(position,{animate:true,duration:0.35});
    else map.fitBounds(nodes.map(n=>[n.lat,n.lng]),{padding:[18,18],maxZoom:19});
    document.getElementById('map-center').textContent='A seguir';
    document.getElementById('map-center').setAttribute('aria-pressed','true');
  };
  let initial=true;
  try {initial=localStorage.getItem('tour-r02-map-visible')!=='false';}catch (_) {}
  visibility(initial,false);
  function init(data) {
    nodes=data.nodes;
    if(!window.L){caption.textContent='O mapa não carregou. A caminhada continua disponível.';return;}
    try {
      map=L.map('mini-map',{zoomControl:false,attributionControl:true,maxZoom:19});
      map.attributionControl.setPrefix(false);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
        maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',keepBuffer:0,updateWhenIdle:true
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
      map.fitBounds(nodes.map(n=>[n.lat,n.lng]),{padding:[18,18],maxZoom:19});
      map.on('dragstart',()=>{
        following=false;
        document.getElementById('map-center').textContent='Centrar';
        document.getElementById('map-center').setAttribute('aria-pressed','false');
      });
      new ResizeObserver(()=>map.invalidateSize({pan:false})).observe(document.getElementById('mini-map'));
      setActive(data.start);
      caption.textContent='Pontos: imagens da visita · azul: a tua posição';
    } catch (_) {caption.textContent='O mapa não carregou. A caminhada continua disponível.';}
  }
  function setActive(id) {
    markers.forEach((marker,key)=>marker.setStyle({radius:key===id?7:4,fillColor:key===id?'#17674e':'#607d6b',color:key===id?'#f7cf52':'#fff',weight:key===id?3:1.5}));
    panel.dataset.activeNode=id;
  }
  function reset() {
    points=[];position=null;lastPosition=null;heading=0;following=true;
    if(map){trail.setLatLngs([]);map.removeLayer(walker);map.removeLayer(accuracyRing);if(!panel.hidden)map.fitBounds(nodes.map(n=>[n.lat,n.lng]),{padding:[18,18],maxZoom:19,animate:false});}
    delete panel.dataset.latitude;delete panel.dataset.longitude;
    caption.textContent='A aguardar a tua posição…';
    document.getElementById('map-center').textContent='A seguir';
    document.getElementById('map-center').setAttribute('aria-pressed','true');
  }
  function update(coords, accuracy, virtual) {
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
    if(following && !panel.hidden && !map.getBounds().pad(-0.3).contains(next))map.panTo(next,{animate:true,duration:0.35});
  }
  function pause(){if(position)caption.textContent='Última posição · caminhada parada';}
  window.TourMap={init,setActive,reset,update,pause};
})();
