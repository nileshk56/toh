import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const SearchUsers = () => {
  const { auth } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [status, setStatus] = useState({ loading: false, error: "" });
  const [results, setResults] = useState([]);

  const { firstName, lastName } = useMemo(() => {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    return {
      firstName: parts[0] || "",
      lastName: parts.slice(1).join(" ")
    };
  }, [fullName]);

  const lastNameRequired = useMemo(
    () => firstName.length > 0 && lastName.length === 0,
    [firstName, lastName]
  );

  useEffect(() => {
    if (!firstName || !lastName) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setStatus({ loading: true, error: "" });
      try {
        const response = await fetch(
          `https://nyysc5yonb.execute-api.ap-south-1.amazonaws.com/users/search?firstName=${encodeURIComponent(
            firstName
          )}&lastName=${encodeURIComponent(lastName)}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${auth.token}`
            },
            signal: controller.signal
          }
        );

        if (!response.ok) {
          throw new Error("Search failed. Please try again.");
        }

        const data = await response.json();
        setResults(data.users || []);
        setStatus({ loading: false, error: "" });
      } catch (error) {
        if (error.name === "AbortError") {
          return;
        }
        setStatus({ loading: false, error: error.message || "Search failed." });
      }
    }, 400);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [firstName, lastName, auth.token]);

  const onChange = (event) => {
    setFullName(event.target.value);
    if (status.error) {
      setStatus((prev) => ({ ...prev, error: "" }));
    }
  };

  return (
    <div className="search-bar">
      <i className="fa fa-search"></i>
      <input
        type="text"
        className="form-control"
        placeholder="First name Last name"
        value={fullName}
        onChange={onChange}
      />
      {lastNameRequired && (
        <div className="small text-warning mt-1">Last name required</div>
      )}
      {status.loading && (
        <div className="small text-muted mt-1">Searching...</div>
      )}
      {status.error && (
        <div className="small text-danger mt-1">{status.error}</div>
      )}
      {results.length > 0 && (
        <div className="search-results shadow">
          <div className="small text-muted px-3 pt-2">Results</div>
          <ul className="list-group list-group-flush">
            {results.map((user) => (
              <li className="list-group-item px-3" key={user.uid}>
                <div className="d-flex align-items-center justify-content-between gap-2">
                  <button
                    type="button"
                    className="btn btn-link p-0 text-start text-truncate"
                    onClick={() => navigate(`/user/${user.uid}`)}
                  >
                    <i className="fa-regular fa-circle-user me-2"></i>
                    {user.firstname} {user.lastname}
                  </button>
                  <span className="badge text-bg-light">
                    <i className="fa-regular fa-envelope me-1"></i>
                    {user.email}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SearchUsers;
