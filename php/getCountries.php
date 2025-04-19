<?php
header('Content-Type: application/json');

$geoFile = '../data/countryBorders.geo.json';

if (!file_exists($geoFile)) {
    echo json_encode(['error' => 'Borders file not found']);
    exit;
}

$geoData = json_decode(file_get_contents($geoFile), true);
$countries = [];

foreach ($geoData['features'] as $feature) {
    $name = $feature['properties']['name'];
    $iso_a2 = $feature['properties']['iso_a2'];

    if (!empty($iso_a2) && !empty($name)) {
        $countries[] = [
            'name' => $name,
            'iso_a2' => $iso_a2
        ];
    }
}

usort($countries, fn($a, $b) => strcmp($a['name'], $b['name']));

echo json_encode($countries);
