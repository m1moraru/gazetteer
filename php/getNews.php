<?php
header('Content-Type: application/json');

$country = $_GET['country'] ?? null;
if (!$country) {
    echo json_encode(['results' => []]);
    exit;
}

$config = include('config.php');
$news_key = $config['NEWSDATA_KEY'];

$url = "https://newsdata.io/api/1/latest?apikey=$news_key&q=breaking%20news&country=" . strtolower($country) . "&language=en";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
$response = curl_exec($ch);
curl_close($ch);

$newsData = json_decode($response, true);
$articles = isset($newsData['results']) && is_array($newsData['results']) ? $newsData['results'] : [];

$news = [];

foreach (array_slice($articles, 0, 5) as $article) {
    $news[] = [
        'title' => $article['title'] ?? 'No title',
        'link' => $article['link'] ?? '#',
        'source' => $article['source_id'] ?? 'Unknown',
        'pubDate' => $article['pubDate'] ?? ''
    ];
}

echo json_encode(['results' => $news]);

