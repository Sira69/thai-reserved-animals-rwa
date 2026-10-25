import { Link } from "react-router-dom";

const FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSf0n2Y2xccA3xrkNcOvmugAXsLHFSjOfBpktpVeti_yUX3ySw/viewform?embedded=true";

export function SurveyPage() {
  return (
    <section className="section survey-page">
      <div className="survey-heading">
        <small>RWA · FEEDBACK</small>
        <h1>แบบสอบถามความพึงพอใจ</h1>
        <p>ร่วมประเมินการใช้งานเว็บไซต์ RWA – Reserved Wild Animals เพื่อช่วยให้เราพัฒนาเว็บไซต์ให้ดียิ่งขึ้น</p>
      </div>
      <div className="survey-frame-wrap">
        <iframe title="แบบสอบถามความพึงพอใจต่อการใช้เว็บไซต์ RWA" src={FORM_URL} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allow="clipboard-write" />
      </div>
      <p className="survey-help">หากแบบสอบถามไม่แสดง <a href={FORM_URL.replace("?embedded=true", "")} target="_blank" rel="noreferrer">เปิดแบบสอบถามใน Google Forms</a></p>
      <p className="survey-admin-hint">สำหรับผู้ดูแลระบบ ตรวจดูผลตอบกลับได้จากเมนูบัญชีผู้ดูแล <Link to="/admin/survey">ผลแบบสอบถาม</Link></p>
    </section>
  );
}
