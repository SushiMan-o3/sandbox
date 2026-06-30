import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Home from './pages/Home';
import AddRecipe from './pages/AddRecipe';
import ReviewRecipe from './pages/ReviewRecipe';
import RecipeDetail from './pages/RecipeDetail';

function WithNav({ children }) {
  return (
    <>
      <Navbar />
      <main style={{ paddingTop: 'var(--navbar-h)' }}>{children}</main>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/home" element={<WithNav><Home /></WithNav>} />
        <Route path="/add" element={<WithNav><AddRecipe /></WithNav>} />
        <Route path="/review" element={<WithNav><ReviewRecipe /></WithNav>} />
        <Route path="/recipe/:id" element={<WithNav><RecipeDetail /></WithNav>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
