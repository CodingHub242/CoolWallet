<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ReceivedAmount extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'amount',
        'date_received',
        'is_loan',
        'lender',
        'loan_status',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'date_received' => 'date',
        'is_loan' => 'boolean',
    ];

    // Relationships
    public function user()
    {
        return $this->belongsTo(SUser::class, 'user_id');
    }

    public function expenses()
    {
        return $this->hasMany(Expense::class, 'received_amount_id');
    }

    // Helper methods
    public function getTotalExpenses()
    {
        return $this->expenses()->sum('amount');
    }

    public function getRemainingAmount()
    {
        return $this->amount - $this->getTotalExpenses();
    }
}