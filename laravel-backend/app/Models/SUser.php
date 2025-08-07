<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class SUser extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $table = 'saveusers';

    protected $fillable = [
        'name',
        'email',
        'password',
        'net_income',
        'profile_picture',
        'voice_notifications_enabled',
        'reminder_frequency',
        'theme',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'net_income' => 'decimal:2',
        'voice_notifications_enabled' => 'boolean',
    ];

    // Relationships
    public function savingsGoals()
    {
        return $this->hasMany(SavingsGoal::class, 's_user_id');
    }

    public function savingsEntries()
    {
        return $this->hasMany(SavingsEntry::class, 's_user_id');
    }

    public function withdrawalEntries()
    {
        return $this->hasMany(WithdrawalEntry::class, 's_user_id');
    }

    // Helper methods
    public function getPrimaryGoal()
    {
        return $this->savingsGoals()->where('is_primary', true)->first();
    }

    public function getTotalSavings()
    {
        $totalSaved = $this->savingsEntries()->sum('amount_saved');
        $totalWithdrawn = $this->withdrawalEntries()->sum('amount_withdrawn');
        return $totalSaved - $totalWithdrawn;
    }

    public function getHistoryEntries()
    {
        $savings = $this->savingsEntries()->with('savingsGoal')->get()->map(function ($entry) {
            return [
                'id' => $entry->id,
                'type' => 'deposit',
                'amount' => $entry->amount_saved,
                'net_income' => $entry->net_income,
                'goal_name' => $entry->savingsGoal?->name,
                'date' => $entry->created_at,
                'notes' => $entry->notes,
            ];
        });

        $withdrawals = $this->withdrawalEntries()->with('savingsGoal')->get()->map(function ($entry) {
            return [
                'id' => $entry->id,
                'type' => 'withdrawal',
                'amount' => $entry->amount_withdrawn,
                'goal_name' => $entry->savingsGoal?->name,
                'date' => $entry->created_at,
                'reason' => $entry->reason,
                'notes' => $entry->notes,
            ];
        });

        return $savings->concat($withdrawals)->sortByDesc('date')->values();
    }
}