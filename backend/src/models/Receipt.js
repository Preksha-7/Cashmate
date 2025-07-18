import { executeQuery } from "../config/database.js";

export class Receipt {
  constructor(data) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.filename = data.filename;
    this.original_filename = data.original_filename;
    this.file_path = data.file_path;
    this.file_size = data.file_size;
    this.mime_type = data.mime_type;
    this.parsed_data = data.parsed_data;
    this.processing_status = data.processing_status;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Create new receipt record
  static async create(receiptData) {
    const {
      user_id,
      filename,
      original_filename,
      file_path,
      file_size,
      mime_type,
      parsed_data,
      processing_status,
    } = receiptData;

    const query = `
      INSERT INTO receipts (
        user_id, filename, original_filename, file_path, 
        file_size, mime_type, parsed_data, processing_status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await executeQuery(query, [
      user_id,
      filename,
      original_filename,
      file_path,
      file_size,
      mime_type,
      JSON.stringify(parsed_data),
      processing_status,
    ]);

    return result.insertId;
  }

  // Get receipts by user ID
  static async getByUserId(userId, limit = 10, offset = 0) {
    const query = `
      SELECT * FROM receipts 
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    const rows = await executeQuery(query, [userId, limit, offset]);
    return rows.map((row) => ({
      ...row,
      parsed_data: row.parsed_data ? JSON.parse(row.parsed_data) : null,
    }));
  }

  // Update receipt processing status
  static async updateStatus(id, status, parsed_data = null) {
    const query = `
      UPDATE receipts 
      SET processing_status = ?, parsed_data = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await executeQuery(query, [
      status,
      parsed_data ? JSON.stringify(parsed_data) : null,
      id,
    ]);
  }

  // Find receipt by ID
  static async findById(id) {
    const query = "SELECT * FROM receipts WHERE id = ?";
    const rows = await executeQuery(query, [id]);

    if (rows.length > 0) {
      const receipt = rows[0];
      receipt.parsed_data = receipt.parsed_data
        ? JSON.parse(receipt.parsed_data)
        : null;
      return new Receipt(receipt);
    }
    return null;
  }

  // Delete receipt
  static async delete(id) {
    const query = "DELETE FROM receipts WHERE id = ?";
    await executeQuery(query, [id]);
  }
}
