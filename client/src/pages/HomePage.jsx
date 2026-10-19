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

export function Home() {
  const [animals, setAnimals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const featuredAnimals = animals.filter((animal) => animal.is_recommended);
  const homeAnimals = (featuredAnimals.length ? featuredAnimals : animals).slice(0, 6);

  useEffect(() => {
    getAnimals()
      .then(setAnimals)
      .catch((error) => {
        console.error(error);
        setError("โหลดข้อมูลสัตว์ไม่สำเร็จ กรุณาลองใหม่");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <>
      <section className="hero">
        <div>
          <small>
            THAILAND RESERVED ANIMALS
          </small>

          <h1>
            รู้จักสัตว์สงวน
            <br />
            ของประเทศไทย
          </h1>

          <p>
            ค้นหาข้อมูลสัตว์สงวน
            พร้อมรายละเอียด
            ชื่อวิทยาศาสตร์
            ประเภท และถิ่นอาศัย
          </p>

          <Link
            className="btn"
            to="/animals"
          >
            ดูสัตว์ทั้งหมด
          </Link>
        </div>
      </section>

      <section className="section">
        <div className="title">
          <h2>สัตว์ในฐานข้อมูล</h2>

          <Link to="/animals">
            ดูทั้งหมด →
          </Link>
        </div>

        {loading ? (
          <p>กำลังโหลดข้อมูล...</p>
        ) : error ? (
          <p className="error">{error}</p>
        ) : animals.length === 0 ? (
          <p>ยังไม่มีข้อมูลสัตว์</p>
        ) : (
          <div className="grid">
            {homeAnimals
              .map((a) => (
                <Card
                  key={a.databaseKey}
                  a={a}
                />
              ))}
          </div>
        )}
      </section>
    </>
  );
}
