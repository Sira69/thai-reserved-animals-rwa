import { Link } from "react-router-dom";
import { FALLBACK } from "../../constants";

export function Card({ a }) {
  return (
    <Link
      to={"/animals/" + a.id}
      className="card"
    >
      <img
        src={a.image_url || FALLBACK}
        alt={a.name_th}
      />

      <div>
        <span>{a.category}</span>

        <h3>{a.name_th}</h3>

        <p>{a.name_en}</p>

        <i>{a.scientific_name}</i>

        <p className="muted">
          {a.habitat}
        </p>
      </div>
    </Link>
  );
}
