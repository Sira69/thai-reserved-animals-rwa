import { get, ref, set, remove } from "firebase/database";
import { db } from "../firebase";

export async function getAnimals() {
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

export async function saveAnimal(animal) {
  const key = String(animal.id || "").trim();
  if (!key || key.includes(".") || key.includes("#") || key.includes("$") || key.includes("[") || key.includes("]") || key.includes("/")) {
    throw new Error("ID สัตว์ไม่ถูกต้อง");
  }
  await set(ref(db, `animals/${key}`), animal);
}

export async function deleteAnimal(key) {
  await remove(ref(db, `animals/${key}`));
}

export async function getCategories() {
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
