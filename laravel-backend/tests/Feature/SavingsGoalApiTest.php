<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\SavingsGoal;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;

class SavingsGoalApiTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->user = User::factory()->create([
            'email' => 'test@example.com',
            'password' => bcrypt('password123')
        ]);
    }

    /** @test */
    public function user_can_create_savings_goal()
    {
        $goalData = [
            'name' => 'Emergency Fund',
            'target_amount' => 10000.00,
            'current_amount' => 0,
            'is_primary' => true
        ];

        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/savings-goals', $goalData);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'message' => 'Savings goal created successfully'
            ])
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'id',
                    'name',
                    'target_amount',
                    'current_amount',
                    'is_primary',
                    'progress_percentage',
                    'remaining_amount',
                    'is_completed',
                    'created_at',
                    'updated_at'
                ]
            ]);

        $this->assertDatabaseHas('savings_goals', [
            'user_id' => $this->user->id,
            'name' => 'Emergency Fund',
            'target_amount' => 10000.00,
            'is_primary' => true
        ]);
    }

    /** @test */
    public function user_can_get_all_savings_goals()
    {
        SavingsGoal::factory()->count(3)->create([
            'user_id' => $this->user->id
        ]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/savings-goals');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true
            ])
            ->assertJsonCount(3, 'data');
    }

    /** @test */
    public function user_can_update_savings_goal()
    {
        $goal = SavingsGoal::factory()->create([
            'user_id' => $this->user->id,
            'name' => 'Original Goal',
            'target_amount' => 5000.00
        ]);

        $updateData = [
            'name' => 'Updated Goal',
            'target_amount' => 7500.00
        ];

        $response = $this->actingAs($this->user, 'sanctum')
            ->putJson("/api/savings-goals/{$goal->id}", $updateData);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Savings goal updated successfully'
            ]);

        $this->assertDatabaseHas('savings_goals', [
            'id' => $goal->id,
            'name' => 'Updated Goal',
            'target_amount' => 7500.00
        ]);
    }

    /** @test */
    public function user_can_delete_savings_goal()
    {
        $goal = SavingsGoal::factory()->create([
            'user_id' => $this->user->id
        ]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->deleteJson("/api/savings-goals/{$goal->id}");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Savings goal deleted successfully'
            ]);

        $this->assertDatabaseMissing('savings_goals', [
            'id' => $goal->id
        ]);
    }

    /** @test */
    public function user_can_set_primary_goal()
    {
        $goal1 = SavingsGoal::factory()->create([
            'user_id' => $this->user->id,
            'is_primary' => true
        ]);

        $goal2 = SavingsGoal::factory()->create([
            'user_id' => $this->user->id,
            'is_primary' => false
        ]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->putJson("/api/savings-goals/{$goal2->id}/set-primary");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Primary goal set successfully'
            ]);

        $this->assertDatabaseHas('savings_goals', [
            'id' => $goal1->id,
            'is_primary' => false
        ]);

        $this->assertDatabaseHas('savings_goals', [
            'id' => $goal2->id,
            'is_primary' => true
        ]);
    }

    /** @test */
    public function user_cannot_access_other_users_goals()
    {
        $otherUser = User::factory()->create();
        $otherGoal = SavingsGoal::factory()->create([
            'user_id' => $otherUser->id
        ]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->getJson("/api/savings-goals/{$otherGoal->id}");

        $response->assertStatus(404);
    }

    /** @test */
    public function validation_fails_for_invalid_goal_data()
    {
        $invalidData = [
            'name' => '', // Required field
            'target_amount' => -100, // Must be positive
        ];

        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/savings-goals', $invalidData);

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
                'message' => 'Validation failed'
            ])
            ->assertJsonValidationErrors(['name', 'target_amount']);
    }
}