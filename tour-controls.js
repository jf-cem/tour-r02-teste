(function(){
  'use strict';
  const frame=document.getElementById('tour'),button=document.getElementById('motion-toggle'),message=document.getElementById('motion-message');
  let player,noticeTimer,pending=false,layoutQueued=false,observer;
  function notice(text){message.textContent=text;message.hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>message.hidden=true,7000);}
  function sync(){if(!player)return;const enabled=player.getUseGyro();button.textContent=enabled?'Movimento ✓':'Olhar à volta';button.setAttribute('aria-pressed',String(enabled));button.title=enabled?'Desativar o movimento do telemóvel':'Mover o telemóvel para olhar à volta';}
  button.onclick=async()=>{
    if(!player||pending)return;
    if(player.getUseGyro()){player.setUseGyro(false);sync();notice('Movimento desativado. Podes explorar a imagem com o dedo.');return;}
    if(!player.getGyroAvailable()){notice('Este dispositivo não disponibiliza o movimento. Podes explorar a imagem com o dedo.');return;}
    pending=true;button.disabled=true;
    try{
      // Request inside the viewer's same-origin window, during the button gesture.
      const event=frame.contentWindow.DeviceOrientationEvent;
      if(typeof event?.requestPermission==='function'){
        const permission=await event.requestPermission();
        if(permission!=='granted'){notice('O acesso ao movimento não foi permitido. Podes continuar a explorar com o dedo.');return;}
      }
      player.setUseGyro(true);
      notice('Move o telemóvel para olhar à volta. Toca novamente no botão para desativar.');
      sync();
    }catch(_){notice('Não foi possível ativar o movimento. Podes continuar a explorar com o dedo.');}
    finally{pending=false;button.disabled=false;}
  };
  function navigationElements(){
    const names=['cr_next','cl_previous','controller_next','controller_previous'];
    return [...frame.contentDocument.querySelectorAll('.ggskin')].filter(el=>names.includes(el.ggId?.trim()));
  }
  function layout(){
    layoutQueued=false;
    if(!player)return;
    const viewer=frame.getBoundingClientRect();
    const visible=navigationElements().filter(el=>{const rect=el.getBoundingClientRect(),style=frame.contentWindow.getComputedStyle(el);return style.visibility!=='hidden'&&style.display!=='none'&&rect.width>0&&rect.height>0&&rect.right>0&&rect.left<viewer.width&&rect.bottom>0&&rect.top<viewer.height;});
    const bar=document.getElementById('route-strip');
    const bottom=bar.getBoundingClientRect().bottom;
    const top=bottom-bar.getBoundingClientRect().height;
    const edges=visible.map(el=>el.getBoundingClientRect()).filter(r=>r.bottom+viewer.top>top-6&&r.top+viewer.top<bottom+6);
    const side=Math.max(48,...edges.map(r=>r.left<viewer.width/2?r.right+8:viewer.width-r.left+8));
    document.documentElement.style.setProperty('--route-side',side+'px');
    document.documentElement.style.setProperty('--map-bottom',(window.innerHeight-bar.getBoundingClientRect().top+10)+'px');
  }
  function queueLayout(){if(!layoutQueued){layoutQueued=true;requestAnimationFrame(layout);}}
  function init(pano){
    player=pano;button.disabled=false;sync();
    player.addListener('gyrochanged',sync);player.addListener('gyroavailable',sync);
    player.addListener('sizechanged',queueLayout);player.addListener('changenode',queueLayout);
    window.addEventListener('resize',queueLayout);window.visualViewport?.addEventListener('resize',queueLayout);
    observer=new MutationObserver(queueLayout);
    const ancestors=new Set();navigationElements().forEach(el=>{for(let current=el;current&&current!==frame.contentDocument.body;current=current.parentElement)ancestors.add(current);});
    ancestors.forEach(el=>observer.observe(el,{attributes:true,attributeFilter:['style','class']}));
    queueLayout();
  }
  window.addEventListener('pagehide',()=>{observer?.disconnect();clearTimeout(noticeTimer);});
  window.TourControls={init};
})();
