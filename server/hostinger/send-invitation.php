<?php
/**
 * GUVEL Operational — Phase 2.0.5
 * Hostinger / Resend personalized invitation delivery template.
 *
 * IMPORTANT:
 * - This endpoint is NOT wired into the GitHub Pages frontend in this phase.
 * - Never place RESEND_API_KEY in JavaScript or config.js.
 * - Configure secrets as Hostinger environment/server variables.
 * - The final production sender should authenticate the caller server-to-server.
 */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: https://guvelsystems.com');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-GUVEL-DELIVERY-SECRET');
header('Access-Control-Allow-Methods: POST, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['error'=>'Method not allowed']); exit; }

$deliverySecret = getenv('GUVEL_DELIVERY_SECRET') ?: '';
$providedSecret = $_SERVER['HTTP_X_GUVEL_DELIVERY_SECRET'] ?? '';
if (!$deliverySecret || !hash_equals($deliverySecret, $providedSecret)) {
    http_response_code(401); echo json_encode(['error'=>'Unauthorized']); exit;
}

$resendKey = getenv('RESEND_API_KEY') ?: '';
$from = getenv('RESEND_FROM') ?: 'GUVEL <no-reply@guvelsystems.com>';
if (!$resendKey) { http_response_code(500); echo json_encode(['error'=>'RESEND_API_KEY is not configured']); exit; }

$body = json_decode(file_get_contents('php://input'), true);
$email = strtolower(trim((string)($body['email'] ?? '')));
$company = trim((string)($body['company_name'] ?? 'Your company'));
$role = trim((string)($body['role'] ?? 'viewer'));
$inviteUrl = trim((string)($body['invitation_url'] ?? ''));

if (!filter_var($email, FILTER_VALIDATE_EMAIL) || !$inviteUrl || !preg_match('/^https:\/\/guvelsystems\.com\//i', $inviteUrl)) {
    http_response_code(400); echo json_encode(['error'=>'Invalid invitation payload']); exit;
}

$roleLabel = ucwords($role);
$html = '<!doctype html><html><body style="font-family:Arial,sans-serif;line-height:1.6;color:#18212a">'
      . '<div style="max-width:620px;margin:0 auto;padding:32px">'
      . '<div style="font-weight:700;font-size:24px">GUVEL <span style="font-weight:400">OPERATIONAL</span></div>'
      . '<p>You have been invited to join <strong>'.htmlspecialchars($company, ENT_QUOTES, 'UTF-8').'</strong> in GUVEL Operational.</p>'
      . '<p>Your assigned role is <strong>'.htmlspecialchars($roleLabel, ENT_QUOTES, 'UTF-8').'</strong>.</p>'
      . '<p><a href="'.htmlspecialchars($inviteUrl, ENT_QUOTES, 'UTF-8').'" style="display:inline-block;padding:12px 20px;border-radius:8px;background:#0cc0df;color:#fff;text-decoration:none;font-weight:700">Accept Invitation</a></p>'
      . '<p style="font-size:12px;color:#65707c">This invitation is valid for 7 days. If you were not expecting this invitation, you can ignore this email.</p>'
      . '</div></body></html>';

$payload = json_encode([
    'from' => $from,
    'to' => [$email],
    'subject' => 'You have been invited to GUVEL Operational',
    'html' => $html
]);

$ch = curl_init('https://api.resend.com/emails');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => ['Authorization: Bearer '.$resendKey, 'Content-Type: application/json'],
    CURLOPT_POSTFIELDS => $payload,
    CURLOPT_TIMEOUT => 15
]);
$response = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($response === false) { http_response_code(502); echo json_encode(['error'=>'Resend request failed','detail'=>$curlError]); exit; }
if ($status < 200 || $status >= 300) { http_response_code(502); echo json_encode(['error'=>'Resend rejected the message','provider_status'=>$status]); exit; }

echo json_encode(['ok'=>true,'provider'=>'resend']);
