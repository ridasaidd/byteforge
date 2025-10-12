<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">

    <title>{{ config('app.name', 'ByteForge') }} - Central Admin</title>

    <!-- Vite CSS -->
    @vite(['resources/css/app.css'])
</head>
<body class="antialiased">
    <div id="superadmin-app"></div>

    <!-- Pass initial user data to React -->
    <script>
        window.__INITIAL_USER__ = @json(auth()->user() ? [
            'id' => auth()->user()->id,
            'name' => auth()->user()->name,
            'email' => auth()->user()->email,
            'avatar' => auth()->user()->avatar ?? null,
            'roles' => auth()->user()->roles->pluck('name')->toArray() ?? [],
        ] : null);
    </script>

    <!-- Vite JS -->
    @vite(['resources/js/superadmin.tsx'])
</body>
</html>
