<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ReceivedAmount;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;

class ReceivedAmountController extends Controller
{
/**
     * Get all received amounts for the authenticated user.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        
        // Debug: if no user, return all data to diagnose
        if (!$user) {
            $allData = DB::table('received_amounts')->get();
            return response()->json([
                'success' => true,
                'data' => $allData,
                'debug' => 'No authenticated user - returning all data'
            ]);
        }
        
        $userId = $user->id;
        
        // If no filters, return all data for this user
        if (!$request->has('month') || !$request->has('year')) {
            $results = DB::table('received_amounts')
                ->where('user_id', $userId)
                ->orderBy('date_received', 'desc')
                ->get();
            
            return response()->json([
                'success' => true,
                'data' => $results,
                'debug' => 'user_id: ' . $userId
            ]);
        }
        
        // With filters - use date range instead of MONTH/YEAR functions
        $month = (int)$request->input('month');
        $year = (int)$request->input('year');
        
        // Calculate start and end dates for the month
        $startDate = sprintf('%04d-%02d-01', $year, $month);
        $endDate = sprintf('%04d-%02d-31', $year, $month);
        
        $results = DB::table('received_amounts')
            ->where('user_id', $userId)
            ->where('date_received', '>=', $startDate)
            ->where('date_received', '<=', $endDate)
            ->orderBy('date_received', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $results,
            'debug' => 'user_id: ' . $userId . ', dates: ' . $startDate . ' to ' . $endDate
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