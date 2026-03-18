# RT Management System

A modern web application for managing Rukun Tetangga (RT) communities with secure authentication, role-based access control, and user management.

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- PostgreSQL (v12 or higher)
- A `.env` file with database connection string

### Installation

1. **Clone/Setup the project:**

   ```bash
   cd KBART4RW18-WEBAPP
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Configure environment variables:**

   ```bash
   cp .env.example .env
   # Edit .env with your database URL and other settings
   ```

4. **Setup database:**

   ```bash
   # Generate Prisma client
   npm run db:generate

   # Create database schema
   npm run db:push

   # Seed initial data
   npm run db:seed
   ```

5. **Start the application:**

   ```bash
   npm start
   ```

   For development with auto-reload:

   ```bash
   npm run dev
   ```

6. **Access the application:**
   - **Home:** http://localhost:3000
   - **Login:** http://localhost:3000/login
   - **Default credentials:**
     - Phone: `admin`
     - Password: `admin123`

## 📚 Project Structure

```
src/
├── config/           # Configuration files (database, session)
├── controllers/      # Route controllers
├── middlewares/      # Express middlewares (auth, RBAC)
├── routes/          # API route definitions
├── services/        # Business logic (to be added)
├── utils/           # Utility functions (logger, helpers)
├── views/           # EJS templates
└── index.js         # Express application entry point

prisma/
├── schema.prisma    # Database schema definition
└── seed.js          # Initial data seeding

public/
├── css/             # Stylesheets
└── js/              # Client-side scripts
```

## 🔐 Authentication & Authorization

### Authentication

- Session-based authentication using `express-session`
- Sessions stored in PostgreSQL
- Password hashing with bcrypt

### Authorization

- Role-Based Access Control (RBAC)
- Permission-based system (not role-based checks)
- Dynamic permission loading from database

### Default Roles

| Role        | Permissions                                            |
| ----------- | ------------------------------------------------------ |
| super_admin | All permissions                                        |
| ketua_rt    | dashboard.view, warga.create, warga.read, warga.update |
| warga       | No special permissions                                 |

## 📊 Database

Built with Prisma ORM and PostgreSQL.

### Main Tables

- `users` - User accounts and credentials
- `roles` - Role definitions
- `permissions` - Permission definitions
- `user_roles` - User-Role relationships (many-to-many)
- `role_permissions` - Role-Permission relationships (many-to-many)
- `activation_tokens` - User account activation tokens

## 📖 Routes

| Method | Route     | Auth | Description  |
| ------ | --------- | ---- | ------------ |
| GET    | `/`       | -    | Landing page |
| GET    | `/login`  | -    | Login page   |
| POST   | `/login`  | -    | Handle login |
| GET    | `/logout` | ✓    | Logout       |
| GET    | `/portal` | ✓    | User portal  |

## 🛠️ Available Commands

```bash
# Start application
npm start

# Development mode with file watching
npm run dev

# Database commands
npm run db:generate    # Generate Prisma client
npm run db:push        # Push schema to database
npm run db:migrate     # Create migration
npm run db:seed        # Seed initial data
```

## 📝 Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture and flows
- [DATABASE.md](DATABASE.md) - Database schema design
- [RBAC.md](RBAC.md) - Role-Based Access Control design
- [AGENTS.md](AGENTS.md) - AI Agent rules and conventions
- [PROGRESS.md](PROGRESS.md) - Development progress log
- [DECISION_LOG.md](DECISION_LOG.md) - Important decisions

## 🔧 Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```env
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/rt_management?schema=public"

# Session
SESSION_SECRET="your-secret-key-change-in-production"

# Application
APP_NAME="RT Management System"
APP_URL="http://localhost:3000"
```

## 🚨 Troubleshooting

### Database Connection Error

- Ensure PostgreSQL is running
- Check DATABASE_URL in .env
- Verify credentials

### Port Already in Use

- Change PORT in .env
- Or kill process using port: `lsof -i :3000` then `kill -9 <PID>`

### Dependencies Issue

- Delete `node_modules` and `package-lock.json`
- Run `npm install` again

## 📞 Support

For issues or questions, refer to the documentation files or contact the development team.

## 📄 License

Proprietary - All rights reserved
