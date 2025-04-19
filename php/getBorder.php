<?php
header('Content-Type: application/json');

$code = $_GET['code'] ?? null;
if (!$code) {
    echo json_encode(['error' => 'Missing country code']);
    exit;
}

$geoFile = '../data/countryBorders.geo.json';

if (!file_exists($geoFile)) {
    echo json_encode(['error' => 'Borders file not found']);
    exit;
}

$geoData = json_decode(file_get_contents($geoFile), true);

foreach ($geoData['features'] as $feature) {
    if ($feature['properties']['iso_a2'] === $code) {
        $geometry = $feature['geometry'];
        $coordinates = $geometry['coordinates'];

        $allCoords = [];
        $flatten = function ($coords) use (&$flatten, &$allCoords) {
            foreach ($coords as $item) {
                if (is_array($item[0])) {
                    $flatten($item);
                } else {
                    $allCoords[] = $item;
                }
            }
        };
        $flatten($coordinates);

        $lats = array_column($allCoords, 1);
        $lngs = array_column($allCoords, 0);

        $bbox = [
            'north' => max($lats),
            'south' => min($lats),
            'east'  => max($lngs),
            'west'  => min($lngs)
        ];

        $feature['bbox'] = $bbox;

        echo json_encode($feature);
        exit;
    }
}

echo json_encode(['error' => 'Country not found']);

