import React, { useEffect, useState } from "react";
import { get, ref, set, remove } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../../firebase";

export function FavoriteButton({ animal }) {
  const [user, setUser] = useState(null);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => onAuthStateChanged(auth, async (currentUser) => {
    setUser(currentUser);
    if (!currentUser) return setSaved(false);
    try {
      const snapshot = await get(ref(db, `favorites/${currentUser.uid}/${animal.id}`));
      setSaved(snapshot.exists());
    } catch (error) {
      console.error(error);
      setMessage("อ่านรายการโปรดไม่สำเร็จ");
    }
  }), [animal.id]);

  async function toggleFavorite() {
    if (!user) return setMessage("เข้าสู่ระบบก่อนบันทึกรายการโปรด");
    try {
      const favoriteRef = ref(db, `favorites/${user.uid}/${animal.id}`);
      if (saved) await remove(favoriteRef);
      else await set(favoriteRef, true);
      setSaved(!saved);
      setMessage(saved ? "นำออกจากรายการโปรดแล้ว" : "บันทึกรายการโปรดแล้ว");
    } catch (error) {
      console.error(error);
      setMessage("บันทึกรายการโปรดไม่สำเร็จ");
    }
  }

  return <div><button type="button" onClick={toggleFavorite}>{saved ? "♥ นำออกจากรายการโปรด" : "♡ บันทึกรายการโปรด"}</button>{message && <small role="status"> {message}</small>}</div>;
}
