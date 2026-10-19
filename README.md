# ระบบแนะนำสัตว์สงวน (RWA)

เว็บ React + Vite ใช้ Firebase Realtime Database เก็บข้อมูลสัตว์ และ Firebase Authentication สำหรับสมาชิกและผู้ดูแล

## เริ่มใช้งานในเครื่อง

1. ติดตั้ง Node.js 20 ขึ้นไป
2. เปิด Terminal ที่โฟลเดอร์โปรเจกต์นี้ แล้วรัน `npm install`
3. ติดตั้งไลบรารีหน้าเว็บด้วย `npm install --prefix client`
4. รัน `npm run dev`
5. เปิดเว็บที่ `http://localhost:5173`

ไฟล์ตั้งค่า Firebase อยู่ที่ `client/src/firebase.js` และเชื่อมกับโปรเจ็กต์ `thai-rwa-fd589` โดยใช้ Realtime Database URL `https://thai-rwa-fd589-default-rtdb.asia-southeast1.firebasedatabase.app`

## เตรียม Firebase

1. เปิด Realtime Database ใน Firebase Console
2. Import ไฟล์ `database-import.json` ที่โฟลเดอร์หลักของโปรเจกต์
3. เผยแพร่กฎจาก `database.rules.json` (หรือ Deploy ด้วย Firebase CLI)
4. เปิด Email/Password ใน Firebase Authentication และสร้างบัญชีผู้ดูแล
5. ใน Realtime Database เพิ่ม `admins/<UID ของผู้ดูแล>` เป็นค่า Boolean `true` เพื่อให้บัญชีนั้นเพิ่ม แก้ไข และลบข้อมูลได้

กฎอนุญาตให้อ่านรายการสัตว์และหมวดหมู่ได้สาธารณะ แต่การเขียนต้องเป็นบัญชีที่อยู่ใน `admins` ส่วนข้อมูลผู้ใช้ รายการโปรด และประวัติถูกจำกัดตาม UID

## โครงสร้างข้อมูล

`database-import.json` เตรียมโหนด `animals`, `categories`, `users`, `favorites`, `search_history`, `recommendations` และ `news` ไว้แล้ว มีข้อมูลสัตว์ 21 รายการและหมวดหมู่ที่ดึงจากชุดข้อมูลเดิม

แต่ละรายการใน `animals` ใช้ ID สัตว์เป็น key เช่น `animals/A001` และมีฟิลด์ `name_th`, `name_en`, `scientific_name`, `category`, `habitat`, `description`, `food`, `behavior`, `conservation_status`, `image_url` และ `is_recommended` รูปภาพ 21 รูปอยู่ใน `client/public/images` โดยใช้ชื่อไฟล์ตามรหัสสัตว์

## ฟังก์ชันที่มี

- หน้าแรกและรายการสัตว์ อ่านข้อมูลจาก Realtime Database
- ค้นหาตามชื่อ ชื่อวิทยาศาสตร์ ถิ่นอาศัย และกรองตามประเภท
- หน้ารายละเอียดสัตว์
- หน้าแนะนำสัตว์ เลือกประเภท ถิ่นอาศัย และค้นความสนใจจากรายละเอียด อาหาร หรือพฤติกรรม
- สมัครสมาชิก/เข้าสู่ระบบ รายการโปรด และประวัติการค้นหา
- หน้าหมวดหมู่และข่าวสารการอนุรักษ์
- หลังบ้านสำหรับผู้ดูแล เพิ่ม แก้ไข ลบ และนำเข้าข้อมูล CSV รวมถึงจัดการหมวดหมู่

## Build และ Deploy บน Firebase Hosting

ติดตั้ง Firebase CLI และเข้าสู่ระบบก่อน (`npm install -g firebase-tools`, `firebase login`) จากนั้นที่โฟลเดอร์โปรเจกต์รัน:

```bash
npm install
npm install --prefix client
npm run build
firebase deploy

```

ไฟล์ `firebase.json` ตั้ง Hosting ให้เผยแพร่ `client/dist` และรองรับ React routes โดย rewrite กลับไปที่ `index.html` ตรวจ URL ที่ Firebase แสดงหลัง Deploy และลองเปิดหน้าแรก รายการ รายละเอียด และ `/recommendation`

## หมายเหตุ

- ข้อมูลอาหาร พฤติกรรม และสถานภาพอนุรักษ์จะว่างไว้เมื่อชุดข้อมูลเดิมไม่มีข้อมูล ให้เติมจากแหล่งอ้างอิงของโครงงานก่อนนำเสนอ
- กฎ `admins` ต้องตั้ง UID ใน Firebase Console หลังสร้างบัญชีผู้ดูแล ห้ามเปิดสิทธิ์เขียนทั้งฐานข้อมูลแบบสาธารณะ

เว็บที่ Deploy แล้ว: https://thai-rwa-fd589.web.app