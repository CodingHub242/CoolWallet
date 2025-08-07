# Savings Wallet App - Laravel Backend API

This is the Laravel backend API for the Savings Wallet mobile application built with Ionic Angular.

## Features

- User authentication with Laravel Sanctum
- Savings goals management (CRUD operations)
- Savings entries tracking
- Withdrawal entries tracking
- User profile and settings management
- Comprehensive API validation and error handling
- Database relationships and data integrity

## Requirements

- PHP 8.1 or higher
- Composer
- MySQL 8.0 or higher
- Laravel 10.x

## Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd laravel-backend
```

2. **Install dependencies**
```bash
composer install
```

3. **Environment setup**
```bash
cp .env.example .env
```

4. **Configure your database in `.env`**
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=savings_wallet_db
DB_USERNAME=your_username
DB_PASSWORD=your_password
```

5. **Generate application key**
```bash
php artisan key:generate
```

6. **Run migrations**
```bash
php artisan migrate
```

7. **Start the development server**
```bash
php artisan serve
```

The API will be available at `http://localhost:8000`

## Database Schema

### Users Table
- `id` - Primary key
- `name` - User's full name
- `email` - Unique email address
- `password` - Hashed password
- `net_income` - User's net income
- `profile_picture` - Profile picture URL
- `voice_notifications_enabled` - Boolean for voice notifications
- `reminder_frequency` - Enum: daily, weekly, monthly, none
- `theme` - Enum: light, dark, maroon

### Savings Goals Table
- `id` - Primary key
- `user_id` - Foreign key to users
- `name` - Goal name (unique per user)
- `target_amount` - Target savings amount
- `current_amount` - Current saved amount
- `is_primary` - Boolean for primary goal

### Savings Entries Table
- `id` - Primary key
- `user_id` - Foreign key to users
- `savings_goal_id` - Foreign key to savings goals (nullable)
- `net_income` - Net income at time of saving
- `amount_saved` - Amount saved in this entry
- `notes` - Optional notes

### Withdrawal Entries Table
- `id` - Primary key
- `user_id` - Foreign key to users
- `savings_goal_id` - Foreign key to savings goals (nullable)
- `amount_withdrawn` - Amount withdrawn
- `reason` - Reason for withdrawal
- `notes` - Optional notes

## API Endpoints

### Authentication

#### Register User
```http
POST /api/register
Content-Type: application/json

{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "password_confirmation": "password123",
    "net_income": 5000.00
}
```

#### Login User
```http
POST /api/login
Content-Type: application/json

{
    "email": "john@example.com",
    "password": "password123"
}
```

#### Logout User
```http
POST /api/user/logout
Authorization: Bearer {token}
```

### User Management

#### Get User Profile
```http
GET /api/user/profile
Authorization: Bearer {token}
```

#### Update User Profile
```http
PUT /api/user/profile
Authorization: Bearer {token}
Content-Type: application/json

{
    "name": "John Doe Updated",
    "net_income": 6000.00,
    "voice_notifications_enabled": true,
    "reminder_frequency": "weekly",
    "theme": "dark"
}
```

#### Get Dashboard Data
```http
GET /api/user/dashboard
Authorization: Bearer {token}
```

#### Get History
```http
GET /api/user/history
Authorization: Bearer {token}
```

### Savings Goals

#### Get All Goals
```http
GET /api/savings-goals
Authorization: Bearer {token}
```

#### Create Goal
```http
POST /api/savings-goals
Authorization: Bearer {token}
Content-Type: application/json

{
    "name": "Emergency Fund",
    "target_amount": 10000.00,
    "current_amount": 0,
    "is_primary": true
}
```

#### Update Goal
```http
PUT /api/savings-goals/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
    "name": "Updated Goal Name",
    "target_amount": 15000.00
}
```

#### Delete Goal
```http
DELETE /api/savings-goals/{id}
Authorization: Bearer {token}
```

#### Set Primary Goal
```http
PUT /api/savings-goals/{id}/set-primary
Authorization: Bearer {token}
```

#### Get Primary Goal
```http
GET /api/savings-goals/primary
Authorization: Bearer {token}
```

### Savings Entries

#### Get All Savings Entries
```http
GET /api/savings-entries
Authorization: Bearer {token}
```

#### Create Savings Entry
```http
POST /api/savings-entries
Authorization: Bearer {token}
Content-Type: application/json

{
    "net_income": 5000.00,
    "amount_saved": 500.00,
    "savings_goal_id": 1,
    "notes": "Monthly savings"
}
```

#### Update Savings Entry
```http
PUT /api/savings-entries/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
    "amount_saved": 600.00,
    "notes": "Updated monthly savings"
}
```

#### Delete Savings Entry
```http
DELETE /api/savings-entries/{id}
Authorization: Bearer {token}
```

#### Get Total Savings
```http
GET /api/savings-entries/total-savings
Authorization: Bearer {token}
```

### Withdrawal Entries

#### Get All Withdrawal Entries
```http
GET /api/withdrawal-entries
Authorization: Bearer {token}
```

#### Create Withdrawal Entry
```http
POST /api/withdrawal-entries
Authorization: Bearer {token}
Content-Type: application/json

{
    "amount_withdrawn": 200.00,
    "savings_goal_id": 1,
    "reason": "Emergency expense",
    "notes": "Car repair"
}
```

#### Update Withdrawal Entry
```http
PUT /api/withdrawal-entries/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
    "amount_withdrawn": 250.00,
    "reason": "Updated emergency expense"
}
```

#### Delete Withdrawal Entry
```http
DELETE /api/withdrawal-entries/{id}
Authorization: Bearer {token}
```

## Response Format

All API responses follow this consistent format:

### Success Response
```json
{
    "success": true,
    "message": "Operation completed successfully",
    "data": {
        // Response data here
    }
}
```

### Error Response
```json
{
    "success": false,
    "message": "Error description",
    "errors": {
        // Validation errors (if applicable)
    }
}
```

## Error Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Validation Error
- `500` - Internal Server Error

## Authentication

This API uses Laravel Sanctum for authentication. Include the Bearer token in the Authorization header for protected routes:

```
Authorization: Bearer {your-token-here}
```

## Data Validation

The API includes comprehensive validation for all inputs:

- **Savings Goals**: Name uniqueness per user, positive amounts
- **Savings Entries**: Positive amounts, valid goal references
- **Withdrawal Entries**: Sufficient balance checks, positive amounts
- **User Data**: Email uniqueness, password strength

## Business Logic

- **Primary Goals**: Only one goal can be primary per user
- **Balance Tracking**: Automatic balance updates when entries are created/updated/deleted
- **Data Integrity**: Foreign key constraints ensure data consistency
- **User Isolation**: All data is scoped to the authenticated user

## Testing

Run the test suite:
```bash
php artisan test
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License.