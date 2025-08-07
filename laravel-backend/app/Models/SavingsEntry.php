<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SavingsEntry extends Model
{
    use HasFactory;

    protected $fillable = [
        's_user_id',
        'savings_goal_id',
        'net_income',
        'amount_saved',
        'notes',
    ];

    protected $casts = [
        'net_income' => 'decimal:2',
        'amount_saved' => 'decimal:2',
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
                $entry->savingsGoal->increment('current_amount', $entry->amount_saved);
            }
        });

        static::updated(function ($entry) {
            if ($entry->savingsGoal && $entry->isDirty('amount_saved')) {
                $oldAmount = $entry->getOriginal('amount_saved');
                $newAmount = $entry->amount_saved;
                $difference = $newAmount - $oldAmount;
                
                $entry->savingsGoal->increment('current_amount', $difference);
            }
        });

        static::deleted(function ($entry) {
            if ($entry->savingsGoal) {
                $entry->savingsGoal->decrement('current_amount', $entry->amount_saved);
            }
        });
    }
}