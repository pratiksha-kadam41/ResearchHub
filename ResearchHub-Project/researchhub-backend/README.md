# ResearchHub backend setup

## Database

Create the existing `researchhub` database and its `users`, `repositories`, and
`student_profiles` tables first. Then run
[`database/researchhub_group_repositories.sql`](./database/researchhub_group_repositories.sql)
in MySQL Workbench or the MySQL command-line client. The script adds repository
membership and invitation tables and registers the existing repository owners.
For an existing installation, run
[`database/researchhub_invitation_responses.sql`](./database/researchhub_invitation_responses.sql)
once to add accepted/rejected invitation statuses, and run
[`database/researchhub_mentor_rejection_reason.sql`](./database/researchhub_mentor_rejection_reason.sql)
once to store faculty rejection feedback for guidance requests.

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

Group repository creation checks the SMTP connection when SMTP is configured.
If SMTP is not configured or an email cannot be delivered, repository creation
still succeeds. The owner receives secure invitation links that can be copied
and shared manually from the repository workspace. The workspace can also
generate a fresh link for pending invitations. When SMTP is configured, failed
email delivery can be retried from that workspace.
Invitation links expire after seven days and can only be accepted by a student
account whose email matches the invitation. If the invitee does not have an
account yet, opening the email link takes them through student registration and
sign-in. Accept and reject links open a confirmation page; invitation links do
not change status until the invitee confirms the choice. Rejection does not
require an account, while acceptance requires the invited student account.

Repository members can also create and edit shared research notes in the
repository workspace. Only authenticated student members of that repository
can read or change its notes.

## Start the backend

From the project root, run `npm start`. The backend listens on the `PORT` from
`.env` (5000 by default).
