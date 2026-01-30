<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">

    <title>{{ config('app.name', 'ByteForge') }}</title>

    <!-- Phase 6: Theme CSS with Customization Support -->
    @isset($activeTheme)
        {{-- 1. Load base theme CSS from disk (system theme files) --}}
        @if($activeTheme->base_theme)
            <link rel="stylesheet" href="{{ asset('storage/themes/' . $activeTheme->base_theme . '/' . $activeTheme->base_theme . '_variables.css') }}" id="theme-variables-css">
            <link rel="stylesheet" href="{{ asset('storage/themes/' . $activeTheme->base_theme . '/' . $activeTheme->base_theme . '_header.css') }}" id="theme-header-css">
            <link rel="stylesheet" href="{{ asset('storage/themes/' . $activeTheme->base_theme . '/' . $activeTheme->base_theme . '_footer.css') }}" id="theme-footer-css">
        @endif

        {{-- 2. Load customization CSS from database (overrides base theme) --}}
        @if($activeTheme->settings_css)
            <style id="customization-settings-css">{!! $activeTheme->settings_css !!}</style>
        @endif
        @if($activeTheme->header_css)
            <style id="customization-header-css">{!! $activeTheme->header_css !!}</style>
        @endif
        @if($activeTheme->footer_css)
            <style id="customization-footer-css">{!! $activeTheme->footer_css !!}</style>
        @endif
    @endisset

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
