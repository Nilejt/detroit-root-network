# Detroit Root Network

Detroit Root Network starts with a practical question: where can someone find locally grown food, and is the information current enough to act on? We built a shared discovery experience and a simple operations workspace so growers can maintain the information customers need. The project demonstrates how product leadership, technical business analysis, program management, and UX research can guide AI-assisted development from requirements through a working cloud deployment. The next step is a controlled farmer pilot to measure whether the workflows improve information freshness and ease of use.

## Nile
Senior Project Manager and Technical Business Analyst

Led product scope and acceptance decisions, translated operational needs into requirements, directed AI-assisted implementation, and configured and validated the deployment across GitHub, Vercel, and Supabase.

## Quinn
Technical Program Manager and UX Researcher

Brings program coordination and UX research to the project. The Director Q workspace supports cross-farm review, contextual feedback, and planned testing with farmers in her network.

## Technology stack

**Application — Next.js 16 and React 19**
App Router pages and server route handlers connect a responsive browser experience to authentication services.

**Implementation — TypeScript and CSS**
Typed data models and responsive styling support discovery, operations, and feedback workflows. Tailwind 4 is included in the styling toolchain.

**Data and identity — Supabase PostgreSQL and Auth**
Persistent relational records, email magic links, authenticated sessions, profile roles, farm memberships, and database access policies.

**Authorization — Row Level Security and SQL triggers**
Database policies govern access. T2 fixture protection checks both old and new records, including tier changes and child-record moves.

**Maps — Leaflet and OpenStreetMap**
Interactive Detroit map with clickable, seeded farm markers. Current markers use predefined coordinates rather than automatic geocoding.

**Delivery — GitHub and Vercel**
PowerShell build and Git workflow, automatic deployment from main, environment-scoped configuration, and firewall rules.

**Quality and recovery — ESLint, TypeScript, Node tests, PostgreSQL tools**
Production builds, focused authentication tests, and a database backup whose archive contents were checked before migration.

## Configuration

**Supabase**
Confirmed existing identities; applied migration 005; verified Owner and Director Q profile roles; configured production Site URL and the email callback redirect. Q's Stall membership and cross-T1 policies are included in the migration.

**Vercel**
Configured public Supabase connection values and private server variables; enabled a temporary beta-login kill switch; published a firewall rate-limit rule before enabling code access.

**GitHub and PowerShell**
Used the existing repository and main branch; staged specific deployment files; ran validation and pushed commit 8175d66 for the beta-authentication release.

**Database recovery**
Installed PostgreSQL command-line tools, created a database archive through the session pooler, and successfully listed the archive before applying the migration. A full restore rehearsal remains a next step.

## Evidence

**Deployed beta**
Vercel deployment reached Ready, and the project owner reported successful beta-code login and satisfactory access checks.

**Automated checks**
The beta-authentication release passed lint, a production build, and eight route tests covering failed and successful authentication boundaries. These tests mock Supabase; they are not a complete live RLS audit.

**Database configuration**
Migration 005 completed successfully. Owner and Director Q roles were confirmed in the profiles table.

**Email authentication**
The production Site URL and callback allowlist were corrected after a failed return and email rate-limit error. A successful post-correction email sign-in still needs confirmation.

**Pilot readiness**
A pilot of up to 15 farmers is planned. No adoption, revenue, yield, or food-access impact metrics are claimed yet.

## Next steps

- Confirm farmer email login and configure email delivery suitable for the pilot.
- Run live direct-API permission tests for unrelated T1 access, T2 mutation attempts, and role escalation.
- Remove temporary Owner and Director Q code login before the larger demo; revoke beta sessions and retire older deployments.
- Observe an initial farmer cohort and measure onboarding completion, time to first inventory update, task completion, and information freshness.
- Add guided farmer onboarding and address geocoding; review map-service capacity and rehearse database restoration.