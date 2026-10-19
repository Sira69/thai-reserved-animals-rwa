import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { get, ref } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../firebase";
import { getAnimals } from "../services/animalService";
import { Card } from "../components/features/AnimalCard";

export function Favorites() {
  const [user, setUser] = useState(null);
  const [animals, setAnimals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => onAuthStateChanged(auth, async (currentUser) => {
    setUser(currentUser);
    if (!currentUser) { setAnimals([]); setLoading(false); return; }
    setLoading(true);
    try {
      const [favoritesSnapshot, allAnimals] = await Promise.all([
        get(ref(db, `favorites/${currentUser.uid}`)), getAnimals(),
      ]);
      const favoriteIds = Object.keys(favoritesSnapshot.val() || {});
      setAnimals(allAnimals.filter((animal) => favoriteIds.includes(String(animal.id))));
      setError("");
    } catch (loadError) {
      console.error(loadError);
      setError("โหลดรายการโปรดไม่สำเร็จ กรุณาลองใหม่");
    } finally { setLoading(false); }
  }), []);

  return <section className="section"><small>FAVORITES</small><h1>สัตว์ที่ชื่นชอบ</h1>
    {!user ? <p>เข้าสู่ระบบเพื่อดูรายการโปรด <Link to="/login">เข้าสู่ระบบ</Link></p>
      : loading ? <p>กำลังโหลดรายการโปรด...</p>
        : error ? <p className="error">{error}</p>
          : animals.length ? <div className="grid">{animals.map((animal) => <Card key={animal.databaseKey} a={animal} />)}</div>
            : <p>ยังไม่มีรายการโปรด ไปที่หน้ารายละเอียดสัตว์เพื่อบันทึกได้เลย</p>}
  </section>;
}
