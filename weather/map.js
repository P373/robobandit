'use strict';

// Map of where each piece of data on the page comes from.

const SOURCES = [
  { id: 'home', lat: CONFIG.lat, lon: CONFIG.lon, color: '#d33', label: 'M', name: 'Megansett Harbor',
    what: 'NWS weather forecast (2.5 km grid square shown) · sun & moon times' },
  { id: 'tide', lat: 41.605, lon: -70.6517, color: '#2b7fb8', label: 'T', name: 'Chappaquoit Point, West Falmouth',
    what: 'Tide predictions (NOAA 8447685)', url: 'https://tidesandcurrents.noaa.gov/stationhome.html?id=8447685' },
  { id: 'wh', lat: 41.5236, lon: -70.6711, color: '#7b4fc9', label: 'W', name: 'Woods Hole',
    what: 'Water temperature & observed water level (NOAA 8447930)', url: 'https://tidesandcurrents.noaa.gov/stationhome.html?id=8447930' },
  { id: 'buoy', lat: 41.397, lon: -71.033, color: '#2f8f6f', label: 'B', name: 'Buzzards Bay tower',
    what: 'Live wind & gusts (NOAA BUZM3), at the mouth of the bay', url: 'https://www.ndbc.noaa.gov/station_page.php?station=buzm3' },
  { id: 'canal', lat: 41.74268, lon: -70.61418, color: '#b5651d', label: 'C', name: 'Cape Cod Canal · Railroad Bridge',
    what: 'Current predictions (NOAA COD0904)', url: 'https://tidesandcurrents.noaa.gov/noaacurrents/predictions?id=COD0904_15' },
  { id: 'strait', lat: 41.51929, lon: -70.68289, color: '#b5651d', label: 'C', name: 'Woods Hole · The Strait',
    what: 'Current predictions (NOAA COD0911)', url: 'https://tidesandcurrents.noaa.gov/noaacurrents/predictions?id=COD0911_1' },
];

function milesFromHome(s) {
  const R = 3958.8, rad = Math.PI / 180;
  const dLat = (s.lat - CONFIG.lat) * rad, dLon = (s.lon - CONFIG.lon) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(CONFIG.lat * rad) * Math.cos(s.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

let sourceMap = null;

function renderSourceMap(cellGeometry) {
  const el = document.getElementById('source-map');
  if (!el || typeof L === 'undefined') return;

  if (!sourceMap) {
    sourceMap = L.map(el, { scrollWheelZoom: false });
    // Public US-government basemaps: no API key, and allowed to be embedded.
    // (OpenStreetMap's own tile servers block sites like this; CARTO now requires a key.)
    const usgs = (service) => L.tileLayer(`https://basemap.nationalmap.gov/arcgis/rest/services/${service}/MapServer/tile/{z}/{y}/{x}`, {
      maxZoom: 16,
      attribution: '<a href="https://www.usgs.gov/programs/national-geospatial-program/national-map">USGS The National Map</a>',
    });
    const layers = {
      'Nautical chart': L.tileLayer.wms('https://gis.charttools.noaa.gov/arcgis/rest/services/MCS/NOAAChartDisplay/MapServer/exts/MaritimeChartService/WMSServer', {
        layers: '0,1,2,3,4,5,6,7', format: 'image/png', version: '1.3.0', tileSize: 512, maxZoom: 17,
        attribution: '<a href="https://nauticalcharts.noaa.gov/">NOAA nautical charts</a> · not for navigation',
      }),
      Map: usgs('USGSTopo'),
      Satellite: usgs('USGSImageryOnly'),
    };
    layers['Nautical chart'].addTo(sourceMap);
    L.control.layers(layers, null, { collapsed: false }).addTo(sourceMap);

    for (const s of SOURCES) {
      const icon = L.divIcon({
        className: 'pin',
        html: `<span style="background:${s.color}">${s.label}</span>`,
        iconSize: [26, 26], iconAnchor: [13, 13], popupAnchor: [0, -12],
      });
      L.marker([s.lat, s.lon], { icon, title: s.name }).addTo(sourceMap)
        .bindPopup(`<b>${esc(s.name)}</b><br>${esc(s.what)}${s.url ? `<br><a href="${s.url}" target="_blank" rel="noopener">NOAA station page</a>` : ''}`);
    }
    sourceMap.fitBounds(SOURCES.map((s) => [s.lat, s.lon]), { padding: [30, 30] });
    loadZoneOutline();

    document.getElementById('source-list').innerHTML = SOURCES.map((s) => `<li>
      <span class="pin-dot" style="background:${s.color}">${s.label}</span>
      <div><b>${s.url ? `<a href="${s.url}" target="_blank" rel="noopener">${esc(s.name)}</a>` : esc(s.name)}</b>
      ${s.id === 'home' ? '' : `<span class="muted"> · ${milesFromHome(s).toFixed(1)} mi away</span>`}
      <div class="muted">${esc(s.what)}</div></div></li>`).join('') +
      `<li><span class="pin-dot zone"></span><div><b>Buzzards Bay marine zone (ANZ234)</b><div class="muted">Area covered by the NWS marine forecast</div></div></li>`;
  }

  if (cellGeometry && !sourceMap._cellLayer) {
    sourceMap._cellLayer = L.geoJSON(cellGeometry, { style: { color: '#d33', weight: 2, fillOpacity: 0.15 } })
      .bindTooltip('NWS forecast grid square').addTo(sourceMap);
  }
}

// The zone outline is large (~110 KB), so cache it; it essentially never changes.
async function loadZoneOutline() {
  const key = `cv:zone:${CONFIG.marineZone}`;
  let geometry = null;
  try { geometry = JSON.parse(localStorage.getItem(key)); } catch { /* ignore */ }
  if (!geometry) {
    try {
      geometry = (await getJSON(`https://api.weather.gov/zones/forecast/${CONFIG.marineZone}`)).geometry;
      try { localStorage.setItem(key, JSON.stringify(geometry)); } catch { /* storage full */ }
    } catch (err) {
      console.error('zone outline', err);
      return;
    }
  }
  // Orange diagonal hatching: stands out from the chart's blue water without muddying it.
  const zone = L.geoJSON(geometry, { style: { color: '#e8590c', weight: 3, fillColor: 'url(#zone-hatch)', fillOpacity: 1 } })
    .bindTooltip('Buzzards Bay marine forecast zone (ANZ234)', { sticky: true })
    .addTo(sourceMap).bringToBack();
  const svg = sourceMap.getRenderer(zone.getLayers()[0])._container;
  if (svg && !svg.querySelector('#zone-hatch')) {
    svg.insertAdjacentHTML('afterbegin', `<defs><pattern id="zone-hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="3" height="9" fill="#e8590c" fill-opacity="0.45"/></pattern></defs>`);
  }
}
