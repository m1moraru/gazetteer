<?php
header('Content-Type: application/json');

$code = $_GET['code'] ?? null;
if (!$code) {
    echo json_encode(['error' => 'Missing country code']);
    exit;
}

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
$rest_data_array = json_decode($rest_response, true);

if (!is_array($rest_data_array) || !isset($rest_data_array[0])) {
    echo json_encode(['error' => 'Country data not found']);
    exit;
}

$rest_data = $rest_data_array[0];
$country_name = $rest_data['name']['common'] ?? $code;
$capital = $rest_data['capital'][0] ?? 'N/A';
$latlng = $rest_data['latlng'] ?? [0, 0];
$capital_coords = $rest_data['capitalInfo']['latlng'] ?? $latlng;
$timezone = $rest_data['timezones'][0] ?? 'Unavailable';
$population = $rest_data['population'] ?? 0;
$flag = $rest_data['flags']['svg'] ?? '';

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
$exchange_data = json_decode(getApiResponse($exchange_url), true);
$exchange_rate = $exchange_data['rates'][$currency_code] ?? 'Unavailable';

$weather_url = "https://api.openweathermap.org/data/2.5/weather?lat={$capital_coords[0]}&lon={$capital_coords[1]}&appid=$weather_key&units=metric";
$weather_data = json_decode(getApiResponse($weather_url), true);
$weather = [
    'desc' => $weather_data['weather'][0]['description'] ?? 'Unavailable',
    'temp' => $weather_data['main']['temp'] ?? 'Unavailable',
    'humidity' => $weather_data['main']['humidity'] ?? 'N/A',
    'wind' => $weather_data['wind']['speed'] ?? 'N/A'
];

$forecast_url = "https://api.openweathermap.org/data/2.5/forecast?lat={$capital_coords[0]}&lon={$capital_coords[1]}&appid=$weather_key&units=metric";
$forecast_data = json_decode(getApiResponse($forecast_url), true);
$forecast_segments = array_slice($forecast_data['list'] ?? [], 0, 3);
$forecast = array_map(function ($entry) {
    return [
        'time' => $entry['dt_txt'],
        'temp' => $entry['main']['temp'],
        'desc' => $entry['weather'][0]['description'],
        'icon' => $entry['weather'][0]['icon']
    ];
}, $forecast_segments);

$wiki_link = "https://en.wikipedia.org/wiki/" . str_replace(" ", "_", $country_name);

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
    'forecast' => $forecast
];

echo json_encode($response);
