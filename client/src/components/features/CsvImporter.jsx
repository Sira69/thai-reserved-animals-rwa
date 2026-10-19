import React, { useState } from "react";
import { ref, update } from "firebase/database";
import { auth, db } from "../../firebase";
import { getAnimals } from "../../services/animalService";
import { parseAnimalCsv, parseCsvRows } from "../../services/csvService";

export function CsvImporter({ onImported }) {
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
