<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Actions\Api\Auth\LoginAction;
use App\Actions\Api\Auth\RegisterAction;
use App\Actions\Api\Auth\LogoutAction;
use App\Actions\Api\Auth\RefreshAction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $action = new LoginAction();
        $result = $action->execute($request->only(['email', 'password']));

        return response()->json($result);
    }

    public function register(Request $request)
    {
        $action = new RegisterAction();
        $result = $action->execute($request->only(['name', 'email', 'password', 'type']));

        return response()->json($result, 201);
    }

    public function logout(Request $request)
    {
        $action = new LogoutAction();
        $action->execute(Auth::user());

        return response()->json(['message' => 'Logged out successfully']);
    }

    public function refresh(Request $request)
    {
        $action = new RefreshAction();
        $result = $action->execute(Auth::user());

        return response()->json($result);
    }

    public function user(Request $request)
    {
        return response()->json(Auth::user());
    }
}
