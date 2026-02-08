import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({
    email: "nilesh1@example.com",
    password: "MySecret123"
  });
  const [status, setStatus] = useState({ loading: false, error: "" });
  const [signup, setSignup] = useState({
    firstname: "Nilesh",
    lastname: "kan",
    email: "nilesh1@example.com",
    password: "MySecret123",
    gender: "male",
    dob: "1990-01-01"
  });
  const [signupStatus, setSignupStatus] = useState({
    loading: false,
    error: "",
    success: ""
  });

  const decodeJwt = (token) => {
    try {
      const payload = token.split(".")[1];
      const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
      const json = atob(normalized);
      return JSON.parse(json);
    } catch (error) {
      return null;
    }
  };

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSignupChange = (event) => {
    const { name, value } = event.target;
    setSignup((prev) => ({ ...prev, [name]: value }));
    if (signupStatus.error || signupStatus.success) {
      setSignupStatus({ loading: false, error: "", success: "" });
    }
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setStatus({ loading: true, error: "" });
    try {
      const response = await fetch(
        "https://nyysc5yonb.execute-api.ap-south-1.amazonaws.com/users/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email: form.email,
            password: form.password
          })
        }
      );

      if (!response.ok) {
        throw new Error("Login failed. Please check your credentials.");
      }

      const data = await response.json();
      const token = data.token || data.jwt || data.accessToken || data.idToken || null;
      const jwtPayload = token ? decodeJwt(token) : null;
      const userFromJwt = jwtPayload
        ? {
            firstname: jwtPayload.firstname,
            lastname: jwtPayload.lastname,
            email: jwtPayload.email,
            uid: jwtPayload.uid
          }
        : null;
      const user = data.user || userFromJwt || data;

      if (!token) {
        throw new Error("Login succeeded but no token was returned.");
      }

      login({ user, token });
      navigate("/home", { replace: true });
    } catch (error) {
      setStatus({ loading: false, error: error.message || "Login failed." });
    }
  };

  const onSignupSubmit = async (event) => {
    event.preventDefault();
    setSignupStatus({ loading: true, error: "", success: "" });
    try {
      const response = await fetch(
        "https://nyysc5yonb.execute-api.ap-south-1.amazonaws.com/users/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            firstname: signup.firstname,
            lastname: signup.lastname,
            email: signup.email,
            password: signup.password,
            gender: signup.gender,
            dob: signup.dob
          })
        }
      );

      if (!response.ok) {
        throw new Error("Signup failed. Please try again.");
      }

      setSignupStatus({ loading: false, error: "", success: "Account created successfully." });
    } catch (error) {
      setSignupStatus({
        loading: false,
        error: error.message || "Signup failed.",
        success: ""
      });
    }
  };

  return (
    <div className="login-page">
      <header className="header">
        <Link to="/home" className="logo">
          <i className="fa-brands fa-stack-overflow"></i> TagOfHonor
        </Link>
        <div className="d-flex align-items-center gap-2">
          <span className="badge text-bg-light">
            <i className="fa-solid fa-circle-info me-1"></i> Public Access
          </span>
        </div>
      </header>

      <div className="login-main">
        <div className="container">
          <div className="row g-4 align-items-start">
            <div className="col-12 col-lg-7">
              <div className="login-card">
                <div className="mb-3">
                  <span className="icon-pill">
                    <i className="fa-solid fa-bolt"></i> TagOfHonor Access
                  </span>
                </div>
                <h1 className="mb-2">Welcome back</h1>
                <p className="text-muted mb-4">
                  Sign in to track endorsements, unlock leaderboards, and show off your skills.
                </p>
                <form onSubmit={onSubmit}>
                  <div className="mb-3">
                    <label className="form-label">Email</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light border">
                        <i className="fa-regular fa-envelope"></i>
                      </span>
                      <input
                        type="email"
                        className="form-control"
                        name="email"
                        placeholder="you@tagofhonor.com"
                        value={form.email}
                        onChange={onChange}
                        required
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Password</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light border">
                        <i className="fa-solid fa-lock"></i>
                      </span>
                      <input
                        type="password"
                        className="form-control"
                        name="password"
                        placeholder="••••••••"
                        value={form.password}
                        onChange={onChange}
                        required
                      />
                    </div>
                  </div>
                  {status.error && (
                    <div className="alert alert-danger py-2" role="alert">
                      <i className="fa-solid fa-triangle-exclamation me-2"></i>
                      {status.error}
                    </div>
                  )}
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" defaultChecked />
                      <label className="form-check-label">Remember me</label>
                    </div>
                    <button type="button" className="btn btn-link text-warning p-0">
                      Forgot password?
                    </button>
                  </div>
                  <button
                    type="submit"
                    className="btn btn-warning w-100 mb-3"
                    disabled={status.loading}
                  >
                    <i className="fa-solid fa-arrow-right-to-bracket me-2"></i>
                    {status.loading ? "Signing In..." : "Sign In"}
                  </button>
                </form>

                <div className="d-flex flex-wrap gap-2 mb-3">
                  <span className="badge text-bg-secondary">
                    <i className="fa-solid fa-shield-halved me-1"></i> Secure Login
                  </span>
                  <span className="badge text-bg-secondary">
                    <i className="fa-solid fa-user-astronaut me-1"></i> Fast Access
                  </span>
                  <span className="badge text-bg-secondary">
                    <i className="fa-solid fa-star me-1"></i> New UI
                  </span>
                </div>

                <hr className="my-4" />
                <h5 className="mb-3">Create an account</h5>
                <form onSubmit={onSignupSubmit}>
                  <div className="row g-2">
                    <div className="col-12 col-md-6">
                      <label className="form-label">First name</label>
                      <input
                        type="text"
                        className="form-control"
                        name="firstname"
                        value={signup.firstname}
                        onChange={onSignupChange}
                        required
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label">Last name</label>
                      <input
                        type="text"
                        className="form-control"
                        name="lastname"
                        value={signup.lastname}
                        onChange={onSignupChange}
                        required
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Email</label>
                      <input
                        type="email"
                        className="form-control"
                        name="email"
                        value={signup.email}
                        onChange={onSignupChange}
                        required
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Password</label>
                      <input
                        type="password"
                        className="form-control"
                        name="password"
                        value={signup.password}
                        onChange={onSignupChange}
                        required
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label">Gender</label>
                      <select
                        className="form-select"
                        name="gender"
                        value={signup.gender}
                        onChange={onSignupChange}
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label">Date of birth</label>
                      <input
                        type="date"
                        className="form-control"
                        name="dob"
                        value={signup.dob}
                        onChange={onSignupChange}
                        required
                      />
                    </div>
                  </div>
                  {signupStatus.error && (
                    <div className="alert alert-danger py-2 mt-3" role="alert">
                      <i className="fa-solid fa-triangle-exclamation me-2"></i>
                      {signupStatus.error}
                    </div>
                  )}
                  {signupStatus.success && (
                    <div className="alert alert-success py-2 mt-3" role="alert">
                      <i className="fa-solid fa-circle-check me-2"></i>
                      {signupStatus.success}
                    </div>
                  )}
                  <button
                    type="submit"
                    className="btn btn-outline-warning w-100 mt-2"
                    disabled={signupStatus.loading}
                  >
                    <i className="fa-solid fa-user-plus me-2"></i>
                    {signupStatus.loading ? "Creating..." : "Create Account"}
                  </button>
                </form>
              </div>
            </div>

            <div className="col-12 col-lg-5 login-side">
              <div className="profile-card">
                <h2 className="mb-3">Build your honor</h2>
                <p className="text-muted">
                  A mobile-first profile hub for endorsements, badges, and rankings. Stay visible in the
                  community.
                </p>
                <div className="d-flex flex-column gap-3">
                  <div className="d-flex align-items-center gap-3">
                    <i className="fa-solid fa-ranking-star fa-2x text-warning"></i>
                    <div>
                      <h6 className="mb-1">Leaderboards</h6>
                      <small className="text-muted">
                        Track the top contributors across every skill.
                      </small>
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-3">
                    <i className="fa-solid fa-people-group fa-2x text-warning"></i>
                    <div>
                      <h6 className="mb-1">Community Endorsements</h6>
                      <small className="text-muted">
                        Gain momentum with verified peer recommendations.
                      </small>
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-3">
                    <i className="fa-solid fa-award fa-2x text-warning"></i>
                    <div>
                      <h6 className="mb-1">Achievements</h6>
                      <small className="text-muted">Earn badges as you level up your skills.</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
