import { Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { Home } from "./pages/HomePage";
import { Animals } from "./pages/AnimalListPage";
import { Detail } from "./pages/AnimalDetailPage";
import { Recommendation } from "./pages/RecommendationPage";
import { CategoryPage } from "./pages/CategoryPage";
import { NewsPage } from "./pages/NewsPage";
import { MemberAuth } from "./pages/MemberAuthPage";
import { SearchHistory } from "./pages/SearchHistoryPage";
import { Favorites } from "./pages/FavoritesPage";
import { Admin } from "./pages/AdminAnimalsPage";
import { AdminCategories } from "./pages/AdminCategoriesPage";
import { SurveyPage } from "./pages/SurveyPage";
import { AdminSurveyPage } from "./pages/AdminSurveyPage";

export default function App() {
  return <Layout><Routes>
    <Route path="/" element={<Home />} />
    <Route path="/animals" element={<Animals />} />
    <Route path="/animals/:id" element={<Detail />} />
    <Route path="/recommendation" element={<Recommendation />} />
    <Route path="/favorites" element={<Favorites />} />
    <Route path="/categories" element={<CategoryPage />} />
    <Route path="/search" element={<Animals />} />
    <Route path="/news" element={<NewsPage />} />
    <Route path="/survey" element={<SurveyPage />} />
    <Route path="/login" element={<MemberAuth />} />
    <Route path="/register" element={<MemberAuth register />} />
    <Route path="/history" element={<SearchHistory />} />
    <Route path="/profile" element={<Navigate to="/history" replace />} />
    <Route path="/admin" element={<Admin />} />
    <Route path="/admin/categories" element={<AdminCategories />} />
    <Route path="/admin/survey" element={<AdminSurveyPage />} />
  </Routes></Layout>;
}
