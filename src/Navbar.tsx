import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const allLinks = [
    { to: '/', text: 'Home' },
    { to: '/profile', text: 'Profile' },
    { to: '/3d-vfx', text: '3D VFX' },
    { to: '/gallery', text: 'Gallery' },
    { to: '/private', text: 'Private' },
  ];

  const currentLink = allLinks.find(link => link.to === location.pathname);
  const currentPageTitle = currentLink ? currentLink.text : 'Home';

  // Helper function to determine the link's class
  const getLinkClass = (path: string) => {
    const isActive = location.pathname === path;
    return `nav-link ${isActive ? 'active' : ''}`;
  };

  const goHome = () => {
    navigate('/'); // 確保回到首頁路由
    window.dispatchEvent(new Event('go-home')); // 觸發 Scene 重置事件 (回到初始鏡頭)
    setIsMenuOpen(false); // If mobile menu is open, close it
  }

  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      padding: '20px 0', // Vertical padding only
      zIndex: 10,
      color: 'white',
      background: 'rgba(0, 0, 0, 0.2)',
      backdropFilter: 'blur(10px)'
    }}>
      <div className="navbar-container">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '15px' }}>
          <div 
            style={{ fontSize: '1.5rem', fontWeight: 'bold', cursor: 'pointer' }}
            onClick={goHome}
          >
            Domo's Portfolio
          </div>
          <span style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.5)' }}>/</span>
          <div style={{fontSize: '1.2rem'}}>{currentPageTitle}</div>
        </div>

        {/* 電腦版選單 */}
        <div className="navbar-links-desktop">
          <Link to="/" onClick={(e) => { e.preventDefault(); goHome(); }} className={getLinkClass('/')}>Home</Link>
          <span style={{ width: '1px', height: '15px', backgroundColor: 'rgba(255,255,255,0.5)' }}></span>
          <Link to="/profile" className={getLinkClass('/profile')}>Profile</Link>
          <span style={{ width: '1px', height: '15px', backgroundColor: 'rgba(255,255,255,0.5)' }}></span>
          <Link to="/3d-vfx" className={getLinkClass('/3d-vfx')}>3D VFX</Link>
          <span style={{ width: '1px', height: '15px', backgroundColor: 'rgba(255,255,255,0.5)' }}></span>
          <Link to="/gallery" className={getLinkClass('/gallery')}>Gallery</Link>
          <span style={{ width: '1px', height: '15px', backgroundColor: 'rgba(255,255,255,0.5)' }}></span>
          <Link to="/private" className={getLinkClass('/private')}>Private</Link>
        </div>

        {/* 手機版漢堡按鈕 */}
        <button className="navbar-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          ☰
        </button>

        {/* 手機版下拉選單 */}
        {isMenuOpen && (
          <div style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            width: '200px',
            background: 'rgba(0, 0, 0, 0.95)',
            display: 'flex',
            flexDirection: 'column',
            padding: '20px',
            gap: '20px',
            borderBottomLeftRadius: '10px'
          }}>
            {allLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                onClick={(e) => {
                  if (link.to === '/') {
                    e.preventDefault();
                    goHome();
                  } else {
                    setIsMenuOpen(false);
                  }
                }}
                className={getLinkClass(link.to)}
              >
                {link.text}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}