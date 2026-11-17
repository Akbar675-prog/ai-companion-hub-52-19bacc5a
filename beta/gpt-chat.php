<?php

header('Content-Type: application/json; charset=utf-8');

$message = $_GET['message'];

$url = "https://android.chat.openai.com/backend-api/f/conversation";


$mCookie = '__cflb=' . bin2hex(random_bytes(20)) . '; '
    . '__cfuvid=' . bin2hex(random_bytes(24)) . '; '
    . 'oai-sc=' . bin2hex(random_bytes(64)) . '; '
    . '__cf_bm=' . bin2hex(random_bytes(48));


$mHeaders = [
    'User-Agent: ChatGPT/1.2027.000 (Android 12; SM-F741N; build 27230000)',
    'Accept: text/event-stream,application/json',
    'Accept-Encoding: gzip',
    'Content-Type: application/json',
    'oai-device-id: ' . bin2hex(random_bytes(10))
];

$payload = [
    'action' => 'next',
    'messages' => [[
        'id' => sprintf('%s-%s-4%s-%s-%s', bin2hex(random_bytes(4)), bin2hex(random_bytes(2)), substr(bin2hex(random_bytes(2)), 1), dechex(random_int(8, 11)) . substr(bin2hex(random_bytes(2)), 1), bin2hex(random_bytes(6))),
        'author' => ['role' => 'user'],
        'content' => [
            'parts' => [$message],
            'content_type' => 'text',
        ],
        'status' => 'finished_successfully',
        'recipient' => 'all',
        'metadata' => [
            'is_visually_hidden_from_conversation' => false,
            'exclude_after_next_user_message' => false,
            'content_references' => [],
            'search_result_groups' => [],
            'search_queries' => [],
            'image_results' => [],
            'real_time_audio_has_video' => false,
            'dictation' => false,
            'image_gen_async' => false,
            'trigger_async_ux' => false,
            'writing_blocks' => (object) [],
        ],
    ]],
    'model' => 'auto',
    'history_and_training_disabled' => false,
    'fork_from_shared_post' => false,
    'enable_message_followups' => false,
    'force_use_sse' => true,
    'force_use_search' => null,
    'force_paragen' => false,
    'supported_encodings' => ['v1'],
    'supports_buffering' => true,
    'timezone' => 'Asia/Ho_Chi_Minh',
    'timezone_offset_min' => -420,
    'system_hints' => [],
    'is_onboarding_conversation' => false,
    'stream' => true,
];

$antik = curl_init();

curl_setopt($antik, CURLOPT_URL, $url);
curl_setopt($antik, CURLOPT_RETURNTRANSFER, true);
curl_setopt($antik, CURLOPT_POST, true);
curl_setopt($antik, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($antik, CURLOPT_COOKIE, $mCookie);
curl_setopt($antik, CURLOPT_HTTPHEADER, $mHeaders);
curl_setopt($antik, CURLOPT_ENCODING, '');
curl_setopt($antik, CURLOPT_TIMEOUT, 30);
$response = curl_exec($antik);
$error = curl_error($antik);
$httpCode = curl_getinfo($antik, CURLINFO_HTTP_CODE);


$text = '';

$lines = explode("\n", $response ?: '');

for ($i = 0; $i < count($lines); $i++) {

    $line = trim($lines[$i]);

    if (strpos($line, 'data:') !== 0) continue;

    $data = json_decode(trim(substr($line, 5)), true);

    if (!is_array($data)) continue;

    if (is_array($data['v'] ?? null) && isset($data['v'][0])) {

        $patches = $data['v'] ?? [];

        for ($j = 0; $j < count($patches); $j++) {

            //$patch = $patches[$j];
            $patch = $patches[$j] ?? [];
            if (
                ($patch['p'] ?? '') == '/message/content/parts/0' &&
                ($patch['o'] ?? '') == 'append' &&
                is_string($patch['v'] ?? null)
            ) {
                $text .= $patch['v'];
            }
        }
    }

    $part = $data['v']['message']['content']['parts'][0] ?? null;

    if (
        $text == '' &&
        ($data['v']['message']['author']['role'] ?? '') == 'assistant' &&
        is_string($part)
    ) {
        $text = $part;
    }

    ///$i =  $i + 1;
}


$res = [
    'by -> '  => '@aantik_mods',
    'message' => $message,
    'response' => trim($text),
  /////  'raw' => $response,
];

echo json_encode($res, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

?>
