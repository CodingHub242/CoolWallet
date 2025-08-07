<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\SavingsGoalController;
use App\Http\Controllers\Api\SavingsEntryController;
use App\Http\Controllers\Api\WithdrawalEntryController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

// Public routes (no authentication required)
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/loginUser', [AuthController::class, 'login']); // Alternative endpoint for compatibility

// Protected routes (authentication required)
Route::middleware('auth:sanctum')->group(function () {
    
    // User routes
    Route::prefix('user')->group(function () {
        Route::get('/profile', [UserController::class, 'profile']);
        Route::put('/profile', [UserController::class, 'updateProfile']);
        Route::put('/password', [UserController::class, 'updatePassword']);
        Route::get('/dashboard', [UserController::class, 'dashboard']);
        Route::get('/history', [UserController::class, 'history']);
        Route::put('/net-income', [UserController::class, 'updateNetIncome']);
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
    });

    // Savings Goals routes
    Route::prefix('savings-goals')->group(function () {
        Route::get('/', [SavingsGoalController::class, 'index']);
        Route::post('/', [SavingsGoalController::class, 'store']);
        Route::get('/primary', [SavingsGoalController::class, 'getPrimary']);
        Route::get('/{goalId}', [SavingsGoalController::class, 'show']);
        Route::put('/{goalId}', [SavingsGoalController::class, 'update']);
        Route::delete('/{goalId}', [SavingsGoalController::class, 'destroy']);
        Route::put('/{goalId}/set-primary', [SavingsGoalController::class, 'setPrimary']);
    });

    // Savings Entries routes
    Route::prefix('savings-entries')->group(function () {
        Route::get('/', [SavingsEntryController::class, 'index']);
        Route::post('/', [SavingsEntryController::class, 'store']);
        Route::get('/total-savings', [SavingsEntryController::class, 'getTotalSavings']);
        Route::get('/{entryId}', [SavingsEntryController::class, 'show']);
        Route::put('/{entryId}', [SavingsEntryController::class, 'update']);
        Route::delete('/{entryId}', [SavingsEntryController::class, 'destroy']);
    });

    // Withdrawal Entries routes
    Route::prefix('withdrawal-entries')->group(function () {
        Route::get('/', [WithdrawalEntryController::class, 'index']);
        Route::post('/', [WithdrawalEntryController::class, 'store']);
        Route::get('/{entryId}', [WithdrawalEntryController::class, 'show']);
        Route::put('/{entryId}', [WithdrawalEntryController::class, 'update']);
        Route::delete('/{entryId}', [WithdrawalEntryController::class, 'destroy']);
    });

    // Alternative route structure for frontend compatibility
    Route::prefix('savings')->group(function () {
        // Goals
        Route::get('/goals', [SavingsGoalController::class, 'index']);
        Route::post('/goals', [SavingsGoalController::class, 'store']);
        Route::get('/goals/primary', [SavingsGoalController::class, 'getPrimary']);
        Route::put('/goals/{goalId}', [SavingsGoalController::class, 'update']);
        Route::delete('/goals/{goalId}', [SavingsGoalController::class, 'destroy']);
        Route::put('/goals/{goalId}/primary', [SavingsGoalController::class, 'setPrimary']);
        
        // Entries
        Route::get('/entries', [SavingsEntryController::class, 'index']);
        Route::post('/entries', [SavingsEntryController::class, 'store']);
        Route::put('/entries/{entryId}', [SavingsEntryController::class, 'update']);
        Route::delete('/entries/{entryId}', [SavingsEntryController::class, 'destroy']);
        
        // Total
        Route::get('/total', [SavingsEntryController::class, 'getTotalSavings']);
    });

    Route::prefix('withdrawals')->group(function () {
        Route::get('/', [WithdrawalEntryController::class, 'index']);
        Route::post('/', [WithdrawalEntryController::class, 'store']);
        Route::put('/{entryId}', [WithdrawalEntryController::class, 'update']);
        Route::delete('/{entryId}', [WithdrawalEntryController::class, 'destroy']);
    });
});

// Fallback route for API
Route::fallback(function () {
    return response()->json([
        'success' => false,
        'message' => 'API endpoint not found'
    ], 404);
});