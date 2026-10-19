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

export function MemberAuth({ register = false }) {
  const navigate = useNavigate();
  const [activeUser, setActiveUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => onAuthStateChanged(auth, (currentUser) => {
    setActiveUser(currentUser);
    setAuthReady(true);
  }), []);

  async function submit(event) {
    event.preventDefault();
    if (auth.currentUser) {
      setActiveUser(auth.currentUser);
      setMessage("ออกจากระบบบัญชีปัจจุบันก่อนเปลี่ยนบัญชี");
      return;
    }
    setLoading(true); setMessage("");
    try {
      if (register) {
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await set(ref(db, `users/${credential.user.uid}`), {
          name: name.trim(), email: credential.user.email, role: "member", createdAt: Date.now(),
        });
      } else {
        const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
        const adminSnapshot = await get(ref(db, `admins/${credential.user.uid}`));
        if (adminSnapshot.val() === true) {
          navigate("/admin");
          return;
        }
      }
      navigate("/animals");
    } catch (error) {
      console.error(error);
      setMessage(error.code === "auth/email-already-in-use" ? "อีเมลนี้มีบัญชีแล้ว"
        : error.code === "auth/weak-password" ? "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"
          : error.code === "auth/invalid-credential" ? "อีเมลหรือรหัสผ่านไม่ถูกต้อง"
            : `ดำเนินการไม่สำเร็จ: ${error.message}`);
    } finally { setLoading(false); }
  }

  async function logout() {
    setLoading(true);
    setMessage("");
    try {
      await signOut(auth);
    } catch (error) {
      console.error(error);
      setMessage(`ออกจากระบบไม่สำเร็จ: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  if (!authReady) return <section className="section login"><div className="panel"><p>กำลังตรวจสอบสถานะบัญชี...</p></div></section>;

  if (activeUser) return (
    <section className="section login">
      <div className="panel">
        <small>MEMBER</small>
        <h1>เข้าสู่ระบบอยู่แล้ว</h1>
        <p>บัญชีปัจจุบัน: {activeUser.email}</p>
        <p>ออกจากระบบก่อน จึงจะเข้าสู่ระบบหรือสมัครบัญชีอื่นได้</p>
        <button className="btn" onClick={logout} disabled={loading}>
          {loading ? "กำลังออกจากระบบ..." : "ออกจากระบบ"}
        </button>
        {message && <p className="error">{message}</p>}
        <p><Link to="/animals">กลับไปหน้าสัตว์สงวน</Link></p>
      </div>
    </section>
  );

  return <section className="section login"><div className="panel"><small>MEMBER</small><h1>{register ? "สมัครสมาชิก" : "เข้าสู่ระบบ"}</h1>
    <form onSubmit={submit}>{register && <input placeholder="ชื่อ" value={name} onChange={(event) => setName(event.target.value)} required />}
      <input type="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      <input type="password" placeholder="Password (อย่างน้อย 6 ตัวอักษร)" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} required />
      <button className="btn" disabled={loading}>{loading ? "กำลังดำเนินการ..." : register ? "สมัครสมาชิก" : "เข้าสู่ระบบ"}</button>
    </form>{message && <p className="error">{message}</p>}
    <p>{register ? "มีบัญชีแล้ว?" : "ยังไม่มีบัญชี?"} <Link to={register ? "/login" : "/register"}>{register ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}</Link></p>
  </div></section>;
}
