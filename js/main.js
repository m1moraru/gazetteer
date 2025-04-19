let map, currentBorderLayer;
let poiLayers = {};
let markerClusters = {};

const poiMarkerStyles = {
  airport: { icon: 'fa-plane', markerColor: 'blue' },
  university: { icon: 'fa-graduation-cap', markerColor: 'cyan' },
  stadium: { icon: 'fa-futbol', markerColor: 'green' },
  museum: { icon: 'fa-landmark', markerColor: 'purple' },
  city: { icon: 'fa-city', markerColor: 'blue' },
  beach: { icon: 'fa-umbrella-beach', markerColor: 'orange' },
  temple: { icon: 'fa-place-of-worship', markerColor: 'red' },
  church: { icon: 'fa-church', markerColor: 'red' },
  mosque: { icon: 'fa-mosque', markerColor: 'red' },
  mountain: { icon: 'fa-mountain', markerColor: 'darkred' },
  forest: { icon: 'fa-tree', markerColor: 'darkgreen' },
  lake: { icon: 'fa-water', markerColor: 'blue' },
  river: { icon: 'fa-water', markerColor: 'cyan' },
  bridge: { icon: 'fa-bridge', markerColor: 'black' },
  road: { icon: 'fa-road', markerColor: 'black' },
  tourist: { icon: 'fa-binoculars', markerColor: 'pink' },
  default: { icon: 'fa-map-marker-alt', markerColor: 'blue-dark' }
};

$(document).ready(function () {

  const streets = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", {
    attribution: "Tiles &copy; Esri"
  });
  const satellite = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
    attribution: "Tiles &copy; Esri"
  });

  map = L.map("map", {
    layers: [streets],
    zoomControl: false,
    attributionControl: true
  });

  map._streetsLayer = streets;
  map._satelliteLayer = satellite;


  let zoomControl = L.control.zoom({ position: 'bottomright' }).addTo(map);

  function updateZoomControlPosition() {
    map.removeControl(zoomControl); 

    const position = window.innerWidth <= 768 ? 'bottomright' : 'topright';
    zoomControl = L.control.zoom({ position }).addTo(map); 
  }

  updateZoomControlPosition();
  window.addEventListener('resize', updateZoomControlPosition);

  ['Airports', 'Cities', 'Universities', 'Stadiums', 'Museums', 'Monuments', 'Default'].forEach(key => {
    markerClusters[key] = L.markerClusterGroup({
      disableClusteringAtZoom: 18,
      iconCreateFunction: function (cluster) {
        const count = cluster.getChildCount();
        let size = 'small';
        if (count >= 50) size = 'large';
        else if (count >= 20) size = 'medium';

        return L.divIcon({
          html: `<div class="cluster-icon ${size}">${count}</div>`,
          className: 'custom-cluster',
          iconSize: L.point(40, 40)
        });
      }
    });
    poiLayers[key] = markerClusters[key];
  });

  addLeftPanelButtons();
  loadCountrySelector();
  enableMobileLocation();

  $('#countrySelect').on('change', function () {
    const code = $(this).val();

    if (currentBorderLayer) map.removeLayer(currentBorderLayer);

    $.getJSON(`php/getBorder.php?code=${code}`, border => {
      currentBorderLayer = L.geoJSON(border, {
        style: { color: '#f03', weight: 2, fillOpacity: 0 }
      });

      const { north, south, east, west } = border.bbox;
      const bounds = currentBorderLayer.getBounds();

      if (!map._mobileLocated || map._userManuallySelectedCountry) {
        currentBorderLayer.addTo(map);
        map.fitBounds(bounds);
      }

      $.getJSON(`php/getCountryDetailsByCode.php?code=${code}`, data => {
        fillInfoModal(data);
        fillWeatherModal(data);
        fillCurrencyModal(data);
        loadPOIs(data, { north, south, east, west }, code);
      });
    });
  });

  $('#countrySelect').on('mousedown', function () {
    map._userManuallySelectedCountry = true;
  });

  $('#exampleModal, #newsModal, #currencyModal, #weatherModal').on('hidden.bs.modal', function () {
    $(this).find(':focus').blur();
  });
});

function enableMobileLocation() {
  function onLocationFound(e) {
    const radius = e.accuracy;
    map._mobileLocated = true;
    map.setView(e.latlng, 16);

    L.marker(e.latlng, {
      icon: L.icon({
        iconUrl: 'img/icons/marker-icon.png',
        iconRetinaUrl: 'img/icons/marker-icon-2x.png',
        shadowUrl: 'img/icons/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      })
    }).addTo(map).bindPopup("You are within " + radius.toFixed(0) + " meters from this point").openPopup();

    L.circle(e.latlng, radius).addTo(map);

    $.getJSON(`php/getCountryData.php?lat=${e.latlng.lat}&lng=${e.latlng.lng}`, data => {
      $('#countrySelect').val(data.code).trigger('change');
    });
  }

  function onLocationError(e) {
    alert(e.message);
    map.fitWorld();
  }

  map.on('locationfound', onLocationFound);
  map.on('locationerror', onLocationError);
  map.locate({ setView: false });
}

function addLeftPanelButtons() {
  const buttons = [
    ['fa-info', () => $('#exampleModal').modal('show'), 'Country Info'],
    ['fa-cloud', () => $('#weatherModal').modal('show'), 'Weather'],
    ['fa-dollar-sign', () => $('#currencyModal').modal('show'), 'Currency'],
    ['fa-book-open', () => {
      const link = $('#infoTable a[href*="wikipedia"]').attr('href');
      if (link) window.open(link, '_blank');
    }, 'Wikipedia'],
    ['fa-newspaper', () => {
      const code = $('#countrySelect').val();
      if (!code) return;
      $.getJSON(`php/getNews.php?country=${code}`, response => {
        const articles = Array.isArray(response.results) ? response.results : [];
        $('#newsBody').html(
          articles.length === 0 ? '<p class="text-muted">No news available.</p>' :
            articles.map(article => `
              <div class="border-bottom pb-2 mb-2">
                <strong>${article.title}</strong><br>
                <small class="text-muted">${new Date(article.pubDate).toLocaleString()}</small>
                <div><a href="${article.link}" target="_blank">Read More...</a></div>
              </div>`).join('')
        );
        $('#newsModal').modal('show');
      });
    }, 'News'],
    ['fa-globe', toggleBasemap, 'Toggle Basemap'],
    ['fa-plane', () => togglePOILayer('Airports'), 'Airports'],
    ['fa-city', () => togglePOILayer('Cities'), 'Cities'],
    ['fa-graduation-cap', () => togglePOILayer('Universities'), 'Universities'],
    ['fa-futbol', () => togglePOILayer('Stadiums'), 'Stadiums'],
    ['fa-landmark', () => togglePOILayer('Museums'), 'Museums'],
    ['fa-map-marker-alt', () => togglePOILayer('Default'), 'Misc']
  ];

  const colorMap = {
    'Country Info': '#198754',
    'Weather': '#dc3545',
    'Currency': '#212529',
    'Wikipedia': '#0d6efd',
    'News': '#dc3545',
    'Airports': '#007bff',
    'Universities': '#17cfcf',
    'Stadiums': '#28a745',
    'Museums': '#6f42c1',
    'Monuments': '#fd7e14',
    'Cities': '#004080',
    'Toggle Basemap': '#6f42c1',
    'Misc': '#495057'
  };

  buttons.forEach(([icon, action, title]) => {
    const button = L.easyButton({
      states: [{
        stateName: 'default',
        icon: `fa ${icon}`,
        title,
        onClick: function (btn, map) {
          const isToggle = /Airports|Cities|Universities|Stadiums|Museums|Monuments|Default|Toggle Basemap/.test(title);
          const baseColor = colorMap[title] || '#ff7f50';
          const isActive = isToggle ? btn.button.classList.toggle('active-button') : false;

          if (isToggle) {
            if (isActive) {
              btn.button.style.backgroundColor = 'black';
              btn.button.style.color = 'white';
              btn.button.style.boxShadow = 'none';
            } else {
              btn.button.style.backgroundColor = baseColor;
              btn.button.style.color = 'white';
              btn.button.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 1)';
            }
          }

          action(btn, map);
        }
      }],
      position: title === 'Toggle Basemap' ? 'bottomright' : 'topleft'
    });

    const baseColor = colorMap[title] || '#ff7f50';
    button.button.style.height = `35px`;
    button.button.style.width = `35px`;
    button.button.style.fontSize = '1.1rem';
    button.button.style.marginLeft = '10px';
    button.button.style.backgroundColor = baseColor;
    button.button.style.boxShadow = '0 2px 6px rgba(0,0,0,0.4)';
    button.button.style.marginBottom = '2px';
    button.button.style.color = 'white';
    button.button.style.transition = 'all 0.3s ease';
    button.button.id = `btn-${title.toLowerCase().replace(/\s+/g, '-')}`;

    if (title === 'Toggle Basemap') {
      button.button.style.marginBottom = '20px';
      button.button.style.marginRight = '10px';
    }
    

    button.button.onmouseenter = () => {
      if (!button.button.classList.contains('active-button')) {
        button.button.style.backgroundColor = 'white';
        button.button.style.color = baseColor;
        button.button.style.boxShadow = 'inset 0 0 3px rgba(0,0,0,0.1)';
      }
    };

    button.button.onmouseleave = () => {
      if (!button.button.classList.contains('active-button')) {
        button.button.style.backgroundColor = baseColor;
        button.button.style.color = 'white';
        button.button.style.boxShadow = '0 2px 6px rgba(0,0,0,0.4)';
      }
    };

    map.addControl(button);
  });

  const container = document.querySelector('.easy-button-container');
  if (container) container.style.marginTop = '80px';
}

function toggleBasemap() {
  if (map.hasLayer(map._streetsLayer)) {
    map.removeLayer(map._streetsLayer);
    map._satelliteLayer.addTo(map);
  } else {
    map.removeLayer(map._satelliteLayer);
    map._streetsLayer.addTo(map);
  }
}

function togglePOILayer(key) {
  const layer = poiLayers[key];
  if (layer instanceof L.Layer) {
    if (map.hasLayer(layer)) {
      map.removeLayer(layer);
    } else {
      map.addLayer(layer);
    }
  }
}

function loadCountrySelector() {
  $.getJSON('php/getCountries.php', countries => {
    const $select = $('#countrySelect');
    $select.html('<option selected disabled>Choose</option>');
    countries.forEach(c => $select.append(`<option value="${c.iso_a2}">${c.name}</option>`));
  });
}

function loadPOIs(data, bbox, code) {
  Object.values(markerClusters).forEach(group => group.clearLayers());

  const { north, south, east, west } = bbox;
  const username = 'mariusmoraru';

  $.getJSON(`https://secure.geonames.org/wikipediaBoundingBoxJSON?north=${north}&south=${south}&east=${east}&west=${west}&username=${username}&maxRows=1000`, res => {

    const pois = (res.geonames || []).filter(p => p.countryCode === code);

    pois.forEach(poi => {
      const title = (poi.title || '').toLowerCase();
      const summary = (poi.summary || '').toLowerCase();
      const combined = `${title} ${summary}`;

      let type = 'default';

      const stadiumRegex = /\b(stadium|arena|field|pitch|coliseum|court|track|ballpark|sports|olympic|stadion|athletic|gymnasium|sports centre|sports center)\b/i;
      
      if (stadiumRegex.test(combined)) type = 'stadium';
      else if (/airport|intl|airfield|aerodrome/i.test(combined)) type = 'airport';
      else if (/university|college|academy|institute/i.test(combined)) type = 'university';
      else if (/museum/i.test(combined)) type = 'museum';
      else if (/capital|city|metropolis|town/i.test(combined)) type = 'city';
      else if (/beach|seaside|coast|shore/i.test(combined)) type = 'beach';
      else if (/temple|shrine/i.test(combined)) type = 'temple';
      else if (/church|cathedral/i.test(combined)) type = 'church';
      else if (/mosque/i.test(combined)) type = 'mosque';
      else if (/mountain|peak|summit/i.test(combined)) type = 'mountain';
      else if (/forest|jungle|woodland/i.test(combined)) type = 'forest';
      else if (/lake/i.test(combined)) type = 'lake';
      else if (/river|stream/i.test(combined)) type = 'river';
      else if (/bridge/i.test(combined)) type = 'bridge';
      else if (/highway|expressway|motorway/i.test(combined)) type = 'road';
      else if (/road|route|street/i.test(combined)) type = 'road';
      else if (/tourist|attraction|sightseeing|viewpoint|destination/i.test(combined)) type = 'tourist';      


      const icon = getCustomIcon(type);

      const marker = L.marker([poi.lat, poi.lng], { icon });

      marker.on('click', () => {
        $('#poiModalTitle').text(poi.title);

        const imageUrl = poi.thumbnailImg || '';

        $('#poiModalBody').html(`
          ${imageUrl ? `
            <div class="text-center mb-3">
              <img src="${imageUrl}" alt="${poi.title}" class="img-fluid rounded shadow-sm" style="max-height: 250px; object-fit: cover;" />
            </div>` : ''
          }
          <p>${poi.summary || 'No description available.'}</p>
          <p><a href="https://${poi.wikipediaUrl}" target="_blank">Read more on Wikipedia</a></p>
        `);
      
        $('#poiModal').modal('show');
      });



      let layerKey = 'Default'; 

      if (type === 'airport') layerKey = 'Airports';
      else if (type === 'university') layerKey = 'Universities';
      else if (type === 'stadium') layerKey = 'Stadiums';
      else if (type === 'museum') layerKey = 'Museums';
      else if (type === 'city') layerKey = 'Cities';
      else layerKey = 'Default'; 


      if (markerClusters[layerKey]) {
        markerClusters[layerKey].addLayer(marker);
      }
    });

    Object.entries(markerClusters).forEach(([key, clusterGroup]) => {
      const btn = document.getElementById(`btn-${key.toLowerCase()}`);
      if (clusterGroup instanceof L.Layer) {
        if (btn && btn.classList.contains('active-button')) {
          map.addLayer(clusterGroup);
        } else {
          map.removeLayer(clusterGroup);
        }
      }
    });
  });
}


function fillInfoModal(data) {
  $('#countryFlag').attr('src', data.flag || '');
  const rows = [
    ['fa-street-view', 'Country', data.country],
    ['fa-landmark', 'Capital', data.capital],
    ['fa-clock', 'Timezone', data.timezone],
    ['fa-people-group', 'Population', data.population.toLocaleString()],
    ['fa-money-bill', 'Currency', `${data.currency} (${data.currency_symbol})`],
    ['fa-chart-line', 'Exchange Rate (to USD)', data.exchange_rate],
    ['fa-cloud-sun', 'Weather', `${data.weather.desc}, ${data.weather.temp}°C`],
    ['fa-book-open', 'Wikipedia', `<a href="${data.wikipedia}" target="_blank">Link</a>`]
  ];
  $('#infoTable').html(rows.map(([icon, label, val]) => `
    <tr>
      <td class="text-center"><i class="fa-solid ${icon} fa-xl text-success"></i></td>
      <td>${label}</td>
      <td class="text-end">${val}</td>
    </tr>`).join(''));
}

function fillWeatherModal(data) {
  const forecasts = (data.forecast || []).map(segment => `
    <div class="text-center">
      <p><strong>${new Date(segment.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></p>
      <img src="https://openweathermap.org/img/wn/${segment.icon}@2x.png" alt="${segment.desc}" />
      <p>${segment.temp}°C</p>
      <p>${segment.desc}</p>
    </div>`).join('');

  $('#weatherBody').html(`
    <div class="text-center mb-2">
      <h4>${data.capital}, ${data.country}</h4>
      <h1>${data.weather.temp}°C</h1>
      <p>${data.weather.desc}</p>
      <p><strong>Humidity:</strong> ${data.weather.humidity || 'N/A'}% | <strong>Wind:</strong> ${data.weather.wind || 'N/A'} mph</p>
    </div>
    <div class="d-flex justify-content-around">${forecasts}</div>`);
}

function fillCurrencyModal(data) {
  $('#amountInput').val('');
  $('#converted').text('0');
  $('#amountInput').off('input').on('input', function () {
    const val = parseFloat(this.value);
    $('#converted').text(!isNaN(val) ? (val * data.exchange_rate).toFixed(2) : '0');
  });
}

function getCustomIcon(type) {
  const style = poiMarkerStyles[type] || poiMarkerStyles.default;
  return L.ExtraMarkers.icon({
    icon: style.icon,
    markerColor: style.markerColor,
    shape: 'circle',
    prefix: 'fa'
  });
}

