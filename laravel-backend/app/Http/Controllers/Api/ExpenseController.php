<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\ReceivedAmount;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rule;

class ExpenseController extends Controller
{
    /**
     * Get all expenses for a specific received amount.
     */
    public function index(Request $request, int $receivedAmountId): JsonResponse
    {
        $user = $request->user();
        
        // Verify the received amount belongs to the user
        $receivedAmount = ReceivedAmount::where('user_id', $user->id)
                                        ->findOrFail($receivedAmountId);
        
        $expenses = Expense::where('received_amount_id', $receivedAmountId)
                          ->orderBy('date', 'desc')
                          ->get();

        return response()->json([
            'success' => true,
            'data' => $expenses
        ]);
    }

    /**
     * Store a newly created expense.
     */
    public function store(Request $request, int $receivedAmountId): JsonResponse
    {
        $user = $request->user();
        
        // Verify the received amount belongs to the user
        $receivedAmount = ReceivedAmount::where('user_id', $user->id)
                                        ->findOrFail($receivedAmountId);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0.01',
            'date' => 'required|date',
        ]);

        $expense = Expense::create([
            'received_amount_id' => $receivedAmountId,
            'name' => $validated['name'],
            'amount' => $validated['amount'],
            'date' => $validated['date'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Expense created successfully',
            'data' => $expense
        ], 201);
    }

    /**
     * Display the specified expense.
     */
    public function show(Request $request, int $receivedAmountId, int $id): JsonResponse
    {
        $user = $request->user();
        
        // Verify the received amount belongs to the user
        $receivedAmount = ReceivedAmount::where('user_id', $user->id)
                                        ->findOrFail($receivedAmountId);
        
        $expense = Expense::where('received_amount_id', $receivedAmountId)
                          ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $expense
        ]);
    }

    /**
     * Update the specified expense.
     */
    public function update(Request $request, int $receivedAmountId, int $id): JsonResponse
    {
        $user = $request->user();
        
        // Verify the received amount belongs to the user
        $receivedAmount = ReceivedAmount::where('user_id', $user->id)
                                        ->findOrFail($receivedAmountId);
        
        $expense = Expense::where('received_amount_id', $receivedAmountId)
                          ->findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'amount' => 'sometimes|numeric|min:0.01',
            'date' => 'sometimes|date',
        ]);

        $expense->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Expense updated successfully',
            'data' => $expense
        ]);
    }

    /**
     * Remove the specified expense.
     */
    public function destroy(Request $request, int $receivedAmountId, int $id): JsonResponse
    {
        $user = $request->user();
        
        // Verify the received amount belongs to the user
        $receivedAmount = ReceivedAmount::where('user_id', $user->id)
                                        ->findOrFail($receivedAmountId);
        
        $expense = Expense::where('received_amount_id', $receivedAmountId)
                          ->findOrFail($id);

        $expense->delete();

        return response()->json([
            'success' => true,
            'message' => 'Expense deleted successfully'
        ]);
    }
}