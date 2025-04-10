<?php
header('Content-Type: application/json');

$lat = $_GET['lat'] ?? null;
$lng = $_GET['lng'] ?? null;

if (!$lat || !$lng) {
    echo json_encode(['error' => 'Missing coordinates']);
    exit;
}

$config = include('config.php');
$opencage_key = $config['OPENCAGE_KEY'];
$weather_key = $config['OPEN_WEATHER_KEY'];
$exchange_key = $config['OPEN_EXCHANGE_KEY'];

$location_url = "https://api.opencagedata.com/geocode/v1/json?q=$lat+$lng&key=$opencage_key";
$location_data = json_decode(file_get_contents($location_url), true);
$country_code = $location_data['results'][0]['components']['ISO_3166-1_alpha-2'] ?? null;

if (!$country_code) {
    echo json_encode(['error' => 'Could not determine country']);
    exit;
}

$rest_url = "https://restcountries.com/v3.1/alpha/$country_code";
$rest_data = json_decode(file_get_contents($rest_url), true)[0] ?? null;

if (!$rest_data) {
    echo json_encode(['error' => 'Country data not found']);
    exit;
}

$capital = $rest_data['capital'][0] ?? 'N/A';
$capital_coords = $rest_data['capitalInfo']['latlng'] ?? [$lat, $lng];

$currency_code = '';
$currency_symbol = '';
if (isset($rest_data['currencies']) && is_array($rest_data['currencies'])) {
    $currency_keys = array_keys($rest_data['currencies']);
    if (!empty($currency_keys)) {
        $currency_code = $currency_keys[0];
        $currency_symbol = $rest_data['currencies'][$currency_code]['symbol'] ?? '';
    }
}

$exchange_url = "https://openexchangerates.org/api/latest.json?app_id=$exchange_key";
$exchange_data = json_decode(file_get_contents($exchange_url), true);
$exchange_rate = $exchange_data['rates'][$currency_code] ?? 'N/A';

$weather_url = "https://api.openweathermap.org/data/2.5/weather?lat={$capital_coords[0]}&lon={$capital_coords[1]}&appid=$weather_key&units=metric";
$weather_data = json_decode(file_get_contents($weather_url), true);
$weather = [
    'desc' => $weather_data['weather'][0]['description'] ?? 'Unavailable',
    'temp' => $weather_data['main']['temp'] ?? 'N/A'
];

$wiki_link = "https://en.wikipedia.org/wiki/" . str_replace(" ", "_", $rest_data['name']['common']);

echo json_encode([
    'country' => $rest_data['name']['common'] ?? $country_code,
    'capital' => $capital,
    'population' => $rest_data['population'] ?? 'N/A',
    'currency' => $currency_code,
    'currency_symbol' => $currency_symbol,
    'exchange_rate' => $exchange_rate,
    'weather' => $weather,
    'wikipedia' => $wiki_link,
    'flag' => $rest_data['flags']['png'] ?? '',
    'code' => $country_code
]);


