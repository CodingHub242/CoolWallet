<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SavingsEntry;
use App\Models\SavingsGoal;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class SavingsEntryController extends Controller
{
    /**
     * Display a listing of the user's savings entries.
     */
    public function index(Request $request): JsonResponse
    {
        $entries = $request->user()->savingsEntries()
            ->with('savingsGoal')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($entry) {
                return [
                    'id' => $entry->id,
                    'net_income' => $entry->net_income,
                    'amount_saved' => $entry->amount_saved,
                    'notes' => $entry->notes,
                    'savings_goal' => $entry->savingsGoal ? [
                        'id' => $entry->savingsGoal->id,
                        'name' => $entry->savingsGoal->name,
                    ] : null,
                    'created_at' => $entry->created_at,
                    'updated_at' => $entry->updated_at,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $entries
        ]);
    }

    /**
     * Store a newly created savings entry.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'net_income' => 'nullable|numeric|min:0',
            'amount_saved' => 'required|numeric|min:0.01',
            'savings_goal_id' => 'nullable|exists:savings_goals,id',
            'notes' => 'nullable|string|max:1000'
        ]);

        // Verify the savings goal belongs to the user if provided
        if (isset($validated['savings_goal_id'])) {
            $goal = SavingsGoal::where('id', $validated['savings_goal_id'])
                ->where('s_user_id', $request->user()->id)
                ->first();
            
            if (!$goal) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid savings goal'
                ], 400);
            }
        }

        $validated['s_user_id'] = $request->user()->id;

        // If no specific goal is provided, use the primary goal
        if (!isset($validated['savings_goal_id'])) {
            $primaryGoal = $request->user()->getPrimaryGoal();
            if ($primaryGoal) {
                $validated['savings_goal_id'] = $primaryGoal->id;
            }
        }

        $entry = SavingsEntry::create($validated);
        $entry->load('savingsGoal');

        return response()->json([
            'success' => true,
            'message' => 'Savings entry created successfully',
            'data' => [
                'id' => $entry->id,
                'net_income' => $entry->net_income,
                'amount_saved' => $entry->amount_saved,
                'notes' => $entry->notes,
                'savings_goal' => $entry->savingsGoal ? [
                    'id' => $entry->savingsGoal->id,
                    'name' => $entry->savingsGoal->name,
                ] : null,
                'created_at' => $entry->created_at,
                'updated_at' => $entry->updated_at,
            ]
        ], 201);
    }

    /**
     * Display the specified savings entry.
     */
    public function show(Request $request, $entryId): JsonResponse
    {
        // Find the entry that belongs to the authenticated user
        $savingsEntry = $request->user()->savingsEntries()->find($entryId);
        
        if (!$savingsEntry) {
            return response()->json([
                'success' => false,
                'message' => 'Savings entry not found'
            ], 404);
        }

        $savingsEntry->load('savingsGoal');

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $savingsEntry->id,
                'net_income' => $savingsEntry->net_income,
                'amount_saved' => $savingsEntry->amount_saved,
                'notes' => $savingsEntry->notes,
                'savings_goal' => $savingsEntry->savingsGoal ? [
                    'id' => $savingsEntry->savingsGoal->id,
                    'name' => $savingsEntry->savingsGoal->name,
                ] : null,
                'created_at' => $savingsEntry->created_at,
                'updated_at' => $savingsEntry->updated_at,
            ]
        ]);
    }

    /**
     * Update the specified savings entry.
     */
    public function update(Request $request, $entryId): JsonResponse
    {
        // Find the entry that belongs to the authenticated user
        $savingsEntry = $request->user()->savingsEntries()->find($entryId);
        
        if (!$savingsEntry) {
            return response()->json([
                'success' => false,
                'message' => 'Savings entry not found'
            ], 404);
        }

        $validated = $request->validate([
            'net_income' => 'sometimes|nullable|numeric|min:0',
            'amount_saved' => 'sometimes|numeric|min:0.01',
            'savings_goal_id' => 'sometimes|nullable|exists:savings_goals,id',
            'notes' => 'sometimes|nullable|string|max:1000'
        ]);

        // Verify the savings goal belongs to the user if provided
        if (isset($validated['savings_goal_id'])) {
            $goal = SavingsGoal::where('id', $validated['savings_goal_id'])
                ->where('s_user_id', $request->user()->id)
                ->first();
            
            if (!$goal) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid savings goal'
                ], 400);
            }
        }

        $savingsEntry->update($validated);
        $savingsEntry->load('savingsGoal');

        return response()->json([
            'success' => true,
            'message' => 'Savings entry updated successfully',
            'data' => [
                'id' => $savingsEntry->id,
                'net_income' => $savingsEntry->net_income,
                'amount_saved' => $savingsEntry->amount_saved,
                'notes' => $savingsEntry->notes,
                'savings_goal' => $savingsEntry->savingsGoal ? [
                    'id' => $savingsEntry->savingsGoal->id,
                    'name' => $savingsEntry->savingsGoal->name,
                ] : null,
                'created_at' => $savingsEntry->created_at,
                'updated_at' => $savingsEntry->updated_at,
            ]
        ]);
    }

    /**
     * Remove the specified savings entry.
     */
    public function destroy(Request $request, $entryId): JsonResponse
    {
        // Find the entry that belongs to the authenticated user
        $savingsEntry = $request->user()->savingsEntries()->find($entryId);
        
        if (!$savingsEntry) {
            return response()->json([
                'success' => false,
                'message' => 'Savings entry not found'
            ], 404);
        }

        $savingsEntry->delete();

        return response()->json([
            'success' => true,
            'message' => 'Savings entry deleted successfully'
        ]);
    }

    /**
     * Get total savings for the user.
     */
    public function getTotalSavings(Request $request): JsonResponse
    {
        $totalSavings = $request->user()->getTotalSavings();

        return response()->json([
            'success' => true,
            'data' => [
                'total_savings' => $totalSavings
            ]
        ]);
    }
}