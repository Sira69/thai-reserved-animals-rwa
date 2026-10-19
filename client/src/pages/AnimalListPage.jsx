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

export function Animals() {
  const [data, setData] = useState([]);
  const [q, setQ] = useState(() => new URLSearchParams(window.location.search).get("q") || "");
  const [cat, setCat] = useState(() => new URLSearchParams(window.location.search).get("category") || "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getAnimals()
      .then(setData)
      .catch((error) => {
        console.error(error);
        setError("โหลดข้อมูลสัตว์ไม่สำเร็จ กรุณาลองใหม่");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!q.trim() && !cat) return undefined;
    let timer;
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) return;
      timer = setTimeout(() => {
        const createdAt = Date.now();
        set(ref(db, `search_history/${currentUser.uid}/${createdAt}`), {
          query: q.trim(), category: cat, createdAt,
        }).catch((error) => console.error("SEARCH HISTORY ERROR:", error));
      }, 700);
    });
    return () => { unsubscribe(); clearTimeout(timer); };
  }, [q, cat]);

  const cats = [
    ...new Set(
      data
        .map((a) => a.category)
        .filter(Boolean)
    ),
  ];

  const filtered = data.filter((a) => {
    const keyword = q.toLowerCase();

    const text = [
      a.name_th,
      a.name_en,
      a.scientific_name,
      a.habitat,
      a.description,
    ]
      .join(" ")
      .toLowerCase();

    return (
      (!cat || a.category === cat) &&
      (!keyword || text.includes(keyword))
    );
  });

  return (
    <section className="section">
      <small>ANIMALS</small>

      <h1>สัตว์สงวน</h1>

      <div className="filters">
        <input
          placeholder="ค้นหาชื่อสัตว์ / ชื่อวิทยาศาสตร์ / ถิ่นอาศัย"
          value={q}
          onChange={(e) =>
            setQ(e.target.value)
          }
        />

        <select
          value={cat}
          onChange={(e) =>
            setCat(e.target.value)
          }
        >
          <option value="">
            ทุกประเภท
          </option>

          {cats.map((x) => (
            <option
              key={x}
              value={x}
            >
              {x}
            </option>
          ))}
        </select>
      </div>

      <p>
        พบ {filtered.length} รายการ
      </p>

      {loading ? (
        <p>กำลังโหลดข้อมูล...</p>
      ) : error ? (
        <p className="error">{error}</p>
      ) : filtered.length === 0 ? (
        <p>ไม่พบสัตว์ที่ตรงกับคำค้นหา</p>
      ) : (
        <div className="grid">
          {filtered.map((a) => (
            <Card
              key={a.databaseKey}
              a={a}
            />
          ))}
        </div>
      )}
    </section>
  );
}
