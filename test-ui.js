'use strict';
const frame = document.getElementById('tour');
const statusBox = document.getElementById('status');
const scenario = document.getElementById('scenario');
const buttons = ['simulate', 'custom', 'gps', 'reset', 'route', 'follow'].map(id => document.getElementById(id));
let data, cases = [], revision = 0, watchId = null, routeTimer = null, preparationTimer = null, ready = false;
let lastError = '', permissionState = 'não disponível', diagnosticRevision = 0;
let preparationSummary='Ainda não realizada';
function status(text, friendly = text) {
  document.getElementById('technical-status').textContent = text;
  statusBox.textContent = friendly;
}
function activeTracking() {
  document.getElementById('follow').disabled=true;
  document.getElementById('follow').textContent='Caminhada em curso';
  document.getElementById('stop').disabled=false;
  document.getElementById('stop').hidden=false;
}
async function diagnostics() {
  const request = ++diagnosticRevision;
  try { permissionState = (await navigator.permissions.query({name:'geolocation'})).state; } catch (_) { permissionState = 'não disponível neste navegador'; }
  if (request !== diagnosticRevision) return;
  const policy = document.permissionsPolicy || document.featurePolicy;
  let allowed = 'não verificável';
  try { allowed = policy ? (policy.allowsFeature('geolocation') ? 'permitida' : 'bloqueada') : allowed; } catch (_) {}
  document.getElementById('diagnostics').textContent = `Versão: 6\nHTTPS: ${window.isSecureContext ? 'sim' : 'não'}\nAPI de localização: ${navigator.geolocation ? 'disponível' : 'indisponível'}\nPermissão reportada pelo navegador: ${permissionState}\nPolítica da página: ${allowed}\nPágina dentro de outra aplicação/frame: ${window.top !== window.self ? 'sim' : 'não'}\nÚltimo erro: ${lastError || 'nenhum'}\nNavegador: ${navigator.userAgent}`;
  document.getElementById('diagnostics').textContent+=`\nPreparação inicial: ${preparationSummary}`;
}
function stopTracking() {
  revision++;
  if (watchId !== null) navigator.geolocation.clearWatch(watchId);
  if (routeTimer !== null) clearInterval(routeTimer);
  if (preparationTimer !== null) clearInterval(preparationTimer);
  preparationTimer=null;
  document.getElementById('use-position').hidden=true;
  document.getElementById('use-position').onclick=null;
  watchId = null; routeTimer = null;
  window.TourMap?.pause();
  document.getElementById('stop').disabled = true;
  document.getElementById('stop').hidden = true;
  document.getElementById('follow').disabled=!ready;
  document.getElementById('follow').textContent='Começar caminhada';
}
function openNode(id) {
  const player = frame.contentWindow.pano;
  if (!player || !player.getNodeIds().includes(id)) throw new Error('O tour ainda está a carregar. Tenta novamente.');
  if (player.getCurrentNode() !== id) player.openNext('{' + id + '}', '');
  const node=data.nodes.find(n=>n.id===id);
  if (node) document.getElementById('current-label').textContent=node.title;
  window.TourMap?.setActive(id);
}
function usePosition(position, source, accuracy) {
  const best = TourGeo.nearest(position, data.nodes);
  const outside = best.meters > 100;
  openNode(outside ? data.start : best.node.id);
  window.TourMap?.reset();
  window.TourMap?.update(position,accuracy,source!=='Localização real');
  const coordText = `${position.lat.toFixed(7)}, ${position.lng.toFixed(7)}`;
  let message = `${source}: ${coordText}\nMais próximo: ${best.node.title} (${Math.round(best.meters)} m).\n`;
  message += outside ? 'Fora da área de teste. Tour aberto no ponto inicial.' : `Tour aberto em ${best.node.title}.`;
  if (accuracy !== undefined) message += `\nPrecisão indicada pelo aparelho: ±${Math.round(accuracy)} m.`;
  if (accuracy > 20) message += '\nA precisão pode ser insuficiente para distinguir panoramas vizinhos.';
  status(message, outside ? 'Esta posição fica fora do percurso. Podes explorar a visita pelas setas.' : `Estás em ${best.node.title}. Explora a imagem com o dedo.`);
}
document.getElementById('simulate').onclick = () => {
  stopTracking();
  try { usePosition(cases[Number(scenario.value)], 'Localização simulada'); } catch (e) { status(e.message); }
};
document.getElementById('custom').onclick = () => {
  stopTracking();
  try {
    const lat = document.getElementById('lat'), lng = document.getElementById('lng');
    if (!lat.value.trim() || !lng.value.trim()) throw new Error('Preenche a latitude e a longitude.');
    usePosition({ lat: Number(lat.value), lng: Number(lng.value) }, 'Coordenadas simuladas');
  } catch (e) { status(e.message); }
};
document.getElementById('reset').onclick = () => {
  stopTracking();
  try { window.TourMap?.reset(); openNode(data.start); status('Tour aberto no ponto inicial.','Estás na primeira imagem. Podes começar uma nova caminhada.'); } catch(e) { status(e.message); }
};
function gpsError(error, current) {
  if (current !== revision) return;
  lastError = `Código ${error.code}: ${error.message || '(sem mensagem do navegador)'}`;
  const retrying = watchId !== null && error.code !== 1;
  if (!retrying) stopTracking();
  const messages = {1:'O navegador bloqueou a localização (código 1). Isso também pode acontecer quando o acesso está bloqueado pelo sistema ou pela aplicação que abriu o link, mesmo com a permissão do site ativa.',2:'O navegador não conseguiu obter uma posição (código 2).',3:'Não chegou uma posição dentro do tempo de espera (código 3).'};
  if (!retrying) { try { openNode(data.start); } catch (_) {} }
  status((messages[error.code] || 'Não foi possível obter a localização.') + (retrying ? '\nO acompanhamento continua ativo, à espera de outra posição.' : '\nAbre “Diagnóstico de localização” e indica a permissão reportada e o último erro. Podes continuar com a caminhada simulada.'), error.code===1 ? 'Não conseguimos aceder à localização. Verifica a permissão no Safari ou Chrome e tenta novamente.' : retrying ? 'A localização está temporariamente indisponível. A caminhada continua ativa, à espera de sinal.' : 'Não foi possível obter a tua localização. Tenta novamente.');
  diagnostics();
}
function startGps(follow) {
  stopTracking();
  const current = revision;
  lastError = ''; diagnostics();
  if (!window.isSecureContext) return status('A localização real precisa de HTTPS.');
  if (!navigator.geolocation) return status('Este navegador não suporta geolocalização.');
  status(follow ? 'Acompanhamento iniciado. A aguardar a primeira posição do aparelho…' : 'A obter a localização real. Autoriza o acesso no navegador.','A procurar a tua localização. Permite o acesso se o navegador pedir.');
  const tracker = TourGeo.createTracker(data.nodes, data.start);
  const relative = document.getElementById('gps-mode').value === 'relative';
  const align = document.getElementById('align').checked;
  const first = data.nodes.find(n=>n.id===data.start);
  const next = data.nodes[data.nodes.indexOf(first)+1];
  let origin = null, rotation = align ? null : 0;
  let preparing=follow, directionDistance=8;
  const preparation=TourGpsStart.createPreparation();
  const continueButton=document.getElementById('use-position');
  function finishPreparation(result,manual=false) {
    if(current!==revision||!preparing)return;
    const chosen=manual?result.fallback:{...result.position,accuracy:result.accuracy};
    if(!chosen)return;
    preparationSummary=`${manual?'Escolha manual':'Estável'} · ${result.count} leituras · ${Math.round(result.elapsed/1000)} s · precisão do aparelho ±${Math.round(chosen.accuracy)} m`;
    preparing=false;clearInterval(preparationTimer);preparationTimer=null;continueButton.hidden=true;
    directionDistance=Math.max(8,Math.min(30,chosen.accuracy*2));
    document.getElementById('follow').textContent='Caminhada em curso';
    success({coords:{latitude:chosen.lat,longitude:chosen.lng,accuracy:chosen.accuracy},timestamp:Date.now()});
    diagnostics();
  }
  function reportPreparation(result) {
    if(current!==revision||!preparing)return;
    if(result.ready){finishPreparation(result);return;}
    continueButton.hidden=!result.fallback;
    const seconds=Math.ceil(Math.max(0,10000-result.elapsed)/1000);
    const accuracy=result.accuracy===null?'A aguardar sinal':`±${Math.round(result.accuracy)} m`;
    document.getElementById('gps-quality').textContent=`GPS: ${accuracy}`;
    status(`Preparação inicial · ${result.count}/5 leituras\nPrecisão do aparelho: ${accuracy}\nDispersão: ${Number.isFinite(result.spread)?result.spread.toFixed(1)+' m':'a aguardar'}\nTempo: ${Math.floor(result.elapsed/1000)} s.`,
      seconds>0?`A preparar a localização… Fica parado por cerca de ${seconds} segundos. GPS: ${accuracy}.`:
      result.fallback?'A posição ainda oscila. Podes aguardar ou começar com a melhor leitura recente.':
      'A preparar a localização… Fica parado enquanto confirmamos várias leituras estáveis.');
  }
  continueButton.onclick=()=>{const result=preparation.snapshot(Date.now());if(result.fallback)finishPreparation(result,true);else reportPreparation(result);};
  window.TourMap?.reset();
  const success = position => {
    if (current !== revision) return;
    try {
      if(preparing){reportPreparation(preparation.add(position));return;}
      document.getElementById('gps-quality').textContent=`GPS: ±${Math.round(position.coords.accuracy)} m`;
      const coords = {lat:position.coords.latitude, lng:position.coords.longitude};
      if (follow && relative) {
        const accuracy=position.coords.accuracy;
        if (!Number.isFinite(accuracy) || accuracy>20) {
          status(`Teste com GPS relativo\nPrecisão: ±${Math.round(accuracy)} m.\nPrecisão insuficiente (mais de 20 m). A aguardar uma posição melhor.`,'O sinal de localização ainda é pouco preciso. Aguarda um momento, de preferência ao ar livre.');
          return;
        }
        if (!origin) {
          origin={...coords}; openNode(first.id);
          trackedPosition(tracker,first,accuracy,'Teste com GPS relativo · origem guardada como P01');
          if (align) status(document.getElementById('technical-status').textContent+`\nCaminha cerca de ${Math.ceil(directionDistance)} m numa direção para alinhar P01 → P02.`,`Posição inicial preparada. Caminha cerca de ${Math.ceil(directionDistance)} metros em linha reta para definir a direção da visita.`);
          return;
        }
        const traveled=TourGeo.distance(origin,coords);
        if (rotation===null) {
          if (traveled<directionDistance) {
            window.TourMap?.update(TourGeo.destination(first,traveled,TourGeo.bearing(first,next)),accuracy,true);
            status(`Teste com GPS relativo · origem guardada como P01\nDeslocamento desde o início: ${traveled.toFixed(1)} m.\nA alinhar a direção: caminha até cerca de ${Math.ceil(directionDistance)} m numa direção.\nPrecisão: ±${Math.round(accuracy)} m.`,`Continua em linha reta para definir a direção. Faltam cerca de ${Math.ceil(directionDistance-traveled)} metros.`);return;
          }
          rotation=TourGeo.bearing(first,next)-TourGeo.bearing(origin,coords);
        }
        const virtual=TourGeo.relativePosition(origin,coords,first,rotation);
        trackedPosition(tracker,virtual,accuracy,'Teste com GPS relativo · direção alinhada');
        status(document.getElementById('technical-status').textContent+`\nDeslocamento desde o início: ${traveled.toFixed(1)} m.`,statusBox.textContent);
      } else if (follow) trackedPosition(tracker, coords, position.coords.accuracy, 'GPS em tempo real');
      else if (relative) {
        openNode(first.id);
        window.TourMap?.update(first,position.coords.accuracy,true);
        status(`GPS obtido. Precisão: ±${Math.round(position.coords.accuracy)} m.\nToca em “Começar caminhada” para guardar a tua posição como P01 e iniciar o teste aqui.`,'A tua localização está disponível. Toca em “Começar caminhada” para iniciar.');
      } else usePosition(coords, 'Localização real', position.coords.accuracy);
      diagnostics();
    } catch (e) { status(e.message); }
  };
  const options = {enableHighAccuracy:true,timeout:25000,maximumAge:0};
  if (follow) {
    watchId = navigator.geolocation.watchPosition(success, error => gpsError(error,current), options);
    activeTracking();
    if(preparing){document.getElementById('follow').textContent='A preparar localização…';reportPreparation(preparation.snapshot(Date.now()));preparationTimer=setInterval(()=>reportPreparation(preparation.snapshot(Date.now())),1000);}
  } else navigator.geolocation.getCurrentPosition(success, error => gpsError(error,current), options);
}
function trackedPosition(tracker, coords, accuracy, source) {
  const decision = tracker(coords, accuracy);
  if (decision.accepted) openNode(decision.id);
  if (decision.accepted) window.TourMap?.update(coords,accuracy,source!=='GPS em tempo real');
  const node = data.nodes.find(n => n.id === decision.id);
  let friendly=`Estás em ${node.title}. Continua a caminhar; as imagens mudam automaticamente.`;
  if (!decision.accepted) friendly='O sinal de localização ainda é pouco preciso. Aguarda um momento, de preferência ao ar livre.';
  else if (decision.best.meters>100) friendly='Estás fora do percurso da visita. Aproxima-te do local para acompanhar a caminhada, ou escolhe experimentar noutro local.';
  else if (decision.waiting) friendly='A confirmar a tua posição. Continua a caminhar.';
  status(`${source}\nMais próximo: ${decision.best.node.title} (${Math.round(decision.best.meters)} m).\nPrecisão: ±${Math.round(accuracy)} m.\n${decision.waiting || (decision.best.meters > 100 ? 'Fora da área. Tour no ponto inicial.' : 'Panorama: ' + node.title)}`,friendly);
}
document.getElementById('gps').onclick = () => startGps(false);
document.getElementById('follow').onclick = () => startGps(true);
function modeChanged() {
  stopTracking();
  window.TourMap?.reset();
  const relative=document.getElementById('gps-mode').value==='relative';
  document.getElementById('align-label').hidden=!relative;
  document.getElementById('relative-help').hidden=!relative;
  document.getElementById('mode-help').textContent=relative ? 'Vais começar na primeira imagem, onde quer que estejas. Os primeiros passos definem a direção da caminhada.' : 'A visita abre a imagem mais próxima de ti e acompanha o teu percurso. Podes começar em qualquer ponto do local.';
  status(relative ? 'Teste aqui: ao iniciar, a tua posição passa a ser P01.' : 'Modo no local real: o GPS é comparado com as coordenadas originais da tour.','Pronto. Toca em “Começar caminhada” e permite o acesso à localização.');
}
document.getElementById('gps-mode').onchange=modeChanged;
document.getElementById('align').onchange=modeChanged;
document.getElementById('stop').onclick = () => { stopTracking(); status('Acompanhamento / simulação parado. Podes navegar livremente.','Caminhada terminada. Podes continuar a explorar pelas setas ou começar de novo.'); };
document.getElementById('route').onclick = () => {
  stopTracking();
  window.TourMap?.reset();
  const tracker = TourGeo.createTracker(data.nodes, data.start);
  const path = [data.nodes[0]];
  for (let i=1;i<data.nodes.length;i++) {
    const a=data.nodes[i-1], b=data.nodes[i];
    for (let step=1;step<=4;step++) path.push({lat:a.lat+(b.lat-a.lat)*step/4,lng:a.lng+(b.lng-a.lng)*step/4});
  }
  path.push(data.nodes.at(-1));
  let step=0;
  const tick = () => {
    try {
      trackedPosition(tracker,path[step++],5,`Caminhada simulada · ${step}/${path.length}`);
      if (step === path.length) { stopTracking(); status(document.getElementById('technical-status').textContent + '\nCaminhada simulada concluída.','A caminhada simulada chegou ao fim. Podes explorar a imagem ou começar uma nova caminhada.'); }
    } catch (e) { stopTracking(); status(e.message); }
  };
  tick(); routeTimer=setInterval(tick,750);
  activeTracking();
};
window.addEventListener('pagehide',stopTracking);
async function init() {
  try {
    const response = await fetch('nodes.json');
    if (!response.ok) throw new Error('Não foi possível carregar os pontos do tour.');
    data = await response.json();
    window.TourMap?.init(data);
    scenario.replaceChildren();
    function add(label, position) {
      const option = document.createElement('option');
      option.textContent = label; option.value = cases.length;
      cases.push(position); scenario.append(option);
    }
    data.nodes.forEach(node => add('Junto de ' + node.title, { lat: node.lat + 0.000009, lng: node.lng }));
    const [a, b] = data.nodes;
    add(`Entre ${a.title} e ${b.title}`, { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 });
    add('Longe da tour (cerca de 5 km)', { lat: a.lat + 0.05, lng: a.lng });
    document.getElementById('lat').value = a.lat;
    document.getElementById('lng').value = a.lng;
    await new Promise((resolve, reject) => {
      const start = Date.now();
      const timer = setInterval(() => {
        try {
          if (frame.contentWindow.pano?.getNodeIds().includes(data.start)) { clearInterval(timer); resolve(); }
          else if (Date.now() - start > 60000) { clearInterval(timer); reject(new Error('O tour demorou a carregar. Recarrega a página e verifica a ligação.')); }
        } catch (e) { clearInterval(timer); reject(e); }
      }, 200);
    });
    ready=true;
    const player=frame.contentWindow.pano;
    const updateLabel=()=>{
      const node=data.nodes.find(n=>n.id===player.getCurrentNode());
      if(node) document.getElementById('current-label').textContent=node.title;
      if(node) window.TourMap?.setActive(node.id);
    };
    player.addListener('changenode',updateLabel);
    updateLabel();
    scenario.disabled = false; buttons.forEach(button => button.disabled = false);
    status(`${data.nodes.length} panoramas prontos. Usa “Simular caminhada pela tour” para testar as mudanças automáticas.`,'Pronto. Toca em “Começar caminhada” e permite o acesso à localização.');
  } catch (e) { status(e.message); }
}
init();
diagnostics();
