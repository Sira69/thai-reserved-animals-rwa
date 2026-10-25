import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { get, ref } from "firebase/database";
import { auth, db } from "../firebase";

const RESPONSES_URL = "https://docs.google.com/forms/d/e/1FAIpQLSf0n2Y2xccA3xrkNcOvmugAXsLHFSjOfBpktpVeti_yUX3ySw/edit#responses";

export function AdminSurveyPage() {
  const [status, setStatus] = useState("checking");

  useEffect(() => onAuthStateChanged(auth, async (user) => {
    if (!user) {
      setStatus("signed-out");
      return;
    }
    try {
      const snapshot = await get(ref(db, `admins/${user.uid}`));
      setStatus(snapshot.val() === true ? "admin" : "denied");
    } catch (error) {
      console.error("ตรวจสอบสิทธิ์ผู้ดูแลไม่สำเร็จ:", error);
      setStatus("error");
    }
  }), []);

  if (status === "checking") return <section className="section"><div className="panel"><p>กำลังตรวจสอบสิทธิ์ผู้ดูแล...</p></div></section>;
  if (status === "signed-out") return <section className="section"><div className="panel"><h1>เข้าสู่ระบบผู้ดูแล</h1><p>กรุณาเข้าสู่ระบบด้วยบัญชีผู้ดูแลเพื่อดูผลแบบสอบถาม</p><Link className="btn" to="/login">เข้าสู่ระบบ</Link></div></section>;
  if (status !== "admin") return <section className="section"><div className="panel"><h1>ไม่มีสิทธิ์เข้าถึง</h1><p>{status === "error" ? "ตรวจสอบสิทธิ์ไม่สำเร็จ กรุณาลองใหม่" : "หน้านี้สำหรับผู้ดูแลระบบเท่านั้น"}</p><Link to="/">กลับหน้าแรก</Link></div></section>;

  return (
    <section className="section survey-admin-page">
      <div className="survey-heading">
        <small>ADMIN · RESPONSES</small>
        <h1>ผลแบบสอบถาม</h1>
        <p>แบบสอบถามความพึงพอใจต่อการใช้เว็บไซต์ RWA – Reserved Wild Animals</p>
      </div>
      <div className="panel survey-admin-card">
        <h2>ตรวจสอบคำตอบและสรุปผล</h2>
        <p>ข้อมูลคำตอบจัดเก็บอยู่ใน Google Forms เปิดหน้าผลตอบกลับของแบบฟอร์มเพื่อดูคำตอบรายคนและสรุปกราฟ บัญชี Google ที่เปิดต้องมีสิทธิ์เป็นเจ้าของหรือผู้แก้ไขแบบฟอร์ม</p>
        <a className="btn" href={RESPONSES_URL} target="_blank" rel="noreferrer">เปิดผลตอบกลับใน Google Forms ↗</a>
        <p className="survey-admin-note">เมนูนี้จำกัดการเข้าถึงเฉพาะบัญชีผู้ดูแลเว็บไซต์ ส่วนสิทธิ์ดูข้อมูลใน Google Forms ยังควบคุมโดย Google</p>
      </div>
      <Link to="/admin">← กลับหน้าจัดการเว็บไซต์</Link>
    </section>
  );
}
