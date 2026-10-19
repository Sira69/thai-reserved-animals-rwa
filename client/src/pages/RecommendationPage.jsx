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

export function Recommendation() {
  const [animals, setAnimals] = useState([]);
  const [category, setCategory] = useState("");
  const [habitat, setHabitat] = useState("");
  const [interest, setInterest] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getAnimals()
      .then(setAnimals)
      .catch((loadError) => {
        console.error(loadError);
        setError("โหลดข้อมูลเพื่อแนะนำไม่สำเร็จ กรุณาลองใหม่");
      })
      .finally(() => setLoading(false));
  }, []);

  const categories = [...new Set(animals.map((animal) => animal.category).filter(Boolean))];
  const habitats = [...new Set(animals.map((animal) => animal.habitat).filter(Boolean))];
  const results = animals.filter((animal) => {
    const searchable = [animal.description, animal.food, animal.behavior, animal.conservation_status]
      .filter(Boolean).join(" ").toLocaleLowerCase();
    return (!category || animal.category === category)
      && (!habitat || animal.habitat === habitat)
      && (!interest || searchable.includes(interest.trim().toLocaleLowerCase()));
  });

  return (
    <section className="section">
      <small>RECOMMENDATION</small>
      <h1>ค้นหาสัตว์ที่ตรงกับความสนใจ</h1>
      <p>เลือกประเภทและถิ่นอาศัย หรือพิมพ์ความสนใจ เช่น อาหาร พฤติกรรม หรือการอนุรักษ์</p>
      <div className="filters">
        <select value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="">ทุกประเภท</option>
          {categories.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select value={habitat} onChange={(event) => setHabitat(event.target.value)}>
          <option value="">ทุกถิ่นอาศัย</option>
          {habitats.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <input placeholder="ความสนใจ เช่น กินหญ้าทะเล" value={interest} onChange={(event) => setInterest(event.target.value)} />
      </div>
      {loading ? <p>กำลังค้นหาสัตว์ที่เหมาะสม...</p>
        : error ? <p className="error">{error}</p>
          : results.length ? <><p>พบสัตว์ที่ตรงเงื่อนไข {results.length} รายการ</p><div className="grid">{results.map((animal) => <Card key={animal.databaseKey} a={animal} />)}</div></>
            : <p>ไม่พบสัตว์ที่ตรงเงื่อนไข ลองเปลี่ยนตัวเลือกหรือคำค้นหา</p>}
    </section>
  );
}
