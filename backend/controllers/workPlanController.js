const db = require('../config/db');
const { emitDataChange, getIO } = require('../services/socketService');

// Get all work plans
exports.getAllWorkPlans = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;
        
        let query = `
            SELECT wp.*, 
                   u.full_name as creator_name,
                   (SELECT COUNT(*) FROM work_plan_checklists WHERE work_plan_id = wp.id) as chk_total,
                   (SELECT COUNT(*) FROM work_plan_checklists WHERE work_plan_id = wp.id AND is_completed = 1) as chk_completed
            FROM work_plans wp
            LEFT JOIN users u ON wp.created_by = u.id
        `;
        let queryParams = [];

        // Role-Based Access Control
        const roleName = req.user.role_name || '';
        const userType = req.user.user_type || '';
        const isSuperAdmin = userType === 'admin' || roleName === 'Super Admin';
        
        if (!isSuperAdmin) {
            query += ` WHERE wp.created_by = ? OR wp.id IN (SELECT work_plan_id FROM work_plan_participants WHERE user_id = ?)`;
            queryParams.push(userId, userId);
        }

        query += ' ORDER BY wp.start_time DESC';

        const [plans] = await db.query(query, queryParams);

        // Fetch participants for each plan
        if (plans.length > 0) {
            const planIds = plans.map(p => p.id);
            const [participants] = await db.query(`
                SELECT wpp.work_plan_id, wpp.user_id, wpp.role, u.full_name, u.avatar_url as avatar
                FROM work_plan_participants wpp
                JOIN users u ON wpp.user_id = u.id
                WHERE wpp.work_plan_id IN (?)
            `, [planIds]);

            plans.forEach(plan => {
                plan.participants = participants.filter(p => p.work_plan_id === plan.id);
                // Parse JSON fields
                if (typeof plan.survey_data === 'string') plan.survey_data = JSON.parse(plan.survey_data);
                if (typeof plan.supervision_data === 'string') plan.supervision_data = JSON.parse(plan.supervision_data);
            });
        }

        res.json({ success: true, data: plans });
    } catch (error) {
        next(error);
    }
};

// Get single work plan details
exports.getWorkPlanById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const role = req.user.role;

        const [plans] = await db.query(`
            SELECT wp.*, u.full_name as creator_name,
                   (SELECT COUNT(*) FROM work_plan_checklists WHERE work_plan_id = wp.id) as chk_total,
                   (SELECT COUNT(*) FROM work_plan_checklists WHERE work_plan_id = wp.id AND is_completed = 1) as chk_completed
            FROM work_plans wp
            LEFT JOIN users u ON wp.created_by = u.id
            WHERE wp.id = ?
        `, [id]);

        if (plans.length === 0) {
            return res.status(404).json({ success: false, message: 'Work plan not found' });
        }

        const plan = plans[0];

        // Ensure Employees only view if they are participating
        const [participants] = await db.query(`
            SELECT wpp.work_plan_id, wpp.user_id, wpp.role, u.full_name, u.avatar_url as avatar
            FROM work_plan_participants wpp
            JOIN users u ON wpp.user_id = u.id
            WHERE wpp.work_plan_id = ?
        `, [id]);

        plan.participants = participants;

        // Role-Based Access Control
        const roleName = req.user.role_name || '';
        const userType = req.user.user_type || '';
        const isSuperAdmin = userType === 'admin' || roleName === 'Super Admin';
        
        if (!isSuperAdmin) {
            const isCreator = plan.created_by === userId;
            const isParticipant = participants.some(p => p.user_id === userId);
            if (!isCreator && !isParticipant) {
                return res.status(403).json({ success: false, message: 'Bạn không có quyền truy cập kế hoạch này' });
            }
        }

        // Parse JSON fields
        if (typeof plan.survey_data === 'string') plan.survey_data = JSON.parse(plan.survey_data);
        if (typeof plan.supervision_data === 'string') plan.supervision_data = JSON.parse(plan.supervision_data);

        res.json({ success: true, data: plan });
    } catch (error) {
        next(error);
    }
};

// Create a new work plan
exports.createWorkPlan = async (req, res, next) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const {
            title, description, type, start_time, end_time, location,
            project_id, customer_name, status = 'planned', priority = 'normal',
            survey_data, supervision_data, meeting_note,
            participants = [] // Array of user_ids or {user_id, role}
        } = req.body;

        const created_by = req.user.id;

        const [result] = await connection.query(`
            INSERT INTO work_plans 
            (title, description, type, start_time, end_time, location, project_id, customer_name, status, priority, created_by, survey_data, supervision_data, meeting_note)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            title, description, type, start_time, end_time, location, project_id || null, customer_name || null, status, priority, created_by,
            survey_data ? JSON.stringify(survey_data) : null,
            supervision_data ? JSON.stringify(supervision_data) : null,
            meeting_note || null
        ]);

        const planId = result.insertId;

        // Ensure creator is always a participant
        if (!participants) participants = [];
        const hasCreator = participants.some(p => (typeof p === 'object' ? p.user_id : p) == created_by);
        if (!hasCreator) {
            participants.push({ user_id: created_by, role: 'owner' });
        }

        // Add Participants
        if (participants.length > 0) {
            for (const p of participants) {
                const uid = typeof p === 'object' ? p.user_id : p;
                const rRole = typeof p === 'object' ? (p.role || 'member') : 'member';
                await connection.query(`INSERT INTO work_plan_participants (work_plan_id, user_id, \`role\`) VALUES (?, ?, ?)`, [planId, uid, rRole]);
            }
        }

        await connection.commit();
        connection.release();

        // Get created plan full data to broadcast
        const [newPlans] = await db.query(`SELECT * FROM work_plans WHERE id = ?`, [planId]);
        
        // Socket.IO Emit
        emitDataChange('work_plans', 'created', newPlans[0]);

        // Emit notifications to participants
        const io = getIO();
        if (io && participants.length > 0) {
            participants.forEach(p => {
                const uid = typeof p === 'object' ? p.user_id : p;
                if (uid !== created_by) {
                    io.to('module_user_' + uid).emit('notification', {
                        type: 'work_plan',
                        title: 'Kế hoạch công việc mới',
                        message: `Bạn được thêm vào kế hoạch: ${title}`
                    });
                }
            });
        }

        res.status(201).json({ success: true, data: { id: planId, ...req.body } });
    } catch (error) {
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        next(error);
    }
};

// Edit a work plan
exports.updateWorkPlan = async (req, res, next) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const { id } = req.params;
        const {
            title, description, type, start_time, end_time, location,
            project_id, customer_name, status, priority,
            survey_data, supervision_data, meeting_note,
            participants // If provided, update participants list
        } = req.body;

        await connection.query(`
            UPDATE work_plans 
            SET title=?, description=?, type=?, start_time=?, end_time=?, location=?, 
                project_id=?, customer_name=?, status=?, priority=?, survey_data=?, supervision_data=?, meeting_note=?
            WHERE id = ?
        `, [
            title, description, type, start_time, end_time, location, 
            project_id || null, customer_name || null, status, priority || 'normal',
            survey_data ? JSON.stringify(survey_data) : null,
            supervision_data ? JSON.stringify(supervision_data) : null,
            meeting_note || null,
            id
        ]);

        // Update participants if provided
        if (participants) {
            // Ensure creator is always preserved in participants
            const [planData] = await connection.query('SELECT created_by FROM work_plans WHERE id = ?', [id]);
            if (planData.length > 0) {
                const creatorId = planData[0].created_by;
                const hasCreator = participants.some(p => (typeof p === 'object' ? p.user_id : p) == creatorId);
                if (!hasCreator) {
                    participants.push({ user_id: creatorId, role: 'owner' });
                }
            }

            // Delete old
            await connection.query('DELETE FROM work_plan_participants WHERE work_plan_id = ?', [id]);
            // Insert new
            if (participants.length > 0) {
                for (const p of participants) {
                    const uid = typeof p === 'object' ? p.user_id : p;
                    const rRole = typeof p === 'object' ? (p.role || 'member') : 'member';
                    await connection.query(`INSERT INTO work_plan_participants (work_plan_id, user_id, \`role\`) VALUES (?, ?, ?)`, [id, uid, rRole]);
                }
            }
        }

        await connection.commit();
        connection.release();

        const [updatedPlans] = await db.query(`SELECT * FROM work_plans WHERE id = ?`, [id]);
        
        emitDataChange('work_plans', 'updated', updatedPlans[0]);

        res.json({ success: true, message: 'Work plan updated' });
    } catch (error) {
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        next(error);
    }
};

// Delete a work plan
exports.deleteWorkPlan = async (req, res, next) => {
    try {
        const { id } = req.params;
        await db.query(`DELETE FROM work_plans WHERE id = ?`, [id]);
        
        // Triggers CASCADE on comments and participants thanks to FOREIGN KEY constraints
        emitDataChange('work_plans', 'deleted', { id });
        
        res.json({ success: true, message: 'Work plan deleted' });
    } catch (error) {
        next(error);
    }
};

// ==========================================
// USERS API FOR WORK PLANS
// ==========================================
exports.getUsersForPlan = async (req, res, next) => {
    try {
        const [users] = await db.query(`
            SELECT u.id, u.full_name, r.name as role, u.avatar_url as avatar 
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.is_active = 1
            ORDER BY u.full_name ASC
        `);
        res.json({ success: true, data: users });
    } catch (error) {
        next(error);
    }
};

// ==========================================
// COMMENTS / DISCUSSIONS APIs
// ==========================================
exports.getComments = async (req, res, next) => {
    try {
        const { id } = req.params; // Work plan ID
        const [comments] = await db.query(`
            SELECT c.*, u.full_name, u.avatar_url as avatar 
            FROM work_plan_comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.work_plan_id = ?
            ORDER BY c.created_at ASC
        `, [id]);

        res.json({ success: true, data: comments });
    } catch (error) {
        next(error);
    }
};

exports.addComment = async (req, res, next) => {
    try {
        const { id } = req.params; // Work plan ID
        const { message } = req.body;
        const userId = req.user.id;

        const [result] = await db.query(`
            INSERT INTO work_plan_comments (work_plan_id, user_id, message)
            VALUES (?, ?, ?)
        `, [id, userId, message]);

        const commentId = result.insertId;

        const [newComment] = await db.query(`
            SELECT c.*, u.full_name, u.avatar_url as avatar 
            FROM work_plan_comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.id = ?
        `, [commentId]);

        // Realtime broadcast to specific discussion room
        const io = getIO();
        if (io) {
            io.to('module_work_plan_discussion_' + id).emit('new_comment', newComment[0]);
        }

        res.status(201).json({ success: true, data: newComment[0] });
    } catch (error) {
        next(error);
    }
};

// ==========================================
// LOGS APIs
// ==========================================
exports.getLogs = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [logs] = await db.query(`
            SELECT l.*, u.full_name, u.avatar_url as avatar 
            FROM work_plan_logs l
            JOIN users u ON l.user_id = u.id
            WHERE l.work_plan_id = ?
            ORDER BY l.created_at DESC
        `, [id]);
        res.json({ success: true, data: logs });
    } catch (error) {
        next(error);
    }
};

exports.addLog = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { action, description } = req.body;
        const userId = req.user.id;

        await db.query(`
            INSERT INTO work_plan_logs (work_plan_id, user_id, action, description)
            VALUES (?, ?, ?, ?)
        `, [id, userId, action, description || null]);

        res.status(201).json({ success: true, message: 'Thêm nhật ký thành công' });
    } catch (error) {
        next(error);
    }
};

// ==========================================
// CHECKLISTS APIs
// ==========================================
exports.getChecklists = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [items] = await db.query(`
            SELECT c.*, u.full_name as completed_by_name 
            FROM work_plan_checklists c
            LEFT JOIN users u ON c.completed_by = u.id
            WHERE c.work_plan_id = ?
            ORDER BY c.created_at ASC
        `, [id]);
        res.json({ success: true, data: items });
    } catch (error) {
        next(error);
    }
};

exports.addChecklistItem = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { title } = req.body;

        const [result] = await db.query(`
            INSERT INTO work_plan_checklists (work_plan_id, title)
            VALUES (?, ?)
        `, [id, title]);

        emitDataChange('work_plans', 'checklist_added', { work_plan_id: id, id: result.insertId });

        res.status(201).json({ success: true, data: { id: result.insertId, title, is_completed: 0 } });
    } catch (error) {
        next(error);
    }
};

exports.toggleChecklistItem = async (req, res, next) => {
    try {
        const { id, itemId } = req.params;
        const { is_completed } = req.body;
        const userId = req.user.id;

        const completedBy = is_completed ? userId : null;
        const completedAt = is_completed ? new Date() : null;

        await db.query(`
            UPDATE work_plan_checklists 
            SET is_completed = ?, completed_by = ?, completed_at = ?
            WHERE id = ? AND work_plan_id = ?
        `, [is_completed, completedBy, completedAt, itemId, id]);

        emitDataChange('work_plans', 'checklist_toggled', { work_plan_id: id, checklist_id: itemId });

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};

exports.deleteChecklistItem = async (req, res, next) => {
    try {
        const { id, itemId } = req.params;
        await db.query(`DELETE FROM work_plan_checklists WHERE id = ? AND work_plan_id = ?`, [itemId, id]);
        
        emitDataChange('work_plans', 'checklist_deleted', { work_plan_id: id, checklist_id: itemId });
        
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};
