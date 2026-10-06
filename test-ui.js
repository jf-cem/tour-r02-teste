'use strict';
const frame = document.getElementById('tour');
const statusBox = document.getElementById('status');
const scenario = document.getElementById('scenario');
const buttons = ['simulate', 'custom', 'gps', 'reset', 'route', 'follow'].map(id => document.getElementById(id));
let data, cases = [], revision = 0, watchId = null, routeTimer = null;
let lastError = '', permissionState = 'não disponível', diagnosticRevision = 0;
function status(text) { statusBox.textContent = text; }
async function diagnostics() {
  const request = ++diagnosticRevision;
  try { permissionState = (await navigator.permissions.query({name:'geolocation'})).state; } catch (_) { permissionState = 'não disponível neste navegador'; }
  if (request !== diagnosticRevision) return;
  const policy = document.permissionsPolicy || document.featurePolicy;
  let allowed = 'não verificável';
  try { allowed = policy ? (policy.allowsFeature('geolocation') ? 'permitida' : 'bloqueada') : allowed; } catch (_) {}
  document.getElementById('diagnostics').textContent = `Versão: 2\nHTTPS: ${window.isSecureContext ? 'sim' : 'não'}\nAPI de localização: ${navigator.geolocation ? 'disponível' : 'indisponível'}\nPermissão reportada pelo navegador: ${permissionState}\nPolítica da página: ${allowed}\nPágina dentro de outra aplicação/frame: ${window.top !== window.self ? 'sim' : 'não'}\nÚltimo erro: ${lastError || 'nenhum'}\nNavegador: ${navigator.userAgent}`;
}
function stopTracking() {
  revision++;
  if (watchId !== null) navigator.geolocation.clearWatch(watchId);
  if (routeTimer !== null) clearInterval(routeTimer);
  watchId = null; routeTimer = null;
  document.getElementById('stop').disabled = true;
}
function openNode(id) {
  const player = frame.contentWindow.pano;
  if (!player || !player.getNodeIds().includes(id)) throw new Error('O tour ainda está a carregar. Tenta novamente.');
  if (player.getCurrentNode() !== id) player.openNext('{' + id + '}', '');
}
function usePosition(position, source, accuracy) {
  const best = TourGeo.nearest(position, data.nodes);
  const outside = best.meters > 100;
  openNode(outside ? data.start : best.node.id);
  const coordText = `${position.lat.toFixed(7)}, ${position.lng.toFixed(7)}`;
  let message = `${source}: ${coordText}\nMais próximo: ${best.node.title} (${Math.round(best.meters)} m).\n`;
  message += outside ? 'Fora da área de teste. Tour aberto no ponto inicial.' : `Tour aberto em ${best.node.title}.`;
  if (accuracy !== undefined) message += `\nPrecisão indicada pelo aparelho: ±${Math.round(accuracy)} m.`;
  if (accuracy > 20) message += '\nA precisão pode ser insuficiente para distinguir panoramas vizinhos.';
  status(message);
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
  try { openNode(data.start); status('Tour aberto no ponto inicial.'); } catch(e) { status(e.message); }
};
function gpsError(error, current) {
  if (current !== revision) return;
  lastError = `Código ${error.code}: ${error.message || '(sem mensagem do navegador)'}`;
  const retrying = watchId !== null && error.code !== 1;
  if (!retrying) stopTracking();
  const messages = {1:'O navegador bloqueou a localização (código 1). Isso também pode acontecer quando o acesso está bloqueado pelo sistema ou pela aplicação que abriu o link, mesmo com a permissão do site ativa.',2:'O navegador não conseguiu obter uma posição (código 2).',3:'Não chegou uma posição dentro do tempo de espera (código 3).'};
  if (!retrying) { try { openNode(data.start); } catch (_) {} }
  status((messages[error.code] || 'Não foi possível obter a localização.') + (retrying ? '\nO acompanhamento continua ativo, à espera de outra posição.' : '\nAbre “Diagnóstico de localização” e indica a permissão reportada e o último erro. Podes continuar com a caminhada simulada.'));
  diagnostics();
}
function startGps(follow) {
  stopTracking();
  const current = revision;
  lastError = ''; diagnostics();
  if (!window.isSecureContext) return status('A localização real precisa de HTTPS.');
  if (!navigator.geolocation) return status('Este navegador não suporta geolocalização.');
  status(follow ? 'Acompanhamento iniciado. A aguardar a primeira posição do aparelho…' : 'A obter a localização real. Autoriza o acesso no navegador.');
  const tracker = TourGeo.createTracker(data.nodes, data.start);
  const success = position => {
    if (current !== revision) return;
    try {
      const coords = {lat:position.coords.latitude, lng:position.coords.longitude};
      if (follow) trackedPosition(tracker, coords, position.coords.accuracy, 'GPS em tempo real');
      else usePosition(coords, 'Localização real', position.coords.accuracy);
      diagnostics();
    } catch (e) { status(e.message); }
  };
  const options = {enableHighAccuracy:true,timeout:25000,maximumAge:0};
  if (follow) {
    watchId = navigator.geolocation.watchPosition(success, error => gpsError(error,current), options);
    document.getElementById('stop').disabled = false;
  } else navigator.geolocation.getCurrentPosition(success, error => gpsError(error,current), options);
}
function trackedPosition(tracker, coords, accuracy, source) {
  const decision = tracker(coords, accuracy);
  if (decision.accepted) openNode(decision.id);
  const node = data.nodes.find(n => n.id === decision.id);
  status(`${source}\nMais próximo: ${decision.best.node.title} (${Math.round(decision.best.meters)} m).\nPrecisão: ±${Math.round(accuracy)} m.\n${decision.waiting || (decision.best.meters > 100 ? 'Fora da área. Tour no ponto inicial.' : 'Panorama: ' + node.title)}`);
}
document.getElementById('gps').onclick = () => startGps(false);
document.getElementById('follow').onclick = () => startGps(true);
document.getElementById('stop').onclick = () => { stopTracking(); status('Acompanhamento / simulação parado. Podes navegar livremente.'); };
document.getElementById('route').onclick = () => {
  stopTracking();
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
      if (step === path.length) { stopTracking(); status(statusBox.textContent + '\nCaminhada simulada concluída.'); }
    } catch (e) { stopTracking(); status(e.message); }
  };
  tick(); routeTimer=setInterval(tick,750);
  document.getElementById('stop').disabled=false;
};
window.addEventListener('pagehide',stopTracking);
async function init() {
  try {
    const response = await fetch('nodes.json');
    if (!response.ok) throw new Error('Não foi possível carregar os pontos do tour.');
    data = await response.json();
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
    scenario.disabled = false; buttons.forEach(button => button.disabled = false);
    status(`${data.nodes.length} panoramas prontos. Usa “Simular caminhada pela tour” para testar as mudanças automáticas.`);
  } catch (e) { status(e.message); }
}
init();
diagnostics();
