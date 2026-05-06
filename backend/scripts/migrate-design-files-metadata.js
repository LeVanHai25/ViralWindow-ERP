/**
 * Migration script: Tạo metadata.json cho các file design đã upload trước đó
 * Chạy script này để tạo metadata cho các file cũ (không có originalName)
 * 
 * Usage: node backend/scripts/migrate-design-files-metadata.js
 */

const fs = require('fs');
const path = require('path');

const designsBaseDir = path.join(__dirname, '../uploads/designs');

console.log('🔄 Starting migration: Create metadata for existing design files...');
console.log('📁 Designs directory:', designsBaseDir);

if (!fs.existsSync(designsBaseDir)) {
    console.log('⚠️ Designs directory does not exist. Nothing to migrate.');
    process.exit(0);
}

// Lấy tất cả các project folders
const projectFolders = fs.readdirSync(designsBaseDir).filter(item => {
    const itemPath = path.join(designsBaseDir, item);
    return fs.statSync(itemPath).isDirectory();
});

console.log(`📦 Found ${projectFolders.length} project folders`);

let totalFiles = 0;
let migratedFiles = 0;
let createdMetadata = 0;

projectFolders.forEach(projectId => {
    const projectDir = path.join(designsBaseDir, projectId);
    const metadataFile = path.join(projectDir, 'metadata.json');
    
    console.log(`\n📂 Processing project: ${projectId}`);
    
    // Đọc metadata hiện có (nếu có)
    let metadata = {};
    if (fs.existsSync(metadataFile)) {
        try {
            const content = fs.readFileSync(metadataFile, 'utf8');
            metadata = JSON.parse(content);
            console.log(`   ✅ Found existing metadata with ${Object.keys(metadata).length} entries`);
        } catch (e) {
            console.warn(`   ⚠️ Could not read metadata file:`, e.message);
            metadata = {};
        }
    } else {
        console.log(`   📝 Creating new metadata file`);
        createdMetadata++;
    }
    
    // Lấy tất cả các file (trừ metadata.json)
    const files = fs.readdirSync(projectDir).filter(f => f !== 'metadata.json');
    totalFiles += files.length;
    
    console.log(`   📄 Found ${files.length} files`);
    
    // Kiểm tra từng file
    files.forEach(filename => {
        if (!metadata[filename]) {
            // File chưa có trong metadata
            const filePath = path.join(projectDir, filename);
            const stats = fs.statSync(filePath);
            
            // Tạo metadata entry với originalName = filename (tạm thời)
            // User có thể sửa sau nếu cần
            metadata[filename] = {
                originalName: filename,  // Tạm thời dùng filename, user có thể sửa sau
                uploadedAt: stats.mtime.toISOString(),
                size: stats.size,
                mimetype: 'application/octet-stream',
                note: 'Migrated - originalName may need manual update'
            };
            
            migratedFiles++;
            console.log(`   ✅ Added metadata for: ${filename}`);
        } else {
            console.log(`   ✓ Already in metadata: ${filename}`);
        }
    });
    
    // Ghi lại metadata file
    if (Object.keys(metadata).length > 0) {
        fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2), 'utf8');
        console.log(`   💾 Saved metadata file with ${Object.keys(metadata).length} entries`);
    }
});

console.log('\n📊 Migration Summary:');
console.log(`   Total projects: ${projectFolders.length}`);
console.log(`   Total files: ${totalFiles}`);
console.log(`   Migrated files: ${migratedFiles}`);
console.log(`   Created metadata files: ${createdMetadata}`);
console.log('\n✅ Migration completed!');
console.log('\n⚠️ Note: For files without original metadata, originalName is set to filename.');
console.log('   You may need to manually update originalName in metadata.json if you know the original names.');


