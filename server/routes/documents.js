'use strict';
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { db, UPLOAD_DIR } = require('../db');
const { requireAuth, canWrite } = require('../auth');
const { wrap, bad, notFound, logActivity, HttpError } = require('../helpers');

const router = express.Router();
router.use(requireAuth);

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    // Store under a random name; the original name is kept in the database only,
    // so a crafted filename can never escape the upload directory.
    const ext = path.extname(file.originalname).slice(0, 12).replace(/[^A-Za-z0-9.]/g, '');
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 10 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new HttpError(400, `Unsupported file type: ${file.mimetype}`));
    }
    cb(null, true);
  },
});

const ENTITY_TABLES = {
  customer: 'customers', case_file: 'case_files', partner: 'partners', lead: 'leads',
};

function assertEntity(type, id) {
  const table = ENTITY_TABLES[type];
  if (!table) bad('Documents can only be attached to a customer, file, partner or lead');
  if (!db.prepare(`SELECT 1 FROM ${table} WHERE id = ?`).get(id)) notFound('Record not found');
}

/**
 * A partner login may only touch documents hanging off its own partner record,
 * its own files, or the customers submitted under it.
 */
function partnerOwns(partnerId, entityType, entityId) {
  if (entityType === 'partner') return entityId === partnerId;
  if (entityType === 'case_file') {
    return Boolean(db.prepare('SELECT 1 FROM case_files WHERE id = ? AND partner_id = ?')
      .get(entityId, partnerId));
  }
  if (entityType === 'customer') {
    return Boolean(db.prepare('SELECT 1 FROM customers WHERE id = ? AND partner_id = ?')
      .get(entityId, partnerId));
  }
  return false;
}

function guardDocumentScope(req, entityType, entityId) {
  if (req.user.role !== 'partner') return;
  if (!partnerOwns(req.user.partner_id, entityType, entityId)) {
    throw new HttpError(403, 'You can only access documents on your own records');
  }
}

router.get('/', wrap((req, res) => {
  const { entity_type, entity_id, category, search } = req.query;
  if (req.user.role === 'partner') {
    if (!entity_type || !entity_id) {
      throw new HttpError(403, 'Open one of your own records to see its documents');
    }
    guardDocumentScope(req, entity_type, Number(entity_id));
  }
  const sql = [`SELECT d.*, u.name AS uploaded_by_name FROM documents d
                LEFT JOIN users u ON u.id = d.uploaded_by`];
  const where = [];
  const params = [];
  if (entity_type) { where.push('d.entity_type = ?'); params.push(entity_type); }
  if (entity_id) { where.push('d.entity_id = ?'); params.push(Number(entity_id)); }
  if (category) { where.push('d.category = ?'); params.push(category); }
  if (search) { where.push('d.original_name LIKE ?'); params.push(`%${search}%`); }
  if (where.length) sql.push(`WHERE ${where.join(' AND ')}`);
  sql.push('ORDER BY d.created_at DESC LIMIT 500');
  res.json({ data: db.prepare(sql.join(' ')).all(...params) });
}));

router.post('/', canWrite('documents'), upload.array('files', 10), wrap((req, res) => {
  const entityType = req.body.entity_type;
  const entityId = Number(req.body.entity_id);
  const category = req.body.category || 'Other';
  if (!req.files || !req.files.length) bad('No file was uploaded');

  try {
    assertEntity(entityType, entityId);
    guardDocumentScope(req, entityType, entityId);
  } catch (err) {
    for (const f of req.files) fs.rmSync(f.path, { force: true });
    throw err;
  }

  const insert = db.prepare(`
    INSERT INTO documents (entity_type, entity_id, category, original_name, stored_name,
                           mime_type, size_bytes, uploaded_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const saved = db.transaction((files) => files.map((f) => {
    const info = insert.run(entityType, entityId, category, f.originalname, f.filename,
      f.mimetype, f.size, req.user.id);
    return db.prepare('SELECT * FROM documents WHERE id = ?').get(info.lastInsertRowid);
  }))(req.files);

  logActivity(entityType, entityId, 'Documents uploaded',
    `${category}: ${req.files.map((f) => f.originalname).join(', ')}`, req.user.id);

  // Uploading a document satisfies a matching checklist line automatically.
  if (entityType === 'case_file') {
    db.prepare(`UPDATE document_checklist SET status = 'Received'
                WHERE case_file_id = ? AND lower(name) = lower(?) AND status = 'Missing'`)
      .run(entityId, category);
  }
  res.status(201).json({ data: saved });
}));

router.get('/:id/download', wrap((req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(Number(req.params.id));
  if (!doc) notFound('Document not found');
  guardDocumentScope(req, doc.entity_type, doc.entity_id);
  const filePath = path.join(UPLOAD_DIR, doc.stored_name);
  // Defence in depth: never serve anything resolving outside the upload directory.
  if (!filePath.startsWith(UPLOAD_DIR + path.sep) || !fs.existsSync(filePath)) {
    notFound('The stored file is no longer available');
  }
  const inline = req.query.inline === '1';
  res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
  res.setHeader('Content-Disposition',
    `${inline ? 'inline' : 'attachment'}; filename="${doc.original_name.replace(/["\r\n]/g, '')}"`);
  fs.createReadStream(filePath).pipe(res);
}));

router.delete('/:id', canWrite('documents'), wrap((req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(Number(req.params.id));
  if (!doc) notFound('Document not found');
  db.prepare('DELETE FROM documents WHERE id = ?').run(doc.id);
  fs.rmSync(path.join(UPLOAD_DIR, doc.stored_name), { force: true });
  logActivity(doc.entity_type, doc.entity_id, 'Document deleted', doc.original_name, req.user.id);
  res.json({ ok: true });
}));

module.exports = router;
