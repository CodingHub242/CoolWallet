<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SavingsGoal extends Model
{
    use HasFactory;

    protected $fillable = [
        's_user_id',
        'name',
        'target_amount',
        'current_amount',
        'is_primary',
    ];

    protected $casts = [
        'target_amount' => 'decimal:2',
        'current_amount' => 'decimal:2',
        'is_primary' => 'boolean',
    ];

    // Relationships
    public function user()
    {
        return $this->belongsTo(SUser::class, 's_user_id');
    }

    public function savingsEntries()
    {
        return $this->hasMany(SavingsEntry::class);
    }

    public function withdrawalEntries()
    {
        return $this->hasMany(WithdrawalEntry::class);
    }

    // Helper methods
    public function getProgressPercentage()
    {
        if ($this->target_amount == 0) {
            return 0;
        }
        return min(($this->current_amount / $this->target_amount) * 100, 100);
    }

    public function getRemainingAmount()
    {
        return max($this->target_amount - $this->current_amount, 0);
    }

    public function isCompleted()
    {
        return $this->current_amount >= $this->target_amount;
    }

    // Boot method to handle primary goal logic
    protected static function boot()
    {
        parent::boot();

        static::saving(function ($goal) {
            if ($goal->is_primary) {
                // Set all other goals for this user to non-primary
                static::where('s_user_id', $goal->s_user_id)
                    ->where('id', '!=', $goal->id)
                    ->update(['is_primary' => false]);
            }
        });
    }
}