import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import Header from "../components/Header.jsx";

const UserPage = () => {
  const { uid } = useParams();
  const { auth } = useAuth();
  const [user, setUser] = useState(null);
  const [tags, setTags] = useState([]);
  const [status, setStatus] = useState({ loading: false, error: "" });
  const [endorseStatus, setEndorseStatus] = useState({ loading: false, error: "" });
  const [endorsersByTag, setEndorsersByTag] = useState({});
  const [endorsersStatus, setEndorsersStatus] = useState({ loadingTag: "", error: "" });
  const [endorsedKeys, setEndorsedKeys] = useState(new Set());
  const [detailTab, setDetailTab] = useState("tags");
  const [recommendations, setRecommendations] = useState([]);
  const [recommendationForm, setRecommendationForm] = useState({ content: "" });
  const [recommendationStatus, setRecommendationStatus] = useState({
    loading: false,
    error: "",
    success: ""
  });
  const [tagPageToken, setTagPageToken] = useState(null);
  const [tagHasMore, setTagHasMore] = useState(true);
  const [tagForm, setTagForm] = useState({ tag: "" });
  const [tagStatus, setTagStatus] = useState({ loading: false, error: "", success: "" });

  const fetchUserAndTags = async ({ append = false, nextToken = null } = {}) => {
    if (!uid || !auth.token) return;
    setStatus({ loading: true, error: "" });
    try {
      const tokenParam = nextToken ? `&lastKey=${encodeURIComponent(nextToken)}` : "";
      const [userRes, tagRes, endorsedRes, recommendationRes] = await Promise.all([
        fetch(`http://localhost:5001/users/${uid}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${auth.token}`,
            "Content-Type": "application/json"
          }
        }),
        fetch(`http://localhost:5002/tags/${uid}?entityType=USER&limit=2${tokenParam}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${auth.token}`,
            "Content-Type": "application/json"
          }
        }),
        fetch("http://localhost:5002/tags/endorsed-users", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${auth.token}`,
            "Content-Type": "application/json"
          }
        }),
        fetch(`http://localhost:5003/recommendations/${uid}?entityType=USER`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${auth.token}`,
            "Content-Type": "application/json"
          }
        })
      ]);

      if (!userRes.ok) {
        throw new Error("Failed to load user details.");
      }
      if (!tagRes.ok) {
        throw new Error("Failed to load user tags.");
      }
      if (!endorsedRes.ok) {
        throw new Error("Failed to load endorsed tags.");
      }
      if (!recommendationRes.ok) {
        throw new Error("Failed to load recommendations.");
      }

      const userData = await userRes.json();
      const tagData = await tagRes.json();
      const endorsedData = await endorsedRes.json();
      const recommendationData = await recommendationRes.json();

      setUser(userData.user || userData);
      const apiTags = Array.isArray(tagData?.tags)
        ? tagData.tags
        : tagData?.tags?.items || tagData?.data || [];
      const endorsedSet = new Set(
        Array.isArray(endorsedData?.items)
          ? endorsedData.items.map((item) => `${item.entityId}:${item.tag}`.toLowerCase())
          : []
      );
      setEndorsedKeys(endorsedSet);
      const mappedTags = apiTags.map((tag, index) => ({
        id: tag.id || tag.tagId || `${tag.tag || tag.name}-${index}`,
        title: tag.tag || tag.name || tag.title || "Tag",
        count: tag.count || tag.points || 0,
        description: tag.description || "New skill added by user.",
        endorsed: endorsedSet.has(
          `${uid}:${(tag.tag || tag.name || tag.title || "").toLowerCase()}`
        )
      }));
      setTags((prev) => (append ? [...prev, ...mappedTags] : mappedTags));
      const nextPageToken = tagData?.lastKey || null;
      setTagPageToken(nextPageToken);
      setTagHasMore(Boolean(nextPageToken));
      const items = Array.isArray(recommendationData?.items)
        ? recommendationData.items
        : recommendationData?.recommendations || [];
      setRecommendations(items);
      setStatus({ loading: false, error: "" });
    } catch (error) {
      setStatus({ loading: false, error: error.message || "Failed to load user." });
    }
  };

  useEffect(() => {
    fetchUserAndTags({ append: false, nextToken: null });
  }, [uid, auth.token]);

  const displayName = useMemo(() => {
    if (!user) return "User";
    return `${user.firstname || ""} ${user.lastname || ""}`.trim() || "User";
  }, [user]);

  const handleEndorse = async (tagTitle, tagId) => {
    if (!auth.token || !uid) return;
    setEndorseStatus({ loading: true, error: "" });
    try {
      const response = await fetch(
        "http://localhost:5002/tags/endorse",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${auth.token}`
          },
          body: JSON.stringify({
            entityId: uid,
            tag: tagTitle
          })
        }
      );

      if (!response.ok) {
        throw new Error("Failed to endorse tag.");
      }

      const data = await response.json().catch(() => null);
      setTags((prev) =>
        prev.map((tag) =>
          tag.id === tagId
            ? { ...tag, endorsed: true, count: data?.newCount ?? tag.count + 1 }
            : tag
        )
      );
      setEndorsedKeys((prev) => {
        const next = new Set(prev);
        next.add(`${uid}:${tagTitle}`.toLowerCase());
        return next;
      });
      setEndorseStatus({ loading: false, error: "" });
    } catch (error) {
      setEndorseStatus({ loading: false, error: error.message || "Failed to endorse tag." });
    }
  };

  const handleAddTagChange = (event) => {
    setTagForm({ tag: event.target.value });
    if (tagStatus.error || tagStatus.success) {
      setTagStatus({ loading: false, error: "", success: "" });
    }
  };

  const handleAddTag = async (event) => {
    event.preventDefault();
    const tag = tagForm.tag.trim();
    if (!tag) {
      setTagStatus({ loading: false, error: "Tag is required.", success: "" });
      return;
    }
    setTagStatus({ loading: true, error: "", success: "" });
    try {
      const response = await fetch("http://localhost:5002/tags/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`
        },
        body: JSON.stringify({
          entityId: uid,
          entityType: "USER",
          tag
        })
      });

      if (!response.ok) {
        throw new Error("Failed to add tag.");
      }

      await response.json().catch(() => null);
      const newTag = {
        id: `tag-${Date.now()}`,
        title: tag,
        count: 0,
        description: "New skill added by user.",
        endorsed: false
      };
      setTags((prev) => [newTag, ...prev]);
      setTagForm({ tag: "" });
      setTagStatus({ loading: false, error: "", success: "Tag added successfully." });
    } catch (error) {
      setTagStatus({ loading: false, error: error.message || "Failed to add tag.", success: "" });
    }
  };

  const handleRecommendationChange = (event) => {
    setRecommendationForm({ content: event.target.value });
    if (recommendationStatus.error || recommendationStatus.success) {
      setRecommendationStatus({ loading: false, error: "", success: "" });
    }
  };

  const handleAddRecommendation = async (event) => {
    event.preventDefault();
    const content = recommendationForm.content.trim();
    if (!content) {
      setRecommendationStatus({ loading: false, error: "Recommendation is required.", success: "" });
      return;
    }

    setRecommendationStatus({ loading: true, error: "", success: "" });
    try {
      const response = await fetch(
        "http://localhost:5003/recommendations",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${auth.token}`
          },
          body: JSON.stringify({
            entityId: uid,
            entityType: "USER",
            content
          })
        }
      );

      if (!response.ok) {
        throw new Error("Failed to add recommendation.");
      }

      const data = await response.json().catch(() => null);
      const newItem = data?.item || data || { content, createdAt: Date.now() };
      setRecommendations((prev) => [newItem, ...prev]);
      setRecommendationForm({ content: "" });
      setRecommendationStatus({ loading: false, error: "", success: "Recommendation added." });
    } catch (error) {
      setRecommendationStatus({
        loading: false,
        error: error.message || "Failed to add recommendation.",
        success: ""
      });
    }
  };

  const handleUpdateRecommendation = async (fromUserId, action) => {
    if (!fromUserId) {
      setRecommendationStatus({
        loading: false,
        error: "Recommendation user id missing.",
        success: ""
      });
      return;
    }
    const confirmMsg =
      action === "APPROVED"
        ? "Approve this recommendation?"
        : "Reject this recommendation?";
    if (!window.confirm(confirmMsg)) {
      return;
    }
    setRecommendationStatus({ loading: true, error: "", success: "" });
    try {
      const response = await fetch(
        "http://localhost:5003/recommendations",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${auth.token}`
          },
          body: JSON.stringify({
            entityId: uid,
            entityType: "USER",
            fromUserId,
            action
          })
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update recommendation.");
      }

      setRecommendations((prev) =>
        prev.map((item) =>
          (item.fromUserId || item.userId || item.uid) === fromUserId
            ? { ...item, status: action }
            : item
        )
      );
      setRecommendationStatus({ loading: false, error: "", success: "Status updated." });
    } catch (error) {
      setRecommendationStatus({
        loading: false,
        error: error.message || "Failed to update recommendation.",
        success: ""
      });
    }
  };

  const handleDeleteRecommendation = async (fromUserId) => {
    if (!fromUserId) {
      setRecommendationStatus({
        loading: false,
        error: "Recommendation user id missing.",
        success: ""
      });
      return;
    }
    if (!window.confirm("Delete this recommendation?")) {
      return;
    }
    setRecommendationStatus({ loading: true, error: "", success: "" });
    try {
      const response = await fetch("http://localhost:5003/recommendations", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`
        },
        body: JSON.stringify({
          entityId: uid,
          entityType: "USER",
          fromUserId
        })
      });

      if (!response.ok) {
        throw new Error("Failed to delete recommendation.");
      }

      setRecommendations((prev) =>
        prev.filter(
          (item) => (item.fromUserId || item.userId || item.uid) !== fromUserId
        )
      );
      setRecommendationStatus({ loading: false, error: "", success: "Recommendation deleted." });
    } catch (error) {
      setRecommendationStatus({
        loading: false,
        error: error.message || "Failed to delete recommendation.",
        success: ""
      });
    }
  };

  const handleToggleEndorsers = async (tagTitle, tagId) => {
    setEndorsersStatus({ loadingTag: tagId, error: "" });
    try {
      if (!auth.token || !uid) return;
      const response = await fetch(
        `http://localhost:5002/tags/${uid}/${encodeURIComponent(
          tagTitle
        )}/endorsers`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${auth.token}`,
            "Content-Type": "application/json"
          }
        }
      );

      if (!response.ok) {
        throw new Error("Failed to load endorsers.");
      }

      const data = await response.json();
      const endorsers = Array.isArray(data?.endorsers) ? data.endorsers : [];
      setEndorsersByTag((prev) => ({
        ...prev,
        [tagId]: {
          show: true,
          list: endorsers
        }
      }));
      setEndorsersStatus({ loadingTag: "", error: "" });
    } catch (error) {
      setEndorsersStatus({ loadingTag: "", error: error.message || "Failed to load endorsers." });
    }
  };

  return (
    <div>
      <Header />
      <div className="container mt-3">
        {status.error && (
          <div className="alert alert-danger" role="alert">
            {status.error}
          </div>
        )}
        {status.loading && <div className="text-muted">Loading...</div>}
        {!status.loading && (
          <div className="row g-3">
            <div className="col-12 col-lg-8">
              <div className="profile-card text-center">
                <img
                  src="https://static.vecteezy.com/system/resources/previews/002/002/403/non_2x/man-with-beard-avatar-character-isolated-icon-free-vector.jpg"
                  width="140"
                  className="rounded-circle"
                  alt="User"
                />
                <p className="mt-2 mb-1">
                  <span className="badge text-bg-light">
                    <i className="fa-solid fa-circle-check me-1"></i> Verified Profile
                  </span>
                </p>
                <h4>{displayName}</h4>
                <div className="d-flex justify-content-center gap-3 mt-2 flex-wrap">
                  <span className="badge text-bg-light">
                    <i className="fa-regular fa-envelope me-1"></i> {user?.email || "n/a"}
                  </span>
                  <span className="badge text-bg-light text-capitalize">
                    <i className="fa-solid fa-user me-1"></i> {user?.gender || "n/a"}
                  </span>
                  <span className="badge text-bg-light">
                    <i className="fa-regular fa-calendar me-1"></i> {user?.dob || "n/a"}
                  </span>
                </div>
              </div>

              <ul className="nav nav-tabs tabs mt-3" id="userDetailTabs">
                <li className="nav-item">
                  <button
                    className={`nav-link ${detailTab === "tags" ? "active" : ""}`}
                    type="button"
                    onClick={() => setDetailTab("tags")}
                  >
                    Tags & Endorsements
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link ${detailTab === "recommendations" ? "active" : ""}`}
                    type="button"
                    onClick={() => setDetailTab("recommendations")}
                  >
                    Recommendations
                  </button>
                </li>
              </ul>

              <div className="tab-content mt-3">
                {detailTab === "tags" && (
                  <div className="tab-pane fade show active">
                    <div className="tag-card">
                      <h6 className="mb-3">
                        <i className="fa-solid fa-tags me-2"></i> Tags & Endorsements
                      </h6>
                      <form className="mb-3" onSubmit={handleAddTag}>
                        <div className="input-group">
                          <span className="input-group-text bg-light">
                            <i className="fa-solid fa-tag"></i>
                          </span>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Add a tag..."
                            value={tagForm.tag}
                            onChange={handleAddTagChange}
                          />
                          <button
                            className="btn btn-primary"
                            type="submit"
                            disabled={tagStatus.loading}
                          >
                            <i className="fa-solid fa-plus me-1"></i>
                            {tagStatus.loading ? "Adding..." : "Add Tag"}
                          </button>
                        </div>
                      </form>
                      {tagStatus.error && (
                        <div className="alert alert-danger py-2">{tagStatus.error}</div>
                      )}
                      {tagStatus.success && (
                        <div className="alert alert-success py-2">{tagStatus.success}</div>
                      )}
                      {endorseStatus.error && (
                        <div className="alert alert-danger py-2">{endorseStatus.error}</div>
                      )}
                      {endorsersStatus.error && (
                        <div className="alert alert-danger py-2">{endorsersStatus.error}</div>
                      )}
                      {tags.length === 0 && (
                        <div className="text-muted">No tags found for this user.</div>
                      )}
                      <div className="d-flex flex-column gap-3">
                        {tags.map((tag) => (
                          <div className="tag-card" key={tag.id}>
                            <h6>
                              <i className="fa fa-code"></i> <strong>{tag.title}</strong> ({tag.count})
                            </h6>
                            <div className="d-flex flex-wrap gap-2">
                              <button
                                className="btn btn-sm btn-primary"
                                type="button"
                                disabled={tag.endorsed || endorseStatus.loading}
                                onClick={() => handleEndorse(tag.title, tag.id)}
                              >
                                <i className={tag.endorsed ? "fa fa-check" : "fa fa-thumbs-up"}></i>
                                {tag.endorsed ? " Endorsed" : " Endorse"}
                              </button>
                              <button
                                className="btn btn-sm btn-outline-secondary"
                                type="button"
                                disabled={endorsersStatus.loadingTag === tag.id}
                                onClick={() => handleToggleEndorsers(tag.title, tag.id)}
                              >
                                <i className="fa fa-users me-1"></i>
                                {endorsersStatus.loadingTag === tag.id
                                  ? "Loading..."
                                  : "View Endorsers"}
                              </button>
                            </div>
                            {endorsersByTag[tag.id]?.show && (
                              <div className="endorsement-list mt-2">
                                {endorsersByTag[tag.id].list.length === 0 && (
                                  <div className="text-muted">No endorsers yet.</div>
                                )}
                                {endorsersByTag[tag.id].list.length > 0 && (
                                  <ul className="list-unstyled mb-0">
                                    {endorsersByTag[tag.id].list.map((endorser) => (
                                      <li key={endorser.tagEndorser}>
                                        🔹 {endorser.endorserId}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            )}
                            <p className="mt-2 mb-0">{tag.description}</p>
                          </div>
                        ))}
                      </div>
                      {tagHasMore && (
                        <div className="d-flex justify-content-center mt-3">
                          <button
                            className="btn btn-outline-secondary"
                            onClick={() =>
                              fetchUserAndTags({ append: true, nextToken: tagPageToken })
                            }
                          >
                            <i className="fa-solid fa-arrow-down me-2"></i> Load More
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {detailTab === "recommendations" && (
                  <div className="tab-pane fade show active">
                    <div className="tag-card">
                      <h6 className="mb-2">
                        <i className="fa fa-star"></i> Recommendations
                      </h6>
                      <p className="text-muted mb-3">Add a recommendation for {displayName}.</p>
                      <form className="mb-3" onSubmit={handleAddRecommendation}>
                        <div className="input-group">
                          <span className="input-group-text bg-light">
                            <i className="fa-solid fa-pen"></i>
                          </span>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Add a recommendation..."
                            value={recommendationForm.content}
                            onChange={handleRecommendationChange}
                          />
                          <button
                            className="btn btn-primary"
                            type="submit"
                            disabled={recommendationStatus.loading}
                          >
                            <i className="fa-solid fa-plus me-1"></i>
                            {recommendationStatus.loading ? "Adding..." : "Add Recommendation"}
                          </button>
                        </div>
                      </form>
                      {recommendationStatus.error && (
                        <div className="alert alert-danger py-2">{recommendationStatus.error}</div>
                      )}
                      {recommendationStatus.success && (
                        <div className="alert alert-success py-2">{recommendationStatus.success}</div>
                      )}
                      <div className="d-flex flex-column gap-2">
                        {recommendations.length === 0 && (
                          <div className="text-muted">No recommendations yet.</div>
                        )}
                        {recommendations.map((item, index) => {
                          const status = item.status || "";
                          const isApproved = status.startsWith("APPROVED#");
                          const isRejected = status.startsWith("REJECTED#");
                          const fromUserId = item.fromUserId || item.userId || item.uid;
                          return (
                            <div className="tag-card" key={item.id || item.recommendationId || index}>
                              <div className="d-flex justify-content-between align-items-start gap-2 flex-wrap">
                                <p className="mb-0">{item.content || item.text || item.message}</p>
                                <div className="d-flex gap-2">
                                  {isApproved || isRejected ? (
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-danger"
                                      disabled={recommendationStatus.loading}
                                      onClick={() => handleDeleteRecommendation(fromUserId)}
                                    >
                                      <i className="fa-solid fa-trash me-1"></i> Delete
                                    </button>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-outline-success"
                                        disabled={recommendationStatus.loading}
                                        onClick={() => handleUpdateRecommendation(fromUserId, "APPROVED")}
                                      >
                                        <i className="fa-solid fa-check me-1"></i> Approve
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-outline-danger"
                                        disabled={recommendationStatus.loading}
                                        onClick={() => handleUpdateRecommendation(fromUserId, "REJECTED")}
                                      >
                                        <i className="fa-solid fa-xmark me-1"></i> Reject
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                              {item.status && (
                                <div className="small text-muted mt-2">Status: {item.status}</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="col-12 col-lg-4">
              <div className="leaderboard-card">
                <h5>
                  <i className="fa-solid fa-user-group me-2"></i> About {displayName}
                </h5>
                <p className="mb-1">
                  <i className="fa-solid fa-location-dot me-2"></i> Location: Global
                </p>
                <p className="mb-1">
                  <i className="fa-solid fa-briefcase me-2"></i> Role: Community Member
                </p>
                <p className="mb-0">
                  <i className="fa-solid fa-clock me-2"></i> Active: Just now
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserPage;
