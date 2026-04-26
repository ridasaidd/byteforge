<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class SetLocale
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $locale = 'en';

        $user = null;
        $bearerToken = (string) $request->bearerToken();

        if ($bearerToken !== '' && substr_count($bearerToken, '.') === 2) {
            try {
                $user = $request->user('api');
            } catch (Throwable) {
                $user = null;
            }
        }

        if ($user && ! empty($user->preferred_locale)) {
            $locale = $user->preferred_locale;
        } else {
            $preferred = $request->getPreferredLanguage(['en', 'sv', 'ar']);
            if (is_string($preferred) && $preferred !== '') {
                $locale = $preferred;
            }
        }

        if (in_array($locale, ['en', 'sv', 'ar'], true)) {
            App::setLocale($locale);
        }

        return $next($request);
    }
}
