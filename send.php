<?php
/**
 * Siemens Service Kyiv - Server Form Processor
 * Безпечний обробник заявок із форм сайту:
 * - Захист від спам-ботів через Honeypot (поле-пастка)
 * - Сувора валідація та нормалізація номера телефону (+380...)
 * - Санітизація вхідних даних
 * - Захист від флуду (Rate limiting через сесію)
 * - Відправка структурованого сповіщення в Telegram через cURL
 * - Резервне логування в файл
 * - Повернення стандартизованого JSON
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');

// Дозволені методи
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Метод запиту не підтримується. Очікується POST.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Запуск сесії для захисту від флуду
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Налаштування Telegram (заповнюються за потреби)
define('TELEGRAM_BOT_TOKEN', getenv('TG_BOT_TOKEN') ?: 'YOUR_TELEGRAM_BOT_TOKEN_HERE');
define('TELEGRAM_CHAT_ID', getenv('TG_CHAT_ID') ?: 'YOUR_TELEGRAM_CHAT_ID_HERE');
define('LOG_FILE', __DIR__ . '/leads.log');

// 1. Перевірка Honeypot (поле-пастка для ботів)
// Якщо приховане поле 'website_url' або 'middle_name' заповнене — це робот
$honeypot = trim($_POST['website_url'] ?? $_POST['middle_name'] ?? '');
if (!empty($honeypot)) {
    // Тихо повертаємо успіх боту, не навантажуючи сервер і не відправляючи спам
    echo json_encode([
        'success' => true,
        'message' => 'Ваша заявка успішно зареєстрована в черзі інженерів.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// 2. Захист від повторних швидких відправок (rate-limiting: 5 секунд між запитами з однієї сесії)
$now = time();
$lastSubmit = $_SESSION['last_submission_time'] ?? 0;
if (($now - $lastSubmit) < 5) {
    http_response_code(429);
    echo json_encode([
        'success' => false,
        'message' => 'Занадто часті запити. Будь ласка, зачекайте кілька секунд.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}
$_SESSION['last_submission_time'] = $now;

// 3. Отримання та санітизація даних
$name = trim(filter_input(INPUT_POST, 'name', FILTER_SANITIZE_FULL_SPECIAL_CHARS) ?? 'Не вказано');
$phoneRaw = trim($_POST['phone'] ?? '');
$appliance = trim(filter_input(INPUT_POST, 'appliance', FILTER_SANITIZE_FULL_SPECIAL_CHARS) ?? 'Побутова техніка Siemens');
$district = trim(filter_input(INPUT_POST, 'district', FILTER_SANITIZE_FULL_SPECIAL_CHARS) ?? 'Не вказано');
$address = trim(filter_input(INPUT_POST, 'address', FILTER_SANITIZE_FULL_SPECIAL_CHARS) ?? 'Не вказано');
$comment = trim(filter_input(INPUT_POST, 'comment', FILTER_SANITIZE_FULL_SPECIAL_CHARS) ?? 'Без коментаря');
$formSource = trim(filter_input(INPUT_POST, 'form_source', FILTER_SANITIZE_FULL_SPECIAL_CHARS) ?? 'Головна форма');
$pageUrl = trim(filter_input(INPUT_POST, 'page_url', FILTER_SANITIZE_URL) ?? '');

// 4. Валідація телефону (українські номери)
// Видаляємо пробіли, дужки, дефіси
$cleanPhone = preg_replace('/[^\d+]/', '', $phoneRaw);

// Перевірка на валідність формату: +380XXXXXXXXX або 0XXXXXXXXX
$isValidPhone = false;
$normalizedPhone = '';

if (preg_match('/^(\+?380|0)(\d{9})$/', $cleanPhone, $matches)) {
    $isValidPhone = true;
    $normalizedPhone = '+380' . $matches[2];
}

if (!$isValidPhone) {
    http_response_code(422);
    echo json_encode([
        'success' => false,
        'message' => 'Будь ласка, введіть коректний номер телефону у форматі +38 (0XX) XXX-XX-XX.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// 5. Формування тексту повідомлення для чергового інженера
$timestamp = date('d.m.Y H:i:s');
$clientIp = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? 'Невідомо';

$telegramMessage = "⚡ <b>НОВА ЗАЯВКА НА ВИКЛИК МАЙСТРА SIEMENS</b>\n";
$telegramMessage .= "━━━━━━━━━━━━━━━━━━━━\n";
$telegramMessage .= "👤 <b>Клієнт:</b> " . htmlspecialchars($name, ENT_QUOTES, 'UTF-8') . "\n";
$telegramMessage .= "📞 <b>Телефон:</b> <a href=\"tel:{$normalizedPhone}\">{$normalizedPhone}</a>\n";
$telegramMessage .= "⚙️ <b>Прилад:</b> " . htmlspecialchars($appliance, ENT_QUOTES, 'UTF-8') . "\n";
if ($district !== 'Не вказано') {
    $telegramMessage .= "📍 <b>Район / Місто:</b> " . htmlspecialchars($district, ENT_QUOTES, 'UTF-8') . "\n";
}
if ($address !== 'Не вказано') {
    $telegramMessage .= "🏠 <b>Адреса:</b> " . htmlspecialchars($address, ENT_QUOTES, 'UTF-8') . "\n";
}
if ($comment !== 'Без коментаря') {
    $telegramMessage .= "💬 <b>Опис поломки:</b> " . htmlspecialchars($comment, ENT_QUOTES, 'UTF-8') . "\n";
}
$telegramMessage .= "━━━━━━━━━━━━━━━━━━━━\n";
$telegramMessage .= "📋 <b>Форма:</b> {$formSource}\n";
$telegramMessage .= "🕒 <b>Час:</b> {$timestamp}\n";
$telegramMessage .= "🌐 <b>IP:</b> {$clientIp}\n";

// 6. Відправка в Telegram (якщо вказано токен і chat_id)
$tgSent = false;
if (TELEGRAM_BOT_TOKEN !== 'YOUR_TELEGRAM_BOT_TOKEN_HERE' && TELEGRAM_CHAT_ID !== 'YOUR_TELEGRAM_CHAT_ID_HERE') {
    $tgUrl = "https://api.telegram.org/bot" . TELEGRAM_BOT_TOKEN . "/sendMessage";
    $postFields = [
        'chat_id' => TELEGRAM_CHAT_ID,
        'text' => $telegramMessage,
        'parse_mode' => 'HTML',
        'disable_web_page_preview' => true
    ];

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $tgUrl);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $postFields);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 6);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode === 200) {
        $tgSent = true;
    }
}

// 7. Логування заявки у резервний файл
$logEntry = sprintf(
    "[%s] | Телефон: %s | Клієнт: %s | Прилад: %s | Район: %s | Форма: %s | IP: %s\n",
    $timestamp,
    $normalizedPhone,
    $name,
    $appliance,
    $district,
    $formSource,
    $clientIp
);
@file_put_contents(LOG_FILE, $logEntry, FILE_APPEND | LOCK_EX);

// 8. Успішна відповідь клієнту
echo json_encode([
    'success' => true,
    'message' => 'Вашу заявку прийнято! Спеціаліст сервісу зв\'яжеться з вами для уточнення деталей.',
    'lead' => [
        'phone' => $normalizedPhone,
        'time' => $timestamp
    ]
], JSON_UNESCAPED_UNICODE);
exit;
