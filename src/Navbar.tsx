import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getAssetPath } from './utils/paths';

// 預載入所有 menu icon 幀 (URL 編碼空格)
// 使用原始檔案 00004-00022，共 19 幀
const menuFrames: string[] = [];
for (let i = 4; i <= 22; i++) {
  const frameNum = i.toString().padStart(5, '0');
  menuFrames.push(getAssetPath(`/media/icon/menu/Comp%201_${frameNum}.png`));
}

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMenuVisible, setIsMenuVisible] = useState(false); // 控制選單實際顯示
  const [menuOpacity, setMenuOpacity] = useState(0); // 控制選單漸變透明度
  const [currentFrame, setCurrentFrame] = useState(0);
  const animationRef = useRef<number | null>(null);
  const isAnimatingRef = useRef(false);

  // 預載入圖片
  useEffect(() => {
    menuFrames.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  // 播放動畫（帶有選單顯示/隱藏的回調）
  const playAnimation = (forward: boolean, onFrameCallback?: (frame: number) => void) => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    isAnimatingRef.current = true;

    const startFrame = forward ? 0 : 18;  // 19 幀 (index 0-18)
    const endFrame = forward ? 18 : 0;
    const step = forward ? 1 : -1;
    let frame = startFrame;
    const fps = 30;
    const frameDuration = 1000 / fps;
    let lastTime = performance.now();

    const animate = (time: number) => {
      if (time - lastTime >= frameDuration) {
        setCurrentFrame(frame);

        // 在特定幀觸發回調
        if (onFrameCallback) {
          onFrameCallback(frame);
        }

        lastTime = time;

        if (frame !== endFrame) {
          frame += step;
          animationRef.current = requestAnimationFrame(animate);
        } else {
          isAnimatingRef.current = false;
          animationRef.current = null;
        }
      } else {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  // 設定選單出現/消失的幀數 (可調整)
  const MENU_SHOW_FRAME = 2;  // 開啟時：播放到第幾幀才顯示選單 (0-18)
  const MENU_HIDE_FRAME = 0;  // 關閉時：倒退到第幾幀才隱藏選單 (0-18)

  const toggleMenu = () => {
    if (isAnimatingRef.current) return; // 防止動畫中重複觸發

    if (!isMenuOpen) {
      setIsMenuOpen(true);
      // 正向播放：在指定幀數時顯示選單
      playAnimation(true, (frame) => {
        if (frame === MENU_SHOW_FRAME) {
          // 先顯示選單（opacity 為 0），等 DOM 渲染後再淡入
          setIsMenuVisible(true);
          // 使用 requestAnimationFrame 確保 DOM 已渲染，再觸發淡入動畫
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              setMenuOpacity(1);
            });
          });
        }
      });
    } else {
      // 反向播放：在指定幀數時隱藏選單
      playAnimation(false, (frame) => {
        if (frame === MENU_HIDE_FRAME) {
          setMenuOpacity(0);
          // 等漸出動畫完成後再隱藏
          setTimeout(() => {
            setIsMenuVisible(false);
            setIsMenuOpen(false);
          }, 500);
        }
      });
    }
  };

  // 關閉選單時播放反向動畫
  const closeMenu = () => {
    if (!isMenuOpen || isAnimatingRef.current) return;
    playAnimation(false, (frame) => {
      if (frame === MENU_HIDE_FRAME) {
        setMenuOpacity(0);
        setTimeout(() => {
          setIsMenuVisible(false);
          setIsMenuOpen(false);
        }, 500);
      }
    });
  };

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

        {/* 手機版漢堡按鈕 - PNG 序列動畫 */}
        <button className="navbar-toggle" onClick={toggleMenu} style={{ transform: 'translateY(7px)' }}>
          <img
            src={menuFrames[currentFrame]}
            alt="Menu"
            style={{
              width: '32px',
              height: '32px',
              filter: `
                drop-shadow(0px 0px 1.5px white)
                drop-shadow(0px 0px 1.5px white)
                drop-shadow(0px 0px 1.5px white)
                drop-shadow(0px 0px 1px white)
                drop-shadow(0px 0px 1px white)
              `,
            }}
          />
        </button>

        {/* 手機版下拉選單 */}
        {isMenuVisible && (
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
            borderBottomLeftRadius: '10px',
            opacity: menuOpacity,
            transition: 'opacity 0.5s ease-out',
          }}>
            {allLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                onClick={(e) => {
                  if (link.to === '/') {
                    e.preventDefault();
                    goHome();
                    closeMenu();
                  } else {
                    closeMenu();
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