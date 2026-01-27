<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">

    <title>{{ config('app.name', 'ByteForge') }}</title>

    <!-- Theme CSS (Phase 2: CSS Variables) -->
    @if($themeCssUrl ?? null)
        <link rel="stylesheet" href="{{ $themeCssUrl }}" id="theme-css-link">
    @else
        <!-- TEMP: Hardcoded CSS link for smoke test; replace when dynamic loading is wired -->
        <link rel="stylesheet" href="/storage/themes/1/1.css" id="theme-css-link-temp">
    @endif

    <!-- Vite CSS -->
    @viteReactRefresh
    @vite(['resources/css/app.css'])
</head>
<body class="antialiased">
    <div id="public-app"></div>

    <!-- Vite JS - Only public app bundle -->
    @vite(['resources/js/public.tsx'])
</body>
</html>
