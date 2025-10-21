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
    /**
     * Login user and return token
     */
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        // Attempt authentication
        if (! Auth::attempt($request->only('email', 'password'))) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $user = Auth::user();

        // Create access token
        // This seems to be a false positive error.
        $token = $user->createToken('web-token')->accessToken;

        return response()->json([
            // This also seems to be a false positive error.
            // @php-ignore
            'user' => $user->load('roles', 'permissions'),
            'token' => $token,
        ]);
    }

    /**
     * Register a new user (optional - for public registration)
     */
    public function register(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
        ]);

        // Assign default role if needed
        // $user->assignRole('user');

        $token = $user->createToken('web-token')->accessToken;

        return response()->json([
            'user' => $user->load('roles', 'permissions'),
            'token' => $token,
        ], 201);
    }

    /**
     * Logout user (revoke token)
     */
    public function logout(Request $request)
    {
        $request->user()->token()->revoke();

        return response()->json([
            'message' => 'Successfully logged out',
        ]);
    }

    /**
     * Refresh access token
     */
    public function refresh(Request $request)
    {
        $user = $request->user();

        // Revoke old token
        $user->token()->revoke();

        // Create new token
        $token = $user->createToken('web-token')->accessToken;

        return response()->json([
            'token' => $token,
        ]);
    }

    /**
     * Get authenticated user with roles and permissions
     */
    public function user(Request $request)
    {
        return response()->json(
            $request->user()->load('roles.permissions', 'permissions')
        );
    }

    /**
     * Update authenticated user's profile
     */
    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email,'.$user->id,
        ]);

        $user->update($validated);

        // Log activity
        $causer = auth('api')->user();
        activity('central')
            ->performedOn($user)
            ->causedBy($causer)
            ->event('updated')
            ->withProperties([
                'attributes' => [
                    'name' => $user->name,
                    'email' => $user->email,
                ],
            ])
            ->log('Profile updated');

        return response()->json([
            'message' => 'Profile updated successfully',
            'user' => $user->load('roles', 'permissions'),
        ]);
    }

    /**
     * Update authenticated user's password
     */
    public function updatePassword(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'current_password' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        // Verify current password
        if (! Hash::check($validated['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['The current password is incorrect.'],
            ]);
        }

        $user->update([
            'password' => Hash::make($validated['password']),
        ]);

        // Log activity
        $causer = auth('api')->user();
        activity('central')
            ->causedBy($causer)
            ->event('updated')
            ->log('Password changed');

        return response()->json([
            'message' => 'Password updated successfully',
        ]);
    }
}
