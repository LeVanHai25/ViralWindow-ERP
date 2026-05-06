-- =============================================================
-- Script tạo bảng CRM cho khách hàng
-- Bao gồm: customer_appointments, customer_interactions
-- =============================================================

-- 1. Tạo bảng customer_appointments (Lịch hẹn)
CREATE TABLE IF NOT EXISTS `customer_appointments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `customer_id` int(11) NOT NULL COMMENT 'ID khách hàng',
  `appointment_date` datetime NOT NULL COMMENT 'Ngày giờ hẹn',
  `appointment_type` varchar(50) DEFAULT 'meeting' COMMENT 'Loại: meeting, survey, call, visit, other',
  `title` varchar(255) NOT NULL COMMENT 'Tiêu đề',
  `description` text DEFAULT NULL COMMENT 'Mô tả',
  `location` varchar(255) DEFAULT NULL COMMENT 'Địa điểm',
  `status` enum('scheduled','completed','cancelled','postponed') NOT NULL DEFAULT 'scheduled' COMMENT 'Trạng thái',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_customer_id` (`customer_id`),
  KEY `idx_appointment_date` (`appointment_date`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_ca_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Lịch hẹn với khách hàng';

-- 2. Tạo bảng customer_interactions (Tương tác)
CREATE TABLE IF NOT EXISTS `customer_interactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `customer_id` int(11) NOT NULL COMMENT 'ID khách hàng',
  `interaction_type` varchar(50) NOT NULL DEFAULT 'call' COMMENT 'Loại: call, email, meeting, visit, quotation, other',
  `interaction_date` datetime NOT NULL COMMENT 'Ngày giờ tương tác',
  `title` varchar(255) NOT NULL COMMENT 'Tiêu đề',
  `description` text DEFAULT NULL COMMENT 'Mô tả chi tiết',
  `related_quotation_id` int(11) DEFAULT NULL COMMENT 'ID báo giá liên quan (nếu có)',
  `related_project_id` int(11) DEFAULT NULL COMMENT 'ID dự án liên quan (nếu có)',
  `created_by` int(11) DEFAULT NULL COMMENT 'ID người tạo',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_customer_id` (`customer_id`),
  KEY `idx_interaction_date` (`interaction_date`),
  KEY `idx_interaction_type` (`interaction_type`),
  KEY `idx_related_quotation` (`related_quotation_id`),
  KEY `idx_related_project` (`related_project_id`),
  CONSTRAINT `fk_ci_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ci_quotation` FOREIGN KEY (`related_quotation_id`) REFERENCES `quotations` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_ci_project` FOREIGN KEY (`related_project_id`) REFERENCES `projects` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Lịch sử tương tác với khách hàng';

-- 3. Thêm cột customer_status và next_followup_date vào bảng customers nếu chưa có
ALTER TABLE `customers` 
ADD COLUMN IF NOT EXISTS `customer_status` varchar(50) DEFAULT 'potential' COMMENT 'Trạng thái: potential, interested, closed, inactive',
ADD COLUMN IF NOT EXISTS `next_followup_date` date DEFAULT NULL COMMENT 'Ngày liên hệ tiếp theo',
ADD COLUMN IF NOT EXISTS `last_contact_date` datetime DEFAULT NULL COMMENT 'Ngày liên hệ cuối cùng';

-- 4. Tạo index cho customer_status
CREATE INDEX IF NOT EXISTS `idx_customer_status` ON `customers` (`customer_status`);


-- Script tạo bảng CRM cho khách hàng
-- Bao gồm: customer_appointments, customer_interactions
-- =============================================================

-- 1. Tạo bảng customer_appointments (Lịch hẹn)
CREATE TABLE IF NOT EXISTS `customer_appointments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `customer_id` int(11) NOT NULL COMMENT 'ID khách hàng',
  `appointment_date` datetime NOT NULL COMMENT 'Ngày giờ hẹn',
  `appointment_type` varchar(50) DEFAULT 'meeting' COMMENT 'Loại: meeting, survey, call, visit, other',
  `title` varchar(255) NOT NULL COMMENT 'Tiêu đề',
  `description` text DEFAULT NULL COMMENT 'Mô tả',
  `location` varchar(255) DEFAULT NULL COMMENT 'Địa điểm',
  `status` enum('scheduled','completed','cancelled','postponed') NOT NULL DEFAULT 'scheduled' COMMENT 'Trạng thái',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_customer_id` (`customer_id`),
  KEY `idx_appointment_date` (`appointment_date`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_ca_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Lịch hẹn với khách hàng';

-- 2. Tạo bảng customer_interactions (Tương tác)
CREATE TABLE IF NOT EXISTS `customer_interactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `customer_id` int(11) NOT NULL COMMENT 'ID khách hàng',
  `interaction_type` varchar(50) NOT NULL DEFAULT 'call' COMMENT 'Loại: call, email, meeting, visit, quotation, other',
  `interaction_date` datetime NOT NULL COMMENT 'Ngày giờ tương tác',
  `title` varchar(255) NOT NULL COMMENT 'Tiêu đề',
  `description` text DEFAULT NULL COMMENT 'Mô tả chi tiết',
  `related_quotation_id` int(11) DEFAULT NULL COMMENT 'ID báo giá liên quan (nếu có)',
  `related_project_id` int(11) DEFAULT NULL COMMENT 'ID dự án liên quan (nếu có)',
  `created_by` int(11) DEFAULT NULL COMMENT 'ID người tạo',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_customer_id` (`customer_id`),
  KEY `idx_interaction_date` (`interaction_date`),
  KEY `idx_interaction_type` (`interaction_type`),
  KEY `idx_related_quotation` (`related_quotation_id`),
  KEY `idx_related_project` (`related_project_id`),
  CONSTRAINT `fk_ci_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ci_quotation` FOREIGN KEY (`related_quotation_id`) REFERENCES `quotations` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_ci_project` FOREIGN KEY (`related_project_id`) REFERENCES `projects` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Lịch sử tương tác với khách hàng';

-- 3. Thêm cột customer_status và next_followup_date vào bảng customers nếu chưa có
ALTER TABLE `customers` 
ADD COLUMN IF NOT EXISTS `customer_status` varchar(50) DEFAULT 'potential' COMMENT 'Trạng thái: potential, interested, closed, inactive',
ADD COLUMN IF NOT EXISTS `next_followup_date` date DEFAULT NULL COMMENT 'Ngày liên hệ tiếp theo',
ADD COLUMN IF NOT EXISTS `last_contact_date` datetime DEFAULT NULL COMMENT 'Ngày liên hệ cuối cùng';

-- 4. Tạo index cho customer_status
CREATE INDEX IF NOT EXISTS `idx_customer_status` ON `customers` (`customer_status`);











