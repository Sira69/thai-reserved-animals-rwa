import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

import {
  BrowserRouter,
  useParams,
  Link,
  Routes,
  Route,
  NavLink,
  useNavigate,
} from "react-router-dom";

import {
  get,
  ref,
  set,
  update,
  remove,
} from "firebase/database";

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";

import { db, auth } from "./firebase";
import { parseAnimalCsv, parseCsvRows } from "./services/csvService";

import "./style.css";

const FALLBACK =
  "https://images.unsplash.com/photo-1564349683136-77e2a7f847a1?w=1000";


/* =====================================================
   FIREBASE REALTIME DATABASE
===================================================== */

async function getAnimals() {
  const snapshot = await get(ref(db, "animals"));
  const records = snapshot.val() || {};

  return Object.entries(records)
    .map(([key, animal]) => {
      const animalId = animal.id || key;
      return {
        databaseKey: key,
        ...animal,
        id: animalId,
        image_url:
          animal.image_url || `/images/${animalId}_thumbnail.webp`,
        conservation_status:
          animal.conservation_status || "สัตว์ป่าสงวนของไทย",
      };
    })
    .sort((a, b) => String(a.id).localeCompare(String(b.id), "th"));
}

async function saveAnimal(animal) {
  const key = String(animal.id || "").trim();
  if (!key || key.includes(".") || key.includes("#") || key.includes("$") || key.includes("[") || key.includes("]") || key.includes("/")) {
    throw new Error("ID สัตว์ไม่ถูกต้อง");
  }
  await set(ref(db, `animals/${key}`), animal);
}

async function deleteAnimal(key) {
  await remove(ref(db, `animals/${key}`));
}

async function getCategories() {
  const snapshot = await get(ref(db, "categories"));
  const englishNames = {
    "สัตว์เลี้ยงลูกด้วยนม": "Mammals",
    "สัตว์จำพวกนก": "Birds",
    "สัตว์เลื้อยคลาน": "Reptiles",
    "สัตว์จำพวกปลา": "Fish",
  };
  return Object.entries(snapshot.val() || {}).map(([key, value]) => ({
    key,
    ...value,
    name_en: value.name_en || englishNames[value.name_th] || "",
  }));
}


/* =====================================================
   LAYOUT
===================================================== */

function Layout({ children }) {
  return (
    <>
      <header>
        <Link to="/" className="logo">
          🦌 RWA
        </Link>

        <nav>
          <NavLink to="/">หน้าแรก</NavLink>
          <NavLink to="/animals">สัตว์สงวน</NavLink>
          <NavLink to="/categories">หมวดหมู่</NavLink>
          <NavLink to="/recommendation">แนะนำสัตว์</NavLink>
          <NavLink to="/news">ข่าวอนุรักษ์</NavLink>
          <NavLink to="/favorites">รายการโปรด</NavLink>
          <NavLink to="/profile">บัญชีของฉัน</NavLink>
          <NavLink to="/login">เข้าสู่ระบบ</NavLink>
          <NavLink to="/admin">หลังบ้าน</NavLink>
        </nav>
      </header>

      <main>{children}</main>

      <footer>
        ระบบแนะนำสัตว์สงวน • Firebase + React
      </footer>
    </>
  );
}


/* =====================================================
   CARD
===================================================== */

function Card({ a }) {
  return (
    <Link
      to={"/animals/" + a.id}
      className="card"
    >
      <img
        src={a.image_url || FALLBACK}
        alt={a.name_th}
      />

      <div>
        <span>{a.category}</span>

        <h3>{a.name_th}</h3>

        <p>{a.name_en}</p>

        <i>{a.scientific_name}</i>

        <p className="muted">
          {a.habitat}
        </p>
      </div>
    </Link>
  );
}


/* =====================================================
   HOME
===================================================== */

function Home() {
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


/* =====================================================
   ANIMALS
===================================================== */

function Animals() {
  const [data, setData] = useState([]);
  const [q, setQ] = useState("");
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


/* =====================================================
   DETAIL
===================================================== */

function Detail() {
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

function Recommendation() {
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

function CategoryPage() {
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

function NewsPage() {
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

function AdminCategories() {
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
  if (!user) return <section className="section"><h1>จัดการหมวดหมู่</h1><p>เข้าสู่ระบบผู้ดูแลที่ <Link to="/admin">หลังบ้าน</Link></p></section>;
  if (!allowed) return <section className="section"><h1>ไม่มีสิทธิ์จัดการหมวดหมู่</h1></section>;
  return <section className="section"><small>ADMIN</small><h1>จัดการหมวดหมู่</h1>{message && <p role="status">{message}</p>}
    <div className="admin"><form className="panel" onSubmit={save}><h2>{form.key ? "แก้ไขหมวดหมู่" : "เพิ่มหมวดหมู่"}</h2><input placeholder="ชื่อภาษาไทย" value={form.name_th} onChange={(event) => setForm({ ...form, name_th: event.target.value })} required /><input placeholder="ชื่อภาษาอังกฤษ" value={form.name_en} onChange={(event) => setForm({ ...form, name_en: event.target.value })} /><input placeholder="URL รูปหมวดหมู่" value={form.image_url} onChange={(event) => setForm({ ...form, image_url: event.target.value })} /><button className="btn" disabled={loading}>บันทึก</button></form>
      <div className="panel"><h2>หมวดหมู่ทั้งหมด</h2>{categories.map((category) => <div className="row" key={category.key}><span>{category.name_th} {category.name_en && `(${category.name_en})`}</span><div><button onClick={() => setForm({ ...category })}>แก้ไข</button><button onClick={() => removeCategory(category)}>ลบ</button></div></div>)}</div></div>
  </section>;
}

function FavoriteButton({ animal }) {
  const [user, setUser] = useState(null);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => onAuthStateChanged(auth, async (currentUser) => {
    setUser(currentUser);
    if (!currentUser) return setSaved(false);
    try {
      const snapshot = await get(ref(db, `favorites/${currentUser.uid}/${animal.id}`));
      setSaved(snapshot.exists());
    } catch (error) {
      console.error(error);
      setMessage("อ่านรายการโปรดไม่สำเร็จ");
    }
  }), [animal.id]);

  async function toggleFavorite() {
    if (!user) return setMessage("เข้าสู่ระบบก่อนบันทึกรายการโปรด");
    try {
      const favoriteRef = ref(db, `favorites/${user.uid}/${animal.id}`);
      if (saved) await remove(favoriteRef);
      else await set(favoriteRef, true);
      setSaved(!saved);
      setMessage(saved ? "นำออกจากรายการโปรดแล้ว" : "บันทึกรายการโปรดแล้ว");
    } catch (error) {
      console.error(error);
      setMessage("บันทึกรายการโปรดไม่สำเร็จ");
    }
  }

  return <div><button type="button" onClick={toggleFavorite}>{saved ? "♥ นำออกจากรายการโปรด" : "♡ บันทึกรายการโปรด"}</button>{message && <small role="status"> {message}</small>}</div>;
}

function Favorites() {
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

function MemberAuth({ register = false }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true); setMessage("");
    try {
      if (register) {
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await set(ref(db, `users/${credential.user.uid}`), {
          name: name.trim(), email: credential.user.email, role: "member", createdAt: Date.now(),
        });
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      navigate("/profile");
    } catch (error) {
      console.error(error);
      setMessage(error.code === "auth/email-already-in-use" ? "อีเมลนี้มีบัญชีแล้ว"
        : error.code === "auth/weak-password" ? "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"
          : error.code === "auth/invalid-credential" ? "อีเมลหรือรหัสผ่านไม่ถูกต้อง"
            : `ดำเนินการไม่สำเร็จ: ${error.message}`);
    } finally { setLoading(false); }
  }

  return <section className="section login"><div className="panel"><small>MEMBER</small><h1>{register ? "สมัครสมาชิก" : "เข้าสู่ระบบ"}</h1>
    <form onSubmit={submit}>{register && <input placeholder="ชื่อ" value={name} onChange={(event) => setName(event.target.value)} required />}
      <input type="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      <input type="password" placeholder="Password (อย่างน้อย 6 ตัวอักษร)" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} required />
      <button className="btn" disabled={loading}>{loading ? "กำลังดำเนินการ..." : register ? "สมัครสมาชิก" : "เข้าสู่ระบบ"}</button>
    </form>{message && <p className="error">{message}</p>}
    <p>{register ? "มีบัญชีแล้ว?" : "ยังไม่มีบัญชี?"} <Link to={register ? "/login" : "/register"}>{register ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}</Link></p>
  </div></section>;
}

function Profile() {
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


/* =====================================================
   CSV IMPORTER
===================================================== */

function CsvImporter({ onImported }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  function choose(e) {
    const f = e.target.files?.[0];

    if (!f) {
      setFile(null);
      setPreview([]);
      return;
    }

    setFile(f);
    setMsg("");

    const reader = new FileReader();

    reader.onload = (ev) => {
      try {
        const rows = parseCsvRows(
          String(
            ev.target.result || ""
          )
        );

        setPreview(rows.slice(0, 6));
      } catch (error) {
        console.error(error);

        setMsg(
          "อ่านไฟล์ CSV ไม่สำเร็จ"
        );
      }
    };

    reader.onerror = () => {
      setMsg(
        "ไม่สามารถอ่านไฟล์ CSV ได้"
      );
    };

    reader.readAsText(
      f,
      "UTF-8"
    );
  }

  async function upload() {
    if (!file) {
      setMsg(
        "กรุณาเลือกไฟล์ CSV ก่อน"
      );
      return;
    }

    if (loading) return;

    setLoading(true);
    setMsg("");

    try {
      const text = await file.text();

      const currentAnimals = await getAnimals();
      const animals = parseAnimalCsv(text, currentAnimals);
      const updates = Object.fromEntries(
        animals.map((animal) => [animal.id, animal]),
      );
      await update(ref(db, "animals"), updates);

      setMsg(
        `นำเข้าสำเร็จ ${animals.length} รายการ`
      );

      setFile(null);
      setPreview([]);

      if (onImported) {
        await onImported();
      }
    } catch (error) {
      console.error(
        "CSV ERROR:",
        error
      );

      setMsg(
        "นำเข้าไม่สำเร็จ: " +
          (error.message ||
            "เกิดข้อผิดพลาด")
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="csv-import">
      <div className="dropzone">
        <div className="csv-icon">
          📄
        </div>

        <h2>
          เพิ่มข้อมูลจากไฟล์ CSV
        </h2>

        <p>
          เลือก CSV จากเครื่อง
          แล้วนำเข้าสู่ Firebase
          Realtime Database
        </p>

        <label className="btn file-btn">
          เลือกไฟล์ CSV

          <input
            type="file"
            accept=".csv,text/csv"
            onChange={choose}
          />
        </label>

        {file && (
          <div className="selected-file">
            ไฟล์ที่เลือก:{" "}
            <b>{file.name}</b>
          </div>
        )}

        <button
          className="btn import-btn"
          disabled={!file || loading}
          onClick={upload}
        >
          {loading
            ? "กำลังนำเข้า..."
            : "นำเข้าข้อมูล"}
        </button>

        {msg && (
          <div
            className={
              msg.includes("สำเร็จ")
                ? "success"
                : "error"
            }
          >
            {msg}
          </div>
        )}
      </div>

      {preview.length > 0 && (
        <div className="preview">
          <h3>
            ตัวอย่างข้อมูล
          </h3>

          <div className="table-wrap">
            <table>
              <tbody>
                {preview.map(
                  (row, i) => (
                    <tr key={i}>
                      {row.map(
                        (c, j) => (
                          <td key={j}>
                            {c}
                          </td>
                        )
                      )}
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="csv-help">
        <b>
          คอลัมน์ที่รองรับ
        </b>

        <code>
          ID, ชื่อไทย, ชื่ออังกฤษ,
          ชื่อวิทยาศาสตร์, ประเภท,
          ถิ่นอาศัย, รายละเอียด,
          image_url, food, behavior,
          conservation_status, is_recommended
        </code>
      </div>
    </div>
  );
}


/* =====================================================
   IMAGE → BASE64
===================================================== */

function imageToBase64(file) {
  return new Promise(
    (resolve, reject) => {
      const reader =
        new FileReader();

      reader.onload = () => {
        resolve(
          String(reader.result)
        );
      };

      reader.onerror = () => {
        reject(
          new Error(
            "ไม่สามารถอ่านรูปภาพได้"
          )
        );
      };

      reader.readAsDataURL(file);
    }
  );
}


/* =====================================================
   ADMIN
===================================================== */

function Admin() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [animals, setAnimals] =
    useState([]);

  const [form, setForm] = useState({
    id: "",
    name_th: "",
    name_en: "",
    scientific_name: "",
    category: "",
    habitat: "",
    description: "",
    food: "",
    behavior: "",
    conservation_status: "",
    is_recommended: false,
  });

  const [image, setImage] =
    useState(null);

  const [preview, setPreview] =
    useState("");

  const [edit, setEdit] =
    useState("");

  const [msg, setMsg] =
    useState("");

  const [loading, setLoading] =
    useState(false);


  /* =====================================================
     AUTH
  ===================================================== */

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (currentUser) => {
          setUser(currentUser);

          if (currentUser) {
            try {
              const adminSnapshot = await get(ref(db, `admins/${currentUser.uid}`));
              const allowed = adminSnapshot.val() === true;
              setIsAdmin(allowed);
              if (!allowed) {
                setAnimals([]);
                setMsg("บัญชีนี้ไม่มีสิทธิ์ผู้ดูแลระบบ");
                return;
              }
              const data =
                await getAnimals();

              setAnimals(data);
            } catch (error) {
              console.error(error);

              setMsg(
                "โหลดข้อมูลไม่สำเร็จ: " +
                  error.message
              );
            }
          } else {
            setIsAdmin(false);
            setAnimals([]);
          }
        }
      );

    return unsubscribe;
  }, []);


  /* =====================================================
     LOGIN
  ===================================================== */

  async function login(e) {
    e.preventDefault();

    if (loading) return;

    setMsg("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      setMsg(
        "เข้าสู่ระบบสำเร็จ"
      );
    } catch (error) {
      console.error(
        "LOGIN ERROR:",
        error
      );

      switch (error.code) {
        case "auth/invalid-credential":
          setMsg(
            "อีเมลหรือรหัสผ่านไม่ถูกต้อง"
          );
          break;

        case "auth/invalid-email":
          setMsg(
            "รูปแบบอีเมลไม่ถูกต้อง"
          );
          break;

        case "auth/user-not-found":
          setMsg(
            "ไม่พบผู้ใช้งานนี้ใน Firebase Authentication"
          );
          break;

        case "auth/wrong-password":
          setMsg(
            "รหัสผ่านไม่ถูกต้อง"
          );
          break;

        case "auth/too-many-requests":
          setMsg(
            "ลองเข้าสู่ระบบหลายครั้งเกินไป กรุณารอสักครู่"
          );
          break;

        case "auth/network-request-failed":
          setMsg(
            "เชื่อมต่อ Firebase ไม่ได้"
          );
          break;

        default:
          setMsg(
            "เข้าสู่ระบบไม่สำเร็จ: " +
              error.message
          );
      }
    } finally {
      setLoading(false);
    }
  }


  /* =====================================================
     LOGOUT
  ===================================================== */

  async function logout() {
    try {
      await signOut(auth);

      setUser(null);
      setIsAdmin(false);
      setAnimals([]);

      resetForm();
    } catch (error) {
      console.error(error);

      setMsg(
        "ออกจากระบบไม่สำเร็จ"
      );
    }
  }


  /* =====================================================
     LOAD
  ===================================================== */

  async function loadAnimals() {
    const data =
      await getAnimals();

    setAnimals(data);

    return data;
  }


  /* =====================================================
     IMAGE SELECT
  ===================================================== */

  async function chooseImage(e) {
    const file =
      e.target.files?.[0];

    if (!file) {
      setImage(null);
      return;
    }

    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];

    if (!allowed.includes(file.type)) {
      setMsg(
        "รองรับเฉพาะ JPG, PNG, WEBP และ GIF"
      );

      e.target.value = "";
      return;
    }

    /*
      จำกัดขนาดไว้ 1.5MB

      เพราะรูปจะถูกเก็บเป็น Base64
      ใน Realtime Database
    */

    if (
      file.size >
      1.5 * 1024 * 1024
    ) {
      setMsg(
        "รูปภาพต้องมีขนาดไม่เกิน 1.5MB"
      );

      e.target.value = "";
      return;
    }

    try {
      setMsg(
        "กำลังเตรียมรูปภาพ..."
      );

      const base64 =
        await imageToBase64(file);

      setImage(file);

      setPreview(base64);

      setMsg("");
    } catch (error) {
      console.error(error);

      setMsg(
        "ไม่สามารถอ่านรูปภาพได้"
      );
    }
  }


  /* =====================================================
     SAVE
  ===================================================== */

  async function save(e) {
    e.preventDefault();

    if (loading) return;

    setMsg("");

    if (!form.name_th.trim()) {
      setMsg(
        "กรุณากรอกชื่อไทย"
      );
      return;
    }

    setLoading(true);

    try {
      /*
        1. สร้าง ID
      */

      let animalId =
        form.id.trim();

      if (!edit && !animalId) {
        animalId =
          "A" +
          String(
            animals.length + 1
          ).padStart(3, "0");
      }


      /*
        2. ตรวจ ID ซ้ำ
      */

      if (!edit) {
        const duplicate =
          animals.find(
            (a) =>
              a.id === animalId
          );

        if (duplicate) {
          throw new Error(
            `ID ${animalId} มีอยู่แล้ว`
          );
        }
      }


      /*
        3. รูปเดิม

        ถ้าแก้ไขข้อมูลและไม่ได้
        เลือกรูปใหม่ จะเก็บรูปเดิมไว้
      */

      let imageUrl =
        preview || "";


      /*
        4. ถ้าเลือกรูปใหม่
        preview จะเป็น Base64
      */

      if (image) {
        setMsg(
          "กำลังเตรียมรูปภาพ..."
        );

        imageUrl =
          await imageToBase64(
            image
          );
      }


      /*
        5. สร้างข้อมูล
      */

      const data = {
        id: animalId,

        name_th:
          form.name_th.trim(),

        name_en:
          form.name_en.trim(),

        scientific_name:
          form.scientific_name.trim(),

        category:
          form.category.trim(),

        habitat:
          form.habitat.trim(),

        description:
          form.description.trim(),

        food: form.food.trim(),

        behavior: form.behavior.trim(),

        conservation_status: form.conservation_status.trim(),

        is_recommended: Boolean(form.is_recommended),

        image_url:
          imageUrl,
      };


      /*
        6. แก้ไข
      */

      if (edit) {
        const existing =
          animals.find(
            (a) =>
              a.id === edit
          );

        if (!existing) {
          throw new Error(
            "ไม่พบข้อมูลที่ต้องการแก้ไข"
          );
        }

        setMsg(
          "กำลังบันทึกข้อมูล..."
        );

        await saveAnimal(data);
      }


      /*
        7. เพิ่ม
      */

      else {
        setMsg(
          "กำลังเพิ่มข้อมูล..."
        );

        await saveAnimal(data);
      }


      /*
        8. สำเร็จ
      */

      setMsg(
        "บันทึกข้อมูลเรียบร้อยแล้ว"
      );

      resetForm();


      /*
        โหลดรายการใหม่
      */

      try {
        await loadAnimals();
      } catch (loadError) {
        console.error(
          "LOAD AFTER SAVE ERROR:",
          loadError
        );
      }

    } catch (error) {
      console.error(
        "SAVE ERROR:",
        error
      );

      let message =
        error.message ||
        "เกิดข้อผิดพลาด";

      if (
        error.code ===
        "permission-denied"
      ) {
        message =
          "Firebase Rules ไม่อนุญาตให้บันทึกข้อมูล";
      }

      setMsg(
        "บันทึกไม่สำเร็จ: " +
          message
      );

    } finally {
      setLoading(false);
    }
  }


  /* =====================================================
     DELETE
  ===================================================== */

  async function del(a) {
    if (
      !confirm(
        `ยืนยันการลบ ${a.name_th}?`
      )
    ) {
      return;
    }

    try {
      setMsg(
        "กำลังลบข้อมูล..."
      );

      await deleteAnimal(a.databaseKey);

      setMsg(
        "ลบข้อมูลเรียบร้อยแล้ว"
      );

      await loadAnimals();

    } catch (error) {
      console.error(
        "DELETE ERROR:",
        error
      );

      setMsg(
        "ลบข้อมูลไม่สำเร็จ: " +
          error.message
      );
    }
  }


  /* =====================================================
     EDIT
  ===================================================== */

  function editAnimal(a) {
    setEdit(a.id);

    setForm({
      id: a.id || "",

      name_th:
        a.name_th || "",

      name_en:
        a.name_en || "",

      scientific_name:
        a.scientific_name || "",

      category:
        a.category || "",

      habitat:
        a.habitat || "",

      description:
        a.description || "",
      food: a.food || "",
      behavior: a.behavior || "",
      conservation_status: a.conservation_status || "",
      is_recommended: Boolean(a.is_recommended),
    });

    /*
      สำคัญ:
      ใช้รูปเดิมจาก Realtime Database
    */

    setPreview(
      a.image_url || ""
    );

    setImage(null);

    setMsg("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }


  /* =====================================================
     RESET
  ===================================================== */

  function resetForm() {
    setForm({
      id: "",
      name_th: "",
      name_en: "",
      scientific_name: "",
      category: "",
      habitat: "",
      description: "",
      food: "",
      behavior: "",
      conservation_status: "",
      is_recommended: false,
    });

    setImage(null);
    setPreview("");
    setEdit("");
  }


  /* =====================================================
     LOGIN PAGE
  ===================================================== */

  if (!user) {
    return (
      <section className="section login">
        <div className="panel">
          <small>ADMIN</small>

          <h1>
            เข้าสู่ระบบหลังบ้าน
          </h1>

          <form
            onSubmit={login}
          >
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) =>
                setEmail(
                  e.target.value
                )
              }
              required
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) =>
                setPassword(
                  e.target.value
                )
              }
              required
            />

            <button
              className="btn"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "กำลังเข้าสู่ระบบ..."
                : "เข้าสู่ระบบ"}
            </button>
          </form>

          {msg && (
            <p
              className={
                msg.includes("สำเร็จ")
                  ? "success"
                  : "error"
              }
            >
              {msg}
            </p>
          )}
        </div>
      </section>
    );
  }

  if (!isAdmin) {
    return <section className="section"><div className="panel"><h1>ไม่มีสิทธิ์เข้าถึงหลังบ้าน</h1><p>{msg || "บัญชีนี้ไม่ได้รับสิทธิ์ผู้ดูแล"}</p><button onClick={logout}>ออกจากระบบ</button></div></section>;
  }


  /* =====================================================
     ADMIN PAGE
  ===================================================== */

  return (
    <section className="section">

      <div className="title">
        <div>
          <small>
            ADMIN PANEL
          </small>

          <h1>
            จัดการสัตว์สงวน
          </h1>

          <p>
            {user.email}
          </p>
        </div>

        <button
          onClick={logout}
        >
          ออกจากระบบ
        </button>
      </div>


      {msg && (
        <div className="notice">
          {msg}
        </div>
      )}


      <div className="admin">

        {/* =================================================
            FORM
        ================================================= */}

        <div className="panel">

          <h2>
            {edit
              ? "แก้ไขข้อมูลสัตว์"
              : "เพิ่มข้อมูลสัตว์"}
          </h2>


          <form
            onSubmit={save}
          >

            <input
              placeholder="ID เช่น A022"
              value={form.id}
              disabled={!!edit}
              onChange={(e) =>
                setForm({
                  ...form,
                  id: e.target.value,
                })
              }
            />


            <input
              placeholder="ชื่อไทย"
              value={form.name_th}
              onChange={(e) =>
                setForm({
                  ...form,
                  name_th:
                    e.target.value,
                })
              }
              required
            />


            <input
              placeholder="ชื่ออังกฤษ"
              value={form.name_en}
              onChange={(e) =>
                setForm({
                  ...form,
                  name_en:
                    e.target.value,
                })
              }
            />


            <input
              placeholder="ชื่อวิทยาศาสตร์"
              value={
                form.scientific_name
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  scientific_name:
                    e.target.value,
                })
              }
            />


            <input
              placeholder="ประเภท"
              value={form.category}
              onChange={(e) =>
                setForm({
                  ...form,
                  category:
                    e.target.value,
                })
              }
            />


            <input
              placeholder="ถิ่นอาศัย"
              value={form.habitat}
              onChange={(e) =>
                setForm({
                  ...form,
                  habitat:
                    e.target.value,
                })
              }
            />


            <textarea
              rows="5"
              placeholder="รายละเอียด"
              value={
                form.description
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  description:
                    e.target.value,
                })
              }
            />

            <input placeholder="อาหาร" value={form.food} onChange={(e) => setForm({ ...form, food: e.target.value })} />
            <textarea rows="3" placeholder="พฤติกรรม" value={form.behavior} onChange={(e) => setForm({ ...form, behavior: e.target.value })} />
            <input placeholder="สถานภาพการอนุรักษ์" value={form.conservation_status} onChange={(e) => setForm({ ...form, conservation_status: e.target.value })} />
            <label><input type="checkbox" checked={form.is_recommended} onChange={(e) => setForm({ ...form, is_recommended: e.target.checked })} /> แสดงเป็นสัตว์แนะนำ</label>


            {/* =================================================
                IMAGE
            ================================================= */}

            <div className="image-upload">

              <h3>
                รูปภาพสัตว์
              </h3>

              <label className="btn file-btn">

                🖼️ เลือกรูปจากเครื่อง

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={
                    chooseImage
                  }
                  style={{
                    display:
                      "none",
                  }}
                />

              </label>


              {image && (
                <p>
                  ไฟล์ที่เลือก:{" "}
                  <b>
                    {image.name}
                  </b>
                </p>
              )}


              {preview && (
                <div
                  style={{
                    marginTop:
                      "15px",
                  }}
                >

                  <img
                    src={preview}
                    alt="preview"
                    style={{
                      width: "100%",
                      maxWidth:
                        "350px",
                      height:
                        "220px",
                      objectFit:
                        "cover",
                      borderRadius:
                        "12px",
                    }}
                  />

                </div>
              )}


              <small className="muted">

                JPG, PNG, WEBP, GIF
                ไม่เกิน 1.5MB

              </small>

              <p className="muted">
                รูปภาพจะถูกเก็บใน
                Realtime Database โดยตรง
                ไม่ต้องใช้ Firebase Storage
              </p>

            </div>


            {/* =================================================
                SAVE BUTTON
            ================================================= */}

            <button
              className="btn"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "กำลังบันทึก..."
                : "💾 บันทึกข้อมูล"}
            </button>


            {edit && (
              <button
                type="button"
                onClick={
                  resetForm
                }
                disabled={loading}
              >
                ยกเลิกการแก้ไข
              </button>
            )}

          </form>


          <hr />


          {/* =================================================
              CSV
          ================================================= */}

          <CsvImporter
            onImported={
              loadAnimals
            }
          />

        </div>


        {/* =================================================
            LIST
        ================================================= */}

        <div className="panel">

          <h2>
            รายการทั้งหมด (
            {animals.length}
            )
          </h2>


          {animals.length === 0 && (
            <p className="muted">
              ยังไม่มีข้อมูล
            </p>
          )}


          {animals.map((a) => (

            <div
              className="row"
              key={
                a.databaseKey
              }
            >

              <div
                style={{
                  display:
                    "flex",
                  alignItems:
                    "center",
                  gap: "12px",
                }}
              >

                {a.image_url ? (

                  <img
                    src={
                      a.image_url
                    }
                    alt={
                      a.name_th
                    }
                    style={{
                      width:
                        "60px",
                      height:
                        "60px",
                      objectFit:
                        "cover",
                      borderRadius:
                        "8px",
                    }}
                  />

                ) : (

                  <div
                    style={{
                      width:
                        "60px",
                      height:
                        "60px",
                      display:
                        "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      background:
                        "#eee",
                      borderRadius:
                        "8px",
                    }}
                  >
                    🐾
                  </div>

                )}


                <div>

                  <b>
                    {a.id} —{" "}
                    {a.name_th}
                  </b>

                  <small>
                    {a.name_en}
                  </small>

                </div>

              </div>


              <div>

                <button
                  onClick={() =>
                    editAnimal(a)
                  }
                >
                  แก้ไข
                </button>


                <button
                  onClick={() =>
                    del(a)
                  }
                >
                  ลบ
                </button>

              </div>

            </div>

          ))}

        </div>

      </div>

    </section>
  );
}


/* =====================================================
   APP
===================================================== */

function App() {
  return (
    <Layout>

      <Routes>

        <Route
          path="/"
          element={<Home />}
        />

        <Route
          path="/animals"
          element={<Animals />}
        />

        <Route
          path="/animals/:id"
          element={<Detail />}
        />

        <Route
          path="/recommendation"
          element={<Recommendation />}
        />

        <Route path="/favorites" element={<Favorites />} />
        <Route path="/categories" element={<CategoryPage />} />
        <Route path="/search" element={<Animals />} />
        <Route path="/news" element={<NewsPage />} />
        <Route path="/login" element={<MemberAuth />} />
        <Route path="/register" element={<MemberAuth register />} />
        <Route path="/profile" element={<Profile />} />

        <Route
          path="/admin"
          element={<Admin />}
        />
        <Route path="/admin/categories" element={<AdminCategories />} />

      </Routes>

    </Layout>
  );
}


/* =====================================================
   START
===================================================== */

createRoot(
  document.getElementById("root")
).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
