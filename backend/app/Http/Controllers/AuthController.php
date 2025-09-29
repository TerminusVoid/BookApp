<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
        ]);

        if ($validator->fails()) {
            $errors = $validator->errors();
            
            // Check for specific validation errors
            if ($errors->has('email')) {
                $emailError = $errors->first('email');
                // Check if it's a unique constraint violation (email already exists)
                if (str_contains($emailError, 'taken') || str_contains($emailError, 'already') || str_contains($emailError, 'exists')) {
                    return response()->json([
                        'success' => false,
                        'message' => 'This email address is already registered. Please use a different email or try signing in.',
                        'error_type' => 'email_exists',
                        'errors' => $errors,
                    ], 422);
                }
                // For other email validation errors (format, etc.)
                return response()->json([
                    'success' => false,
                    'message' => 'Please enter a valid email address.',
                    'error_type' => 'email_invalid',
                    'errors' => $errors,
                ], 422);
            }
            
            if ($errors->has('password')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Password must be at least 8 characters and match the confirmation.',
                    'errors' => $errors,
                ], 422);
            }

            return response()->json([
                'success' => false,
                'message' => 'Please check your information and try again.',
                'errors' => $errors,
            ], 422);
        }

        try {
            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => Hash::make($request->password),
            ]);

            $token = $user->createToken('auth_token')->plainTextToken;

            return response()->json([
                'success' => true,
                'message' => 'User registered successfully',
                'data' => [
                    'user' => $user,
                    'token' => $token,
                ],
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Registration failed. Please try again.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function login(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'password' => 'required',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Check if user exists
        $user = User::where('email', $request->email)->first();
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'No account found with this email address. Please register first.',
            ], 401);
        }

        // Attempt authentication
        if (!Auth::attempt($request->only('email', 'password'))) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid credentials. Please check your password and try again.',
            ], 401);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Login successful',
            'data' => [
                'user' => $user,
                'token' => $token,
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully',
        ]);
    }

    public function user(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => [
                'user' => $request->user(),
            ],
        ]);
    }

    public function deleteAccount(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Password is required to delete your account.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = $request->user();

        // Verify the password
        if (!Hash::check($request->password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Incorrect password. Please verify your password to delete your account.',
            ], 401);
        }

        try {
            // Delete all user's favorites first
            $user->favorites()->delete();
            
            // Delete all user's tokens
            $user->tokens()->delete();
            
            // Delete the user account
            $user->delete();

            return response()->json([
                'success' => true,
                'message' => 'Your account has been permanently deleted.',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete account. Please try again.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
