import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { get, ref, set, update, remove } from "firebase/database";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../firebase";
import { getAnimals, saveAnimal, deleteAnimal, getCategories } from "../services/animalService";
import { parseAnimalCsv, parseCsvRows } from "../services/csvService";
import { imageToBase64 } from "../services/imageService";
import { FALLBACK } from "../constants";
import { Card } from "../components/features/AnimalCard";
import { FavoriteButton } from "../components/features/FavoriteButton";
import { CsvImporter } from "../components/features/CsvImporter";

export function Profile() {
  const [user, setUser] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => onAuthStateChanged(auth, async (currentUser) => {
    setUser(currentUser);
    if (!currentUser) return setHistory([]);
    try {
      const snapshot = await get(ref(db, `search_history/${currentUser.uid}`));
      setHistory(Object.values(snapshot.val() || {}).sort((a, b) => b.createdAt - a.createdAt).slice(0, 10));
    } catch (loadError) { console.error(loadError); setError("อ่านประวัติการค้นหาไม่สำเร็จ"); }
  }), []);

  async function logout() { await signOut(auth); setUser(null); }
  if (!user) return <section className="section"><h1>บัญชีของฉัน</h1><p>เข้าสู่ระบบเพื่อดูประวัติการค้นหา <Link to="/login">เข้าสู่ระบบ</Link></p></section>;
  return <section className="section"><small>PROFILE</small><h1>บัญชีของฉัน</h1><p>{user.email}</p><button onClick={logout}>ออกจากระบบ</button><h2>ประวัติการค้นหาล่าสุด</h2>
    {error ? <p className="error">{error}</p> : history.length ? <ul>{history.map((item, index) => <li key={`${item.createdAt}-${index}`}>{item.query || "ทุกคำค้น"}{item.category ? ` • ${item.category}` : ""}</li>)}</ul> : <p>ยังไม่มีประวัติการค้นหา</p>}
  </section>;
}
