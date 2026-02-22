import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const EditProfile = () => {
  const { auth, updateUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstname: auth.user?.firstname || "",
    lastname: auth.user?.lastname || "",
    email: auth.user?.email || "",
    gender: auth.user?.gender || "",
    dob: auth.user?.dob || "",
    profilePicUrl: auth.user?.profilePicUrl || ""
  });
  const [file, setFile] = useState(null);
  const [uploadedKey, setUploadedKey] = useState("");
  const [status, setStatus] = useState({ loading: false, error: "", success: "" });
  const [uploadStatus, setUploadStatus] = useState({ loading: false, error: "" });

  const previewUrl = useMemo(() => {
    if (file) return URL.createObjectURL(file);
    return form.profilePicUrl || "";
  }, [file, form.profilePicUrl]);

  useEffect(() => {
    if (file && previewUrl) {
      return () => URL.revokeObjectURL(previewUrl);
    }
  }, [file, previewUrl]);

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (status.error || status.success) {
      setStatus({ loading: false, error: "", success: "" });
    }
  };

  const onFileChange = (event) => {
    const selected = event.target.files?.[0] || null;
    setFile(selected);
    setUploadStatus({ loading: false, error: "" });
  };

  const uploadPhoto = async () => {
    if (!file) return;
    setUploadStatus({ loading: true, error: "" });
    try {
      const contentType = "image/webp";
      if (file.type && file.type !== "image/webp") {
        throw new Error("Please upload a WEBP image.");
      }
      const presignRes = await fetch("http://localhost:5005/uploads/presign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`
        },
        body: JSON.stringify({
          type: "profile",
          filename: file.name,
          contentType,
          sizeBytes: file.size
        })
      });

      if (!presignRes.ok) {
        throw new Error("Failed to get upload URL.");
      }

      const presignData = await presignRes.json();
      const uploadUrl = presignData?.upload?.url;
      const fields = presignData?.upload?.fields || {};
      const fileUrl = presignData?.fileUrl || presignData?.publicUrl;
      const key = fields.key || "";

      if (!uploadUrl) {
        throw new Error("Upload URL missing from response.");
      }

      if (presignData?.maxBytes && file.size > presignData.maxBytes) {
        throw new Error(`File too large. Max ${presignData.maxBytes} bytes.`);
      }

      const formData = new FormData();
      Object.entries(fields).forEach(([fieldKey, value]) => {
        formData.append(fieldKey, value);
      });
      formData.append("file", file);

      const uploadRes = await fetch(uploadUrl, {
        method: "POST",
        body: formData
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload image.");
      }

      if (fileUrl) {
        setForm((prev) => ({ ...prev, profilePicUrl: fileUrl }));
        updateUser({ profilePicUrl: fileUrl });
      }
      if (key) {
        setUploadedKey(key);
      }

      setUploadStatus({ loading: false, error: "" });
    } catch (error) {
      setUploadStatus({ loading: false, error: error.message || "Upload failed." });
    }
  };

  const handleDeleteUpload = async () => {
    if (!uploadedKey) return;
    setUploadStatus({ loading: true, error: "" });
    try {
      const response = await fetch("http://localhost:5005/uploads", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`
        },
        body: JSON.stringify({ key: uploadedKey })
      });

      if (!response.ok) {
        throw new Error("Failed to delete upload.");
      }

      setUploadedKey("");
      setForm((prev) => ({ ...prev, profilePicUrl: "" }));
      updateUser({ profilePicUrl: "" });
      setUploadStatus({ loading: false, error: "" });
    } catch (error) {
      setUploadStatus({ loading: false, error: error.message || "Delete failed." });
    }
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!auth.user?.uid) return;
    setStatus({ loading: true, error: "", success: "" });
    try {
      const response = await fetch(`http://localhost:5001/users/${auth.user.uid}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`
        },
        body: JSON.stringify({
          firstname: form.firstname,
          lastname: form.lastname,
          email: form.email,
          gender: form.gender,
          dob: form.dob,
          profilePicUrl: form.profilePicUrl
        })
      });

      if (!response.ok) {
        throw new Error("Failed to update profile.");
      }

      const data = await response.json().catch(() => null);
      updateUser(
        data?.user || {
          firstname: form.firstname,
          lastname: form.lastname,
          email: form.email,
          gender: form.gender,
          dob: form.dob,
          profilePicUrl: form.profilePicUrl
        }
      );
      setStatus({ loading: false, error: "", success: "Profile updated." });
      navigate("/home", { replace: true });
    } catch (error) {
      setStatus({ loading: false, error: error.message || "Update failed." });
    }
  };

  return (
    <div>
      <Header />
      <div className="container mt-3">
        <div className="edit-profile">
          <div className="edit-profile__hero">
            <div>
              <h3 className="mb-1">Edit Profile</h3>
              <p className="text-muted mb-0">
                Keep your details up to date and make a strong first impression.
              </p>
            </div>
            <button className="btn btn-outline-secondary" type="button" onClick={() => navigate(-1)}>
              <i className="fa-solid fa-arrow-left me-2"></i> Back
            </button>
          </div>

          <div className="row g-3">
            <div className="col-12 col-lg-4">
              <div className="profile-card h-100">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <h5 className="mb-0">Profile Photo</h5>
                  {uploadStatus.loading && <span className="small text-muted">Uploading...</span>}
                </div>
                <div className="edit-profile__photo">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Profile preview" />
                  ) : (
                    <div className="edit-profile__photo-fallback">
                      <i className="fa-regular fa-user"></i>
                    </div>
                  )}
                </div>
                <div className="small text-muted mb-2">JPG, PNG, or WEBP up to 5MB.</div>
                <input type="file" className="form-control mb-2" onChange={onFileChange} />
                <button
                  type="button"
                  className="btn btn-outline-secondary w-100"
                  onClick={uploadPhoto}
                  disabled={!file || uploadStatus.loading}
                >
                  <i className="fa-solid fa-cloud-arrow-up me-2"></i>
                  {uploadStatus.loading ? "Uploading..." : "Upload Photo"}
                </button>
                {uploadedKey && (
                  <button
                    type="button"
                    className="btn btn-outline-danger w-100 mt-2"
                    onClick={handleDeleteUpload}
                    disabled={uploadStatus.loading}
                  >
                    <i className="fa-solid fa-trash me-2"></i>
                    Delete Upload
                  </button>
                )}
                {uploadStatus.error && (
                  <div className="small text-danger mt-2">{uploadStatus.error}</div>
                )}
              </div>
            </div>

            <div className="col-12 col-lg-8">
              <div className="profile-card h-100">
                <h5 className="mb-3">Profile Details</h5>
                <form onSubmit={onSubmit}>
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label">First name</label>
                      <input
                        type="text"
                        className="form-control"
                        name="firstname"
                        value={form.firstname}
                        onChange={onChange}
                        required
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label">Last name</label>
                      <input
                        type="text"
                        className="form-control"
                        name="lastname"
                        value={form.lastname}
                        onChange={onChange}
                        required
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Email</label>
                      <input
                        type="email"
                        className="form-control"
                        name="email"
                        value={form.email}
                        onChange={onChange}
                        required
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label">Gender</label>
                      <select
                        className="form-select"
                        name="gender"
                        value={form.gender}
                        onChange={onChange}
                      >
                        <option value="">Select</option>
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
                        value={form.dob}
                        onChange={onChange}
                      />
                    </div>
                  </div>

                  {status.error && (
                    <div className="alert alert-danger mt-3">{status.error}</div>
                  )}
                  {status.success && (
                    <div className="alert alert-success mt-3">{status.success}</div>
                  )}

                  <div className="d-flex flex-wrap gap-2 mt-3">
                    <button type="submit" className="btn btn-primary" disabled={status.loading}>
                      <i className="fa-solid fa-floppy-disk me-2"></i>
                      {status.loading ? "Saving..." : "Save Changes"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => navigate("/home")}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          <div className="edit-profile__tips">
            <div>
              <h6 className="mb-1">
                <i className="fa-solid fa-bolt me-2"></i>Profile tips
              </h6>
              <p className="text-muted mb-0">
                Use a clear headshot and keep your profile consistent with your endorsements.
              </p>
            </div>
            <div className="d-flex gap-2">
              <span className="badge text-bg-light">
                <i className="fa-solid fa-check me-1"></i> Verified
              </span>
              <span className="badge text-bg-light">
                <i className="fa-solid fa-shield-halved me-1"></i> Secure
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditProfile;
