<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WithdrawalEntry;
use App\Models\SavingsGoal;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class WithdrawalEntryController extends Controller
{
    /**
     * Display a listing of the user's withdrawal entries.
     */
    public function index(Request $request): JsonResponse
    {
        $entries = $request->user()->withdrawalEntries()
            ->with('savingsGoal')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($entry) {
                return [
                    'id' => $entry->id,
                    'amount_withdrawn' => $entry->amount_withdrawn,
                    'reason' => $entry->reason,
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
     * Store a newly created withdrawal entry.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'amount_withdrawn' => 'required|numeric|min:0.01',
            'savings_goal_id' => 'nullable|exists:savings_goals,id',
            'reason' => 'nullable|string|max:500',
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

            // Check if the goal has sufficient balance
            if ($goal->current_amount < $validated['amount_withdrawn']) {
                return response()->json([
                    'success' => false,
                    'message' => 'Insufficient balance in the selected savings goal'
                ], 400);
            }
        } else {
            // Check total savings if no specific goal
            $totalSavings = $request->user()->getTotalSavings();
            if ($totalSavings < $validated['amount_withdrawn']) {
                return response()->json([
                    'success' => false,
                    'message' => 'Insufficient total savings balance'
                ], 400);
            }
        }

        $validated['s_user_id'] = $request->user()->id;

        $entry = WithdrawalEntry::create($validated);
        $entry->load('savingsGoal');

        return response()->json([
            'success' => true,
            'message' => 'Withdrawal entry created successfully',
            'data' => [
                'id' => $entry->id,
                'amount_withdrawn' => $entry->amount_withdrawn,
                'reason' => $entry->reason,
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
     * Display the specified withdrawal entry.
     */
    public function show(Request $request, $entryId): JsonResponse
    {
        // Find the entry that belongs to the authenticated user
        $withdrawalEntry = $request->user()->withdrawalEntries()->find($entryId);
        
        if (!$withdrawalEntry) {
            return response()->json([
                'success' => false,
                'message' => 'Withdrawal entry not found'
            ], 404);
        }

        $withdrawalEntry->load('savingsGoal');

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $withdrawalEntry->id,
                'amount_withdrawn' => $withdrawalEntry->amount_withdrawn,
                'reason' => $withdrawalEntry->reason,
                'notes' => $withdrawalEntry->notes,
                'savings_goal' => $withdrawalEntry->savingsGoal ? [
                    'id' => $withdrawalEntry->savingsGoal->id,
                    'name' => $withdrawalEntry->savingsGoal->name,
                ] : null,
                'created_at' => $withdrawalEntry->created_at,
                'updated_at' => $withdrawalEntry->updated_at,
            ]
        ]);
    }

    /**
     * Update the specified withdrawal entry.
     */
    public function update(Request $request, $entryId): JsonResponse
    {
        // Find the entry that belongs to the authenticated user
        $withdrawalEntry = $request->user()->withdrawalEntries()->find($entryId);
        
        if (!$withdrawalEntry) {
            return response()->json([
                'success' => false,
                'message' => 'Withdrawal entry not found'
            ], 404);
        }

        $validated = $request->validate([
            'amount_withdrawn' => 'sometimes|numeric|min:0.01',
            'savings_goal_id' => 'sometimes|nullable|exists:savings_goals,id',
            'reason' => 'sometimes|nullable|string|max:500',
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

        // If amount is being updated, check balance constraints
        if (isset($validated['amount_withdrawn'])) {
            $oldAmount = $withdrawalEntry->amount_withdrawn;
            $newAmount = $validated['amount_withdrawn'];
            $difference = $newAmount - $oldAmount;

            if ($difference > 0) { // Increasing withdrawal amount
                if ($withdrawalEntry->savingsGoal) {
                    $availableBalance = $withdrawalEntry->savingsGoal->current_amount + $oldAmount;
                    if ($availableBalance < $newAmount) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Insufficient balance in the selected savings goal'
                        ], 400);
                    }
                } else {
                    $totalSavings = $request->user()->getTotalSavings() + $oldAmount;
                    if ($totalSavings < $newAmount) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Insufficient total savings balance'
                        ], 400);
                    }
                }
            }
        }

        $withdrawalEntry->update($validated);
        $withdrawalEntry->load('savingsGoal');

        return response()->json([
            'success' => true,
            'message' => 'Withdrawal entry updated successfully',
            'data' => [
                'id' => $withdrawalEntry->id,
                'amount_withdrawn' => $withdrawalEntry->amount_withdrawn,
                'reason' => $withdrawalEntry->reason,
                'notes' => $withdrawalEntry->notes,
                'savings_goal' => $withdrawalEntry->savingsGoal ? [
                    'id' => $withdrawalEntry->savingsGoal->id,
                    'name' => $withdrawalEntry->savingsGoal->name,
                ] : null,
                'created_at' => $withdrawalEntry->created_at,
                'updated_at' => $withdrawalEntry->updated_at,
            ]
        ]);
    }

    /**
     * Remove the specified withdrawal entry.
     */
    public function destroy(Request $request, $entryId): JsonResponse
    {
        // Find the entry that belongs to the authenticated user
        $withdrawalEntry = $request->user()->withdrawalEntries()->find($entryId);
        
        if (!$withdrawalEntry) {
            return response()->json([
                'success' => false,
                'message' => 'Withdrawal entry not found'
            ], 404);
        }

        $withdrawalEntry->delete();

        return response()->json([
            'success' => true,
            'message' => 'Withdrawal entry deleted successfully'
        ]);
    }
}