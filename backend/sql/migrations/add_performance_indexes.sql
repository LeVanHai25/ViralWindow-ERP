-- =====================================================
-- MIGRATION: Add Performance Indexes
-- Date: 2026-01-22
-- Description: Thêm các indexes để tối ưu performance queries
-- =====================================================

-- BACKUP DATABASE TRƯỚC KHI CHẠY!
-- mysqldump -u root viral_window_db > backup_before_indexes.sql

-- =====================================================
-- PROJECTS TABLE
-- =====================================================
-- Index cho filter by status (dashboard, reports)
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- Index cho filter by customer (customer page)
CREATE INDEX IF NOT EXISTS idx_projects_customer_id ON projects(customer_id);

-- Index cho sort by date (list views)
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);

-- Composite index cho common filters
CREATE INDEX IF NOT EXISTS idx_projects_status_created ON projects(status, created_at);

-- =====================================================
-- QUOTATIONS TABLE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_project_id ON quotations(project_id);
CREATE INDEX IF NOT EXISTS idx_quotations_customer_id ON quotations(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotations_created_at ON quotations(created_at);

-- =====================================================
-- INVENTORY TABLE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_inventory_item_code ON inventory(item_code);
CREATE INDEX IF NOT EXISTS idx_inventory_item_type ON inventory(item_type);
CREATE INDEX IF NOT EXISTS idx_inventory_supplier_id ON inventory(supplier_id);

-- =====================================================
-- STOCK DOCUMENTS TABLE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_stock_documents_doc_type ON stock_documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_stock_documents_status ON stock_documents(status);
CREATE INDEX IF NOT EXISTS idx_stock_documents_doc_date ON stock_documents(doc_date);
CREATE INDEX IF NOT EXISTS idx_stock_documents_project_id ON stock_documents(project_id);

-- =====================================================
-- FINANCIAL TRANSACTIONS TABLE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_financial_transaction_date ON financial_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_financial_status ON financial_transactions(status);
CREATE INDEX IF NOT EXISTS idx_financial_trans_type ON financial_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_financial_project_id ON financial_transactions(project_id);

-- =====================================================
-- DEBTS TABLE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_debts_status ON debts(status);
CREATE INDEX IF NOT EXISTS idx_debts_customer_id ON debts(customer_id);
CREATE INDEX IF NOT EXISTS idx_debts_due_date ON debts(due_date);

-- =====================================================
-- ALUMINUM SCRAPS TABLE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_aluminum_scraps_status ON aluminum_scraps(status);
CREATE INDEX IF NOT EXISTS idx_aluminum_scraps_source_project ON aluminum_scraps(source_project_id);

-- =====================================================
-- VERIFY INDEXES
-- =====================================================
-- Chạy sau khi thêm indexes để verify:
-- SHOW INDEX FROM projects;
-- SHOW INDEX FROM quotations;
-- SHOW INDEX FROM inventory;
-- SHOW INDEX FROM stock_documents;
-- SHOW INDEX FROM financial_transactions;

-- =====================================================
-- ANALYZE TABLES (Cập nhật statistics)
-- =====================================================
ANALYZE TABLE projects;
ANALYZE TABLE quotations;
ANALYZE TABLE inventory;
ANALYZE TABLE stock_documents;
ANALYZE TABLE financial_transactions;
ANALYZE TABLE debts;
ANALYZE TABLE aluminum_scraps;

-- =====================================================
-- ROLLBACK (Nếu cần)
-- =====================================================
-- DROP INDEX idx_projects_status ON projects;
-- DROP INDEX idx_projects_customer_id ON projects;
-- ... (tương tự cho các indexes khác)
