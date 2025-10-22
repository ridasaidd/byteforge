<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Allowed File Types for Upload
    |--------------------------------------------------------------------------
    |
    | Define strict whitelist of allowed MIME types and file extensions
    | for the media library. This is critical for security in a multi-tenant
    | environment to prevent malicious file uploads.
    |
    */

    'allowed_mime_types' => [
        // Images
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml',
        
        // Documents
        'application/pdf',
        'application/msword', // .doc
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'application/vnd.ms-excel', // .xls
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'text/plain', // .txt
        
        // Videos
        'video/mp4',
        'video/mpeg',
        'video/quicktime', // .mov
        'video/x-msvideo', // .avi
        'video/webm',
    ],

    'allowed_extensions' => [
        // Images
        'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg',
        
        // Documents
        'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt',
        
        // Videos
        'mp4', 'mpeg', 'mov', 'avi', 'webm',
    ],

    /*
    |--------------------------------------------------------------------------
    | File Size Limits
    |--------------------------------------------------------------------------
    */

    'max_file_size' => 10240, // 10MB in kilobytes

    /*
    |--------------------------------------------------------------------------
    | Blocked File Types (Additional Security Layer)
    |--------------------------------------------------------------------------
    |
    | Explicitly blocked extensions and MIME types that should NEVER be allowed
    |
    */

    'blocked_extensions' => [
        'php', 'phtml', 'php3', 'php4', 'php5', 'phar',
        'exe', 'dll', 'bat', 'cmd', 'com', 'msi',
        'sh', 'bash', 'zsh',
        'js', 'jsx', 'ts', 'tsx',
        'html', 'htm', 'xhtml',
        'py', 'pyc', 'pyo',
        'rb', 'pl', 'cgi',
        'jar', 'class', 'war',
        'zip', 'rar', '7z', 'tar', 'gz', 'bz2',
        'sql', 'db', 'sqlite',
        'swf', 'fla',
    ],

    'blocked_mime_types' => [
        'application/x-php',
        'application/x-httpd-php',
        'application/x-msdownload',
        'application/x-sh',
        'application/x-bat',
        'application/javascript',
        'text/javascript',
        'text/html',
        'text/x-python',
        'application/zip',
        'application/x-rar-compressed',
        'application/java-archive',
        'application/x-shockwave-flash',
    ],
];

