<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    /**
     * Get user profile information.
     */
    public function profile(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'net_income' => $user->net_income,
                'profile_picture' => $user->profile_picture,
                'voice_notifications_enabled' => $user->voice_notifications_enabled,
                'reminder_frequency' => $user->reminder_frequency,
                'theme' => $user->theme,
                'created_at' => $user->created_at,
                'updated_at' => $user->updated_at,
            ]
        ]);
    }

    /**
     * Update user profile information.
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => [
                'sometimes',
                'email',
                'max:255',
                Rule::unique('users')->ignore($user->id)
            ],
            'net_income' => 'sometimes|nullable|numeric|min:0',
            'profile_picture' => 'sometimes|nullable|string|max:500',
            'voice_notifications_enabled' => 'sometimes|boolean',
            'reminder_frequency' => 'sometimes|in:daily,weekly,monthly,none',
            'theme' => 'sometimes|in:light,dark,maroon'
        ]);

        $user->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Profile updated successfully',
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'net_income' => $user->net_income,
                'profile_picture' => $user->profile_picture,
                'voice_notifications_enabled' => $user->voice_notifications_enabled,
                'reminder_frequency' => $user->reminder_frequency,
                'theme' => $user->theme,
                'created_at' => $user->created_at,
                'updated_at' => $user->updated_at,
            ]
        ]);
    }

    /**
     * Update user password.
     */
    public function updatePassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:8|confirmed'
        ]);

        $user = $request->user();

        if (!Hash::check($validated['current_password'], $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Current password is incorrect'
            ], 400);
        }

        $user->update([
            'password' => Hash::make($validated['new_password'])
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Password updated successfully'
        ]);
    }

    /**
     * Get user dashboard data.
     */
    public function dashboard(Request $request): JsonResponse
    {
        $user = $request->user();
        $totalSavings = $user->getTotalSavings();
        $primaryGoal = $user->getPrimaryGoal();
        $historyEntries = $user->getHistoryEntries()->take(10); // Latest 10 entries

        return response()->json([
            'success' => true,
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'net_income' => $user->net_income,
                    'profile_picture' => $user->profile_picture,
                ],
                'total_savings' => $totalSavings,
                'primary_goal' => $primaryGoal ? [
                    'id' => $primaryGoal->id,
                    'name' => $primaryGoal->name,
                    'target_amount' => $primaryGoal->target_amount,
                    'current_amount' => $primaryGoal->current_amount,
                    'progress_percentage' => $primaryGoal->getProgressPercentage(),
                    'remaining_amount' => $primaryGoal->getRemainingAmount(),
                    'is_completed' => $primaryGoal->isCompleted(),
                ] : null,
                'recent_history' => $historyEntries,
                'statistics' => [
                    'total_goals' => $user->savingsGoals()->count(),
                    'completed_goals' => $user->savingsGoals()->whereRaw('current_amount >= target_amount')->count(),
                    'total_deposits' => $user->savingsEntries()->count(),
                    'total_withdrawals' => $user->withdrawalEntries()->count(),
                    'total_deposited' => $user->savingsEntries()->sum('amount_saved'),
                    'total_withdrawn' => $user->withdrawalEntries()->sum('amount_withdrawn'),
                ]
            ]
        ]);
    }

    /**
     * Get complete history entries.
     */
    public function history(Request $request): JsonResponse
    {
        $user = $request->user();
        $historyEntries = $user->getHistoryEntries();

        return response()->json([
            'success' => true,
            'data' => $historyEntries
        ]);
    }

    /**
     * Update net income.
     */
    public function updateNetIncome(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'net_income' => 'required|numeric|min:0'
        ]);

        $user = $request->user();
        $user->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Net income updated successfully',
            'data' => [
                'net_income' => $user->net_income
            ]
        ]);
    }
}