import { get, ref, set, remove } from "firebase/database";
import { db } from "../firebase";
import { RECOMMENDED_ANIMAL_INFO } from "../data/recommendedAnimalInfo";

export async function getAnimals() {
  const snapshot = await get(ref(db, "animals"));
  const records = snapshot.val() || {};

  return Object.entries(records)
    .map(([key, animal]) => {
      const animalId = animal.id || key;
      const curated = RECOMMENDED_ANIMAL_INFO[animalId];
      const mergedAnimal = { ...animal };

      if (curated) {
        if (curated.name_en && (!animal.name_en || animal.name_en === curated.legacyNameEn)) mergedAnimal.name_en = curated.name_en;
        if (!animal.habitat || animal.habitat === curated.legacyHabitat) mergedAnimal.habitat = curated.habitat;
        if (!animal.description || animal.description === curated.legacyDescription) mergedAnimal.description = curated.description;
        if (!animal.food) mergedAnimal.food = curated.food;
        if (!animal.behavior) mergedAnimal.behavior = curated.behavior;
        mergedAnimal.info_source = curated.info_source;
        mergedAnimal.is_recommended = curated.is_recommended || Boolean(animal.is_recommended);
      }

      return {
        databaseKey: key,
        ...mergedAnimal,
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
