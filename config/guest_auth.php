<?php

return [
    'magic_link_ttl_minutes' => (int) env('GUEST_MAGIC_LINK_TTL_MINUTES', 30),
    'access_token_ttl_minutes' => (int) env('GUEST_ACCESS_TOKEN_TTL_MINUTES', 15),
    'refresh_cookie_name' => env('GUEST_AUTH_REFRESH_COOKIE_NAME', 'byteforge_guest_refresh'),
    'refresh_cookie_path' => env('GUEST_AUTH_REFRESH_COOKIE_PATH', '/api/guest-auth'),
    'refresh_ttl_minutes' => (int) env('GUEST_AUTH_REFRESH_TTL_MINUTES', 20160),
    'refresh_cookie_same_site' => env('GUEST_AUTH_REFRESH_COOKIE_SAME_SITE', 'lax'),
];
