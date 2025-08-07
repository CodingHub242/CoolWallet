<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSavingsGoalRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('savings_goals')->where(function ($query) {
                    return $query->where('user_id', $this->user()->id);
                })
            ],
            'target_amount' => 'required|numeric|min:0.01|max:999999999.99',
            'current_amount' => 'nullable|numeric|min:0|max:999999999.99',
            'is_primary' => 'boolean'
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'name.required' => 'The goal name is required.',
            'name.unique' => 'You already have a savings goal with this name.',
            'target_amount.required' => 'The target amount is required.',
            'target_amount.min' => 'The target amount must be at least 0.01.',
            'target_amount.max' => 'The target amount cannot exceed 999,999,999.99.',
            'current_amount.min' => 'The current amount cannot be negative.',
            'current_amount.max' => 'The current amount cannot exceed 999,999,999.99.',
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'current_amount' => $this->current_amount ?? 0,
            'is_primary' => $this->is_primary ?? false,
        ]);
    }
}