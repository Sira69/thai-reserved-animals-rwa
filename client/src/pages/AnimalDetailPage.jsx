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

export function Detail() {
  const { id } = useParams();

  const [animal, setAnimal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getAnimals()
      .then((animals) => {
        const found = animals.find(
          (a) => String(a.id) === String(id)
        );

        setAnimal(found || null);
      })
      .catch((error) => {
        console.error(error);
        setError("โหลดรายละเอียดไม่สำเร็จ กรุณาลองใหม่");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <section className="section">
        <h1>กำลังโหลด...</h1>
      </section>
    );
  }

  if (!animal) {
    return (
      <section className="section">
        <h1>{error ? "เกิดข้อผิดพลาด" : "ไม่พบข้อมูล"}</h1>
        {error && <p className="error">{error}</p>}

        <Link to="/animals">
          กลับ
        </Link>
      </section>
    );
  }

  return (
    <section className="section detail">
      <Link to="/animals">
        ← กลับรายการ
      </Link>

      <img
        className="detail-img"
        src={
          animal.image_url || FALLBACK
        }
        alt={animal.name_th}
      />

      <span>
        {animal.category}
      </span>

      <h1>
        {animal.name_th}
      </h1>

      <h2>
        {animal.name_en}
      </h2>

      <p>
        <i>
          {animal.scientific_name}
        </i>
      </p>

      <FavoriteButton animal={animal} />

      <div className="info">
        <div>
          <b>ถิ่นอาศัย</b>

          <p>
            {animal.habitat}
          </p>
        </div>

        <div>
          <b>รายละเอียด</b>

          <p>
            {animal.description}
          </p>
        </div>
        {animal.food && <div><b>อาหาร</b><p>{animal.food}</p></div>}
        {animal.behavior && <div><b>พฤติกรรม</b><p>{animal.behavior}</p></div>}
        {animal.conservation_status && <div><b>สถานภาพการอนุรักษ์</b><p>{animal.conservation_status}</p></div>}
      </div>
    </section>
  );
}
