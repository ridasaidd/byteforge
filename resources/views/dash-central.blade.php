<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">

    <title>{{ config('app.name', 'ByteForge') }} - Central Admin</title>

    <!-- Vite CSS -->
    @viteReactRefresh
    @vite(['resources/css/app.css'])
</head>
<body class="antialiased">
    <div id="superadmin-app"></div>

    <!-- Vite JS -->
    @vite(['resources/js/superadmin.tsx'])
</body>
</html>
