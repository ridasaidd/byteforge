<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        return response()->json(['message' => 'Route auth.login works']);
    }

    public function register(Request $request)
    {
        return response()->json(['message' => 'Route auth.register works']);
    }

    public function logout(Request $request)
    {
        return response()->json(['message' => 'Route auth.logout works']);
    }

    public function refresh(Request $request)
    {
        return response()->json(['message' => 'Route auth.refresh works']);
    }

    public function user(Request $request)
    {
        return response()->json(['message' => 'Route auth.user works']);
    }
}