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

export function Admin() {
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
