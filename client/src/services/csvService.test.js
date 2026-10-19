import assert from "node:assert/strict";
import test from "node:test";

import { parseAnimalCsv, parseCsvRows } from "./csvService.js";

const headers = "ID,ชื่อไทย,ชื่ออังกฤษ,ชื่อวิทยาศาสตร์,ประเภท,ถิ่นอาศัย,รายละเอียด";
const dugongRow = "A006,พะยูน,Dugong,Dugong dugon,สัตว์เลี้ยงลูกด้วยนม,ทะเลชายฝั่ง,กินหญ้าทะเลเป็นหลัก";

test("parses commas and line breaks inside quoted CSV fields", () => {
  const rows = parseCsvRows(`${headers}\r\nA006,พะยูน,Dugong,Dugong dugon,สัตว์เลี้ยงลูกด้วยนม,ทะเลชายฝั่ง,\"กินหญ้าทะเล, เป็นอาหารหลัก\"`);
  assert.equal(rows[1][6], "กินหญ้าทะเล, เป็นอาหารหลัก");
});

test("maps supported headers and supplies local image and reserved-status defaults", () => {
  const animals = parseAnimalCsv(`${headers}\n${dugongRow}`);
  assert.equal(animals.length, 1);
  assert.equal(animals[0].id, "A006");
  assert.equal(animals[0].image_url, "/images/A006_thumbnail.webp");
  assert.equal(animals[0].conservation_status, "สัตว์ป่าสงวนของไทย");
});

test("preserves existing optional values when optional CSV columns are omitted", () => {
  const existing = [{
    id: "A006",
    image_url: "/images/custom-dugong.webp",
    food: "หญ้าทะเล",
    behavior: "ขึ้นมาหายใจเป็นระยะ",
    is_recommended: true,
  }];
  const [animal] = parseAnimalCsv(`${headers}\n${dugongRow}`, existing);
  assert.equal(animal.image_url, "/images/custom-dugong.webp");
  assert.equal(animal.food, "หญ้าทะเล");
  assert.equal(animal.behavior, "ขึ้นมาหายใจเป็นระยะ");
  assert.equal(animal.is_recommended, true);
});

test("rejects a row missing required animal information", () => {
  const invalidRow = "A006,,Dugong,Dugong dugon,สัตว์เลี้ยงลูกด้วยนม,ทะเลชายฝั่ง,กินหญ้าทะเล";
  assert.throws(
    () => parseAnimalCsv(`${headers}\n${invalidRow}`),
    /แถว 2: ข้อมูลจำเป็นว่าง/,
  );
});

test("rejects duplicate animal IDs before import", () => {
  assert.throws(
    () => parseAnimalCsv(`${headers}\n${dugongRow}\n${dugongRow}`),
    /รหัส A006 ซ้ำในไฟล์/,
  );
});

test("rejects an unclosed quoted field", () => {
  assert.throws(() => parseCsvRows(`${headers}\n${dugongRow},\"`), /ปิดไม่ครบ/);
});
