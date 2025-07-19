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
    this.parsed_data = data.parsed_data ? JSON.parse(data.parsed_data) : null;
    this.processing_status = data.processing_status;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Create new receipt
  static async create(receiptData) {
    const {
      user_id,
      filename,
      original_filename,
      file_path,
      file_size,
      mime_type,
      parsed_data,
      processing_status = "pending",
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
      parsed_data ? JSON.stringify(parsed_data) : null,
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
    return rows.map((row) => new Receipt(row));
  }

  // Find receipt by ID
  static async findById(id) {
    const query = "SELECT * FROM receipts WHERE id = ?";
    const rows = await executeQuery(query, [id]);
    return rows.length > 0 ? new Receipt(rows[0]) : null;
  }

  // Update receipt
  static async update(id, receiptData) {
    const updateFields = [];
    const params = [];

    if (receiptData.parsed_data !== undefined) {
      updateFields.push("parsed_data = ?");
      params.push(
        receiptData.parsed_data ? JSON.stringify(receiptData.parsed_data) : null
      );
    }

    if (receiptData.processing_status !== undefined) {
      updateFields.push("processing_status = ?");
      params.push(receiptData.processing_status);
    }

    if (updateFields.length === 0) {
      throw new Error("No fields to update");
    }

    updateFields.push("updated_at = CURRENT_TIMESTAMP");
    params.push(id);

    const query = `
      UPDATE receipts 
      SET ${updateFields.join(", ")}
      WHERE id = ?
    `;

    await executeQuery(query, params);
    return await Receipt.findById(id);
  }

  // Delete receipt
  static async delete(id) {
    const query = "DELETE FROM receipts WHERE id = ?";
    const result = await executeQuery(query, [id]);
    return result.affectedRows > 0;
  }

  // Get receipt count for user
  static async getCountByUserId(userId) {
    const query = "SELECT COUNT(*) as count FROM receipts WHERE user_id = ?";
    const rows = await executeQuery(query, [userId]);
    return rows[0].count;
  }

  // Get receipts by processing status
  static async getByStatus(status, limit = 10) {
    const query = `
      SELECT * FROM receipts 
      WHERE processing_status = ?
      ORDER BY created_at ASC
      LIMIT ?
    `;

    const rows = await executeQuery(query, [status, limit]);
    return rows.map((row) => new Receipt(row));
  }

  // Mark as processing
  async markAsProcessing() {
    return await Receipt.update(this.id, { processing_status: "processing" });
  }

  // Mark as completed
  async markAsCompleted(parsedData) {
    return await Receipt.update(this.id, {
      processing_status: "completed",
      parsed_data: parsedData,
    });
  }

  // Mark as failed
  async markAsFailed() {
    return await Receipt.update(this.id, { processing_status: "failed" });
  }
}
