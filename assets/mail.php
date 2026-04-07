<?php

// Only process POST requests.
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo 'Method not allowed.';
    exit;
}

function da_clean_header_value($value) {
    $value = trim((string) $value);
    // Prevent header injection
    $value = str_replace(["\r", "\n"], ' ', $value);
    return $value;
}

$name = da_clean_header_value($_POST['name'] ?? '');
$email = da_clean_header_value($_POST['email'] ?? '');
$message = trim((string) ($_POST['message'] ?? ''));

$budget = da_clean_header_value($_POST['budget'] ?? '');

$services = $_POST['service'] ?? [];
if (!is_array($services)) {
    $services = [$services];
}
$services = array_values(array_filter(array_map('da_clean_header_value', $services)));

// Validate required fields (Contact page only requires name + email).
if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo 'Please enter your name and a valid email.';
    exit;
}

// Set the recipient email address.
$recipient = 'bhavesh.leifii@gmail.com';

// Set the email subject.
$subject = "New enquiry from {$name}";

// Build the email content.
$email_content = "New enquiry from DA Design Visuals website\n\n";
$email_content .= "Name: {$name}\n";
$email_content .= "Email: {$email}\n";

if (!empty($services)) {
    $email_content .= 'Services: ' . implode(', ', $services) . "\n";
}

if ($budget !== '') {
    $email_content .= "Budget: {$budget}\n";
}

if ($message !== '') {
    $email_content .= "\nMessage:\n{$message}\n";
}

// Build safer email headers: fixed From + Reply-To to the user.
$email_headers = "From: DA Design Visuals <{$recipient}>\r\n";
$email_headers .= "Reply-To: {$name} <{$email}>\r\n";
$email_headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

// Send the email.
if (mail($recipient, $subject, $email_content, $email_headers)) {
    http_response_code(200);
    echo 'Thank you! Your message has been sent.';
    exit;
}

http_response_code(500);
echo "Oops! Something went wrong and we couldn't send your message.";
exit;

?>

