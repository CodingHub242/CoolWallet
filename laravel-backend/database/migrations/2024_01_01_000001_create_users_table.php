<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->decimal('net_income', 10, 2)->default(0);
            $table->string('profile_picture')->nullable();
            $table->boolean('voice_notifications_enabled')->default(true);
            $table->enum('reminder_frequency', ['daily', 'weekly', 'monthly', 'none'])->default('weekly');
            $table->enum('theme', ['light', 'dark', 'maroon'])->default('light');
            $table->rememberToken();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('users');
    }
};