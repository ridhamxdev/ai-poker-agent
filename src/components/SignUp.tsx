import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import api from "../api"; // ✅ import API helper

const SignUp = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await api.signUp(formData);
      console.log("✅ Registration success:", result);
      alert("Account created successfully!");
      navigate("/signin"); // redirect to signin
    } catch (err: any) {
      console.error("❌ Registration failed:", err.message);
      alert(err.message);
    }
    setIsLoading(false);
  };

  return (
    <div className="auth-page">
      <motion.div className="auth-container" initial="hidden" animate="visible">
        <Link to="/" className="back-link">← Back to Home</Link>

        <div className="auth-header">
          <h1>Join AI Poker Pro</h1>
          <p>Create your account and start mastering poker</p>
        </div>

        <motion.form onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="text"
              name="name"
              className="form-control"
              placeholder="Full name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <input
              type="email"
              name="email"
              className="form-control"
              placeholder="Email address"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <input
              type="password"
              name="password"
              className="form-control"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%" }}
            disabled={isLoading}
          >
            {isLoading ? "Creating Account..." : "Create Account"}
          </button>
        </motion.form>

        <div className="auth-link">
          <p>
            Already have an account? <Link to="/signin">Sign in here</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default SignUp;
