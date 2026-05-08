# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
npm install -d

# Start the application
npm start          # runs: node index.js

# Development (with auto-restart)
nodemon index.js
```

There are no lint or test scripts configured.

## Architecture Overview

**Stack:** Express.js + Handlebars + MongoDB (Mongoose) + Passport.js

The app is a school management system with role-based access control. `index.js` is the entry point — it wires together Express, MongoDB, Passport sessions, and mounts all route modules.

### Route Modules

Routes are in `routes/` and mounted in `index.js`:
- `students.js` — Student CRUD, Transfer Certificate (TC) generation
- `courses.js` — Course/subject management, mark entry, PDF report card and admit card generation (ZIP downloads)
- `users.js` — Registration, login/logout, admin approval workflow for new users
- `api.js` — Unauthenticated REST endpoints (student lookup, departments, courses)
- `miscellaneous.js` — Miscellaneous dashboard and session management
- `uploads.js` — Image upload management (multer)
- `print.js` — PDF rendering helpers used by courses and students routes

### Auth and Access Control

`helpers/auth.js` exports middleware functions used on protected routes:
- `ensureAuthenticated` — redirect to `/users/signin` if not logged in
- `isAdmin` — 403 if not admin
- `readAccessControl`, `createAccessControl`, `updateAccessControl`, `deleteAccessControl` — privilege checks stored on the User model

New user registrations require admin approval (`user.request` flag) before the Passport local strategy will authenticate them.

### Models

All models are in `models/` with Mongoose schemas and Joi validation:
- `student.js` — Core student record including nested `academicDetails` (marks per exam per subject) and `RelievingDetails` (TC info)
- `course.js` — Course with subjects array (each subject has passingMarks, maxMarks, examDate, markingType)
- `user.js` — User with `role` enum, `isAdmin` boolean, and `privileges` object (read/create/update/delete booleans)
- `department.js` — Simple department name
- `upload.js` — Saved image metadata

### PDF Generation

Two approaches coexist:
- `pdf-creator-node` — Renders HTML templates in `views/pdfTemplates/` for mark sheets and TC documents
- `html-pdf` — Used for admit cards
- Options/config in `helper/options.js` (note: `helper/` ≠ `helpers/`)

### Views

Handlebars templates in `views/`, using layouts in `views/layouts/` and partials in `views/partials/`. The main authenticated layout is `layouts/main.handlebars`; unauthenticated pages use `layouts/home.handlebars` or `layouts/signin.handlebars`.

Custom Handlebars helpers are registered in `helpers/customHelpers.js` (pagination, conditional select, equality check).

## Key Conventions

- Routes use `method-override` to support PUT/DELETE from HTML forms (pass `_method` query param or hidden field)
- Flash messages are set via `connect-flash` and exposed as `req.app.locals` in `index.js`; displayed via the `_msg` partial
- Mongoose paginate plugin (`mongoose-paginate`) is used on Student and Course models; page size for students is 50
- MongoDB connection string and session secret are hardcoded in `index.js` — use environment variables (`MONGODB_URI`, `SESSION_SECRET`) when deploying
