<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WithdrawalEntry extends Model
{
    use HasFactory;

    protected $fillable = [
        's_user_id',
        'savings_goal_id',
        'amount_withdrawn',
        'reason',
        'notes',
    ];

    protected $casts = [
        'amount_withdrawn' => 'decimal:2',
    ];

    // Relationships
    public function user()
    {
        return $this->belongsTo(SUser::class, 's_user_id');
    }

    public function savingsGoal()
    {
        return $this->belongsTo(SavingsGoal::class);
    }

    // Boot method to update goal amounts
    protected static function boot()
    {
        parent::boot();

        static::created(function ($entry) {
            if ($entry->savingsGoal) {
                $entry->savingsGoal->decrement('current_amount', $entry->amount_withdrawn);
            }
        });

        static::updated(function ($entry) {
            if ($entry->savingsGoal && $entry->isDirty('amount_withdrawn')) {
                $oldAmount = $entry->getOriginal('amount_withdrawn');
                $newAmount = $entry->amount_withdrawn;
                $difference = $newAmount - $oldAmount;
                
                $entry->savingsGoal->decrement('current_amount', $difference);
            }
        });

        static::deleted(function ($entry) {
            if ($entry->savingsGoal) {
                $entry->savingsGoal->increment('current_amount', $entry->amount_withdrawn);
            }
        });
    }
}