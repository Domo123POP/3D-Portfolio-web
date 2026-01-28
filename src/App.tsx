import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import Scene from './Scene';
import Navbar from './Navbar';
import Profile from './Profile';
import ThreeDVfx from './ThreeDVfx';
import Gallery from './Gallery';
import Private from './Private';

// 暫時建立簡單的佔位元件，之後會換成真正的頁面
const Home = () => (
  <>
    <Scene />
  </>
);

function App() {
  // 媒體保護：禁用右鍵選單（僅針對圖片和影片）
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // 僅在圖片、影片、canvas 上禁用右鍵
      if (target.tagName === 'IMG' || target.tagName === 'VIDEO' || target.tagName === 'CANVAS') {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  // 取得 base URL 用於 Router basename
  const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '';

  return (
    <Router basename={basename}>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/3d-vfx" element={<ThreeDVfx />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/private" element={<Private />} />
      </Routes>
    </Router>
  );
}

export default App
