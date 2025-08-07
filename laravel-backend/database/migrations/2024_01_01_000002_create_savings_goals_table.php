<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('savings_goals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('name');
            $table->decimal('target_amount', 10, 2);
            $table->decimal('current_amount', 10, 2)->default(0);
            $table->boolean('is_primary')->default(false);
            $table->timestamps();

            // Ensure unique goal names per user
            $table->unique(['user_id', 'name']);
            
            // Index for faster queries
            $table->index(['user_id', 'is_primary']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('savings_goals');
    }
};