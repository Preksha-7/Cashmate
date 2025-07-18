import { executeQuery } from "../config/database.js";
import bcrypt from "bcrypt";

export class User {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.email = data.email;
    this.password = data.password;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Create new user
  static async create(userData) {
    const { name, email, password } = userData;
    const hashedPassword = await bcrypt.hash(password, 10);

    const query = `
      INSERT INTO users (name, email, password)
      VALUES (?, ?, ?)
    `;

    const result = await executeQuery(query, [name, email, hashedPassword]);
    return result.insertId;
  }

  // Find user by email
  static async findByEmail(email) {
    const query = "SELECT * FROM users WHERE email = ?";
    const users = await executeQuery(query, [email]);
    return users.length > 0 ? new User(users[0]) : null;
  }

  // Find user by ID
  static async findById(id) {
    const query = "SELECT * FROM users WHERE id = ?";
    const users = await executeQuery(query, [id]);
    return users.length > 0 ? new User(users[0]) : null;
  }

  // Update user
  static async update(id, userData) {
    const { name, email } = userData;
    const query = `
      UPDATE users 
      SET name = ?, email = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await executeQuery(query, [name, email, id]);
    return await User.findById(id);
  }

  // Delete user
  static async delete(id) {
    const query = "DELETE FROM users WHERE id = ?";
    await executeQuery(query, [id]);
  }

  // Verify password
  async verifyPassword(password) {
    return await bcrypt.compare(password, this.password);
  }
}
