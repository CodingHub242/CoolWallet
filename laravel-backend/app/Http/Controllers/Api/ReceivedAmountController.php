<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ReceivedAmount;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rule;

class ReceivedAmountController extends Controller
{
    /**
     * Get all received amounts for the authenticated user.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = ReceivedAmount::where('user_id', $user->id);

        // Filter by month/year if provided
        if ($request->has('month') && $request->has('year')) {
            $month = (int)$request->input('month');
            $year = (int)$request->input('year');
            $query->whereMonth('date_received', $month)
                  ->whereYear('date_received', $year);
        }

        $receivedAmounts = $query->with(['expenses'])
                                ->orderBy('date_received', 'desc')
                                ->get();

        return response()->json([
            'success' => true,
            'data' => $receivedAmounts
        ]);
    }

    /**
     * Store a newly created received amount.
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validate([
            'amount' => 'required|numeric|min:0',
            'date_received' => 'required|date',
            'is_loan' => 'sometimes|boolean',
            'lender' => 'required_if:is_loan,true|string|max:255',
            'loan_status' => 'sometimes|in:pending,partially_paid,paid',
        ]);

        $receivedAmount = ReceivedAmount::create([
            'user_id' => $user->id,
            'amount' => $validated['amount'],
            'date_received' => $validated['date_received'],
            'is_loan' => $validated['is_loan'] ?? false,
            'lender' => $validated['lender'] ?? null,
            'loan_status' => $validated['loan_status'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Received amount created successfully',
            'data' => $receivedAmount
        ], 201);
    }

    /**
     * Display the specified received amount.
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $receivedAmount = ReceivedAmount::where('user_id', $user->id)
                                        ->with(['expenses'])
                                        ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $receivedAmount
        ]);
    }

    /**
     * Update the specified received amount.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $receivedAmount = ReceivedAmount::where('user_id', $user->id)
                                        ->findOrFail($id);

        $validated = $request->validate([
            'amount' => 'sometimes|numeric|min:0',
            'date_received' => 'sometimes|date',
            'is_loan' => 'sometimes|boolean',
            'lender' => 'required_if:is_loan,true|string|max:255',
            'loan_status' => 'sometimes|in:pending,partially_paid,paid',
        ]);

        $receivedAmount->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Received amount updated successfully',
            'data' => $receivedAmount
        ]);
    }

    /**
     * Remove the specified received amount.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $receivedAmount = ReceivedAmount::where('user_id', $user->id)
                                        ->findOrFail($id);

        $receivedAmount->delete();

        return response()->json([
            'success' => true,
            'message' => 'Received amount deleted successfully'
        ]);
    }
}