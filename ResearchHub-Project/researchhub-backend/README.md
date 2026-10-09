# ResearchHub backend setup

## Database

Create the existing `researchhub` database and its `users`, `repositories`, and
`student_profiles` tables first. Then run
[`database/researchhub_group_repositories.sql`](./database/researchhub_group_repositories.sql)
in MySQL Workbench or the MySQL command-line client. The script adds repository
membership and invitation tables and registers the existing repository owners.
Run `node database/migrate.js` from `researchhub-backend` to create or update the
project lifecycle tables, including milestones, submissions, reviews, suggestion
responses, uploaded-file metadata, and deadline-reminder tracking. The
migration also adds email verification/account status fields to `users` and links
existing invitation rows to registered student accounts through
`repository_invitations.invited_user_id`. New and existing accounts must verify
their email before signing in or accepting/creating projects. Verification uses
a six-digit email code that expires in 10 minutes; after five incorrect attempts
the user must request a new code. Existing accounts can request one from the
verification screen linked on sign in.
This also safely adds milestone columns to databases created with an older schema.
The migration also creates the project-scoped research paper tables and seeds
three initial templates with their own section structures.
For an existing installation, run
[`database/researchhub_invitation_responses.sql`](./database/researchhub_invitation_responses.sql)
once to add accepted/rejected invitation statuses, and run
[`database/researchhub_mentor_rejection_reason.sql`](./database/researchhub_mentor_rejection_reason.sql)
once to store faculty rejection feedback for guidance requests.

## Milestone lifecycle

Milestones belong to an individual repository/project. Assigned faculty create
the complete ordered plan in one save using
`POST /api/milestones/repository/:repositoryId/plan`; the batch is validated and
published atomically. Students and faculty can then see every milestone in the
same project list from the start. Each milestone requires a title, description,
student instructions, allocated marks, a future deadline, and a meeting date.
A project may allocate up to 100 marks across its milestones. Student submissions are
versioned, with lateness calculated by the backend against the milestone
deadline. Reviews, remarks, suggestions, and suggestion responses remain in
history; outstanding suggestions from earlier milestones are included in later
submissions until faculty accepts them.

Awarded marks are returned to students only after faculty releases them.
Submission files are stored locally in `uploads/submissions` and are served
through authenticated project-scoped downloads. The backend creates one
in-app deadline reminder per project member and milestone within three days
before the deadline. Configure persistent local storage and back up that
directory in deployed environments.

## Email invitations

For Gmail, add the sending account and Google App Password to the backend
`.env`. Keep SMTP credentials private; do not commit the `.env` file.

- `SMTP_USER` is the Gmail address that sends the invitations.
- `SMTP_PASS` is its Google App Password. Do not use the regular Gmail password.
- Gmail is the default provider (`smtp.gmail.com`, port `587`); `SMTP_HOST`,
  `SMTP_PORT`, and `SMTP_SECURE` can override it.
- `SMTP_FROM` is optional for Gmail and defaults to `SMTP_USER`.
- `FRONTEND_URL` is the website origin used to build invitation links. Set it to
  the deployed frontend URL outside local development.

Google requires two-step verification before a Google App Password can be
created. Store it only in the backend `.env` file and restart the backend after
changing `.env`.

Registration sends a six-digit verification code by email. Enter the code on
the verification screen to activate the account. Codes are stored as a
keyed hash, expire after 10 minutes, and allow five attempts before a new code
must be requested. Email/password is the only sign-in method.

Group repository creation requires a working SMTP connection and accepts only
unique email addresses for registered, active, email-verified student accounts.
Each invitation references its student in `repository_invitations`; invitations
are not stored as a comma-separated field. The project owner is added as the
owner member immediately. Invitees receive both a dashboard notification and a
real email containing the project title, owner, domain, description, and
accept/reject links. SMTP delivery errors are reported and can be retried from
the repository workspace.

Invitation links expire after seven days and can only be accepted or rejected
by the invited verified student account. Accepting adds that student to
`repository_members`; rejecting does not. Pending invitees are not counted as
members. The owner can see each invitee's email and pending/accepted/rejected
status in the repository workspace.

Repository members can also create and edit shared research notes in the
repository workspace. Only authenticated student members of that repository
can read or change its notes.

## Research papers

Each project can have one shared research paper created from an active template.
Templates and their section structures are stored in `paper_templates` and
`paper_template_sections`; project papers, editable sections, and revision
history are stored in `research_papers`, `paper_sections`, and
`paper_section_versions`. Accepted project members share the paper, and
assigned faculty can access it. `milestone_paper_sections` links relevant
sections to existing project milestones without copying paper content into
milestone submissions.

Authenticated endpoints are mounted at `/api/research-papers` for template
listing, project paper retrieval/creation, section saves and history, paper
status, and milestone-section linking. Access is authorized against the
existing project membership and accepted faculty assignment relationships.

## Start the backend

From the project root, run `npm start`. The backend listens on the `PORT` from
`.env` (5000 by default).
