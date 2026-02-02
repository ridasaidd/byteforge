<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">

    <title>{{ config('app.name', 'ByteForge') }}</title>

    <!-- Storefront Base CSS - Browser defaults (undoes Tailwind resets, ensures consistent rendering) -->
    <link rel="stylesheet" href="{{ asset('css/storefront-base.css') }}">

    <!-- Phase 6: Theme CSS with Customization Support -->
    @isset($activeTheme)
        {{-- Font Preloads for Performance (Phase 7) --}}
        @if(isset($activeTheme->theme_data['typography']['fontFamily']))
            @foreach(['sans', 'serif', 'mono'] as $category)
                @if(isset($activeTheme->theme_data['typography']['fontFamily'][$category]['file']))
                    @php
                        $fontConfig = $activeTheme->theme_data['typography']['fontFamily'][$category];
                        $fontFile = $fontConfig['file'] ?? null;
                    @endphp
                    @if($fontFile)
                        <link rel="preload" href="{{ asset('fonts/' . $category . '/' . $fontFile) }}" as="font" type="font/woff2" crossorigin>
                    @endif
                @endif
            @endforeach
        @endif

        {{-- Load consolidated theme CSS from disk --}}
        <link rel="stylesheet" href="{{ asset('storage/themes/' . $activeTheme->id . '/' . $activeTheme->id . '.css') }}" id="theme-css">

        {{-- Load scoped customization CSS from database (central scope: tenant_id = NULL) --}}
        @php
            $scopedCustomCss = $activeTheme->getScopedCustomizationCss(null);
        @endphp
        @if($scopedCustomCss)
            <style id="customization-css">{!! $scopedCustomCss !!}</style>
        @endif
    @endisset

    <!-- Vite JS only - CSS comes from theme system -->
    @viteReactRefresh
</head>
<body class="antialiased">
    <div id="public-app"></div>

    <!-- Vite JS - Only public app bundle -->
    @vite(['resources/js/public.tsx'])
</body>
</html>
