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

export function NewsPage() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    get(ref(db, "news")).then((snapshot) => setNews(Object.entries(snapshot.val() || {}).map(([id, item]) => ({ id, ...item })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))))
      .catch((loadError) => { console.error(loadError); setError("โหลดข่าวสารไม่สำเร็จ"); }).finally(() => setLoading(false));
  }, []);
  return <section className="section"><small>CONSERVATION</small><h1>ข่าวสารการอนุรักษ์</h1>
    {loading ? <p>กำลังโหลดข่าว...</p> : error ? <p className="error">{error}</p> : news.length
      ? <div className="grid">{news.map((item) => <article className="panel" key={item.id}>{item.image_url && <img src={item.image_url} alt="" className="detail-img" />}<h2>{item.title || "ข่าวการอนุรักษ์"}</h2><small>{item.date || ""}</small><p>{item.summary || item.description || ""}</p></article>)}</div>
      : <p>ยังไม่มีข่าวสารในฐานข้อมูล</p>}
  </section>;
}
