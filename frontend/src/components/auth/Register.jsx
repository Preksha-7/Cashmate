import React, { useState } from "react";
import { register } from "../../services/auth";

const Register = () => {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await register(form.name, form.email, form.password);
    if (res.error) setMessage(res.error);
    else setMessage("Registration successful! You can now log in.");
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-4 bg-white rounded shadow">
      <h2 className="text-xl font-semibold mb-4">Register</h2>
      {message && <p className="mb-2 text-sm text-blue-500">{message}</p>}
      <form onSubmit={handleSubmit}>
        <input
          name="name"
          type="text"
          placeholder="Name"
          className="input w-full mb-2"
          value={form.name}
          onChange={handleChange}
          required
        />
        <input
          name="email"
          type="email"
          placeholder="Email"
          className="input w-full mb-2"
          value={form.email}
          onChange={handleChange}
          required
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          className="input w-full mb-4"
          value={form.password}
          onChange={handleChange}
          required
        />
        <button type="submit" className="btn w-full bg-green-600 text-white">
          Register
        </button>
      </form>
    </div>
  );
};

export default Register;
