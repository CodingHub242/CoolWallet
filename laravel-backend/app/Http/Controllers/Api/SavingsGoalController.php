<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SavingsGoal;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rule;

class SavingsGoalController extends Controller
{
    /**
     * Display a listing of the user's savings goals.
     */
    public function index(Request $request): JsonResponse
    {
        $goals = $request->user()->savingsGoals()
            ->orderBy('is_primary', 'desc')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($goal) {
                return [
                    'id' => $goal->id,
                    'name' => $goal->name,
                    'target_amount' => $goal->target_amount,
                    'current_amount' => $goal->current_amount,
                    'is_primary' => $goal->is_primary,
                    'progress_percentage' => $goal->getProgressPercentage(),
                    'remaining_amount' => $goal->getRemainingAmount(),
                    'is_completed' => $goal->isCompleted(),
                    'created_at' => $goal->created_at,
                    'updated_at' => $goal->updated_at,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $goals
        ]);
    }

    /**
     * Store a newly created savings goal.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('savings_goals')->where(function ($query) use ($request) {
                    return $query->where('s_user_id', $request->user()->id);
                })
            ],
            'target_amount' => 'required|numeric|min:0.01',
            'current_amount' => 'nullable|numeric|min:0',
            'is_primary' => 'boolean'
        ]);

        $validated['s_user_id'] = $request->user()->id;
        $validated['current_amount'] = $validated['current_amount'] ?? 0;
        $validated['is_primary'] = $validated['is_primary'] ?? false;

        $goal = SavingsGoal::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Savings goal created successfully',
            'data' => [
                'id' => $goal->id,
                'name' => $goal->name,
                'target_amount' => $goal->target_amount,
                'current_amount' => $goal->current_amount,
                'is_primary' => $goal->is_primary,
                'progress_percentage' => $goal->getProgressPercentage(),
                'remaining_amount' => $goal->getRemainingAmount(),
                'is_completed' => $goal->isCompleted(),
                'created_at' => $goal->created_at,
                'updated_at' => $goal->updated_at,
            ]
        ], 201);
    }

    /**
     * Display the specified savings goal.
     */
    public function show(Request $request, $goalId): JsonResponse
    {
        // Find the goal that belongs to the authenticated user
        $savingsGoal = $request->user()->savingsGoals()->find($goalId);
        
        if (!$savingsGoal) {
            return response()->json([
                'success' => false,
                'message' => 'Savings goal not found'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $savingsGoal->id,
                'name' => $savingsGoal->name,
                'target_amount' => $savingsGoal->target_amount,
                'current_amount' => $savingsGoal->current_amount,
                'is_primary' => $savingsGoal->is_primary,
                'progress_percentage' => $savingsGoal->getProgressPercentage(),
                'remaining_amount' => $savingsGoal->getRemainingAmount(),
                'is_completed' => $savingsGoal->isCompleted(),
                'created_at' => $savingsGoal->created_at,
                'updated_at' => $savingsGoal->updated_at,
            ]
        ]);
    }

    /**
     * Update the specified savings goal.
     */
    public function update(Request $request, $goalId): JsonResponse
    {
        // Find the goal that belongs to the authenticated user
        $savingsGoal = $request->user()->savingsGoals()->find($goalId);
        
        if (!$savingsGoal) {
            return response()->json([
                'success' => false,
                'message' => 'Savings goal not found'
            ], 404);
        }

        $validated = $request->validate([
            'name' => [
                'sometimes',
                'string',
                'max:255',
                Rule::unique('savings_goals')->where(function ($query) use ($request) {
                    return $query->where('s_user_id', $request->user()->id);
                })->ignore($savingsGoal->id)
            ],
            'target_amount' => 'sometimes|numeric|min:0.01',
            'current_amount' => 'sometimes|numeric|min:0',
            'is_primary' => 'sometimes|boolean'
        ]);

        $savingsGoal->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Savings goal updated successfully',
            'data' => [
                'id' => $savingsGoal->id,
                'name' => $savingsGoal->name,
                'target_amount' => $savingsGoal->target_amount,
                'current_amount' => $savingsGoal->current_amount,
                'is_primary' => $savingsGoal->is_primary,
                'progress_percentage' => $savingsGoal->getProgressPercentage(),
                'remaining_amount' => $savingsGoal->getRemainingAmount(),
                'is_completed' => $savingsGoal->isCompleted(),
                'created_at' => $savingsGoal->created_at,
                'updated_at' => $savingsGoal->updated_at,
            ]
        ]);
    }

    /**
     * Remove the specified savings goal.
     */
    public function destroy(Request $request, $goalId): JsonResponse
    {
        // Find the goal that belongs to the authenticated user
        $savingsGoal = $request->user()->savingsGoals()->find($goalId);
        
        if (!$savingsGoal) {
            return response()->json([
                'success' => false,
                'message' => 'Savings goal not found'
            ], 404);
        }

        $savingsGoal->delete();

        return response()->json([
            'success' => true,
            'message' => 'Savings goal deleted successfully'
        ]);
    }

    /**
     * Set a savings goal as primary.
     */
    public function setPrimary(Request $request, $goalId): JsonResponse
    {
        // Find the goal that belongs to the authenticated user
        $savingsGoal = $request->user()->savingsGoals()->find($goalId);
        
        if (!$savingsGoal) {
            return response()->json([
                'success' => false,
                'message' => 'Savings goal not found'
            ], 404);
        }

        // Set all other goals for this user to non-primary first
        $request->user()->savingsGoals()->update(['is_primary' => false]);
        
        // Set this goal as primary
        $savingsGoal->update(['is_primary' => true]);

        return response()->json([
            'success' => true,
            'message' => 'Primary goal set successfully',
            'data' => [
                'id' => $savingsGoal->id,
                'name' => $savingsGoal->name,
                'target_amount' => $savingsGoal->target_amount,
                'current_amount' => $savingsGoal->current_amount,
                'is_primary' => $savingsGoal->is_primary,
                'progress_percentage' => $savingsGoal->getProgressPercentage(),
                'remaining_amount' => $savingsGoal->getRemainingAmount(),
                'is_completed' => $savingsGoal->isCompleted(),
                'created_at' => $savingsGoal->created_at,
                'updated_at' => $savingsGoal->updated_at,
            ]
        ]);
    }

    /**
     * Get the primary savings goal.
     */
    public function getPrimary(Request $request): JsonResponse
    {
        $primaryGoal = $request->user()->getPrimaryGoal();

        if (!$primaryGoal) {
            return response()->json([
                'success' => true,
                'data' => null
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $primaryGoal->id,
                'name' => $primaryGoal->name,
                'target_amount' => $primaryGoal->target_amount,
                'current_amount' => $primaryGoal->current_amount,
                'is_primary' => $primaryGoal->is_primary,
                'progress_percentage' => $primaryGoal->getProgressPercentage(),
                'remaining_amount' => $primaryGoal->getRemainingAmount(),
                'is_completed' => $primaryGoal->isCompleted(),
                'created_at' => $primaryGoal->created_at,
                'updated_at' => $primaryGoal->updated_at,
            ]
        ]);
    }
}