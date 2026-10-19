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

export function AdminCategories() {
  const [user, setUser] = useState(null);
  const [allowed, setAllowed] = useState(false);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ key: "", name_th: "", name_en: "", image_url: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  async function refresh() { setCategories(await getCategories()); }
  useEffect(() => onAuthStateChanged(auth, async (currentUser) => {
    setUser(currentUser);
    if (!currentUser) { setAllowed(false); return; }
    try {
      const adminSnapshot = await get(ref(db, `admins/${currentUser.uid}`));
      const isAllowed = adminSnapshot.val() === true;
      setAllowed(isAllowed);
      if (isAllowed) await refresh();
    } catch (error) { console.error(error); setMessage("โหลดข้อมูลไม่สำเร็จ"); }
  }), []);
  async function save(event) {
    event.preventDefault(); if (loading) return;
    const key = form.key || `cat_${Date.now()}`;
    if (!form.name_th.trim()) return setMessage("กรุณาระบุชื่อหมวดหมู่");
    setLoading(true);
    try {
      await set(ref(db, `categories/${key}`), { name_th: form.name_th.trim(), name_en: form.name_en.trim(), image_url: form.image_url.trim() });
      setForm({ key: "", name_th: "", name_en: "", image_url: "" }); setMessage("บันทึกหมวดหมู่แล้ว"); await refresh();
    } catch (error) { console.error(error); setMessage(`บันทึกไม่สำเร็จ: ${error.message}`); }
    finally { setLoading(false); }
  }
  async function removeCategory(category) {
    if (!confirm(`ลบหมวดหมู่ ${category.name_th}?`)) return;
    try { await remove(ref(db, `categories/${category.key}`)); await refresh(); setMessage("ลบหมวดหมู่แล้ว"); }
    catch (error) { console.error(error); setMessage(`ลบไม่สำเร็จ: ${error.message}`); }
  }
  async function logout() {
    await signOut(auth);
    setUser(null);
    setAllowed(false);
  }
  if (!user) return <section className="section"><h1>จัดการหมวดหมู่</h1><p>เข้าสู่ระบบผู้ดูแลที่ <Link to="/admin">หลังบ้าน</Link></p></section>;
  if (!allowed) return <section className="section"><h1>ไม่มีสิทธิ์จัดการหมวดหมู่</h1><p>ออกจากระบบก่อน หากต้องการเปลี่ยนบัญชี</p><button onClick={logout}>ออกจากระบบ</button></section>;
  return <section className="section"><small>ADMIN</small><h1>จัดการหมวดหมู่</h1>{message && <p role="status">{message}</p>}
    <div className="admin"><form className="panel" onSubmit={save}><h2>{form.key ? "แก้ไขหมวดหมู่" : "เพิ่มหมวดหมู่"}</h2><input placeholder="ชื่อภาษาไทย" value={form.name_th} onChange={(event) => setForm({ ...form, name_th: event.target.value })} required /><input placeholder="ชื่อภาษาอังกฤษ" value={form.name_en} onChange={(event) => setForm({ ...form, name_en: event.target.value })} /><input placeholder="URL รูปหมวดหมู่" value={form.image_url} onChange={(event) => setForm({ ...form, image_url: event.target.value })} /><button className="btn" disabled={loading}>บันทึก</button></form>
      <div className="panel"><h2>หมวดหมู่ทั้งหมด</h2>{categories.map((category) => <div className="row" key={category.key}><span>{category.name_th} {category.name_en && `(${category.name_en})`}</span><div><button onClick={() => setForm({ ...category })}>แก้ไข</button><button onClick={() => removeCategory(category)}>ลบ</button></div></div>)}</div></div>
  </section>;
}
