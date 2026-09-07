# The Last Bench Product — Design Contract

## Brand & Vision

**The Last Bench** is a platform for Bangladeshi secondary-school students seeking clarity, guidance, and community as they navigate study-abroad pathways. The app combines real-time application tracking, AI-powered guidance, and a creator/skills community, all powered by a network of trusted tutors and coaching centers.

**Brand Tagline:** _Creating a Lasting Benchmark._

**Core Positioning:** We are not a consultancy. We are a transparent, always-on platform that makes the study-abroad journey feel less like a black box and more like a supported, visible process.

## Surface Architecture & Source Precedence

One domain contains four connected surfaces with different jobs:

| Surface                   | Route                                                | Visual role                                           | Product role                                                                       |
| ------------------------- | ---------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Cinematic student journey | `/`                                                  | Dark emotion moving from monsoon/night to daylight    | Explain the Malaysia journey and convert to mentor guidance or account entry       |
| Student product           | `/app/`                                              | Calm, legible light/dark mobile UI                    | Show real profile, application, university, guide, and settings data               |
| `[CLASS(Λ)]`              | `/class-lambda/` overview · `/class-a/` registration | Last Bench system with a build-first editorial rhythm | Compare the free masterclass and full venture-builder path, then register honestly |
| co.lab                    | `/colab/`                                            | Dark confidence with restrained green progress cues   | Explain and begin human-scoped brand/business work                                 |

The official brand kit and `design-system/tokens.json` control identity. The live
Claude Design files — Malaysia Experience v2, Last Bench Dashboard, and Last Bench
Mobile App — are visual references for hierarchy, motion, and mobile density. Their
prototype names, progress values, deadlines, recommendations, and chat messages are
illustrative and must never replace real product data.

The implementation wins whenever a design reference conflicts with truthful data,
accessibility, mobile performance, privacy, or an existing working backend flow.

---

## Design Principles

| Principle                      | Meaning                                                                                                             | Implementation                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **Clarity First**              | Students should always know where they stand and what comes next.                                                   | Every screen should show status, next steps, and reasons for delays. No hidden processes. |
| **Trust Through Transparency** | Honest about what we know and what we don't. Manual updates are labeled as such; AI recommendations show reasoning. | Avoid fake live integrations. Show "Last updated by [name]" for status changes.           |
| **Mentor-Like Tone**           | Speak like a smart, supportive older sibling, not a corporate consultancy.                                          | Use warm, practical language. Avoid jargon. Celebrate milestones.                         |
| **Mobile-First, One-Handed**   | Designed for portrait orientation on a phone held in one hand. All key actions are thumb-reachable.                 | Bottom-heavy navigation. Large, tappable buttons. Minimal scrolling for critical info.    |
| **Community Over Transaction** | The app should feel like joining a peer group, not just a service.                                                  | Show peer progress, cohort milestones, and opportunities to help others.                  |

---

## Screen List & User Flows

### **Student Journey**

#### 1. **Authentication & Onboarding**

| Screen                       | Purpose                                                                | Key Elements                                                                    |
| ---------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **Sign In / Sign Up**        | First entry point. Simple email/password or social login.              | Email input, password, "Sign up" link, "Forgot password?" link                  |
| **Profile Setup**            | Capture student's name, class/year, interests, and study-abroad goals. | Name, class dropdown, field of interest, destination preference, GPA (optional) |
| **Transcript Upload**        | Upload academic transcript or GPA document.                            | File picker, upload progress, confirmation message                              |
| **Referral Code (Optional)** | If student came via tutor referral, enter the code here.               | Referral code input, "Where did you hear about us?" optional text               |

**Flow:** Sign Up → Profile Setup → Transcript Upload → (Optional) Referral Code → Dashboard

---

#### 2. **Student Dashboard (Home)**

| Screen                            | Purpose                                                                         | Key Elements                                                                                                                                                                                                  |
| --------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Application Status Overview**   | Shows the student's current application stage at a glance.                      | Current stage from the student's record, last verified update, next known action, and quick action button; otherwise an honest empty state                                                                    |
| **Application Tracking Pipeline** | Visual representation of the student's journey through the application process. | Stages: Documents Received → Profile Analyzed → University Shortlist → Application Drafted → Submitted to University → Under Review → Offer Received → Visa Application Filed → Visa Decision → Pre-Departure |
| **Key Metrics**                   | Quick stats relevant to the student's progress.                                 | Universities shortlisted, applications submitted, offers received, visa status                                                                                                                                |
| **Recent Activity Feed**          | Chronological log of updates visible to this student.                           | "Status updated to [stage]", "Mentor [name] sent you a message", or a newly published community resource, with timestamps and privacy boundaries                                                              |

**UX Pattern:** Tap on any stage to see details (documents needed, timeline, mentor notes).

---

#### 3. **AI Guidance Chat**

| Screen                      | Purpose                                                                      | Key Elements                                                                                                                                                           |
| --------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Guidance Chat Interface** | Conversational AI that helps students explore options and make decisions.    | Chat bubbles, input field at bottom, typing indicator, suggested prompts ("Tell me about [university]", "What are my options with a 3.2 GPA?")                         |
| **Recommendation Card**     | AI helps a student explore universities/programmes based on profile context. | University, programme, match rationale, concerns to verify, source/review context, "Explore" button, and "Discuss with a mentor" action                                |
| **Comparison View**         | Side-by-side exploration of universities or programmes.                      | 2-3 columns using only currently sourced fields; unknown or stale values are labeled instead of estimated, and the action is "Verify this option" rather than "Choose" |

**AI Behavior:** The AI acts as an information engine. It explains reasoning ("This matches your GPA range and budget"), flags concerns ("Field switching may require additional documentation"), and escalates to human mentors for high-stakes decisions.

---

#### 4. **Application Management**

| Screen                 | Purpose                                                                      | Key Elements                                                                                                  |
| ---------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **My Applications**    | List of all applications the student has filed or is preparing.              | Application card (university, program, status, last updated date), "Add Application" button, filter by status |
| **Application Detail** | Deep dive into a single application.                                         | University info, program details, documents uploaded, current stage, mentor assigned, timeline, notes section |
| **Document Upload**    | Upload required documents (transcript, essay, recommendation letters, etc.). | Document type selector, file picker, upload progress, "Submitted" confirmation                                |
| **Mentor Messaging**   | Direct chat with assigned mentor/tutor.                                      | Message thread, typing indicator, file sharing capability, "Schedule Call" button                             |

---

#### 5. **Community & Skills**

| Screen            | Purpose                                                                          | Key Elements                                                                                               |
| ----------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Community Hub** | Discover peers, join cohorts, and access shared content.                         | Cohort list (e.g., "Class of 2026 - Malaysia Bound"), peer profiles, trending topics, "Join Cohort" button |
| **Cohort Space**  | Cohort-specific channel with peers at similar stages.                            | Cohort name, member count, weekly skill content, peer posts, "Ask a Question" button                       |
| **Skill Lessons** | Practical micro-lessons on AI literacy, portfolio building, interview prep, etc. | Lesson card (title, duration, difficulty, preview image), "Start Lesson" button, progress indicator        |
| **Peer Profiles** | View other students' journeys and progress.                                      | Student name, destination, status, applications, "Connect" button, shared interests                        |

---

#### 6. **Profile & Settings**

| Screen            | Purpose                                    | Key Elements                                                                  |
| ----------------- | ------------------------------------------ | ----------------------------------------------------------------------------- |
| **My Profile**    | Student's public and private profile info. | Name, photo, bio, study-abroad goals, applications count, "Edit" button       |
| **Settings**      | App preferences, notifications, privacy.   | Notification toggles, dark mode, language, privacy settings, "Log Out" button |
| **Referral Link** | Share a unique link to refer friends.      | Referral link (copyable), referral count, "Share" button                      |

---

### **Tutor/Coach Journey**

#### 1. **Tutor Onboarding**

| Screen                  | Purpose                                 | Key Elements                                                                                    |
| ----------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **Tutor Sign Up**       | Register as a tutor or coaching center. | Name/center name, email, phone, location, expertise areas (checkboxes), "Create Account" button |
| **Referral Link Setup** | Generate a unique referral link/code.   | Referral code (auto-generated), copy button, "Share on WhatsApp" button, QR code                |

---

#### 2. **Tutor Dashboard**

| Screen                     | Purpose                                       | Key Elements                                                                                       |
| -------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **Referral Overview**      | Summary of referred students and commissions. | Total referred, pending commission, earned commission, "Withdraw" button                           |
| **Referred Students List** | All students referred by this tutor.          | Student name, status, application count, commission status (pending/earned), "View Details" button |
| **Commission Tracker**     | Track earnings from successful placements.    | Commission per student, total earned, payout history, "Request Payout" button                      |
| **Student Detail**         | View a referred student's progress.           | Student name, applications, current stage, contact info, notes section                             |

---

#### 3. **Tutor Messaging**

| Screen             | Purpose                             | Key Elements                                                           |
| ------------------ | ----------------------------------- | ---------------------------------------------------------------------- |
| **Tutor Messages** | Communicate with referred students. | Message thread, typing indicator, "Schedule Call" button, file sharing |

---

### **Admin/Operations Journey**

#### 1. **Admin Dashboard**

| Screen                         | Purpose                                          | Key Elements                                                                                                                      |
| ------------------------------ | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| **System Overview**            | High-level metrics and alerts.                   | Total students, total applications, pending status updates, alerts (e.g., "5 students waiting for update"), "View Details" button |
| **Student Management**         | Search and manage student records.               | Search bar, student list, status, last updated, "Edit" button, "View Applications" button                                         |
| **Application Status Updates** | Manually update application stages for students. | Student selector, application selector, new status dropdown, notes field, "Update" button                                         |
| **Referral Approvals**         | Review and approve tutor referrals.              | Pending referrals list, tutor name, student name, "Approve" / "Reject" button                                                     |
| **Commission Management**      | Track and manage tutor commissions.              | Tutor list, commission earned, payout status, "Process Payout" button                                                             |

---

## User Flows (Detailed)

### **Flow 1: Student Signs Up and Gets Guided**

```
1. Student opens app → Sign In screen
2. Taps "Sign Up" → Profile Setup screen
3. Enters name, class, interests, destination → Transcript Upload screen
4. Uploads transcript → (Optional) Referral Code screen
5. Enters referral code (if applicable) → Dashboard
6. Sees the current stage from their real record, or an empty-state setup prompt → Taps to see next steps
7. Sees AI Guidance prompt → Taps "Get Guidance"
8. Chats with AI about universities → AI recommends 3 options
9. Student taps "Add to Shortlist" → Application Management
10. Sees "My Applications" with shortlisted universities
11. Uploads documents for first application → Mentor assigned
12. Receives notification: "Mentor [name] sent you a message"
```

---

### **Flow 2: Tutor Refers a Student and Tracks Commission**

```
1. Tutor opens app → Tutor Sign Up screen
2. Enters center name, expertise areas → Referral Link Setup
3. Gets unique referral code → Tutor Dashboard
4. Shares referral link with students (WhatsApp, in-person, etc.)
5. Student signs up using referral code
6. Tutor sees student in "Referred Students List"
7. As student progresses, tutor sees status updates
8. When student gets visa approval → Commission marked as "Earned"
9. Tutor taps "Request Payout" → Operator reviews the request and records the approved payout through the configured method
```

---

### **Flow 3: Admin Updates Application Status**

```
1. Admin opens app → Admin Dashboard
2. Sees alert: "5 students waiting for update"
3. Taps "View Details" → Student Management
4. Searches for student by name
5. Taps student → Application Status Updates
6. Selects application → Selects new status (e.g., "Submitted to University")
7. Adds note: "University received application on June 19"
8. Taps "Update" → Student receives notification
9. Student sees updated status on Dashboard
```

---

## Color Palette

| Token          | Light                | Dark                    | Usage                                                    |
| -------------- | -------------------- | ----------------------- | -------------------------------------------------------- |
| **Primary**    | `#00C853`            | `#00E676`               | Primary actions, progress, active navigation             |
| **Background** | `#FAFAF8`            | `#07100B`               | Warm light page ground and cinematic/product dark ground |
| **Surface**    | `#E6F2E9`            | `#0F2A1E`               | Cards, elevated surfaces, grouped controls               |
| **Foreground** | `#111111`            | `#FAFAF8`               | Primary text                                             |
| **Muted**      | `#6B6F76`            | `#A1A1AA`               | Secondary text, hints                                    |
| **Border**     | `rgba(17,17,17,.12)` | `rgba(250,250,248,.15)` | Dividers and boundaries                                  |
| **Success**    | `#00C853`            | `#00E676`               | Confirmed completion; always paired with text or icon    |
| **Warning**    | `#B76800`            | `#FFB300`               | Cautions and items needing attention                     |
| **Error**      | `#C62828`            | `#FF6B6B`               | Errors and blocked states                                |

---

## Typography

| Element               | Font Size                 | Font Weight    | Line Height | Usage                                                                                    |
| --------------------- | ------------------------- | -------------- | ----------- | ---------------------------------------------------------------------------------------- |
| **Marketing display** | Responsive 42-126px Anton | Regular (400)  | 0.9-1.0     | Cinematic headlines only                                                                 |
| **Product heading 1** | 32px General Sans         | Bold (700)     | 1.2         | App screen titles                                                                        |
| **Product heading 2** | 24px General Sans         | Semibold (600) | 1.3         | App section titles                                                                       |
| **Product heading 3** | 18px General Sans         | Semibold (600) | 1.4         | App subsections                                                                          |
| **Body**              | 16px Sora                 | Regular (400)  | 1.5         | Main product text and form inputs                                                        |
| **Caption**           | 14px Sora                 | Regular (400)  | 1.4         | Secondary text and hints                                                                 |
| **Small**             | 12px Sora                 | Medium (500)   | 1.3         | Timestamps and labels; never shrink below readable mobile size for essential information |

---

## Interaction Patterns

| Pattern             | Behavior                                        | Feedback                                |
| ------------------- | ----------------------------------------------- | --------------------------------------- |
| **Button Tap**      | Primary action (submit, confirm, navigate).     | Scale to 0.97, haptic feedback (light). |
| **Card Tap**        | Navigate to detail or expand.                   | Opacity 0.7, no haptic.                 |
| **List Scroll**     | Infinite scroll or pagination for large lists.  | Loading indicator at bottom.            |
| **Pull-to-Refresh** | Refresh data (e.g., status updates).            | Spinner, haptic feedback on completion. |
| **Swipe**           | Dismiss notifications or navigate between tabs. | Smooth animation, haptic on completion. |
| **Long Press**      | Context menu (copy, share, delete).             | Haptic feedback, menu appears.          |

---

## Accessibility

- All buttons and interactive elements have minimum 44x44pt touch target.
- Color is never the only indicator of status (use icons + text).
- All images have descriptive alt text.
- Text contrast meets WCAG AA standards (4.5:1 for body text).
- Support for system font scaling (up to 200%).

---

## Responsive Design

The app is designed for **portrait orientation (9:16)** on mobile devices. Key breakpoints:

| Device             | Width     | Adjustments                                          |
| ------------------ | --------- | ---------------------------------------------------- |
| **Small Phone**    | 320px     | Reduced padding, single-column layout                |
| **Standard Phone** | 375-414px | Default design (primary target)                      |
| **Large Phone**    | 480px+    | Increased padding, optional 2-column for lists       |
| **Tablet**         | 768px+    | 2-column layout, larger cards, split-view for detail |

---

## Current Release Priorities

1. Verify production auth and API health on the canonical domain; a successful static deploy is not proof that the product is live.
2. Apply and verify the pending AI-guide schema migration before exposing the guide flow in production.
3. Build the document-picker UI on top of the existing document backend.
4. Connect the public lead flow to an approved CRM/data path while preserving consent and attribution.
5. Replace any illustrative founder photography only after all three founders approve the assets and biographies.
6. Keep 320px, 390px, and 430px mobile QA, keyboard navigation, reduced motion, and real empty/error states in every release gate.
