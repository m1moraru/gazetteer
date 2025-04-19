# Gazetteer

Gazetteer is a mobile-first, fully responsive web application that displays country profiles with demographic, geographic, climatic, and economic data using interactive maps and data visualizations. This project was developed as part of the IT Career Switch Portfolio Program.

## Project Purpose

The aim of this project is to showcase technical skills by building a dynamic single-page application using modern front-end technologies, third-party APIs, and PHP for backend integration. It also demonstrates the ability to design intuitive user experiences for both desktop and mobile.

## Key Features

- Geolocation-based automatic country detection
- Interactive map with toggleable Street and Satellite views
- Country border highlighting using GeoJSON
- Country selector dropdown
- Data modals:
  - Country information (name, capital, timezone, population, currency, weather, Wikipedia)
  - Weather forecast modal with icons and hourly data
  - Currency exchange modal with input and live calculation
  - News modal with articles pulled via API
- Dynamic POI markers (airports, universities, museums, etc.) based on GeoNames Wikipedia API
- Marker clustering for enhanced map performance
- EasyButton controls to toggle POI layers and modals
- Custom map icons using Leaflet ExtraMarkers and local image assets
- Responsive layout using Bootstrap 5

## Technologies Used

- HTML5, CSS3, Bootstrap 5
- JavaScript, jQuery, AJAX
- Leaflet.js (core map, MarkerCluster, ExtraMarkers, EasyButton)
- PHP (for backend API requests)
- GeoJSON (for borders)

## APIs Used

- OpenCage Geocoder – for reverse geolocation
- GeoNames – for Wikipedia-based POI data and country metadata
- OpenWeatherMap – for live weather and forecast
- Open Exchange Rates – for currency exchange rates
- Rest Countries – for basic country data
- NewsData.io – for live news headlines


## How It Works

- When the page loads, the app tries to determine the user's location.
- It identifies the country using OpenCage and fetches border polygons from a local GeoJSON file.
- The map is then zoomed to the selected country and filled with data from various APIs using PHP.
- Users can also select countries manually from the dropdown to explore.

## Deployment Requirements

- Local or online PHP-enabled web server (e.g., XAMPP or Hostinger)
- API keys must be added to `config.php`:
  ```php
  return [
    'OPENCAGE_KEY' => 'your_key_here',
    'OPEN_EXCHANGE_KEY' => 'your_key_here',
    'OPEN_WEATHER_KEY' => 'your_key_here',
    'GEONAMES_USERNAME' => 'your_username_here',
    'NEWSDATA_KEY' => 'your_key_here'
  ];


