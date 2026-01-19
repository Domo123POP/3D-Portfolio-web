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
  return (
    <Router>
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
