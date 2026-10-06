(function (root) {
  'use strict';
  function distance(a, b) {
    const rad = Math.PI / 180;
    const dlat = (b.lat - a.lat) * rad;
    const dlon = (b.lng - a.lng) * rad;
    const h = Math.sin(dlat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dlon / 2) ** 2;
    return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - Math.min(1, h)));
  }
  function nearest(position, nodes) {
    if (!Number.isFinite(position.lat) || !Number.isFinite(position.lng) || Math.abs(position.lat) > 90 || Math.abs(position.lng) > 180) throw new Error('Coordenadas inválidas.');
    if (!nodes.length) throw new Error('Não existem panoramas com coordenadas.');
    return nodes.reduce((best, node) => {
      const meters = distance(position, node);
      return !best || meters < best.meters ? { node, meters } : best;
    }, null);
  }
  function createTracker(nodes, start) {
    let current = start, initialized = false, pending = null, count = 0;
    return function (position, accuracy = 0) {
      const best = nearest(position, nodes);
      if (!Number.isFinite(accuracy) || accuracy > 20) {
        pending = null; count = 0;
        return { id: current, best, waiting: 'Precisão insuficiente (mais de 20 m). A aguardar uma posição melhor.', accepted: false };
      }
      const target = best.meters > 100 ? start : best.node.id;
      const currentNode = nodes.find(n => n.id === current);
      if (!initialized) { current = target; initialized = true; }
      else if (target !== current) {
        if (best.meters <= 100 && currentNode && distance(position, currentNode) - best.meters < 2) {
          pending = null; count = 0;
          return { id: current, best, waiting: 'Perto da fronteira entre pontos. A manter o panorama para evitar oscilações.', accepted: true };
        }
        if (pending === target) count++; else { pending = target; count = 1; }
        if (count >= 2) { current = target; pending = null; count = 0; }
        else return { id: current, best, waiting: 'A confirmar o próximo ponto com outra atualização de localização.', accepted: true };
      } else { pending = null; count = 0; }
      return { id: current, best, waiting: '', accepted: true };
    };
  }
  const api = { distance, nearest, createTracker };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TourGeo = api;
})(typeof window === 'undefined' ? globalThis : window);
