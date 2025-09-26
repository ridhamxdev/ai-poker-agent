// src/api.ts
const API_BASE = "http://localhost:5000/api"; // adjust if backend runs on another port

const signUp = async (data: { name: string; email: string; password: string }) => {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // ✅ send cookies for JWT
    body: JSON.stringify({
      username: data.name, // 🔥 backend expects username
      email: data.email,
      password: data.password
    })
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Failed to register");
  }

  return res.json();
};

export default { signUp };
