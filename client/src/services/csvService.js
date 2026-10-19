const HEADER_ALIASES = {
  id: ["id", "animalid", "รหัส", "รหัสสัตว์"],
  name_th: ["nameth", "thaianimalname", "ชื่อไทย", "ชื่อสัตว์ภาษาไทย"],
  name_en: ["nameen", "englishname", "ชื่ออังกฤษ", "ชื่อสัตว์ภาษาอังกฤษ"],
  scientific_name: ["scientificname", "ชื่อวิทยาศาสตร์"],
  category: ["category", "ประเภท", "หมวดหมู่"],
  habitat: ["habitat", "ถิ่นอาศัย"],
  description: ["description", "รายละเอียด"],
  image_url: ["imageurl", "รูปภาพ", "urlรูปภาพ"],
  food: ["food", "อาหาร"],
  behavior: ["behavior", "behaviour", "พฤติกรรม"],
  conservation_status: ["conservationstatus", "สถานภาพการอนุรักษ์", "สถานะการอนุรักษ์"],
  is_recommended: ["isrecommended", "แนะนำ", "สัตว์แนะนำ"],
};

const REQUIRED_FIELDS = [
  "id",
  "name_th",
  "name_en",
  "scientific_name",
  "category",
  "habitat",
  "description",
];

function normalizeHeader(value) {
  return String(value || "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLocaleLowerCase()
    .replace(/[\s_-]+/g, "");
}

export function parseCsvRows(text) {
  const source = String(text || "").replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];

    if (quoted) {
      if (char === '"' && source[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"' && field.length === 0) {
      quoted = true;
    } else if (char === ",") {
      row.push(field.trim());
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[i + 1] === "\n") i += 1;
      row.push(field.trim());
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (quoted) throw new Error("พบเครื่องหมายคำพูดที่ปิดไม่ครบในไฟล์ CSV");

  row.push(field.trim());
  if (row.some((value) => value !== "")) rows.push(row);
  return rows;
}

export function parseAnimalCsv(text, existingAnimals = []) {
  const rows = parseCsvRows(text);
  if (rows.length < 2) throw new Error("ไฟล์ CSV ไม่มีแถวข้อมูล");

  const normalizedHeaders = rows[0].map(normalizeHeader);
  const columns = {};
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    columns[field] = normalizedHeaders.findIndex((header) =>
      aliases.includes(header),
    );
  }

  const missingHeaders = REQUIRED_FIELDS.filter((field) => columns[field] < 0);
  if (missingHeaders.length) {
    throw new Error(`ไม่พบหัวคอลัมน์ที่จำเป็น: ${missingHeaders.join(", ")}`);
  }

  const existingById = new Map(
    existingAnimals.map((animal) => [String(animal.id), animal]),
  );
  const seenIds = new Set();
  const animals = [];

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const getValue = (field) => {
      const column = columns[field];
      return column < 0 ? "" : String(row[column] || "").trim();
    };
    const id = getValue("id");
    const missingValues = REQUIRED_FIELDS.filter(
      (field) => field !== "id" && !getValue(field),
    );

    if (!id) throw new Error(`แถว ${rowIndex + 1}: ไม่มีรหัสสัตว์`);
    if ([".", "#", "$", "[", "]", "/"].some((character) => id.includes(character))) {
      throw new Error(`แถว ${rowIndex + 1}: รหัสสัตว์มีอักขระที่ Firebase ไม่อนุญาต`);
    }
    if (missingValues.length) {
      throw new Error(`แถว ${rowIndex + 1}: ข้อมูลจำเป็นว่าง (${missingValues.join(", ")})`);
    }
    if (seenIds.has(id)) throw new Error(`แถว ${rowIndex + 1}: รหัส ${id} ซ้ำในไฟล์`);
    seenIds.add(id);

    const existing = existingById.get(id) || {};
    const imageUrl = getValue("image_url");
    const status = getValue("conservation_status");
    const recommended = getValue("is_recommended").toLocaleLowerCase();

    animals.push({
      id,
      name_th: getValue("name_th"),
      name_en: getValue("name_en"),
      scientific_name: getValue("scientific_name"),
      category: getValue("category"),
      habitat: getValue("habitat"),
      description: getValue("description"),
      image_url: imageUrl || existing.image_url || `/images/${id}_thumbnail.webp`,
      food: getValue("food") || existing.food || "",
      behavior: getValue("behavior") || existing.behavior || "",
      conservation_status:
        status || existing.conservation_status || "สัตว์ป่าสงวนของไทย",
      is_recommended: columns.is_recommended < 0
        ? Boolean(existing.is_recommended)
        : ["true", "1", "yes", "ใช่"].includes(recommended),
    });
  }

  return animals;
}
