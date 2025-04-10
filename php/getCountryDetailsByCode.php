<?php
header('Content-Type: application/json');

$code = $_GET['code'] ?? null;

if (!$code) {
    echo json_encode(['error' => 'Missing country code']);
    exit;
}

// Load API keys from config.php
$config = include('config.php');
$exchange_key = $config['OPEN_EXCHANGE_KEY'];
$weather_key = $config['OPEN_WEATHER_KEY'];
$geonames_username = $config['GEONAMES_USERNAME'];

function getApiResponse($url) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $response = curl_exec($ch);
    curl_close($ch);
    return $response;
}

$rest_url = "https://restcountries.com/v3.1/alpha/" . urlencode($code);
$rest_response = getApiResponse($rest_url);

if (!$rest_response) {
    echo json_encode(['error' => 'REST API request failed']);
    exit;
}

$rest_data_array = json_decode($rest_response, true);

if (!is_array($rest_data_array) || !isset($rest_data_array[0])) {
    echo json_encode(['error' => 'Country data not found']);
    exit;
}

$rest_data = $rest_data_array[0];

$country_name = $rest_data['name']['common'] ?? $code;
$capital = $rest_data['capital'][0] ?? 'N/A';
$latlng = isset($rest_data['latlng']) && is_array($rest_data['latlng']) && count($rest_data['latlng']) === 2 ? $rest_data['latlng'] : null;
$capital_coords = isset($rest_data['capitalInfo']['latlng']) && is_array($rest_data['capitalInfo']['latlng']) && count($rest_data['capitalInfo']['latlng']) === 2 ? $rest_data['capitalInfo']['latlng'] : null;
$timezone = $rest_data['timezones'][0] ?? 'Unavailable';
$population = $rest_data['population'] ?? null;
$flag = $rest_data['flags']['svg'] ?? $rest_data['flags']['png'] ?? '';

$currency_code = '';
$currency_symbol = '';
if (isset($rest_data['currencies']) && is_array($rest_data['currencies'])) {
    $currency_keys = array_keys($rest_data['currencies']);
    if (!empty($currency_keys)) {
        $currency_code = $currency_keys[0];
        $currency_symbol = $rest_data['currencies'][$currency_code]['symbol'] ?? '';
    }
}

$exchange_rate = 'Unavailable';
if (!empty($currency_code)) {
    $exchange_url = "https://openexchangerates.org/api/latest.json?app_id=$exchange_key";
    $exchange_data = json_decode(getApiResponse($exchange_url), true);
    $exchange_rate = $exchange_data['rates'][$currency_code] ?? 'Unavailable';
}

$weather = ['desc' => 'Unavailable', 'temp' => 'Unavailable'];
if (is_array($capital_coords) && count($capital_coords) === 2) {
    $lat = $capital_coords[0];
    $lng = $capital_coords[1];
    $weather_url = "https://api.openweathermap.org/data/2.5/weather?lat=$lat&lon=$lng&appid=$weather_key&units=metric";
    $weather_data = json_decode(getApiResponse($weather_url), true);
    $weather = [
        'desc' => $weather_data['weather'][0]['description'] ?? 'Unavailable',
        'temp' => $weather_data['main']['temp'] ?? 'Unavailable'
    ];
}

$wiki_link = "https://en.wikipedia.org/wiki/" . str_replace(" ", "_", $country_name);

$poi_list = [];
if (is_array($capital_coords) && count($capital_coords) === 2 && !empty($geonames_username)) {
    $wikiPOIUrl = "http://api.geonames.org/findNearbyWikipediaJSON?lat={$capital_coords[0]}&lng={$capital_coords[1]}&username=$geonames_username";
    $poi_data = json_decode(getApiResponse($wikiPOIUrl), true);
    $poi_list = $poi_data['geonames'] ?? [];
}

$response = [
    'country' => $country_name,
    'capital' => $capital,
    'timezone' => $timezone,
    'population' => $population,
    'currency' => $currency_code,
    'currency_symbol' => $currency_symbol,
    'exchange_rate' => $exchange_rate,
    'weather' => $weather,
    'wikipedia' => $wiki_link,
    'flag' => $flag,
    'latlng' => $latlng,
    'capital_info' => [
        'latlng' => $capital_coords
    ],
    'nearby_pois' => $poi_list
];

echo json_encode($response);
