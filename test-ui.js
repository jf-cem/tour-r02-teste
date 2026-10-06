'use strict';
const frame = document.getElementById('tour');
const statusBox = document.getElementById('status');
const scenario = document.getElementById('scenario');
const buttons = ['simulate', 'custom', 'gps', 'reset'].map(id => document.getElementById(id));
let data, cases = [], revision = 0;
function status(text) { statusBox.textContent = text; }
function openNode(id) {
  const player = frame.contentWindow.pano;
  if (!player || !player.getNodeIds().includes(id)) throw new Error('O tour ainda está a carregar. Tenta novamente.');
  player.openNext('{' + id + '}', '');
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
  revision++;
  try { usePosition(cases[Number(scenario.value)], 'Localização simulada'); } catch (e) { status(e.message); }
};
document.getElementById('custom').onclick = () => {
  revision++;
  try {
    const lat = document.getElementById('lat'), lng = document.getElementById('lng');
    if (!lat.value.trim() || !lng.value.trim()) throw new Error('Preenche a latitude e a longitude.');
    usePosition({ lat: Number(lat.value), lng: Number(lng.value) }, 'Coordenadas simuladas');
  } catch (e) { status(e.message); }
};
document.getElementById('reset').onclick = () => {
  revision++;
  try { openNode(data.start); status('Tour aberto no ponto inicial.'); } catch(e) { status(e.message); }
};
document.getElementById('gps').onclick = () => {
  const current = ++revision;
  if (!window.isSecureContext) return status('A localização real precisa de HTTPS.');
  if (!navigator.geolocation) return status('Este navegador não suporta geolocalização.');
  status('A obter a localização real. Autoriza o acesso no navegador.');
  navigator.geolocation.getCurrentPosition(position => {
    if (current !== revision) return;
    try { usePosition({ lat: position.coords.latitude, lng: position.coords.longitude }, 'Localização real', position.coords.accuracy); } catch (e) { status(e.message); }
  }, error => {
    if (current !== revision) return;
    const messages = { 1: 'Acesso à localização recusado.', 2: 'Localização indisponível.', 3: 'Tempo de espera pela localização esgotado.' };
    try { openNode(data.start); } catch (_) {}
    status((messages[error.code] || 'Não foi possível obter a localização.') + ' Tour mantido no ponto inicial. Podes continuar com uma posição simulada.');
  }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
};
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
    status(`${data.nodes.length} panoramas prontos. Escolhe uma posição e toca em “Testar posição simulada”.`);
  } catch (e) { status(e.message); }
}
init();
