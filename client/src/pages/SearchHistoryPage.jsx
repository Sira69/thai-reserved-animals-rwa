import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { get, ref } from "firebase/database";
import { auth, db } from "../firebase";

export function SearchHistory() {
  const [user, setUser] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => onAuthStateChanged(auth, async (currentUser) => {
    setUser(currentUser);
    setHistory([]);
    setError("");
    if (!currentUser) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const snapshot = await get(ref(db, `search_history/${currentUser.uid}`));
      const records = Object.values(snapshot.val() || {})
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
        .slice(0, 5);
      setHistory(records);
    } catch (loadError) {
      console.error(loadError);
      setError("โหลดประวัติการค้นหาไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  }), []);

  if (!user && !loading) {
    return <section className="section"><h1>ประวัติการค้นหา</h1><p>เข้าสู่ระบบเพื่อดูประวัติการค้นหา <Link to="/login">เข้าสู่ระบบ</Link></p></section>;
  }

  return (
    <section className="section">
      <small>SEARCH HISTORY</small>
      <h1>ประวัติการค้นหาล่าสุด</h1>
      {loading ? <p>กำลังโหลดประวัติการค้นหา...</p>
        : error ? <p className="error">{error}</p>
          : history.length ? (
            <ul className="search-history-list">
              {history.map((item, index) => (
                <li key={item.createdAt || index}>
                  <Link to={getSearchPath(item)}>
                    {item.query || "ค้นหาตามประเภท"}
                    {item.category && ` • ${item.category}`}
                  </Link>
                </li>
              ))}
            </ul>
          ) : <p>ยังไม่มีประวัติการค้นหา</p>}
    </section>
  );
}

function getSearchPath(item) {
  const params = new URLSearchParams();
  if (item.query) params.set("q", item.query);
  if (item.category) params.set("category", item.category);
  return `/animals?${params.toString()}`;
}
