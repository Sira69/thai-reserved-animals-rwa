import { Link } from "react-router-dom";
import { FALLBACK } from "../../constants";
import { FavoriteButton } from "./FavoriteButton";

export function Card({ a }) {
  return (
    <article className="card animal-card">
      <Link to={"/animals/" + a.id} className="animal-card-image">
        <img src={a.image_url || FALLBACK} alt={a.name_th} />
      </Link>

      <div className="animal-card-content">
        <div className="animal-card-meta">
          <span>{a.category}</span>
          <FavoriteButton animal={a} />
        </div>

        <Link to={"/animals/" + a.id} className="animal-card-details">
          <h3>{a.name_th}</h3>
          <p>{a.name_en}</p>
          <i>{a.scientific_name}</i>
          <div className="animal-card-summary">
            <p><strong>ถิ่นอาศัย:</strong> {a.habitat || "ไม่มีข้อมูล"}</p>
            <p><strong>อาหาร:</strong> {a.food || "ไม่มีข้อมูล"}</p>
          </div>
        </Link>
      </div>
    </article>
  );
}
