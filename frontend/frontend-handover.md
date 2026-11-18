# SkillSwap: Frontend Integration Guide

**Everything the frontend needs, in one place.** The backend and cloud are complete, deployed and tested. Read sections 1–4 first, then use the rest as a reference while building each page.

---

## 1. What's live

- **API (Cloudflare Worker):** `https://skillswap-api.mishrakrati789.workers.dev`
  - Base path for every endpoint: `/api/v1`
  - Health check (no login needed): `https://skillswap-api.mishrakrati789.workers.dev/api/v1/health`
- **Supabase project** (Auth, database, Realtime, Storage): URL and publishable key are **sent privately**, not in Git.
- **AI:** Cloudflare Workers AI, used only through the API. The frontend never calls a model directly.
- **Status:** every module in the spec is implemented: auth, profiles, skills, availability, discovery, AI matching, connections, chat with realtime, notifications, sessions, resources, reviews, AI Learning Hub, learning goals/progress, reports and admin.
- **Tested:** 97 unit tests, 128 database security checks, and 199 live checks against the deployed API.
- **You don't need to run the backend locally.** Point your app at the live URL, even during local development.

## 2. Setup

- `frontend/.env` (never commit it; commit `frontend/.env.example` with empty values):
  ```
  VITE_SUPABASE_URL=            # sent privately
  VITE_SUPABASE_ANON_KEY=       # publishable key "sb_publishable_...", sent privately, safe in the browser
  VITE_API_BASE_URL=https://skillswap-api.mishrakrati789.workers.dev
  ```
- **Never** use the Supabase secret key (`sb_secret_...`) in the frontend.
- **CORS:** `http://localhost:5173` (the Vite default) is already allowed. **Send me your live frontend URL** (Vercel or Cloudflare Pages) when you have it and I'll add it to the API. Until it's added, the deployed site can't call the API.
- **Hosting: Vercel** (named in our assignment brief) **or Cloudflare Pages**. Either works.
- **Vercel settings:**
  - Framework preset: Vite
  - Root directory: `frontend`
  - Build command: `npm run build`
  - Output directory: `dist`
  - Environment variables: the same 3 `VITE_*` values
  - SPA routing: add `frontend/vercel.json` containing `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`
- **Cloudflare Pages settings** (if using Pages instead):
  - Framework preset: Vite
  - Root directory: `frontend`
  - Build command: `npm run build`
  - Output directory: `dist`
  - Environment variables: the same 3 `VITE_*` values, for Production and Preview
  - SPA routing: create `frontend/public/_redirects` containing `/* /index.html 200`
- **Demo accounts** (password sent privately), all with complete profiles:
  - `aarav.demo@skillswap.dev`: teaches Python and ML, learns UI/UX and Figma
  - `meera.demo@skillswap.dev`: teaches Figma and UI/UX, learns Python and ML (Aarav's 93% match)
  - `kabir.demo@skillswap.dev`: teaches Guitar and Personal Finance, learns JavaScript and React
  - `sara.demo@skillswap.dev`: teaches JavaScript and React, learns Guitar and Public Speaking
  - `admin.demo@skillswap.dev`: **admin** account for the admin dashboard

## 3. Golden rules (spec 13.4)

- Send **all** backend calls through **one central API service** (`services/api.js`).
- Read the base URL from `import.meta.env.VITE_API_BASE_URL`.
- Attach the **Supabase access token automatically** to every request.
- **Don't hardcode** user data, compatibility scores or success responses: everything comes from the API.
- Show **loading, error and empty** states for every request.
- Show the backend's `error.message` (and field `details` for forms) to the user.
- **Refresh data** after create / update / delete actions (for example, invalidate TanStack Query keys).
- Use **pagination** (`page`, `limit`) for lists.
- Use Supabase **Realtime only for authorized subscriptions** (section 8).
- Don't change shared field names, statuses or response shapes without telling me (spec 2.3).

## 4. Authentication

- **Sign-up, login, logout and password reset** are done in the frontend with `@supabase/supabase-js`, not through our API:
  ```js
  import { createClient } from '@supabase/supabase-js';
  export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

  await supabase.auth.signUp({ email, password, options: { data: { full_name, username } } });
  await supabase.auth.signInWithPassword({ email, password });
  await supabase.auth.signOut();
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/reset-password` });
  ```
- A **profile row is created automatically** on sign-up. `full_name` and `username` are optional at this point; an invalid or taken username is simply left empty and set later during onboarding.
- **Email verification** is handled by Supabase: the user must confirm their email before they can log in.
- **Calling the API**, the central helper:
  ```js
  export async function api(path, { method = 'GET', body } = {}) {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1${path}`, {
      method,
      headers: {
        ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json();
    if (!json.success) throw Object.assign(new Error(json.error.message), { status: res.status, ...json.error });
    return json.data;
  }
  ```
- **After login:** call `GET /auth/me`. If `onboarding_completed` is `false`, go to onboarding; otherwise go to the dashboard.
- **`401` (`UNAUTHORIZED` / `INVALID_TOKEN`):** refresh the session or send the user to login. The Supabase client refreshes tokens automatically.
- **`403 ACCOUNT_SUSPENDED`:** show a "your account is suspended" screen.
- **Admin pages:** show them only when `GET /auth/me` returns `role: "admin"`. The backend also enforces this.

## 5. API conventions

- **Base URL:** `${VITE_API_BASE_URL}/api/v1`
- **Headers:** `Authorization: Bearer <access_token>` (every endpoint except `/health`) and `Content-Type: application/json`
- **Success response:**
  ```json
  { "success": true, "data": { }, "message": "Operation completed successfully" }
  ```
- **Error response:**
  ```json
  { "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Invalid request",
    "details": [{ "field": "username", "message": "Username must be 3-30 characters: ..." }] } }
  ```
  - `details` (a list of `{ field, message }`) is present only for validation errors. Use it to highlight form fields.
- **Paginated lists:** `data = { items: [...], pagination: { page, limit, total, total_pages } }`
  - Query parameters: `?page=1&limit=20` (default limit 20, max 50, catalogue lists max 100).
- **Unknown fields are rejected:** sending a field that isn't allowed, such as `role`, returns `400`.
- **Dates:** ISO 8601 UTC (`2026-11-23T14:00:00Z`).
- **Rate limits:** 120 requests per minute per IP; AI endpoints 10 per minute; chat messages 30 per 10 seconds. Over the limit you get `429 RATE_LIMITED` with a `Retry-After` header.
- **Error codes:**
  - `400 VALIDATION_ERROR`: invalid input (see `details`)
  - `400 INVALID_JSON`: the body isn't valid JSON
  - `400 ONBOARDING_INCOMPLETE`: finishing onboarding too early (`details.missing`)
  - `400 PROFILE_INCOMPLETE`: matching needs at least one TEACH and one LEARN skill
  - `400 SKILL_NOT_OFFERED`: booking a skill neither person teaches
  - `401 UNAUTHORIZED`: no token
  - `401 INVALID_TOKEN`: expired or invalid token
  - `403 FORBIDDEN`: not allowed (for example non-admin)
  - `403 ACCOUNT_SUSPENDED`: suspended user
  - `403 NOT_CONNECTED`: chat or booking without an accepted connection
  - `404 NOT_FOUND` / `PROFILE_NOT_FOUND`: doesn't exist, **or you aren't allowed to see it**
  - `409 CONFLICT`: duplicate (username taken, skill already added, request already exists, already reviewed)
  - `409 INVALID_ACTION` / `INVALID_STATUS`: action not valid in the current state
  - `409 SESSION_CONFLICT`: overlaps a confirmed session
  - `409 OUTSIDE_AVAILABILITY`: time outside someone's availability
  - `409 SESSION_NOT_COMPLETED`: reviewing too early
  - `409 MATCH_NO_LONGER_VALID`: the match was removed on refresh
  - `429 RATE_LIMITED` / `AI_QUOTA_EXCEEDED`: too many requests, or the daily AI limit is reached
  - `500 INTERNAL_ERROR` / `DATABASE_ERROR`: server problem (show a generic error)

## 6. Onboarding sequence

1. `PATCH /profiles/me` with `full_name`, `username`, `bio`, `college`, `location`, `languages`, `learning_style`, `session_mode` and `timezone`.
   - Send the browser timezone: `Intl.DateTimeFormat().resolvedOptions().timeZone` (for example `Asia/Kolkata`).
   - Optional: upload an avatar first (section 9), then send `avatar_url`.
2. `GET /skills?limit=100` (or `GET /discover/skills?q=`) for the skill pickers, then **one `POST /users/me/skills` per selected skill**, with `skill_type` `TEACH` or `LEARN` and a `proficiency_level`.
3. `PUT /availability/me` with the weekly slots.
4. Optional: `POST /learning/goals` for each learning goal.
5. `PATCH /profiles/me { "onboarding_completed": true }`.
   - This requires `full_name`, `username`, at least 1 TEACH skill and at least 1 LEARN skill.
   - Otherwise you get `400 ONBOARDING_INCOMPLETE` with `details.missing`, for example `["at least one LEARN skill"]`. Use it to send the user back to that step.
   - After this, the user's AI embeddings are generated automatically and they become discoverable and matchable.

## 7. Endpoints by page / module

### 7.1 Health and auth
- `GET /health`: no token needed → `{ service, version, status: "healthy", time }`
- `GET /auth/me` → `{ id, email, email_confirmed, role, account_status, onboarding_completed, created_at, last_sign_in_at }`
- `GET /auth/status` → `{ authenticated, user_id, onboarding_completed }`. It never returns 401.

### 7.2 Profiles
- `GET /profiles/me`: own profile, including `email`, `is_public`, `role`, `account_status` and `onboarding_completed`
- `PATCH /profiles/me`: partial update. Allowed fields only:
  - `full_name` (1–100), `username` (`^[a-z0-9_]{3,30}$`, lowercased automatically), `avatar_url` (http(s) URL or null), `bio` (≤ 1000), `college` (≤ 150), `location` (≤ 100), `languages` (string[], max 10), `learning_style`, `session_mode`, `timezone` (IANA), `is_public` (bool; hides you from discovery), `onboarding_completed`
  - Username taken → `409`
- `DELETE /profiles/me`: requests account deletion → `{ account_status: "DELETION_REQUESTED" }`. The profile is hidden and an admin completes the deletion.
- `GET /profiles?q=&page=&limit=`: search other users by name, username or college
- `GET /profiles/:id`: public profile + `teach_skills[]`, `learn_skills[]`, `average_rating`, `review_count`. **Email is never included.**

### 7.3 Skills
- `GET /skills?q=&category=&page=&limit=`: catalogue (42 skills), sorted by name, `limit` up to 100
- `GET /skills/categories` → `[{ value: "PROGRAMMING", label: "Programming" }, ...]`. Use `label` for display.
- `GET /skills/:id`: skill + `teachers_count`, `learners_count`
- `POST /skills`: **admin only** `{ name, category, description? }`
- `GET /users/me/skills?type=TEACH|LEARN`: my skills
- `POST /users/me/skills` → 201: `{ skill_id, skill_type, proficiency_level, experience_description?, portfolio_url? }`
  - Already added → `409`
- `PATCH /users/me/skills/:id`: `{ proficiency_level?, experience_description?, portfolio_url? }`
- `DELETE /users/me/skills/:id`
- Changing skills refreshes the user's matching data automatically.

### 7.4 Availability
- Weekly recurring slots. `day_of_week`: **0 = Sunday … 6 = Saturday**. Times are 24-hour `"HH:MM"`, and `end_time` may be `"24:00"`.
- `GET /availability/me` → `{ timezone, slots: [{ id, day_of_week, start_time, end_time, timezone, is_active }] }`
- `PUT /availability/me`: **replaces all slots** in one go: `{ timezone?, slots: [{ day_of_week, start_time, end_time }] }` (max 50). The timezone defaults to the profile's.
  - Overlapping slots on the same day → `409`, and nothing is changed.
- `GET /availability/:userId`: another user's slots
- `GET /availability/overlap?user_id=&timezone=`: common free time with another user, converted to `timezone` (defaults to yours):
  ```json
  { "user_id": "uuid", "timezone": "Asia/Kolkata", "total_overlap_minutes": 120,
    "overlap_slots": [{ "day_of_week": 1, "day_name": "Monday", "start_time": "19:30", "end_time": "20:30",
                        "duration_minutes": 60, "label": "Monday 19:30-20:30" }] }
  ```
  - **Use this to offer valid times in the booking form.**

### 7.5 Discover
- `GET /discover`: browse users. Query parameters (all optional):
  - `skill` (partial name), `category`, `level`, `skill_type` (`TEACH` by default = "people who teach it", or `LEARN`), `location` (partial), `session_mode` (users with `BOTH` always match), `language` (exact, case-insensitive), `availability` (day `0`–`6` or a name like `monday`), `sort` (`newest` | `rating` | `name`), `page`, `limit` (max 50)
  - Each item: public profile + `average_rating`, `review_count`, `teach_skills[]`, `learn_skills[]`. You never see yourself.
- `GET /discover/skills?q=&category=&limit=`: skills with `teachers_count` and `learners_count`
- `GET /discover/filters` → options for the filter UI: `categories`, `levels`, `session_modes`, `skill_types`, `days_of_week`, `sort_options`, `locations`, `languages`

### 7.6 Matches (AI)
- `POST /matches/generate`: computes, ranks and saves up to 20 matches → `{ matches: [Match], total_candidates_evaluated, semantic_matching, embeddings_regenerated }`
  - Needs at least 1 TEACH and 1 LEARN skill (otherwise `400 PROFILE_INCOMPLETE`)
  - Can take a few seconds. Show a loader.
- `GET /matches?status=&page=&limit=`: saved matches, best first (`DISMISSED` hidden unless filtered)
- `GET /matches/:id`: details. `SUGGESTED` becomes `VIEWED`.
- `POST /matches/:id/refresh`: recompute from current data (`409 MATCH_NO_LONGER_VALID` means it was removed)
- `GET /matches/:id/explanation` → `{ match_id, explanation, source: "AI"|"FALLBACK", cached, model? }`. 2–3 sentences written by the AI. Load it on demand, for example a "Why this match?" button.
- **Match card data:**
  ```json
  {
    "id": "uuid",
    "user": { "id": "uuid", "name": "Meera Iyer", "username": "meera_demo", "avatar_url": null, "college": "...", "location": "Delhi" },
    "compatibility_score": 93,
    "matched_skills": ["Figma", "UI/UX Design", "Python", "Machine Learning"],
    "exchange": { "they_teach_you": ["UI/UX Design", "Figma"], "you_teach_them": ["Python", "Machine Learning"] },
    "availability_overlap": ["Monday 19:30-20:30", "Wednesday 20:00-21:00"],
    "reasons": ["Mutual skill exchange: ...", "Compatible availability: 2 hours of shared free time each week", "Shared language: English"],
    "score_breakdown": { "skill_compatibility": { "score": 1, "weight": 35, "points": 35 }, "reciprocal_exchange": { "...": 0 } },
    "has_explanation": false, "status": "SUGGESTED", "created_at": "...", "updated_at": "..."
  }
  ```
- **Score breakdown keys** (weights): `skill_compatibility` 35, `reciprocal_exchange` 20, `availability_overlap` 15, `learning_goal_similarity` 10, `proficiency_compatibility` 10, `learning_preference` 10. Each has `score` (0–1), `weight` and `points`, and the points add up to `compatibility_score`. Good for a "score explained" bar chart.
- **Match status:** `SUGGESTED`, `VIEWED`, `CONNECTED` (you sent this person a request), `DISMISSED`

### 7.7 Connections
- `POST /connections` → 201: `{ receiver_id, message? }` (message ≤ 500)
  - A pending or accepted connection already exists in either direction → `409`. Yourself → `400`.
- `GET /connections`: accepted connections
- `GET /connections/received`: pending requests sent to me
- `GET /connections/sent`: pending requests I sent
- `GET /connections/with/:userId`: current PENDING or ACCEPTED connection with that user, or `null`. **Use it for the Connect button state on profile pages.**
- `PATCH /connections/:id/accept`: **recipient only** (403 otherwise; 409 if no longer pending)
- `PATCH /connections/:id/reject`: recipient only
- `DELETE /connections/:id`: the sender withdraws a pending request, **or** either user removes an accepted connection (status `WITHDRAWN`)
- **Connection response:**
  ```json
  { "id": "uuid", "sender_id": "uuid", "receiver_id": "uuid", "status": "PENDING", "message": "Hi!",
    "direction": "SENT", "other_user": { "id": "uuid", "name": "Meera Iyer", "username": "meera_demo", "avatar_url": null, "college": "...", "location": "..." },
    "created_at": "...", "updated_at": "..." }
  ```
- After someone sends, accepts or rejects a request, the other person gets a notification automatically.

### 7.8 Chat (conversations and messages)
- You can only chat with an **accepted connection**.
- `GET /conversations?page=&limit=`: my chats, most recent first:
  ```json
  { "id": "uuid", "other_user": { "id": "uuid", "name": "Meera Iyer", "username": "meera_demo", "avatar_url": null },
    "can_message": true,
    "last_message": { "id": "uuid", "content": "Hi!", "message_type": "TEXT", "sender_id": "uuid", "is_mine": false, "is_deleted": false, "created_at": "..." },
    "unread_count": 2, "created_at": "...", "updated_at": "..." }
  ```
- `POST /conversations` `{ user_id }`: opens the chat with a connected user, or returns the existing one. Not connected → `403 NOT_CONNECTED`.
- `GET /conversations/:id/messages?limit=30&before=`: newest page first, items ordered **oldest → newest** → `{ items: [Message], has_more, next_before }`
  - To load older messages, pass `before=<next_before>`.
- `POST /conversations/:id/messages` → 201: `{ content }` for text (≤ 5000), or `{ message_type: "IMAGE"|"FILE", attachment_url, content? }`
- `PATCH /conversations/:id/read`: marks all received messages in the chat as read (call this when the chat is opened)
- `PATCH /messages/:id/read`: marks this and earlier received messages as read
- `DELETE /messages/:id`: sender only. The content is erased and `is_deleted: true`.
- **Message:** `{ id, conversation_id, sender_id, content, message_type, attachment_url, is_read, is_deleted, created_at, is_mine }`
- If the connection is removed, the history stays readable but `can_message` becomes `false` and sending returns `403 NOT_CONNECTED`. **Hide the input box when `can_message` is false.**
- Not a member → `404`.

### 7.9 Notifications
- `GET /notifications?unread_only=true&type=&page=&limit=` → items + pagination + **`unread_count`** (for the bell badge)
- `PATCH /notifications/:id/read`
- `PATCH /notifications/read-all` → `{ marked_read }`
- `DELETE /notifications/:id`
- **Notification:**
  ```json
  { "id": "uuid", "type": "CONNECTION_REQUEST", "title": "New connection request",
    "message": "Aarav Sharma wants to connect with you", "reference_id": "uuid", "is_read": false, "created_at": "..." }
  ```
- `reference_id` points to the connection (`CONNECTION_*`), the session (`SESSION_*`) or the review (`NEW_REVIEW`). Use it to deep-link.
- Created automatically by the backend. The frontend never creates notifications.

### 7.10 Sessions (booking)
- `POST /sessions` → 201 `PENDING`:
  ```json
  { "receiver_id": "uuid", "skill_id": "uuid", "topic": "Figma basics", "description": "optional",
    "start_time": "2026-11-23T14:00:00Z", "end_time": "2026-11-23T15:00:00Z",
    "timezone": "Asia/Kolkata", "session_mode": "ONLINE", "meeting_link": "https://...", "objectives": ["Auto-layout"] }
  ```
- **Booking rules** (each with its own error):
  - Must be connected → `403 NOT_CONNECTED`
  - The skill must be one either person **teaches** → `400 SKILL_NOT_OFFERED`
  - Must fit **both** weekly availabilities → `409 OUTSIDE_AVAILABILITY` (`details.requester_available`, `details.receiver_available`). Use `GET /availability/overlap` to offer valid slots.
  - No overlap with either person's confirmed sessions → `409 SESSION_CONFLICT`
  - In the future, 15 minutes to 4 hours long, at most 180 days ahead → `400`
- `GET /sessions?status=&role=requester|receiver&when=upcoming|past&page=&limit=`
- `GET /sessions/:id`: participants only
- `PATCH /sessions/:id`: `{ description?, meeting_link?, objectives? }` while the session isn't finished
- `PATCH /sessions/:id/accept`: receiver → `CONFIRMED`
- `PATCH /sessions/:id/reject`: receiver declines → `REJECTED`. Also used to decline a proposed new time: a confirmed session then keeps its original time.
- `PATCH /sessions/:id/reschedule`: `{ start_time, end_time }` → `RESCHEDULE_REQUESTED` (adds `proposed_start_time` and `proposed_end_time`)
- `PATCH /sessions/:id/confirm`: the **other** person accepts the proposed time → `CONFIRMED` at the new time
- `PATCH /sessions/:id/cancel`: `{ reason? }` → `CANCELLED`
- `PATCH /sessions/:id/complete`: after the start time → `COMPLETED` (unlocks reviews)
- **Use `allowed_actions` to decide which buttons to show.** Values: `accept`, `reject`, `reschedule`, `confirm`, `cancel`, `complete`, `review`, `edit_details`, `add_resource`. An action not in the list returns `409 INVALID_ACTION`.
- **Session response:**
  ```json
  { "id": "uuid", "requester_id": "uuid", "receiver_id": "uuid", "skill_id": "uuid", "skill_name": "Figma",
    "topic": "Figma basics", "description": null, "start_time": "...", "end_time": "...", "timezone": "Asia/Kolkata",
    "session_mode": "ONLINE", "meeting_link": null, "status": "PENDING", "objectives": ["Auto-layout"],
    "proposed_start_time": null, "proposed_end_time": null, "reschedule_requested_by": null,
    "cancelled_by": null, "cancellation_reason": null,
    "my_role": "RECEIVER", "other_user": { "id": "uuid", "name": "Aarav Sharma", "username": "aarav_demo", "avatar_url": null },
    "has_reviewed": false, "allowed_actions": ["accept", "reject", "reschedule", "edit_details", "add_resource"],
    "created_at": "...", "updated_at": "..." }
  ```
- **Reminders:** both people get a `SESSION_REMINDER` notification about 24 hours before a confirmed session (automatic).

### 7.11 Session resources (session workspace)
- `GET /sessions/:id/resources`: participants only. Each item has `is_mine`.
- `POST /sessions/:id/resources`: `{ title, resource_url (http/https), resource_type: LINK|FILE|DOCUMENT|VIDEO|IMAGE|NOTE }`
- `DELETE /sessions/:id/resources/:resourceId`: the uploader only
- For files: upload to Storage first (section 9), then add the URL here with `resource_type: "FILE"`.

### 7.12 Reviews
- `POST /reviews`: `{ session_id, overall_rating (1-5), teaching_quality?, communication?, punctuality?, knowledge?, comment? (≤ 1000) }`
  - Only after a **completed** session you took part in, **once** per session. Reviews can't be edited.
  - The reviewed person is set automatically to the other participant.
- `GET /reviews/user/:id?page=&limit=` → items + `summary: { review_count, average_rating, teaching_quality, communication, punctuality, knowledge }`
- `GET /reviews/session/:id`: participants only
- **Review:** `{ id, session_id, reviewer_id, reviewed_user_id, overall_rating, teaching_quality, communication, punctuality, knowledge, comment, reviewer: { id, name, avatar_url }, created_at }`

### 7.13 AI Learning Hub
- All `POST`, rate limited to 10 per minute, with a **daily AI limit per user** (`429 AI_QUOTA_EXCEEDED`). Responses can take **2–30 seconds**: show a loader and disable the button meanwhile.
- **Every response has `source`:**
  - `"AI"`: a fresh AI answer
  - `"CACHED"`: the same question was answered recently (instant)
  - `"FALLBACK"`: AI unavailable, so a basic template answer was used. Label it, for example "Basic suggestion: try again later for an AI answer".
- Users should **review AI text before saving it**. Nothing is saved automatically except roadmaps.
- `POST /ai/roadmap`: `{ goal, current_level?: BEGINNER|INTERMEDIATE|ADVANCED, existing_skills?: string[], hours_per_week?: 1-60 (default 5), goal_id?, save?: true }`
  - → `{ roadmap: { title, summary, estimated_weeks, milestones: [{ skill, topics[], estimated_hours }] }, saved: { roadmap_id, milestones: [{ id, milestone_title, status, completion_percentage }] } | null }`
  - When saved, each milestone becomes a trackable progress item (section 7.14).
- `POST /ai/skill-gap`: `{ goal, current_skills?: string[] }`
  - → `{ goal, current_skills, summary, required_skills: [{ skill, importance: HIGH|MEDIUM|LOW, status: HAVE|PARTIAL|MISSING, reason, on_skillswap: { skill_id, name, teachers_on_platform } | null }], next_steps[] }`
  - `on_skillswap`: "N people on SkillSwap can teach this" → link to Discover with that skill.
- `POST /ai/profile-assistant`: `{ text, field?: BIO|SKILL_DESCRIPTION|GOAL, skill_name? }` → `{ field, original_text, improved_text, tips[] }`. Show "Use this" and "Keep mine".
- `POST /ai/session-plan`: `{ session_id? OR topic, skill?, duration_minutes?, learner_level?, objectives?, apply?: false }`
  - → `{ session_id, duration_minutes, plan: { title, objectives[], agenda: [{ minutes, activity, details }], preparation[], follow_up[] }, applied_to_session }`
  - `apply: true` (with `session_id`) saves the objectives onto the session.
- `POST /ai/session-summary`: `{ notes (20-8000 chars), session_id? }` → `{ summary, key_points[], action_items[], topics_covered[] }`
- `POST /ai/learning-assistant`: `{ question (3-1000 chars), context? }` → `{ question, answer }` (plain text; learning topics only)
- `POST /ai/resources`: `{ topic, level?, format?: ANY|VIDEO|ARTICLE|COURSE|BOOK|PRACTICE }`
  - → `{ topic, resources: [{ title, type, description, search_query, search_url }], learn_on_skillswap: { skill_id, name, teachers_on_platform } | null }`
  - `search_url` is a safe YouTube or Google search link built by the backend.

### 7.14 Learning goals and progress (learning dashboard)
- `GET /learning/goals?status=`: each goal has `progress: { total, completed, in_progress, not_started, overall_percentage }`
- `POST /learning/goals` → 201: `{ title, description?, goal_type?: SKILL|CAREER|PROJECT|CERTIFICATION|OTHER, target_date?: "YYYY-MM-DD" }`
- `PATCH /learning/goals/:id`: any of the above + `status: ACTIVE|PAUSED|COMPLETED|ABANDONED`
- `DELETE /learning/goals/:id`: also deletes its milestones and roadmaps
- `GET /learning/progress?goal_id=&roadmap_id=&status=` → `{ items: [Milestone], summary: { total, completed, in_progress, not_started, overall_percentage, next_milestone } }`
  - `next_milestone` is the suggested next step: show it on the dashboard.
- `POST /learning/progress` → 201: `{ milestone_title, description?, goal_id?, roadmap_id?, status?, completion_percentage? }`
- `PATCH /learning/progress/:id`: `{ status?, completion_percentage?, milestone_title?, description? }`
  - 100% = `COMPLETED` (with `completed_at`); any progress > 0 = at least `IN_PROGRESS`; re-opening a completed milestone resets it to 50%.
- `GET /learning/roadmaps?goal_id=`: saved AI roadmaps
- `GET /learning/roadmaps/:id`: `roadmap_data` + `progress` (items + summary)
- `DELETE /learning/roadmaps/:id`
- **Milestone:** `{ id, goal_id, roadmap_id, milestone_title, description, status, completion_percentage, completed_at, created_at, updated_at }`

### 7.15 Reports
- `POST /reports` → 201: `{ reported_user_id, reason: SPAM|HARASSMENT|INAPPROPRIATE_CONTENT|FAKE_PROFILE|NO_SHOW|OTHER, description? }` (put a "Report user" option on profiles and chats)
- `GET /reports/mine`: reports I submitted, with their status

### 7.16 Admin (show only if `role === "admin"`)
- `GET /admin/dashboard` → `{ users: { total, onboarded, active, suspended, deletion_requested, new_last_7_days }, connections: { accepted, pending }, sessions: { STATUS: count }, messages: { total, last_24_hours }, reviews: { total, average_rating }, reports: { open, under_review }, ai: { calls_today } }`
- `GET /admin/users?q=&status=&role=&page=&limit=`: users **with email**, `sessions_count`, `reports_against`
- `PATCH /admin/users/:id/status`: `{ account_status: ACTIVE|SUSPENDED, reason? }`. Suspended users are locked out at once. Admins can't suspend themselves or other admins.
- `GET /admin/reports?status=`: reports with `reporter` and `reported_user` (including `account_status`)
- `PATCH /admin/reports/:id`: `{ status: OPEN|UNDER_REVIEW|RESOLVED|DISMISSED, admin_notes? }`
- `GET /admin/analytics?days=30` → `{ daily: [{ date, signups, connections, sessions_booked, messages }], top_taught_skills: [{ skill, users }], top_wanted_skills, session_status, average_match_score }`. Good for Recharts line and bar charts.
- `GET /admin/ai-usage?days=7` → `{ totals: { requests, model_calls, cached, fallbacks, errors, avg_latency_ms, unique_users }, by_feature, by_model, daily: [{ date, model_calls }] }`

## 8. Realtime (live chat and notification badge)

- **Send** messages through the API. **Receive** them live through Supabase Realtime.
- Only authorized users receive events: an outsider subscribing to someone else's chat gets nothing (tested).
- **Live chat**: subscribe when a chat opens:
  ```js
  const channel = supabase
    .channel(`conversation:${conversationId}`)
    .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        ({ new: m }) => addMessage({ ...m, is_mine: m.sender_id === myUserId }))
    .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        ({ new: m }) => updateMessage(m))   // read receipts + deletions
    .subscribe();
  // when leaving the chat screen:
  supabase.removeChannel(channel);
  ```
- **Notification badge**: subscribe once after login:
  ```js
  supabase.channel(`notifications:${myUserId}`)
    .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${myUserId}` },
        ({ new: n }) => { showToast(n.title, n.message); incrementBadge(); })
    .subscribe();
  ```
- Realtime rows are raw table rows, with **no `is_mine` field**: compare `sender_id` with the logged-in user's id.
- A deleted message arrives as an **UPDATE** with `is_deleted: true` and empty content.
- **Order when opening a chat:** subscribe first → load history with `GET /conversations/:id/messages` → merge by message `id`. Otherwise a message sent during the first second can be missed.
- Subscribe **after login**. If events never arrive, call `supabase.realtime.setAuth(session.access_token)` before subscribing.

## 9. File uploads (Supabase Storage)

- Upload **directly from the browser** with the Supabase client, then save the URL through the API.
- The **path must start with your own user id** (or the session id for session files), or the upload is rejected.
- Buckets:
  - **Avatar:** bucket `profile-images` (public), path `${userId}/avatar.png`, ≤ 2 MB, jpg/png/webp/gif → `PATCH /profiles/me { avatar_url: publicUrl }`
  - **Portfolio:** `portfolio-files` (private), `${userId}/<file>`, ≤ 5 MB, pdf/images → `PATCH /users/me/skills/:id { portfolio_url }`
  - **Certificate:** `certificates` (private), `${userId}/<file>`, ≤ 5 MB, pdf/images
  - **Learning resource:** `learning-resources` (private, readable by all signed-in users), `${userId}/<file>`, ≤ 10 MB, documents/images
  - **Session file:** `session-attachments` (private, **the two participants only**), `${sessionId}/<file>`, ≤ 10 MB, documents/images/zip → `POST /sessions/:id/resources { title, resource_url, resource_type: "FILE" }`
- Code:
  ```js
  // Public bucket: avatar
  const path = `${user.id}/avatar.png`;
  await supabase.storage.from('profile-images').upload(path, file, { upsert: true, contentType: file.type });
  const { data: { publicUrl } } = supabase.storage.from('profile-images').getPublicUrl(path);

  // Private bucket: upload, then save getPublicUrl(path) as the reference URL
  await supabase.storage.from('session-attachments').upload(`${sessionId}/${file.name}`, file, { contentType: file.type });

  // Private bucket: to open a file, create a short-lived signed link from its path
  const { data } = await supabase.storage.from('session-attachments').createSignedUrl(`${sessionId}/${fileName}`, 3600);
  window.open(data.signedUrl);
  ```
- For private files, the saved URL is a **reference**, not a working link. When displaying, take the part after `/<bucket>/` as the path and call `createSignedUrl`.
- A wrong file type or size, or a folder you don't own, returns an upload error. Show it to the user.

## 10. Enum values

- **Skill category:** `PROGRAMMING`, `DATA_SCIENCE`, `DESIGN`, `COMMUNICATION`, `FINANCE`, `LANGUAGES`, `CREATIVE_ARTS`, `MUSIC`, `OTHER` (labels from `GET /skills/categories`)
- **skill_type:** `TEACH`, `LEARN`
- **proficiency_level:** `BEGINNER`, `INTERMEDIATE`, `ADVANCED`, `EXPERT`
- **Profile session_mode:** `ONLINE`, `OFFLINE`, `BOTH`
- **Session session_mode:** `ONLINE`, `OFFLINE`
- **learning_style:** `VISUAL`, `AUDITORY`, `READING_WRITING`, `KINESTHETIC`, `MIXED`
- **role:** `user`, `admin` (lowercase)
- **account_status:** `ACTIVE`, `SUSPENDED`, `DELETION_REQUESTED`
- **Connection status:** `PENDING`, `ACCEPTED`, `REJECTED`, `WITHDRAWN`
- **Session status:** `PENDING`, `CONFIRMED`, `RESCHEDULE_REQUESTED`, `COMPLETED`, `CANCELLED`, `REJECTED`
- **Match status:** `SUGGESTED`, `VIEWED`, `CONNECTED`, `DISMISSED`
- **Message type:** `TEXT`, `IMAGE`, `FILE`
- **Notification type:** `CONNECTION_REQUEST`, `CONNECTION_ACCEPTED`, `CONNECTION_REJECTED`, `SESSION_REQUEST`, `SESSION_CONFIRMED`, `SESSION_REJECTED`, `SESSION_RESCHEDULE_REQUESTED`, `SESSION_CANCELLED`, `SESSION_COMPLETED`, `SESSION_REMINDER`, `NEW_REVIEW`, `NEW_MATCH`, `SYSTEM`
- **Goal type:** `SKILL`, `CAREER`, `PROJECT`, `CERTIFICATION`, `OTHER`
- **Goal status:** `ACTIVE`, `PAUSED`, `COMPLETED`, `ABANDONED`
- **Milestone status:** `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`
- **Report reason:** `SPAM`, `HARASSMENT`, `INAPPROPRIATE_CONTENT`, `FAKE_PROFILE`, `NO_SHOW`, `OTHER`
- **Report status:** `OPEN`, `UNDER_REVIEW`, `RESOLVED`, `DISMISSED`
- **AI `source`:** `AI`, `CACHED`, `FALLBACK`
- **Days of week:** `0` Sunday, `1` Monday … `6` Saturday

## 11. Shared data shapes (spec 13.3)

- **User profile** (`GET /profiles/:id`):
  ```json
  { "id": "uuid", "full_name": "Aarav Sharma", "username": "aarav123", "bio": "Computer Science student",
    "college": "Example University", "location": "Delhi", "avatar_url": null, "languages": ["English", "Hindi"],
    "learning_style": "VISUAL", "session_mode": "BOTH", "timezone": "Asia/Kolkata", "is_verified": false,
    "created_at": "...", "teach_skills": [], "learn_skills": [], "average_rating": 4.5, "review_count": 2 }
  ```
- **User skill:**
  ```json
  { "id": "uuid", "user_id": "uuid", "skill_id": "uuid", "skill_name": "Python", "category": "PROGRAMMING",
    "skill_type": "TEACH", "proficiency_level": "INTERMEDIATE", "experience_description": null,
    "portfolio_url": null, "created_at": "...", "updated_at": "..." }
  ```
- **Match:** section 7.6 · **Connection:** 7.7 · **Conversation / Message:** 7.8 · **Notification:** 7.9 · **Session:** 7.10 · **Review:** 7.12 · **Milestone:** 7.14

## 12. Helpers built for the UI

- `allowed_actions` on sessions: which buttons to show
- `my_role` and `other_user` on sessions: no need to compare ids yourself
- `can_message` on conversations: show or hide the input box
- `unread_count` on conversations and notifications: badges
- `direction` (`SENT` / `RECEIVED`) and `other_user` on connections
- `GET /connections/with/:userId`: Connect button state on a profile
- `GET /availability/overlap`: valid times for the booking calendar
- `is_mine` on messages and session resources
- `has_reviewed` on sessions: show "Leave a review" only once
- `next_milestone` in progress summaries: "Your next step"
- `source` on AI results: label AI, cached or fallback answers
- `GET /discover/filters`: all filter options in one call
- `ONBOARDING_INCOMPLETE` → `details.missing`: which onboarding step is missing

## 13. Additions to the original spec contracts (please note)

- Skill categories use `UPPER_SNAKE` values (labels come from the API).
- Profiles gained `timezone`, `is_public` and `account_status`.
- User skills also return `category`, `user_id`, `experience_description`, `portfolio_url` and timestamps.
- Lists return `{ items, pagination }`.
- Email is never part of public profiles.
- Extra endpoints: `PATCH /conversations/:id/read`, `GET /connections/with/:userId`, `PATCH /sessions/:id`, `GET/DELETE /learning/roadmaps(/:id)`, `POST /reports`, `GET /reports/mine`.
- Matches also include `exchange`, `score_breakdown` and `has_explanation`. Sessions also include `skill_name`, `my_role`, `other_user`, `allowed_actions`, `has_reviewed` and reschedule/cancel fields.

## 14. What I need from you (spec 13.2)

- Your **live frontend URL** (Vercel or Pages) for CORS, as soon as it exists. I'll also set it as the **Site URL in Supabase Auth**, so email verification and password-reset links open your site.
- Final page list and wireframes.
- Any extra fields you need on: onboarding and profile forms, match cards, chat, the booking form, the dashboard statistics.
- Notification types you plan to display.
- Anything in an API response that's missing or awkward for the UI: tell me rather than working around it in the frontend.
