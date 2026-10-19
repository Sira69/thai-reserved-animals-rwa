import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { get, ref } from "firebase/database";
import { auth, db } from "../../firebase";

export function Layout({ children }) {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setAuthReady(false);
      setUser(currentUser);
      setIsAdmin(false);
      setProfileMenuOpen(false);

      if (currentUser) {
        try {
          const snapshot = await get(ref(db, `admins/${currentUser.uid}`));
          if (active && auth.currentUser?.uid === currentUser.uid) {
            setIsAdmin(snapshot.val() === true);
          }
        } catch (error) {
          console.error("ตรวจสอบสิทธิ์แอดมินไม่สำเร็จ:", error);
        }
      }

      if (active) setAuthReady(true);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!profileMenuOpen) return undefined;
    function closeOnEscape(event) {
      if (event.key === "Escape") setProfileMenuOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [profileMenuOpen]);

  async function handleLogout() {
    setLogoutError("");
    try {
      await signOut(auth);
      setProfileMenuOpen(false);
    } catch (error) {
      console.error("ออกจากระบบไม่สำเร็จ:", error);
      setLogoutError("ออกจากระบบไม่สำเร็จ กรุณาลองอีกครั้ง");
    }
  }

  return (
    <>
      <header>
        <Link to="/" className="logo">
          🦌 RWA
        </Link>

        <nav>
          <NavLink to="/">หน้าแรก</NavLink>
          <NavLink to="/animals">สัตว์สงวน</NavLink>
          {authReady && (user ? (
            <button
              type="button"
              className="profile-icon-link"
              aria-label="เปิดเมนูโปรไฟล์"
              aria-expanded={profileMenuOpen}
              aria-controls="profile-menu-dialog"
              title="เมนูโปรไฟล์"
              onClick={() => {
                setLogoutError("");
                setProfileMenuOpen(true);
              }}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M12 12a4.25 4.25 0 1 0 0-8.5A4.25 4.25 0 0 0 12 12Zm0 2c-4.3 0-7.75 2.2-7.75 4.9V21h15.5v-2.1c0-2.7-3.45-4.9-7.75-4.9Z" />
              </svg>
              <span className="sr-only">เมนูโปรไฟล์</span>
            </button>
          ) : (
            <NavLink to="/login">เข้าสู่ระบบ</NavLink>
          ))}
        </nav>
      </header>

      {profileMenuOpen && user && (
        <div className="profile-menu-backdrop" onClick={() => setProfileMenuOpen(false)}>
          <section
            className="profile-menu-dialog"
            id="profile-menu-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="เมนูบัญชีผู้ใช้"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="profile-menu-close"
              aria-label="ปิดเมนู"
              onClick={() => setProfileMenuOpen(false)}
            >
              ×
            </button>
            <div className="profile-menu-card">
              <strong className="profile-menu-email">{user.email}</strong>
              <Link className="profile-menu-link" to="/history" onClick={() => setProfileMenuOpen(false)}>
                ประวัติการค้นหา
              </Link>
              {!isAdmin && (
                <Link className="profile-menu-link" to="/favorites" onClick={() => setProfileMenuOpen(false)}>
                  สัตว์ที่ชื่นชอบ
                </Link>
              )}
              {isAdmin && (
                <Link className="profile-menu-link" to="/admin" onClick={() => setProfileMenuOpen(false)}>
                  จัดการข้อมูล
                </Link>
              )}
              <button type="button" className="profile-menu-logout" onClick={handleLogout}>
                ออกจากระบบ
              </button>
              {logoutError && <p className="profile-menu-error" role="alert">{logoutError}</p>}
            </div>
          </section>
        </div>
      )}

      <main>{children}</main>
    </>
  );
}
