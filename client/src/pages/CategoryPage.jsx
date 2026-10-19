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

export function CategoryPage() {
  const [animals, setAnimals] = useState([]);
  const [savedCategories, setSavedCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([getAnimals(), getCategories()]).then(([animalData, categoryData]) => {
      setAnimals(animalData);
      setSavedCategories(categoryData);
    }).catch((loadError) => { console.error(loadError); setError("โหลดหมวดหมู่ไม่สำเร็จ"); }).finally(() => setLoading(false));
  }, []);
  const knownNames = new Set(savedCategories.map((category) => category.name_th));
  const categories = [
    ...savedCategories,
    ...[...new Set(animals.map((animal) => animal.category).filter(Boolean))]
      .filter((name) => !knownNames.has(name)).map((name) => ({ key: name, name_th: name })),
  ];
  return <section className="section"><small>CATEGORIES</small><h1>หมวดหมู่สัตว์</h1>
    {loading ? <p>กำลังโหลดหมวดหมู่...</p> : error ? <p className="error">{error}</p> : categories.length
      ? <div className="grid">{categories.map((category) => <Link className="card" key={category.key} to={`/animals?category=${encodeURIComponent(category.name_th)}`}><div>{category.image_url && <img src={category.image_url} alt="" />}<h2>{category.name_th}</h2>{category.name_en && <p>{category.name_en}</p>}<p>{animals.filter((animal) => animal.category === category.name_th).length} รายการ</p></div></Link>)}</div>
      : <p>ยังไม่มีหมวดหมู่</p>}
  </section>;
}
