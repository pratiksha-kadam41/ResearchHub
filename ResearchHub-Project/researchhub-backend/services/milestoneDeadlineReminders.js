const db = require("../config/db");
const { createNotifications } = require("./repositoryAccess");

const sendUpcomingMilestoneReminders = async () => {
  const [milestones] = await db.promise().execute(
    `SELECT m.id AS milestone_id, m.order_no, m.title AS milestone_title,
            r.id AS repository_id, r.name AS project_name, rm.user_id
     FROM milestones m
     JOIN repositories r ON r.id = m.repository_id
     JOIN repository_members rm ON rm.repository_id = r.id
     WHERE m.deadline > NOW()
       AND m.deadline <= DATE_ADD(NOW(), INTERVAL 3 DAY)
       AND m.status NOT IN ('APPROVED', 'COMPLETED')
       AND COALESCE(m.submission_status, '') NOT IN
           ('SUBMITTED', 'RESUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'COMPLETED')
     ORDER BY m.deadline, m.id, rm.user_id`,
  );

  for (const milestone of milestones) {
    const connection = await db.promise().getConnection();
    try {
      await connection.beginTransaction();
      const [result] = await connection.execute(
        `INSERT IGNORE INTO milestone_deadline_reminders (milestone_id, user_id)
         VALUES (?, ?)`,
        [milestone.milestone_id, milestone.user_id],
      );
      if (result.affectedRows === 1) {
        await createNotifications([milestone.user_id], {
          type: "MILESTONE_DEADLINE_APPROACHING",
          title: "Milestone deadline approaching",
          message: `Milestone ${milestone.order_no} (${milestone.milestone_title}) deadline is approaching for ${milestone.project_name}.`,
          linkUrl: `/repository/${milestone.repository_id}?tab=milestones&milestone=${milestone.milestone_id}`,
        }, connection);
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
};

module.exports = { sendUpcomingMilestoneReminders };
