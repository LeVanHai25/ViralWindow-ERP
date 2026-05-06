-- Create product_manufacturing table for smart status tracking
-- Option D: Materials determine readiness, User confirms completion

DROP TABLE IF EXISTS product_manufacturing;

CREATE TABLE product_manufacturing (
    id INT PRIMARY KEY AUTO_INCREMENT,
    project_id INT NOT NULL,
    product_id VARCHAR(50) NOT NULL, -- Composite ID like "525_1"
    design_id INT NULL, -- door_designs.id if exists
    
    -- Status tracking with audit trail
    status ENUM(
        'not_assigned',
        'missing_materials',
        'ready',
        'manufacturing',
        'completed'
    ) NOT NULL DEFAULT 'not_assigned',
    last_status ENUM(
        'not_assigned',
        'missing_materials',
        'ready',
        'manufacturing',
        'completed'
    ) NULL COMMENT 'Previous status for audit',
    status_updated_at DATETIME NULL COMMENT 'When status last changed',
    
    -- Materials tracking
    materials_required_count INT DEFAULT 0 COMMENT 'Total materials needed',
    materials_exported_count INT DEFAULT 0 COMMENT 'Materials exported from warehouse',
    materials_percent INT DEFAULT 0 COMMENT 'Cached percentage for performance',
    
    -- Manufacturing timestamps
    started_at DATETIME NULL COMMENT 'When manufacturing started',
    completed_at DATETIME NULL COMMENT 'When product completed',
    
    -- Audit timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign keys
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (design_id) REFERENCES door_designs(id) ON DELETE SET NULL,
    
    -- Unique constraint
    UNIQUE KEY unique_product (project_id, product_id),
    
    -- Indexes for performance
    INDEX idx_status (status),
    INDEX idx_project_status (project_id, status),
    INDEX idx_materials_percent (materials_percent)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Smart product manufacturing tracking with material-based status';

-- Add comments for clarity
ALTER TABLE product_manufacturing COMMENT = 'Manufacturing status: not_assigned → missing_materials → ready → manufacturing → completed';
