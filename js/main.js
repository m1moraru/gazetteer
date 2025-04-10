let map;
let bordersLayer = null;
let countryDetailsData = null;
let flagMarker = null;
let capitalMarker = null;

$(document).ready(function () {
  initMap();
  loadCountries();
  locateUserAndDisplay();
  loadEarthquakeOverlay();

  $("#countrySelect").on("change", function () {
    const selectedCode = $(this).val();
    fetchCountryDetailsByCode(selectedCode);
  });

  $("#getInfoBtn").on("click", function () {
    if (countryDetailsData) {
      showCountryData(countryDetailsData);

      const modalEl = document.getElementById("countryModal");
      const bsModal = new bootstrap.Modal(modalEl);
      bsModal.show();
    }
  });
});

function initMap() {
  map = L.map("map").setView([20, 0], 2);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors"
  }).addTo(map);
}

function loadCountries() {
  $.ajax({
    url: "/gazetteer/php/getCountries.php",
    method: "GET",
    success: function (data) {
      data.forEach(country => {
        $("#countrySelect").append(
          `<option value="${country.iso_a2}">${country.name}</option>`
        );
      });
    },
    error: function () {
      alert("Could not load countries.");
    }
  });
}

function locateUserAndDisplay() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(position => {
      const { latitude, longitude, accuracy } = position.coords;

      map.setView([latitude, longitude], 6);

      L.circle([latitude, longitude], {
        radius: accuracy,
        color: '#007BFF',
        fillColor: '#007BFF',
        fillOpacity: 0.1
      }).addTo(map);

      // Auto-select user's country
      $.getJSON(`/gazetteer/php/getCountryData.php?lat=${latitude}&lng=${longitude}`, function (data) {
        if (data.code) {
          $("#countrySelect").val(data.code);
          fetchCountryDetailsByCode(data.code);
        }
      });

    }, () => {
      alert("Could not detect your location.");
    });
  }
}


function loadBorderByCode(code) {
  $.getJSON(`/gazetteer/php/getBorder.php?code=${code}`, function (data) {
    if (bordersLayer) {
      map.removeLayer(bordersLayer);
    }

    bordersLayer = L.geoJSON(data.geometry, {
      style: {
        color: '#007BFF',
        weight: 2,
        fillOpacity: 0.1
      }
    }).addTo(map);

    const bounds = bordersLayer.getBounds();
    const isMobile = window.innerWidth <= 768;
    const padding = isMobile ? 0.15 : 0.1;
    map.fitBounds(bounds.pad(padding));

    setTimeout(() => {
      let flagLatLng;
    
      if (
        countryDetailsData &&
        countryDetailsData.capital_info &&
        Array.isArray(countryDetailsData.capital_info.latlng) &&
        countryDetailsData.capital_info.latlng.length === 2
      ) {
        const [capLat, capLng] = countryDetailsData.capital_info.latlng;
    
        flagLatLng = [capLat - 1.5, capLng];
      } else if (bordersLayer) {
        const center = bordersLayer.getBounds().getCenter();
        flagLatLng = [center.lat, center.lng];
      } else {
        console.warn(" No valid coordinates for flag marker.");
        return;
      }
    
      console.log("🧭 Final flag coordinates:", flagLatLng);
    
      if (flagMarker) map.removeLayer(flagMarker);
    
      if (countryDetailsData && countryDetailsData.flag) {
        flagMarker = L.marker(flagLatLng, {
          icon: L.divIcon({
            className: 'flag-icon-container',
            html: `
              <div class="flag-wrapper">
                <img src="${countryDetailsData.flag}" alt="Flag of ${countryDetailsData.country}"
                     style="width:36px; height:24px; border-radius:2px; box-shadow:0 2px 4px rgba(0,0,0,0.3); object-fit:cover;"
                     class="flag-img animate__animated animate__pulse animate__infinite"/>
              </div>
            `,
            iconSize: [36, 24],
            iconAnchor: [18, 12],
          })
        }).addTo(map);
      }
    }, 500);      
    
  });
}

function fetchCountryDetailsByCode(code) {
  countryDetailsData = null;
  $("#getInfoBtn").addClass("d-none");
  $("#mapLoader").show();

  if (flagMarker) map.removeLayer(flagMarker);
  if (capitalMarker) map.removeLayer(capitalMarker);

  $.getJSON(`/gazetteer/php/getCountryDetailsByCode.php?code=${code}`, function (data) {
    console.log("🔍 Received country details:", data);

    countryDetailsData = data;
    $("#mapLoader").hide();
    $("#getInfoBtn").removeClass("d-none").fadeIn();

    loadBorderByCode(code);

    if (data.capital_info && Array.isArray(data.capital_info.latlng) && data.capital_info.latlng.length === 2) {
      const [capLat, capLng] = data.capital_info.latlng;

      const capitalIcon = L.icon({
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/235/235861.png',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30],
      });

      capitalMarker = L.marker([capLat, capLng], { icon: capitalIcon })
        .addTo(map)
        .bindPopup(`<strong>${data.capital}</strong><br><small>Capital of ${data.country}</small>`);

      setTimeout(() => {
        capitalMarker.openPopup();
      }, 500);
    } else {
      console.warn("Invalid capital_info.latlng. Skipping capital marker.");
    }

  }).fail(function () {
    $("#mapLoader").hide();
    alert("Failed to load country details.");
  });
}

function loadEarthquakeOverlay() {
  $.getJSON("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson", function (data) {
    const quakes = L.geoJSON(data, {
      pointToLayer: (feature, latlng) => L.circleMarker(latlng, {
        radius: 4,
        fillColor: "red",
        color: "#900",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.6
      }),
      onEachFeature: function (feature, layer) {
        layer.bindPopup(`<strong>${feature.properties.place}</strong><br>Magnitude: ${feature.properties.mag}`);
      }
    });
    quakes.addTo(map);
  });
}

function showCountryData(data) {
  $("#countryName").html(`
    ${data.country}
    ${data.flag ? `<img src="${data.flag}" alt="Flag of ${data.country}" width="40" class="ms-2" />` : ''}
  `);

  let html = `
    <p><strong>Capital:</strong> ${data.capital}</p>
    <p><strong>Timezone:</strong> ${data.timezone ?? 'Unavailable'}</p>
    <p><strong>Population:</strong> ${data.population ? data.population.toLocaleString() : 'Unavailable'}</p>
    <p><strong>Currency:</strong> ${data.currency} ${data.currency_symbol}</p>
    <p><strong>Exchange Rate (to USD):</strong> ${data.exchange_rate ?? 'Unavailable'}</p>
    <p><strong>Weather:</strong> ${
      data.weather && data.weather.temp !== undefined
        ? `${data.weather.temp}°C, ${data.weather.desc}`
        : 'Unavailable'
    }</p>
    <p><a href="${data.wikipedia}" target="_blank">Wikipedia Page</a></p>
  `;

  if (data.nearby_pois && data.nearby_pois.length > 0) {
    html += `<h5 class="mt-4">Nearby Points of Interest</h5><ul>`;
    data.nearby_pois.forEach(poi => {
      html += `<li><a href="https://${poi.wikipediaUrl}" target="_blank">${poi.title}</a> (${poi.distance} km)</li>`;
    });
    html += `</ul>`;
  }

  $("#countryData").html(html);
}
