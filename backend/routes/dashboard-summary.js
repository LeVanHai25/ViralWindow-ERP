/**
 * Dashboard Summary Counts API
 * Provides quick counts for sidebar badges and KPI cards
 * GET /api/dashboard/summary-counts
 */
const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.get('/summary-counts', async (req, res) => {
    try {
        const agencyId = req.query.agency_id || null;

        // Run all count queries in parallel
        const [
            [activeProjects],
            [pendingQuotations],
            [lateProjects],
            [unreadMessages]
        ] = await Promise.all([
            // Active projects count
            db.query(
                `SELECT COUNT(*) as count FROM projects 
                 WHERE status IN ('active','in_progress','running','dang_thuc_hien')
                 ${agencyId ? 'AND agency_id = ?' : ''}`,
                agencyId ? [agencyId] : []
            ),
            // Pending quotations count
            db.query(
                `SELECT COUNT(*) as count FROM quotations 
                 WHERE status IN ('draft','pending','cho_duyet')
                 ${agencyId ? 'AND agency_id = ?' : ''}`,
                agencyId ? [agencyId] : []
            ),
            // Late projects (deadline passed, not completed)
            db.query(
                `SELECT COUNT(*) as count FROM projects 
                 WHERE deadline < CURDATE() 
                 AND status NOT IN ('completed','done','cancelled','hoan_thanh','da_huy')
                 ${agencyId ? 'AND agency_id = ?' : ''}`,
                agencyId ? [agencyId] : []
            ),
            // Unread messages (if user is authenticated)
            req.user ? db.query(
                `SELECT COUNT(*) as count FROM messages m
                 JOIN conversation_members cm ON cm.conversation_id = m.conversation_id
                 LEFT JOIN message_reads mr ON mr.message_id = m.id AND mr.user_id = ?
                 WHERE cm.user_id = ? AND mr.id IS NULL AND m.sender_id != ?`,
                [req.user.id, req.user.id, req.user.id]
            ).catch(() => [{ count: 0 }]) : Promise.resolve([{ count: 0 }])
        ]);

        res.json({
            success: true,
            activeProjects: activeProjects[0]?.count || 0,
            pendingQuotations: pendingQuotations[0]?.count || 0,
            lateProjects: lateProjects[0]?.count || 0,
            unreadMessages: unreadMessages[0]?.count || 0
        });
    } catch (err) {
        console.error('Dashboard summary-counts error:', err.message);
        // Return zeros on error to not break sidebar badges
        res.json({
            success: false,
            activeProjects: 0,
            pendingQuotations: 0,
            lateProjects: 0,
            unreadMessages: 0
        });
    }
});

module.exports = router;
