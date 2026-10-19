require("dotenv").config();
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const Papa = require("papaparse");

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = path.join(__dirname);
const DATA = path.join(ROOT, "data", "animals.json");
const UPLOADS = path.join(ROOT, "uploads");

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || "dev-secret-change-me",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", secure: false, maxAge: 8 * 60 * 60 * 1000 }
}));
app.use("/uploads", express.static(UPLOADS));

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOADS),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, file, cb) => cb(null, /^image\\/(jpeg|png|webp|gif)$/.test(file.mimetype))
});

function readAnimals() {
  return JSON.parse(fs.readFileSync(DATA, "utf8"));
}
function writeAnimals(items) {
  fs.writeFileSync(DATA, JSON.stringify(items, null, 2), "utf8");
}
function nextId(items) {
  const nums = items.map(x => Number(String(x.id || "").replace(/^A/i, ""))).filter(Number.isFinite);
  return `A${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, "0")}`;
}
function auth(req, res, next) {
  if (!req.session.admin) return res.status(401).json({ message: "กรุณาเข้าสู่ระบบ Admin" });
  next();
}
function normalize(row, fallbackId) {
  return {
    id: String(row.id || row.ID || fallbackId || ""),
    name_th: String(row.name_th || row["ชื่อไทย"] || ""),
    name_en: String(row.name_en || row["ชื่ออังกฤษ"] || ""),
    scientific_name: String(row.scientific_name || row["ชื่อวิทยาศาสตร์"] || ""),
    category: String(row.category || row["ประเภท"] || ""),
    habitat: String(row.habitat || row["ถิ่นอาศัย"] || ""),
    description: String(row.description || row["รายละเอียด"] || ""),
    image_url: String(row.image_url || row["image_url"] || "")
  };
}

app.get("/api/health", (_, res) => res.json({ ok: true }));
app.get("/api/auth/me", (req, res) => res.json({ loggedIn: !!req.session.admin, email: req.session.admin?.email || null }));

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body || {};
  const ok = email === (process.env.ADMIN_EMAIL || "admin@example.com") &&
             password === (process.env.ADMIN_PASSWORD || "change-me");
  if (!ok) return res.status(401).json({ message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
  req.session.admin = { email };
  res.json({ ok: true, email });
});
app.post("/api/auth/logout", (req, res) => req.session.destroy(() => res.json({ ok: true })));

app.get("/api/animals", (req, res) => {
  let items = readAnimals();
  const q = String(req.query.q || "").trim().toLowerCase();
  const category = String(req.query.category || "");
  if (q) items = items.filter(x => [x.name_th,x.name_en,x.scientific_name,x.habitat,x.description].join(" ").toLowerCase().includes(q));
  if (category) items = items.filter(x => x.category === category);
  res.json(items);
});
app.get("/api/animals/:id", (req, res) => {
  const item = readAnimals().find(x => x.id === req.params.id);
  if (!item) return res.status(404).json({ message: "ไม่พบสัตว์รายการนี้" });
  res.json(item);
});

app.post("/api/animals", auth, (req, res) => {
  const items = readAnimals();
  const item = normalize(req.body, nextId(items));
  if (!item.name_th) return res.status(400).json({ message: "กรุณาระบุชื่อไทย" });
  if (items.some(x => x.id === item.id)) return res.status(409).json({ message: "ID ซ้ำ" });
  items.push(item); writeAnimals(items); res.status(201).json(item);
});
app.put("/api/animals/:id", auth, (req, res) => {
  const items = readAnimals();
  const i = items.findIndex(x => x.id === req.params.id);
  if (i < 0) return res.status(404).json({ message: "ไม่พบข้อมูล" });
  items[i] = normalize({ ...items[i], ...req.body }, req.params.id);
  writeAnimals(items); res.json(items[i]);
});
app.delete("/api/animals/:id", auth, (req, res) => {
  const items = readAnimals();
  const item = items.find(x => x.id === req.params.id);
  if (!item) return res.status(404).json({ message: "ไม่พบข้อมูล" });
  if (item.image_url?.startsWith("/uploads/")) {
    const p = path.join(ROOT, item.image_url);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  writeAnimals(items.filter(x => x.id !== req.params.id));
  res.json({ ok: true });
});

app.post("/api/animals/:id/image", auth, upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "ไฟล์ต้องเป็นรูปภาพ jpg/png/webp/gif ขนาดไม่เกิน 5MB" });
  const items = readAnimals();
  const i = items.findIndex(x => x.id === req.params.id);
  if (i < 0) return res.status(404).json({ message: "ไม่พบข้อมูล" });
  if (items[i].image_url?.startsWith("/uploads/")) {
    const old = path.join(ROOT, items[i].image_url);
    if (fs.existsSync(old)) fs.unlinkSync(old);
  }
  items[i].image_url = `/uploads/${req.file.filename}`;
  writeAnimals(items);
  res.json(items[i]);
});

app.post("/api/import/csv", auth, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "กรุณาเลือก CSV" });
  try {
    const text = fs.readFileSync(req.file.path, "utf8").replace(/^\uFEFF/, "");
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
    const current = readAnimals();
    const imported = parsed.data.map((r, i) => normalize(r, `A${String(i+1).padStart(3,"0")}`));
    const byId = new Map(current.map(x => [x.id, x]));
    imported.forEach(x => byId.set(x.id, { ...(byId.get(x.id) || {}), ...x }));
    const result = Array.from(byId.values());
    writeAnimals(result);
    fs.unlinkSync(req.file.path);
    res.json({ ok: true, count: imported.length, total: result.length });
  } catch (e) {
    console.error(e); res.status(400).json({ message: "อ่าน CSV ไม่สำเร็จ" });
  }
});

app.get("/api/import/google-sheet", auth, async (req, res) => {
  const url = process.env.GOOGLE_SHEET_CSV_URL;
  if (!url) return res.status(400).json({ message: "ยังไม่ได้ตั้ง GOOGLE_SHEET_CSV_URL" });
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
    const current = readAnimals();
    const imported = parsed.data.map((r, i) => normalize(r, `A${String(i+1).padStart(3,"0")}`));
    const byId = new Map(current.map(x => [x.id, x]));
    imported.forEach(x => byId.set(x.id, { ...(byId.get(x.id) || {}), ...x }));
    const result = Array.from(byId.values());
    writeAnimals(result);
    res.json({ ok: true, count: imported.length, total: result.length });
  } catch (e) {
    console.error(e); res.status(502).json({ message: "ดึง Google Sheets ไม่สำเร็จ", detail: e.message });
  }
});

const clientDist = path.join(__dirname, "..", "client", "dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*splat", (_, res) => res.sendFile(path.join(clientDist, "index.html")));
}

app.listen(PORT, () => console.log(`Thai Reserved Animals API: http://localhost:${PORT}`));