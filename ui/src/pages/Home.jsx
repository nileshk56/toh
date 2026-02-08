import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import Header from "../components/Header.jsx";

const initialTags = [];

const leaderboards = [
  {
    id: 1,
    title: "Top JavaScript Experts",
    entries: [
      "🥇 John Doe - 120 Points",
      "🥈 Jane Smith - 110 Points",
      "🥉 Alex Johnson - 105 Points"
    ]
  },
  {
    id: 2,
    title: "Frontend Rising Stars",
    entries: [
      "🥇 Priya Singh - 98 Points",
      "🥈 Liam Chen - 92 Points",
      "🥉 Maria Costa - 87 Points"
    ]
  },
  {
    id: 3,
    title: "API Builders",
    entries: [
      "🥇 Sara Ali - 89 Points",
      "🥈 Noah Brooks - 83 Points",
      "🥉 Leo Park - 80 Points"
    ]
  }
];

const Home = () => {
  const { auth } = useAuth();
  const [tags, setTags] = useState([]);
  const [activeTab, setActiveTab] = useState("tags");
  const [tagForm, setTagForm] = useState({ tag: "" });
  const [tagStatus, setTagStatus] = useState({ loading: false, error: "", success: "" });
  const [endorsersByTag, setEndorsersByTag] = useState({});
  const [endorsersStatus, setEndorsersStatus] = useState({ loadingTag: "", error: "" });
  const [recommendations, setRecommendations] = useState([]);
  const [recommendationStatus, setRecommendationStatus] = useState({
    loading: false,
    error: "",
    success: ""
  });
  const [tagPageToken, setTagPageToken] = useState(null);
  const [tagHasMore, setTagHasMore] = useState(true);

  const userName = useMemo(() => {
    if (auth.user?.firstname) return `${auth.user.firstname} ${auth.user.lastname || ""}`.trim();
    if (auth.user?.firstName) return `${auth.user.firstName} ${auth.user.lastName || ""}`.trim();
    return "User";
  }, [auth.user]);

  const fetchTags = async ({ append = false, nextToken = null } = {}) => {
    if (!auth.user?.uid || !auth.token) return;
    try {
      const tokenParam = nextToken
        ? `&lastKey=${encodeURIComponent(btoa(nextToken))}`
        : "";
      const response = await fetch(
        `https://q003qm8w8d.execute-api.ap-south-1.amazonaws.com/tags/${auth.user.uid}?limit=2${tokenParam}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${auth.token}`,
            "Content-Type": "application/json"
          }
        }
      );

      if (!response.ok) {
        throw new Error("Failed to load tags.");
      }

      const data = await response.json();
      const apiTags = Array.isArray(data?.tags) ? data.tags : data?.tags?.items || data?.data;
      if (!Array.isArray(apiTags)) {
        return;
      }

      const mapped = apiTags.map((tag, index) => ({
        id: tag.id || tag.tagId || `${tag.tag || tag.name}-${index}`,
        title: tag.tag || tag.name || tag.title || "Tag",
        count: tag.count || tag.points || 0,
        endorsers: tag.endorsers || [],
        description: tag.description || "New skill added by user.",
        endorsed: false,
        showEndorsers: false
      }));

      setTags((prev) => (append ? [...prev, ...mapped] : mapped));
      const nextPageToken = data?.lastKey || null;
      setTagPageToken(nextPageToken);
      setTagHasMore(Boolean(nextPageToken));
    } catch (error) {
      setTagStatus({ loading: false, error: error.message || "Failed to load tags.", success: "" });
    }
  };

  useEffect(() => {
    fetchTags({ append: false, nextToken: null });
  }, [auth.user?.uid, auth.token]);

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!auth.user?.uid || !auth.token) return;
      try {
        const response = await fetch(
          `https://95liowcoa4.execute-api.ap-south-1.amazonaws.com/recommendations/${auth.user.uid}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${auth.token}`,
              "Content-Type": "application/json"
            }
          }
        );

        if (!response.ok) {
          throw new Error("Failed to load recommendations.");
        }

        const data = await response.json();
        const items = Array.isArray(data?.items) ? data.items : data?.recommendations || [];
        setRecommendations(items);
      } catch (error) {
        setRecommendationStatus((prev) => ({
          ...prev,
          error: error.message || "Failed to load recommendations."
        }));
      }
    };

    fetchRecommendations();
  }, [auth.user?.uid, auth.token]);

  const handleEndorse = (id) => {
    setTags((prev) =>
      prev.map((tag) =>
        tag.id === id ? { ...tag, endorsed: true, count: tag.count + 1 } : tag
      )
    );
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
      const response = await fetch(
        "https://q003qm8w8d.execute-api.ap-south-1.amazonaws.com/tags/add",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${auth.token}`
          },
          body: JSON.stringify({
            userId: auth.user?.uid,
            tag
          })
        }
      );

      if (!response.ok) {
        throw new Error("Failed to add tag.");
      }

      const data = await response.json().catch(() => null);
      const newTagTitle = data?.tag || data?.name || tag;
      const newTag = {
        id: data?.id || data?.tagId || `tag-${Date.now()}`,
        title: newTagTitle,
        count: 0,
        endorsers: [],
        description: data?.description || "New skill added by user.",
        endorsed: false,
        showEndorsers: false
      };
      setTags((prev) => [newTag, ...prev]);
      setTagForm({ tag: "" });
      setTagStatus({ loading: false, error: "", success: "Tag added successfully." });
    } catch (error) {
      setTagStatus({ loading: false, error: error.message || "Failed to add tag." });
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
    setRecommendationStatus({ loading: true, error: "", success: "" });
    try {
      const response = await fetch(
        "https://95liowcoa4.execute-api.ap-south-1.amazonaws.com/recommendations/",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${auth.token}`
          },
          body: JSON.stringify({
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

  const handleToggleEndorsers = async (tagTitle, tagId) => {
    setEndorsersStatus({ loadingTag: tagId, error: "" });
    try {
      if (!auth.token || !auth.user?.uid) return;
      const response = await fetch(
        `https://q003qm8w8d.execute-api.ap-south-1.amazonaws.com/tags/${auth.user.uid}/${encodeURIComponent(
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
        [tagId]: { show: true, list: endorsers }
      }));
      setEndorsersStatus({ loadingTag: "", error: "" });
    } catch (error) {
      setEndorsersStatus({ loadingTag: "", error: error.message || "Failed to load endorsers." });
    }
  };

  const handleLoadMoreTags = () => {
    if (!tagHasMore) return;
    fetchTags({ append: true, nextToken: tagPageToken });
  };

  return (
    <div>
      <Header />

      <div className="container mt-3">
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
                <a href="#">Set Profile Picture</a>
              </p>
              <h4>{userName}</h4>
              <div className="d-flex justify-content-center gap-3 mt-3 flex-wrap">
                <span className="badge text-bg-light">
                  <i className="fa-solid fa-certificate me-1"></i> Verified
                </span>
                <span className="badge text-bg-light">
                  <i className="fa-solid fa-bolt me-1"></i> Top Contributor
                </span>
                <span className="badge text-bg-light">
                  <i className="fa-solid fa-medal me-1"></i> 24 Badges
                </span>
              </div>
            </div>

            <ul className="nav nav-tabs tabs" id="userTabs">
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === "tags" ? "active" : ""}`}
                  type="button"
                  onClick={() => setActiveTab("tags")}
                >
                  Tags & Endorsements
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === "recommendations" ? "active" : ""}`}
                  type="button"
                  onClick={() => setActiveTab("recommendations")}
                >
                  Recommendations
                </button>
              </li>
            </ul>

            <div className="tab-content mt-3">
              {activeTab === "tags" && (
                <div className="tab-pane fade show active">
                  <div className="tag-card mb-3">
                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                      <h6 className="mb-0">
                        <i className="fa-solid fa-tags me-2"></i> Add a Tag
                      </h6>
                      <span className="small text-muted">Share a new skill</span>
                    </div>
                    <form className="mt-3" onSubmit={handleAddTag}>
                      <div className="input-group">
                        <span className="input-group-text bg-light">
                          <i className="fa-solid fa-tag"></i>
                        </span>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. smart"
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
                      <div className="small text-danger mt-2">{tagStatus.error}</div>
                    )}
                    {tagStatus.success && (
                      <div className="small text-success mt-2">{tagStatus.success}</div>
                    )}
                  </div>
                  {endorsersStatus.error && (
                    <div className="alert alert-danger py-2">{endorsersStatus.error}</div>
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
                            onClick={() => handleEndorse(tag.id)}
                            disabled={tag.endorsed}
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
                      <button className="btn btn-outline-secondary" onClick={handleLoadMoreTags}>
                        <i className="fa-solid fa-arrow-down me-2"></i> Load More
                      </button>
                    </div>
                  )}
                </div>
              )}
              {activeTab === "recommendations" && (
                <div className="tab-pane fade show active">
                  <h5>
                    <i className="fa fa-star"></i> Recommendations
                  </h5>
                  <p className="text-muted">
                    Review and approve recommendations others have written for {userName}.
                  </p>
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
                    {recommendations.map((item, index) => (
                      <div className="tag-card" key={item.id || item.recommendationId || index}>
                        <div className="d-flex justify-content-between align-items-start gap-2 flex-wrap">
                          <p className="mb-0">{item.content || item.text || item.message}</p>
                          <div className="d-flex gap-2">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-success"
                              disabled={recommendationStatus.loading}
                              onClick={() =>
                                handleUpdateRecommendation(
                                  item.fromUserId || item.userId || item.uid,
                                  "APPROVED"
                                )
                              }
                            >
                              <i className="fa-solid fa-check me-1"></i> Approve
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              disabled={recommendationStatus.loading}
                              onClick={() =>
                                handleUpdateRecommendation(
                                  item.fromUserId || item.userId || item.uid,
                                  "REJECTED"
                                )
                              }
                            >
                              <i className="fa-solid fa-xmark me-1"></i> Reject
                            </button>
                          </div>
                        </div>
                        {item.status && (
                          <div className="small text-muted mt-2">Status: {item.status}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="col-12 col-lg-4">
            <div className="d-flex flex-column gap-3">
              {leaderboards.map((board) => (
                <div className="leaderboard-card" key={board.id}>
                  <h5>
                    <i className="fa fa-trophy"></i> Leaderboard
                  </h5>
                  <div>
                    <h6>
                      <i className="fa fa-code"></i> {board.title}
                    </h6>
                    {board.entries.map((entry) => (
                      <p className="mb-1" key={entry}>
                        {entry}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
