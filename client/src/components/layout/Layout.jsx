import { Link, NavLink } from "react-router-dom";

export function Layout({ children }) {
  return (
    <>
      <header>
        <Link to="/" className="logo">
          🦌 RWA
        </Link>

        <nav>
          <NavLink to="/">หน้าแรก</NavLink>
          <NavLink to="/animals">สัตว์สงวน</NavLink>
          <NavLink to="/categories">หมวดหมู่</NavLink>
          <NavLink to="/recommendation">แนะนำสัตว์</NavLink>
          <NavLink to="/news">ข่าวอนุรักษ์</NavLink>
          <NavLink to="/favorites">รายการโปรด</NavLink>
          <NavLink to="/profile">บัญชีของฉัน</NavLink>
          <NavLink to="/login">เข้าสู่ระบบ</NavLink>
          <NavLink to="/admin">หลังบ้าน</NavLink>
        </nav>
      </header>

      <main>{children}</main>

      <footer>
        ระบบแนะนำสัตว์สงวน • Firebase + React
      </footer>
    </>
  );
}
