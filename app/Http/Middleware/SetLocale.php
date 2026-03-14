<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class SetLocale
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $locale = 'en';

        $user = Auth::guard('api')->user();

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
