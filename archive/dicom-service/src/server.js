const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const dicomParser = require('dicom-parser');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.DICOM_PORT || 3004;
const UPLOAD_PATH = process.env.DICOM_STORAGE_PATH || '/tmp/dicom-storage';
const DB_PATH = process.env.DATABASE_URL || '../node-api/data/diabetes.db';

// Middleware
app.use(cors());
app.use(express.json());

// Initialize storage directory
async function initializeStorage() {
  try {
    await fs.mkdir(UPLOAD_PATH, { recursive: true });
    await fs.mkdir(`${UPLOAD_PATH}/studies`, { recursive: true });
    await fs.mkdir(`${UPLOAD_PATH}/thumbnails`, { recursive: true });
    console.log('✓ DICOM storage directories initialized');
  } catch (error) {
    console.error('Error initializing storage:', error);
  }
}

// Database connection
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('✓ Connected to EMR database');
    loadDicomSchema();
  }
});

async function loadDicomSchema() {
  try {
    const schemaPath = path.join(__dirname, '../../data/dicom_schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf8');
    
    db.exec(schema, (err) => {
      if (err) {
        console.error('Error loading DICOM schema:', err);
      } else {
        console.log('✓ DICOM database schema loaded');
      }
    });
  } catch (error) {
    console.warn('⚠ DICOM schema file not found, creating tables manually');
    createDicomTables();
  }
}

function createDicomTables() {
  // Basic DICOM tables creation (fallback)
  const tables = [
    `CREATE TABLE IF NOT EXISTS dicom_studies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      study_instance_uid TEXT UNIQUE NOT NULL,
      study_date DATE,
      study_description TEXT,
      modality TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS dicom_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      study_id INTEGER NOT NULL,
      sop_instance_uid TEXT UNIQUE NOT NULL,
      file_path TEXT NOT NULL,
      thumbnail_path TEXT,
      metadata TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  ];

  tables.forEach(sql => {
    db.run(sql, (err) => {
      if (err) console.error('Error creating DICOM table:', err);
    });
  });
}

// Configure multer for DICOM file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, `${UPLOAD_PATH}/studies`);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${uuidv4()}.dcm`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    // Accept DICOM files (usually no extension or .dcm)
    const isValidDicom = !file.originalname.includes('.') || 
                        file.originalname.toLowerCase().endsWith('.dcm') ||
                        file.originalname.toLowerCase().endsWith('.dicom');
    cb(null, isValidDicom);
  },
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB limit
  }
});

// DICOM Parser utilities
class DicomProcessor {
  static async parseDicomFile(filePath) {
    try {
      const fileBuffer = await fs.readFile(filePath);
      const dataSet = dicomParser.parseDicom(fileBuffer);
      
      return {
        patientName: this.getElementString(dataSet, 'x00100010'),
        patientID: this.getElementString(dataSet, 'x00100020'),
        patientBirthDate: this.getElementString(dataSet, 'x00100030'),
        patientSex: this.getElementString(dataSet, 'x00100040'),
        studyInstanceUID: this.getElementString(dataSet, 'x0020000d'),
        seriesInstanceUID: this.getElementString(dataSet, 'x0020000e'),
        sopInstanceUID: this.getElementString(dataSet, 'x00080018'),
        studyDate: this.getElementString(dataSet, 'x00080020'),
        studyTime: this.getElementString(dataSet, 'x00080030'),
        studyDescription: this.getElementString(dataSet, 'x00081030'),
        seriesDescription: this.getElementString(dataSet, 'x0008103e'),
        modality: this.getElementString(dataSet, 'x00080060'),
        instanceNumber: this.getElementString(dataSet, 'x00200013'),
        sliceLocation: this.getElementString(dataSet, 'x00201041'),
        windowCenter: this.getElementString(dataSet, 'x00281050'),
        windowWidth: this.getElementString(dataSet, 'x00281051'),
        rows: this.getElementNumber(dataSet, 'x00280010'),
        columns: this.getElementNumber(dataSet, 'x00280011'),
        pixelSpacing: this.getElementString(dataSet, 'x00280030')
      };
    } catch (error) {
      console.error('Error parsing DICOM file:', error);
      return null;
    }
  }

  static getElementString(dataSet, tag) {
    const element = dataSet.elements[tag];
    if (!element) return null;
    return dataSet.string(tag) || null;
  }

  static getElementNumber(dataSet, tag) {
    const element = dataSet.elements[tag];
    if (!element) return null;
    return dataSet.uint16(tag) || null;
  }

  static async generateThumbnail(filePath, outputPath) {
    try {
      // For now, create a placeholder thumbnail
      // In production, you'd extract pixel data and convert to image
      await sharp({
        create: {
          width: 200,
          height: 200,
          channels: 3,
          background: { r: 50, g: 50, b: 50 }
        }
      })
      .png()
      .toFile(outputPath);
      
      return outputPath;
    } catch (error) {
      console.error('Error generating thumbnail:', error);
      return null;
    }
  }
}

// API Routes

// Test endpoint for basic connectivity
app.post('/api/dicom/test-upload', (req, res) => {
  console.log('Test upload endpoint called');
  res.json({ 
    success: true, 
    message: 'Test endpoint working',
    timestamp: new Date().toISOString()
  });
});

// Upload DICOM files
app.post('/api/dicom/upload', upload.array('dicomFiles', 10), async (req, res) => {
  try {
    const { patientId } = req.body;
    
    if (!patientId) {
      return res.status(400).json({ error: 'Patient ID is required' });
    }

    const results = [];

    for (const file of req.files) {
      try {
        // Parse DICOM metadata
        const metadata = await DicomProcessor.parseDicomFile(file.path);
        
        if (!metadata) {
          console.error(`Failed to parse DICOM file: ${file.filename}`);
          continue;
        }

        // Generate thumbnail
        const thumbnailPath = `${UPLOAD_PATH}/thumbnails/${file.filename}.png`;
        await DicomProcessor.generateThumbnail(file.path, thumbnailPath);

        // Store or get study information
        let study = await new Promise((resolve, reject) => {
          db.get(
            'SELECT id FROM dicom_studies WHERE study_instance_uid = ?',
            [metadata.studyInstanceUID],
            (err, row) => {
              if (err) reject(err);
              else resolve(row);
            }
          );
        });

        // Create study if it doesn't exist
        if (!study) {
          const studyData = await new Promise((resolve, reject) => {
            db.run(
              `INSERT INTO dicom_studies 
               (patient_id, study_instance_uid, study_date, study_description, modality) 
               VALUES (?, ?, ?, ?, ?)`,
              [patientId, metadata.studyInstanceUID, metadata.studyDate, 
               metadata.studyDescription, metadata.modality],
              function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID });
              }
            );
          });
          study = studyData;
        }

        // Store image information
        const imageData = await new Promise((resolve, reject) => {
          db.run(
            `INSERT INTO dicom_images 
             (study_id, sop_instance_uid, file_path, thumbnail_path, metadata) 
             VALUES (?, ?, ?, ?, ?)`,
            [study.id, metadata.sopInstanceUID, file.path, thumbnailPath, 
             JSON.stringify(metadata)],
            function(err) {
              if (err) reject(err);
              else resolve({ id: this.lastID });
            }
          );
        });

        results.push({
          filename: file.filename,
          studyId: study.id,
          imageId: imageData.id,
          metadata: metadata
        });

      } catch (error) {
        console.error(`Error processing file ${file.filename}:`, error);
      }
    }

    res.json({
      message: `Processed ${results.length} DICOM files`,
      results
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to process DICOM upload' });
  }
});

// Get studies for a patient
app.get('/api/dicom/patients/:patientId/studies', (req, res) => {
  const { patientId } = req.params;
  
  const query = `
    SELECT s.*, COUNT(i.id) as image_count
    FROM dicom_studies s
    LEFT JOIN dicom_images i ON s.id = i.study_id
    WHERE s.patient_id = ?
    GROUP BY s.id
    ORDER BY s.study_date DESC, s.created_at DESC
  `;
  
  db.all(query, [patientId], (err, studies) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(studies);
  });
});

// Get images for a study
app.get('/api/dicom/studies/:studyId/images', (req, res) => {
  const { studyId } = req.params;
  
  const query = `
    SELECT id, sop_instance_uid, file_path, thumbnail_path, metadata
    FROM dicom_images 
    WHERE study_id = ?
    ORDER BY CAST(JSON_EXTRACT(metadata, '$.instanceNumber') AS INTEGER)
  `;
  
  db.all(query, [studyId], (err, images) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Parse metadata for each image
    const imagesWithMetadata = images.map(image => ({
      ...image,
      metadata: JSON.parse(image.metadata || '{}')
    }));
    
    res.json(imagesWithMetadata);
  });
});

// Serve DICOM files
app.get('/api/dicom/files/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = `${UPLOAD_PATH}/studies/${filename}`;
    
    // Security check - ensure file exists and is in allowed directory
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ error: 'File not found' });
    }
    
    res.setHeader('Content-Type', 'application/dicom');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.sendFile(path.resolve(filePath));
    
  } catch (error) {
    res.status(500).json({ error: 'Failed to serve file' });
  }
});

// Serve thumbnails
app.get('/api/dicom/thumbnails/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const thumbnailPath = `${UPLOAD_PATH}/thumbnails/${filename}`;
    
    try {
      await fs.access(thumbnailPath);
    } catch {
      return res.status(404).json({ error: 'Thumbnail not found' });
    }
    
    res.setHeader('Content-Type', 'image/png');
    res.sendFile(path.resolve(thumbnailPath));
    
  } catch (error) {
    res.status(500).json({ error: 'Failed to serve thumbnail' });
  }
});

// Health check
app.get('/api/dicom/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'DICOM Service',
    version: '1.0.0',
    storage: UPLOAD_PATH
  });
});

// Initialize and start server
async function startServer() {
  await initializeStorage();
  
  app.listen(PORT, () => {
    console.log(`✓ DICOM Service running on http://localhost:${PORT}`);
    console.log(`✓ Storage path: ${UPLOAD_PATH}`);
  });
}

startServer().catch(console.error);

module.exports = app;