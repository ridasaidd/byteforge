<?php

return [
    'refresh_cookie_name' => env('AUTH_REFRESH_COOKIE_NAME', 'byteforge_refresh'),
    'refresh_cookie_path' => env('AUTH_REFRESH_COOKIE_PATH', '/api/auth'),
    'refresh_ttl_minutes' => (int) env('AUTH_REFRESH_TTL_MINUTES', 20160),
    'refresh_cookie_same_site' => env('AUTH_REFRESH_COOKIE_SAME_SITE', 'lax'),
];
