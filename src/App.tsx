import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ExplorePage } from "./routes/Explore";
import { AboutPage } from "./routes/About";

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<ExplorePage />} />
        <Route path="about" element={<AboutPage />} />
      </Route>
    </Routes>
  );
}
