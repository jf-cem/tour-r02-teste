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
  const api = { distance, nearest };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TourGeo = api;
})(typeof window === 'undefined' ? globalThis : window);
