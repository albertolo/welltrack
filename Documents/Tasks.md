# WellTrack Implementation Tasks

This document breaks down the WellTrack requirements into actionable development tasks organized by phase.

---

## Phase 1: Project Setup & Backend Foundation (Weeks 1-3)

### 1.1 Project Initialization

- [x] Create monorepo structure with `/backend` and `/frontend` directories
- [x] Initialize backend Node.js project with TypeScript (`npm init`, `tsconfig.json`)
- [x] Install backend dependencies: express, prisma, bcrypt, jsonwebtoken, cors, dotenv, zod
- [x] Install dev dependencies: typescript, ts-node-dev, @types packages, eslint, prettier
- [x] Create `.env` file with database URL, JWT secrets, and port configuration
- [x] Set up ESLint and Prettier configuration for consistent code style
- [x] Create basic Express server with health check endpoint (`GET /api/health`)

### 1.2 Database Setup

- [ ] Install and configure PostgreSQL locally (or use Docker)
- [ ] Initialize Prisma (`npx prisma init`)
- [ ] Create Prisma schema with User model (id, email, password_hash, display_name, timezone, created_at)
- [ ] Add Symptom model (id, user_id nullable, name, category, is_active)
- [ ] Add SymptomLog model (id, user_id, symptom_id, severity, notes, logged_at, created_at)
- [ ] Add MoodLog model (id, user_id, mood_score, energy_level, stress_level, notes, logged_at, created_at)
- [ ] Add Medication model (id, user_id, name, dosage, frequency, is_active, created_at)
- [ ] Add MedicationLog model (id, user_id, medication_id, taken, taken_at, notes, created_at)
- [ ] Add Habit model (id, user_id nullable, name, tracking_type enum, unit, is_active)
- [ ] Add HabitLog model (id, user_id, habit_id, value_boolean, value_numeric, value_duration, notes, logged_at, created_at)
- [ ] Add database indexes on (user_id, logged_at) for all log tables
- [ ] Run initial migration (`npx prisma migrate dev`)
- [ ] Create seed script for default symptoms (Headache, Fatigue, Joint Pain, etc.)
- [ ] Create seed script for default habits (Sleep Duration, Water Intake, Exercise, etc.)

### 1.3 Authentication System

- [ ] Create auth middleware to verify JWT tokens
- [ ] Create utility function for hashing passwords with bcrypt
- [ ] Create utility function for generating access tokens (short-lived)
- [ ] Create utility function for generating refresh tokens (long-lived)
- [ ] Implement `POST /api/auth/register` - validate input, check email uniqueness, hash password, create user, return tokens
- [ ] Implement `POST /api/auth/login` - validate credentials, return tokens
- [ ] Implement `POST /api/auth/refresh` - validate refresh token, issue new access token
- [ ] Implement `POST /api/auth/logout` - invalidate refresh token (add to blocklist or delete from DB)
- [ ] Implement `POST /api/auth/forgot-password` - generate reset token, log to console (email TBD)
- [ ] Implement `POST /api/auth/reset-password` - validate reset token, update password
- [ ] Add input validation using Zod for all auth endpoints
- [ ] Add proper error handling and HTTP status codes

### 1.4 User Endpoints

- [ ] Implement `GET /api/users/me` - return authenticated user's profile
- [ ] Implement `PATCH /api/users/me` - update display_name and timezone
- [ ] Implement `DELETE /api/users/me` - cascade delete all user data and account

### 1.5 Symptom Endpoints

- [ ] Implement `GET /api/symptoms` - return system defaults + user's custom symptoms
- [ ] Implement `POST /api/symptoms` - create custom symptom for user
- [ ] Implement `PATCH /api/symptoms/:id` - update symptom (name, category, is_active)
- [ ] Implement `DELETE /api/symptoms/:id` - delete custom symptom (prevent deleting system defaults)
- [ ] Add validation: users can only modify their own symptoms

### 1.6 Symptom Log Endpoints

- [ ] Implement `GET /api/symptom-logs` - return logs with date range filtering, pagination
- [ ] Implement `POST /api/symptom-logs` - create new log with severity (1-10), optional notes
- [ ] Implement `PATCH /api/symptom-logs/:id` - update existing log
- [ ] Implement `DELETE /api/symptom-logs/:id` - delete log
- [ ] Ensure users can only access their own logs

### 1.7 Mood Log Endpoints

- [ ] Implement `GET /api/mood-logs` - return logs with date range filtering
- [ ] Implement `POST /api/mood-logs` - create log with mood_score (1-5), optional energy/stress
- [ ] Implement `PATCH /api/mood-logs/:id` - update existing log
- [ ] Implement `DELETE /api/mood-logs/:id` - delete log

### 1.8 Medication Endpoints

- [ ] Implement `GET /api/medications` - return user's medications
- [ ] Implement `POST /api/medications` - create medication with name, optional dosage/frequency
- [ ] Implement `PATCH /api/medications/:id` - update medication details
- [ ] Implement `DELETE /api/medications/:id` - delete medication

### 1.9 Medication Log Endpoints

- [ ] Implement `GET /api/medication-logs` - return logs with date range filtering
- [ ] Implement `POST /api/medication-logs` - log medication taken/not taken
- [ ] Implement `PATCH /api/medication-logs/:id` - update log
- [ ] Implement `DELETE /api/medication-logs/:id` - delete log

### 1.10 Habit Endpoints

- [ ] Implement `GET /api/habits` - return system defaults + user's custom habits
- [ ] Implement `POST /api/habits` - create custom habit with tracking_type (boolean/numeric/duration)
- [ ] Implement `PATCH /api/habits/:id` - update habit details
- [ ] Implement `DELETE /api/habits/:id` - delete custom habit

### 1.11 Habit Log Endpoints

- [ ] Implement `GET /api/habit-logs` - return logs with date range filtering
- [ ] Implement `POST /api/habit-logs` - create log with appropriate value field based on tracking_type
- [ ] Implement `PATCH /api/habit-logs/:id` - update log
- [ ] Implement `DELETE /api/habit-logs/:id` - delete log

### 1.12 Backend Testing & Documentation

- [ ] Set up Jest for backend testing
- [ ] Write tests for auth endpoints (register, login, token refresh)
- [ ] Write tests for CRUD operations on at least one resource (e.g., symptoms)
- [ ] Test date filtering and pagination on log endpoints
- [ ] Document API endpoints in README or simple API docs

---

## Phase 2: Frontend Foundation (Weeks 4-6)

### 2.1 React Project Setup

- [ ] Initialize React app with Vite and TypeScript (`npm create vite@latest`)
- [ ] Install dependencies: react-router-dom, axios, tailwindcss, react-hook-form, zod
- [ ] Configure Tailwind CSS with custom color palette (soft teal, sage - per requirements)
- [ ] Set up folder structure: `/components`, `/pages`, `/hooks`, `/services`, `/types`
- [ ] Create API service layer with axios instance and interceptors for auth
- [ ] Set up environment variables for API base URL

### 2.2 Authentication State & Routing

- [ ] Create AuthContext for managing user state and tokens
- [ ] Implement token storage (localStorage or httpOnly cookies)
- [ ] Create ProtectedRoute component to guard authenticated pages
- [ ] Set up React Router with public and protected routes
- [ ] Implement automatic token refresh on 401 responses

### 2.3 Auth Pages

- [ ] Create Login page with email/password form
- [ ] Create Register page with email/password/confirm password form
- [ ] Create Forgot Password page with email input
- [ ] Create Reset Password page with new password form
- [ ] Add form validation with react-hook-form and Zod
- [ ] Display API error messages to users
- [ ] Add loading states to submit buttons

### 2.4 Layout & Navigation

- [ ] Create main app layout with header and navigation
- [ ] Build bottom navigation bar for mobile (Dashboard, Log, History, Trends, Settings)
- [ ] Create responsive sidebar for desktop view
- [ ] Add user menu with logout option

### 2.5 Dashboard Page

- [ ] Create Dashboard page component
- [ ] Display current date and greeting
- [ ] Build "Today's Summary" section showing logged items
- [ ] Create quick-add buttons for each log type (symptoms, mood, meds, habits)
- [ ] Show "days logged this week" streak indicator
- [ ] Fetch and display today's logs on mount

### 2.6 Symptom Logging

- [ ] Create SymptomLogModal component
- [ ] Build symptom selector (dropdown or searchable list)
- [ ] Create severity slider/input (1-10 scale) with visual feedback
- [ ] Add optional notes textarea
- [ ] Add date/time picker (defaults to now)
- [ ] Implement form submission to API
- [ ] Add success feedback and close modal

### 2.7 Mood Logging

- [ ] Create MoodLogModal component
- [ ] Build mood selector with 5-point scale (emoji or color-coded)
- [ ] Add optional energy level input (1-5)
- [ ] Add optional stress level input (1-5)
- [ ] Add optional notes textarea
- [ ] Add date/time picker
- [ ] Implement form submission

### 2.8 Medication Logging

- [ ] Create MedicationLogModal component
- [ ] List user's active medications with checkboxes
- [ ] Add "taken at" time picker
- [ ] Add optional notes field
- [ ] Implement form submission

### 2.9 Habit Logging

- [ ] Create HabitLogModal component
- [ ] Display habits grouped by tracking type
- [ ] Build boolean habit toggle (yes/no)
- [ ] Build numeric habit input with unit label
- [ ] Build duration habit input (hours/minutes)
- [ ] Add optional notes field
- [ ] Implement form submission

### 2.10 TypeScript Types

- [ ] Define User type matching backend model
- [ ] Define Symptom and SymptomLog types
- [ ] Define MoodLog type
- [ ] Define Medication and MedicationLog types
- [ ] Define Habit and HabitLog types
- [ ] Define API response wrapper types

---

## Phase 3: Full Features (Weeks 7-9)

### 3.1 History View

- [ ] Create History page component
- [ ] Implement infinite scroll or pagination for past entries
- [ ] Group entries by day with date headers
- [ ] Create expandable entry cards showing details
- [ ] Add filter tabs (All, Symptoms, Mood, Medications, Habits)
- [ ] Implement edit functionality - open pre-filled modal on tap
- [ ] Implement delete functionality with confirmation dialog

### 3.2 Trends & Analytics

- [ ] Create Trends page component
- [ ] Install charting library (recharts or chart.js)
- [ ] Build date range picker (7/30/90 days, custom range)
- [ ] Create line chart for symptom severity over time
- [ ] Create line chart for mood/energy/stress trends
- [ ] Add symptom selector to view individual symptom trends
- [ ] Display average values and min/max for selected period

### 3.3 Calendar Heatmap

- [ ] Create CalendarHeatmap component
- [ ] Display month grid with day cells
- [ ] Color-code days based on logging activity (none, partial, complete)
- [ ] Add month navigation (prev/next)
- [ ] Show tooltip on hover with day's log summary
- [ ] Allow clicking a day to navigate to that day's history

### 3.4 Settings Page

- [ ] Create Settings page with section navigation
- [ ] Build profile edit form (display name, timezone selector)
- [ ] Add save button with API call and feedback

### 3.5 Manage Symptoms

- [ ] Create ManageSymptoms page/section
- [ ] List all symptoms (system + custom) with toggle switches
- [ ] Implement hide/show toggle for system symptoms (updates is_active)
- [ ] Add "Create Custom Symptom" button and form
- [ ] Add edit functionality for custom symptoms
- [ ] Add delete button for custom symptoms with confirmation

### 3.6 Manage Habits

- [ ] Create ManageHabits page/section
- [ ] List all habits with toggle switches
- [ ] Implement hide/show toggle for system habits
- [ ] Add "Create Custom Habit" form with tracking type selector
- [ ] Add edit functionality for custom habits
- [ ] Add delete button for custom habits

### 3.7 Manage Medications

- [ ] Create ManageMedications page/section
- [ ] List all medications with active/inactive status
- [ ] Add "Create Medication" form (name, dosage, frequency)
- [ ] Add edit functionality for medications
- [ ] Add delete button with confirmation
- [ ] Add toggle to mark medication as inactive

### 3.8 Data Export

- [ ] Implement `GET /api/export/csv` backend endpoint
- [ ] Generate CSV with all user's logs in date range
- [ ] Include symptom logs, mood logs, medication logs, habit logs
- [ ] Create Export section in Settings
- [ ] Add date range picker for export
- [ ] Implement download button that triggers CSV download

### 3.9 Insights Endpoint

- [ ] Implement `GET /api/insights/trends` backend endpoint
- [ ] Calculate averages, counts, and trends for specified date range
- [ ] Return structured data for frontend charts
- [ ] Add caching if needed for performance

### 3.10 Account Management

- [ ] Create "Delete Account" section in Settings
- [ ] Add confirmation modal with warning about data loss
- [ ] Require password re-entry for confirmation
- [ ] Implement account deletion flow (API call, logout, redirect)

---

## Phase 4: Polish & Launch (Weeks 10-12)

### 4.1 Responsive Design

- [ ] Test all pages on mobile viewport (375px)
- [ ] Test all pages on tablet viewport (768px)
- [ ] Test all pages on desktop viewport (1280px+)
- [ ] Fix any layout issues or overflow problems
- [ ] Ensure touch targets are at least 44px for mobile
- [ ] Test modal behavior on mobile devices

### 4.2 Accessibility

- [ ] Add proper ARIA labels to interactive elements
- [ ] Ensure color contrast meets WCAG AA standards
- [ ] Test keyboard navigation on all forms
- [ ] Add focus indicators to interactive elements
- [ ] Ensure screen reader compatibility for key flows

### 4.3 Loading & Error States

- [ ] Add loading skeletons to Dashboard
- [ ] Add loading skeletons to History page
- [ ] Add loading skeletons to Trends charts
- [ ] Create consistent error message component
- [ ] Add retry buttons for failed API calls
- [ ] Handle network offline state gracefully

### 4.4 Performance

- [ ] Add React.lazy() for route-based code splitting
- [ ] Optimize images and assets
- [ ] Review bundle size and remove unused dependencies
- [ ] Add appropriate caching headers on backend
- [ ] Test performance with Lighthouse

### 4.5 Security Hardening

- [ ] Enable HTTPS in production
- [ ] Add rate limiting to auth endpoints
- [ ] Add rate limiting to API endpoints
- [ ] Sanitize all user inputs
- [ ] Review CORS configuration
- [ ] Ensure JWT secrets are strong and properly stored
- [ ] Add security headers (helmet.js)

### 4.6 Testing

- [ ] Write E2E tests for registration flow
- [ ] Write E2E tests for login flow
- [ ] Write E2E tests for logging a symptom
- [ ] Write E2E tests for viewing history
- [ ] Test timezone handling across different zones
- [ ] Test date filtering edge cases

### 4.7 Deployment

- [ ] Choose hosting provider (Vercel/Railway/Render)
- [ ] Set up production PostgreSQL database
- [ ] Configure environment variables in hosting platform
- [ ] Set up CI/CD pipeline for automatic deploys
- [ ] Run production migrations and seed data
- [ ] Configure custom domain (if applicable)
- [ ] Set up basic monitoring/logging

### 4.8 Beta Launch

- [ ] Create simple landing page explaining the app
- [ ] Add beta signup/waitlist if needed
- [ ] Prepare user feedback collection method
- [ ] Write basic user documentation/FAQ
- [ ] Onboard initial beta users
- [ ] Monitor for errors and performance issues

---

## Nice-to-Have Tasks (If Time Permits)

- [ ] Daily reminder emails - set up email service (SendGrid/Postmark), create reminder job
- [ ] Correlation insights - analyze patterns between habits and symptoms
- [ ] PDF export for doctor visits - generate formatted PDF report
- [ ] Onboarding flow - guided tour for new users explaining features
- [ ] Dark mode toggle - add theme support with system preference detection

---

## Quick Reference: File Structure

```
/backend
  /src
    /controllers    # Route handlers
    /middleware     # Auth, validation, error handling
    /routes         # Express route definitions
    /services       # Business logic
    /utils          # Helpers (jwt, hash, etc.)
    index.ts        # Express app entry point
  /prisma
    schema.prisma   # Database schema
    /migrations     # Migration files
    seed.ts         # Seed script

/frontend
  /src
    /components     # Reusable UI components
    /pages          # Page components
    /hooks          # Custom React hooks
    /services       # API calls
    /context        # React context (auth, etc.)
    /types          # TypeScript types
    App.tsx         # Root component with routing
    main.tsx        # Entry point
```
