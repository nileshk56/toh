import React, { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import SearchUsers from "./SearchUsers.jsx";

const Header = () => {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();

  const firstName = useMemo(() => {
    if (auth.user?.firstname) return auth.user.firstname;
    if (auth.user?.firstName) return auth.user.firstName;
    return "User";
  }, [auth.user]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="header">
      <Link to="/home" className="logo">
        <i className="fa-brands fa-stack-overflow"></i> TagOfHonor
      </Link>
      <div className="d-none d-md-block" style={{ flex: 1 }}>
        <SearchUsers />
      </div>
      <div className="d-flex align-items-center gap-3">
        <div className="text-end">
          <div className="fw-semibold">
            <i className="fa-regular fa-user me-2"></i>
            {firstName}
          </div>
          <small className="text-muted">Active now</small>
        </div>
        <div className="dropdown settings-dropdown">
          <button
            className="dropdown-toggle"
            type="button"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            <i className="fa fa-cog me-1"></i> Settings
          </button>
          <ul className="dropdown-menu dropdown-menu-end">
            <li>
              <button className="dropdown-item" type="button">
                <i className="fa-regular fa-user me-2"></i>Profile
              </button>
            </li>
            <li>
              <button className="dropdown-item" type="button">
                <i className="fa-solid fa-sliders me-2"></i>Account Settings
              </button>
            </li>
            <li>
              <button className="dropdown-item" type="button" onClick={handleLogout}>
                <i className="fa-solid fa-right-from-bracket me-2"></i>Logout
              </button>
            </li>
          </ul>
        </div>
      </div>
    </header>
  );
};

export default Header;
