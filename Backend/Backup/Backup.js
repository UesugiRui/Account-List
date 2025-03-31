//Configuration
const express = require('express');
const router = express.Router();
const { pool } = require('../Database/Database');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');

// Get SQL Server's native backup directory
const getBackupPath = async () => {
  const result = await pool.request().query(`
    SELECT SERVERPROPERTY('InstanceDefaultBackupPath') as BackupPath
  `);
  return result.recordset[0].BackupPath.replace(/\\+$/, '');
};

// Backup creation route
router.post('/create', async (req, res) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    try {
        const backupFiles = [];
        const baseName = `accmnglist_Backup_${timestamp}`;
        const sqlBackupDir = await getBackupPath();
        
        const backupPaths = Array.from({ length: 3 }, (_, i) =>
            path.join(sqlBackupDir, `${baseName}_COPY${i + 1}.bak`)
        );

        for (const backupPath of backupPaths) {
            await pool.request().query(`
                BACKUP DATABASE [accmnglist] 
                TO DISK = N'${backupPath.replace(/\\/g, '\\\\')}'
                WITH FORMAT, INIT
            `);
            backupFiles.push(backupPath);
        }

        const zipFileName = `${baseName}.zip`;
        const zipPath = path.join(sqlBackupDir, zipFileName);
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip');

        await new Promise((resolve, reject) => {
            archive.pipe(output);
            backupFiles.forEach(file => {
                archive.file(file, { name: path.basename(file) });
            });
            archive.finalize();
            output.on('close', resolve);
            archive.on('error', reject);
        });

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);
        res.sendFile(zipPath, () => {
            backupFiles.forEach(f => fs.unlinkSync(f));
            fs.unlinkSync(zipPath);
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to create backup',
            error: error.message
        });
    }
});

// Get SQL Server's native backup directory
  
router.post('/restore', async (req, res) => {
    let restorePath;
    let extractPath;
    
    try {
        if (!req.files?.backupFile) {
            return res.status(400).json({ success: false, message: 'No backup file provided' });
        }

        // Setup SSE connection
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        const sendProgress = (message, progress) => {
            res.write(`data: ${JSON.stringify({ message, progress })}\n\n`);
        };

        const backupFile = req.files.backupFile;
        
        // Verify file is a zip
        if (!backupFile.name.toLowerCase().endsWith('.zip')) {
            sendProgress('Error: Invalid file format. Please upload a .zip backup file', 0);
            return res.end();
        }
        
        const sqlBackupDir = await getBackupPath();
        restorePath = path.join(sqlBackupDir, backupFile.name);
        extractPath = path.join(sqlBackupDir, 'extract_' + Date.now());

        // 1. Save backup file - 10%
        sendProgress('Uploading backup file...', 5);
        await backupFile.mv(restorePath);
        sendProgress('File uploaded successfully', 10);
        
        // 2. Create extract directory - 15%
        sendProgress('Preparing extraction...', 15);
        if (!fs.existsSync(extractPath)) {
            fs.mkdirSync(extractPath, { recursive: true });
        }
        
        // 3. Extract zip file - 30%
        sendProgress('Extracting backup files...', 20);
        const extract = require('extract-zip');
        await extract(restorePath, { dir: extractPath });
        sendProgress('Files extracted successfully', 30);
        
        // 4. Find .bak files - 40%
        sendProgress('Locating backup files...', 35);
        const bakFiles = fs.readdirSync(extractPath)
            .filter(file => file.toLowerCase().endsWith('.bak'))
            .map(file => path.join(extractPath, file));
            
        if (bakFiles.length === 0) {
            throw new Error('No valid backup files found in the archive');
        }
        
        // Use the first .bak file for restore
        const bakFile = bakFiles[0];
        sendProgress(`Found backup file: ${path.basename(bakFile)}`, 40);

        // 5. Create a new connection to the master database
        sendProgress('Connecting to master database...', 45);
        
        // Create a new SQL Server connection to master database
        const sql = require('mssql');
        const config = {
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            server: process.env.DB_SERVER,
            database: 'master', // Connect to master database
            options: {
                encrypt: true,
                trustServerCertificate: true
            }
        };
        
        // Create a new connection pool for master database
        const masterPool = new sql.ConnectionPool(config);
        await masterPool.connect();
        
        sendProgress('Connected to master database', 50);
        
        // 6. Execute restore with progress updates
        const executeQuery = async (query, progressStart, progressEnd) => {
            let lastProgress = progressStart;
            let progressInterval = setInterval(() => {
                if (lastProgress < progressEnd - 5) {
                    lastProgress += 2;
                    sendProgress('Restore in progress...', lastProgress);
                } else {
                    clearInterval(progressInterval);
                }
            }, 3000);
            
            try {
                // Execute the query using the master database connection
                await masterPool.request().query(query);
                clearInterval(progressInterval);
                return true;
            } catch (error) {
                clearInterval(progressInterval);
                throw error;
            }
        };

        try {
            // Set single user mode
            sendProgress('Setting database to single user mode...', 55);
            await executeQuery(`
                ALTER DATABASE [accmnglist] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
            `, 55, 60);
            
            // Perform restore
            sendProgress('Starting database restore...', 60);
            await executeQuery(`
                RESTORE DATABASE [accmnglist] 
                FROM DISK = N'${bakFile.replace(/\\/g, '\\\\')}'
                WITH REPLACE;
            `, 60, 90);
            
            // Set multi user mode
            sendProgress('Setting database back to multi-user mode...', 90);
            await executeQuery(`
                ALTER DATABASE [accmnglist] SET MULTI_USER;
            `, 90, 95);
        } catch (queryError) {
            sendProgress(`Database error: ${queryError.message}`, 60);
            
            // Try to set multi-user mode in case of failure
            try {
                await masterPool.request().query(`
                    ALTER DATABASE [accmnglist] SET MULTI_USER;
                `);
            } catch (finalError) {
                throw finalError;
            }
            
            throw queryError;
        } finally {
            // Always close the master pool connection
            if (masterPool) {
                await masterPool.close();
            }
        }

        // 7. Final cleanup
        sendProgress('Finalizing and cleaning up temporary files...', 95);
        
        // Clean up files
        if (fs.existsSync(restorePath)) {
            fs.unlinkSync(restorePath);
        }
        
        // Clean up extract directory
        bakFiles.forEach(file => {
            if (fs.existsSync(file)) {
                fs.unlinkSync(file);
            }
        });
        
        if (fs.existsSync(extractPath)) {
            fs.rmdirSync(extractPath, { recursive: true });
        }
        
        sendProgress('Restore complete! Redirecting to login...', 100);
        res.end();

    } catch (error) {
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
        
        // Clean up files on error
        if (restorePath && fs.existsSync(restorePath)) {
            try { fs.unlinkSync(restorePath); } catch (e) { }
        }
        
        if (extractPath && fs.existsSync(extractPath)) {
            try { fs.rmdirSync(extractPath, { recursive: true }); } catch (e) { }
        }
    }
});
  
module.exports = router;