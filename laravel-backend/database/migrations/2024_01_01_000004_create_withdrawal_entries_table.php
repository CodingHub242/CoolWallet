<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('withdrawal_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('savings_goal_id')->nullable()->constrained()->onDelete('set null');
            $table->decimal('amount_withdrawn', 10, 2);
            $table->text('reason')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            // Index for faster queries
            $table->index(['user_id', 'created_at']);
            $table->index(['savings_goal_id', 'created_at']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('withdrawal_entries');
    }
};