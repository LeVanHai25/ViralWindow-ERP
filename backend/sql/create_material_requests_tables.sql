-- =============================================================
-- Script tạo bảng lưu trữ yêu cầu vật tư
-- Bao gồm: material_requests, material_request_items
-- =============================================================

-- 1. Tạo bảng material_requests (Phiếu yêu cầu vật tư)
CREATE TABLE IF NOT EXISTS `material_requests` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `project_id` int(11) DEFAULT NULL COMMENT 'ID dự án',
  `project_name` varchar(255) DEFAULT NULL COMMENT 'Tên dự án',
  `order_code` varchar(100) NOT NULL COMMENT 'Mã đơn hàng',
  `request_date` date NOT NULL COMMENT 'Ngày tạo phiếu',
  `required_date` date DEFAULT NULL COMMENT 'Ngày vật tư cần về',
  `category` enum('nhom','kinh','phukien','vattu') NOT NULL COMMENT 'Loại: nhom, kinh, phukien, vattu',
  `status` enum('draft','submitted','approved','rejected','completed') NOT NULL DEFAULT 'draft' COMMENT 'Trạng thái',
  `delivery_address` text DEFAULT NULL COMMENT 'Địa chỉ giao hàng',
  `project_type` varchar(100) DEFAULT NULL COMMENT 'Chủng loại',
  `project_color` varchar(100) DEFAULT NULL COMMENT 'Màu sắc',
  `notes` text DEFAULT NULL COMMENT 'Ghi chú',
  `created_by` int(11) DEFAULT NULL COMMENT 'ID người tạo',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_order_code` (`order_code`),
  KEY `idx_project_id` (`project_id`),
  KEY `idx_category` (`category`),
  KEY `idx_status` (`status`),
  KEY `idx_request_date` (`request_date`),
  CONSTRAINT `fk_mr_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Phiếu yêu cầu vật tư';

-- 2. Tạo bảng material_request_items (Chi tiết vật tư trong phiếu yêu cầu)
CREATE TABLE IF NOT EXISTS `material_request_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `material_request_id` int(11) NOT NULL COMMENT 'ID phiếu yêu cầu',
  `item_index` int(11) NOT NULL DEFAULT 1 COMMENT 'STT trong phiếu',
  `material_code` varchar(100) DEFAULT NULL COMMENT 'Mã vật tư',
  `material_name` varchar(255) NOT NULL COMMENT 'Tên vật tư',
  `unit` varchar(50) DEFAULT 'cây' COMMENT 'Đơn vị tính',
  `quantity` decimal(10,2) NOT NULL DEFAULT 0 COMMENT 'Số lượng yêu cầu',
  `shortage` decimal(10,2) DEFAULT 0 COMMENT 'Số lượng thiếu',
  `density` decimal(10,3) DEFAULT NULL COMMENT 'Tỷ trọng (cho nhôm)',
  `length_m` decimal(10,2) DEFAULT NULL COMMENT 'Chiều dài mét (cho nhôm)',
  `weight` decimal(10,2) DEFAULT NULL COMMENT 'Khối lượng (cho nhôm)',
  `width` decimal(10,2) DEFAULT NULL COMMENT 'Chiều rộng (cho kính)',
  `height` decimal(10,2) DEFAULT NULL COMMENT 'Chiều cao (cho kính)',
  `panels` int(11) DEFAULT NULL COMMENT 'Số tấm (cho kính)',
  `area` decimal(10,4) DEFAULT NULL COMMENT 'Diện tích (cho kính)',
  `glass_type` varchar(100) DEFAULT NULL COMMENT 'Loại kính',
  `notes` text DEFAULT NULL COMMENT 'Ghi chú',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_material_request_id` (`material_request_id`),
  KEY `idx_item_index` (`item_index`),
  CONSTRAINT `fk_mri_request` FOREIGN KEY (`material_request_id`) REFERENCES `material_requests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Chi tiết vật tư trong phiếu yêu cầu';


-- Script tạo bảng lưu trữ yêu cầu vật tư
-- Bao gồm: material_requests, material_request_items
-- =============================================================

-- 1. Tạo bảng material_requests (Phiếu yêu cầu vật tư)
CREATE TABLE IF NOT EXISTS `material_requests` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `project_id` int(11) DEFAULT NULL COMMENT 'ID dự án',
  `project_name` varchar(255) DEFAULT NULL COMMENT 'Tên dự án',
  `order_code` varchar(100) NOT NULL COMMENT 'Mã đơn hàng',
  `request_date` date NOT NULL COMMENT 'Ngày tạo phiếu',
  `required_date` date DEFAULT NULL COMMENT 'Ngày vật tư cần về',
  `category` enum('nhom','kinh','phukien','vattu') NOT NULL COMMENT 'Loại: nhom, kinh, phukien, vattu',
  `status` enum('draft','submitted','approved','rejected','completed') NOT NULL DEFAULT 'draft' COMMENT 'Trạng thái',
  `delivery_address` text DEFAULT NULL COMMENT 'Địa chỉ giao hàng',
  `project_type` varchar(100) DEFAULT NULL COMMENT 'Chủng loại',
  `project_color` varchar(100) DEFAULT NULL COMMENT 'Màu sắc',
  `notes` text DEFAULT NULL COMMENT 'Ghi chú',
  `created_by` int(11) DEFAULT NULL COMMENT 'ID người tạo',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_order_code` (`order_code`),
  KEY `idx_project_id` (`project_id`),
  KEY `idx_category` (`category`),
  KEY `idx_status` (`status`),
  KEY `idx_request_date` (`request_date`),
  CONSTRAINT `fk_mr_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Phiếu yêu cầu vật tư';

-- 2. Tạo bảng material_request_items (Chi tiết vật tư trong phiếu yêu cầu)
CREATE TABLE IF NOT EXISTS `material_request_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `material_request_id` int(11) NOT NULL COMMENT 'ID phiếu yêu cầu',
  `item_index` int(11) NOT NULL DEFAULT 1 COMMENT 'STT trong phiếu',
  `material_code` varchar(100) DEFAULT NULL COMMENT 'Mã vật tư',
  `material_name` varchar(255) NOT NULL COMMENT 'Tên vật tư',
  `unit` varchar(50) DEFAULT 'cây' COMMENT 'Đơn vị tính',
  `quantity` decimal(10,2) NOT NULL DEFAULT 0 COMMENT 'Số lượng yêu cầu',
  `shortage` decimal(10,2) DEFAULT 0 COMMENT 'Số lượng thiếu',
  `density` decimal(10,3) DEFAULT NULL COMMENT 'Tỷ trọng (cho nhôm)',
  `length_m` decimal(10,2) DEFAULT NULL COMMENT 'Chiều dài mét (cho nhôm)',
  `weight` decimal(10,2) DEFAULT NULL COMMENT 'Khối lượng (cho nhôm)',
  `width` decimal(10,2) DEFAULT NULL COMMENT 'Chiều rộng (cho kính)',
  `height` decimal(10,2) DEFAULT NULL COMMENT 'Chiều cao (cho kính)',
  `panels` int(11) DEFAULT NULL COMMENT 'Số tấm (cho kính)',
  `area` decimal(10,4) DEFAULT NULL COMMENT 'Diện tích (cho kính)',
  `glass_type` varchar(100) DEFAULT NULL COMMENT 'Loại kính',
  `notes` text DEFAULT NULL COMMENT 'Ghi chú',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_material_request_id` (`material_request_id`),
  KEY `idx_item_index` (`item_index`),
  CONSTRAINT `fk_mri_request` FOREIGN KEY (`material_request_id`) REFERENCES `material_requests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Chi tiết vật tư trong phiếu yêu cầu';











