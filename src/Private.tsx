import { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { useNavigate } from 'react-router-dom';
import Scene from './Scene';
import './Private.css';

// 使用 orientationchange 事件來區分設備旋轉和頁面刷新
// 設備旋轉時會先觸發 orientationchange，然後可能重新載入頁面
const wasRotating = sessionStorage.getItem('privateIsRotating') === 'true';

// 如果不是設備旋轉（沒有 rotating 標記），清除認證狀態
if (!wasRotating) {
  sessionStorage.removeItem('privateAuthenticated');
}
// 清除旋轉標記
sessionStorage.removeItem('privateIsRotating');

// 監聽設備旋轉事件，在旋轉時設置標記
window.addEventListener('orientationchange', () => {
  sessionStorage.setItem('privateIsRotating', 'true');
});

interface Work {
  id: number;
  title: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  // 頂部白色資訊條
  topBar: {
    left: string;    // 左邊文字
    center: string;  // 中間編號（會自動格式化為 001）
    right: string;   // 右邊文字
  };
  // 媒體下方三欄標籤
  mediaLabels: {
    left: string;
    center: string;
    right: string;
  };
  // 描述文字
  description: string;
  // 底部三欄標籤
  bottomLabels: {
    left: string;
    center: string;
    right: string;
  };
}

const CORRECT_PASSWORD = '1234';

// 解析文字標記，支援 [g]灰色文字[/g] 和 \n 換行
function parseStyledText(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // 匹配 [g]...[/g] 標籤和換行符
  const regex = /(\[g\].*?\[\/g\]|\n)/g;
  let lastIndex = 0;
  let match;
  let keyIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    // 添加標籤前的普通文字
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[0] === '\n') {
      // 換行符
      parts.push(<br key={`br-${keyIndex++}`} />);
    } else {
      // [g]...[/g] 灰色文字
      const grayText = match[0].replace(/\[g\]|\[\/g\]/g, '');
      parts.push(
        <span key={`gray-${keyIndex++}`} className="text-gray">
          {grayText}
        </span>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // 添加剩餘的文字
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

// 發光自轉空心方塊元件
function GlowingCube() {
  const meshRef = useRef<THREE.LineSegments>(null!);

  useFrame((_, delta) => {
    if (meshRef.current) {
      // 只在 Y 軸水平自轉
      meshRef.current.rotation.y += delta * 0.5;
    }
  });

  const boxGeometry = new THREE.BoxGeometry(2, 2, 2);
  const edgesGeometry = new THREE.EdgesGeometry(boxGeometry);

  return (
    <lineSegments ref={meshRef} geometry={edgesGeometry} rotation={[-0.3, 0, 0]}>
      <lineBasicMaterial color="#ffffff" toneMapped={false} />
    </lineSegments>
  );
}

// 登入圖示的迷你 Canvas（使用正交攝影機，無透視效果）
function LoginCubeCanvas() {
  return (
    <Canvas
      orthographic
      camera={{ position: [0, 0, 10], zoom: 40 }}
      style={{ background: 'transparent' }}
      gl={{ alpha: true, antialias: true }}
    >
      <ambientLight intensity={0.5} />
      <GlowingCube />
    </Canvas>
  );
}

const privateWorks: Work[] = [
  {
    id: 1,
    title: 'Private Project 1',
    mediaUrl: '/path/to/media1.jpg',
    mediaType: 'image',
    topBar: {
      left: 'Confidential Client A',
      center: '001',
      right: 'Lead VFX Artist',
    },
    mediaLabels: {
      left: 'Confidential Client A',
      center: 'Project Info',
      right: 'Houdini, Nuke, Maya'
    },
    description: '我是無意義的文字內容，我是無意義的文字內容，我是無意義的文字內容，我是無意義的文字內容，我是無意義的文字內容，我是無意義的文字內容，我是無意義的文字內容，我是無意義的文字內容。',
    bottomLabels: {
      left: 'Credits -',
      center: 'Houdini, Nuke\n, M\na\nya',
      right: 'Lead VFX Artist',
    },
  },
  {
    id: 2,
    title: 'Private Project 2',
    mediaUrl: '/path/to/media2.mp4',
    mediaType: 'video',
    topBar: {
      left: 'Confidential Client B',
      center: '002',
      right: 'VFX Supervisor',
    },
    mediaLabels: {
      left: 'Confidential Client B',
      center: 'Project Info',
      right: 'Houdini, Nuke, Maya',
    },
    description: '我是無意義的文字內容，我是無意義的文字內容，我是無意義的文字內容，我是無意義的文字內容，我是無意義的文字內容，我是無意義的文字內容，我是無意義的文字內容，我是無意義的文字內容。',
    bottomLabels: {
      left: 'Credits -',
      center: 'Cinema 4D,\n [g]After Effects[/g]',
      right: 'VFX Supervisor',
    },
  },
  {
    id: 3,
    title: 'Private Project 3',
    mediaUrl: '/path/to/media3.jpg',
    mediaType: 'image',
    topBar: {
      left: 'Confidential Client C',
      center: '003',
      right: 'Technical Artist',
    },
    mediaLabels: {
      left: 'Confidential Client C',
      center: 'Project Info',
      right: 'Houdini, Nuke, Maya',
    },
    description: '我是無意義的文字內容，我是無意義的文字內容，我是無意義的文字內容，我是無意義的文字內容，我是無意義的文字內容，我是無意義的文字內容，我是無意義的文字內容，我是無意義的文字內容。',
    bottomLabels: {
      left: 'Credits -',
      center: 'Unreal Engine, Substance',
      right: 'Technical Artist',
    },
  },
  {
    id: 4,
    title: 'Private Project 4',
    mediaUrl: '/path/to/media4.jpg',
    mediaType: 'image',
    topBar: {
      left: 'Confidential Client D',
      center: '004',
      right: 'Compositor',
    },
    mediaLabels: {
      left: 'Confidential Client D',
      center: 'Project Info',
      right: 'Houdini, Nuke, Maya',
    },
    description: '我是無意義的文字內容，我是無意義的文字內容，我是無意義的文字內容，我是無意義的文字內容，我是無意義的文字內容，我是無意義的文字內容，我是無意義的文字內容，我是無意義的文字內容。',
    bottomLabels: {
      left: 'Credits -',
      center: 'Nuke, Photoshop',
      right: 'Compositor',
    },
  },
  {
    id: 5,
    title: 'Private Project 5',
    mediaUrl: '/path/to/media5.mp4',
    mediaType: 'video',
    topBar: {
      left: 'Confidential Client E',
      center: '005',
      right: '3D Generalist',
    },
    mediaLabels: {
      left: 'Confidential Client E',
      center: 'Project Info',
      right: 'Houdini, Nuke, Maya',
    },
    description: '我是無意義的文字內容，我是無意義的文字內容，我是無意義的文字內容，我是無意義的文字內容，我是無意義的文字內容，我是無意義的文字內容，我是無意義的文字內容，我是無意義的文字內容。',
    bottomLabels: {
      left: 'Credits -',
      center: 'Blender, Houdini, Redshift',
      right: '3D Generalist',
    },
  },
];

function PasswordModal({ onCorrectPassword }: { onCorrectPassword: () => void }) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === CORRECT_PASSWORD) {
      onCorrectPassword();
    } else {
      setError(true);
      setTimeout(() => setError(false), 500);
    }
  };

  const goHome = () => {
    navigate('/');
    window.dispatchEvent(new Event('go-home'));
  };

  return (
    <motion.div
      className="password-modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      {/* 毛玻璃遮罩層 */}
      <motion.div
        className="frosted-overlay"
        exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
        transition={{ duration: 0.6 }}
      ></motion.div>

      {/* 登入內容 - 置中 */}
      <motion.div
        className={`login-content ${error ? 'shake' : ''}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -30, scale: 0.95 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {/* 發光自轉方塊 */}
        <div className="login-cube">
          <LoginCubeCanvas />
        </div>

        {/* 標題 */}
        <h2 className="login-title">Content Hidden</h2>

        {/* 說明文字 */}
        <p className="login-subtitle">Please enter access password</p>

        {/* 密碼輸入表單 */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="password-input-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="password-input"
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              data-form-type="other"
              data-lpignore="true"
              data-1p-ignore="true"
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                // 眼睛打開 (顯示密碼)
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              ) : (
                // 眼睛關閉 (隱藏密碼)
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              )}
            </button>
          </div>

          {error && <p className="error-message">Incorrect password</p>}

          {/* Access Content 按鈕 */}
          <button type="submit" className="access-button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="lock-icon">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 9.9-1" />
            </svg>
            Access Content
          </button>
        </form>

        {/* 返回首頁 */}
        <button className="back-home" onClick={goHome}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Home
        </button>
      </motion.div>
    </motion.div>
  );
}

function Card3D({ work, cardIndex, isMobile, isLandscapeTablet, isPortraitTablet }: {
  work: Work;
  cardIndex: number;
  isMobile: boolean;
  isLandscapeTablet: boolean;
  isPortraitTablet: boolean;
}) {
  // 根據設備類型設定卡片尺寸
  let cardHeight = 'calc(100vh - 125px)';
  let cardWidth = '90vw';
  let cardMaxWidth = '800px';
  let meshY = -0.04;
  let distanceFactor = 1.2;

  if (isLandscapeTablet) {
    cardHeight = '110vh';
    cardWidth = '100vw';
    cardMaxWidth = '600px';
    meshY = -0.4;
    distanceFactor = 1.5;
  } else if (isPortraitTablet) {
    cardHeight = 'calc(100vh - 125px)';
    cardWidth = '85vw';
    cardMaxWidth = '700px';
    meshY = -0.04;
    distanceFactor = 1.2;
  } else if (isMobile) {
    cardWidth = '95vw';
    cardMaxWidth = '100%';
    distanceFactor = 1.2;
  }

  return (
    <mesh position={[cardIndex * 2.5, meshY, 0]}>
      <planeGeometry args={[4, 5.66]} />
      <meshBasicMaterial transparent opacity={0} />
      <Html
        transform
        distanceFactor={distanceFactor}
        center
        zIndexRange={[50, 0]}
        style={{
          width: cardWidth,
          maxWidth: cardMaxWidth,
          height: cardHeight,
          maxHeight: '1200px',
          pointerEvents: 'auto',
        }}
      >
        <div className="card-3d-content">
          {/* 頂部區域：Logo 和 資訊條 */}
          <div className="card-header">
            {/* 左上角 Logo */}
            <div className="card-logo">Domo</div>

            {/* 右上角資訊條 */}
            <div className="card-info-bar">
              <span className="info-left">{work.topBar.left}</span>
              <span className="info-center">{work.topBar.center}</span>
              <span className="info-right">{work.topBar.right}</span>
            </div>
          </div>

          {/* 間隔區域 */}
          <div className="card-spacer"></div>

          {/* 標題 - 靠左對齊 */}
          <h2 className="card-title">{work.title}</h2>

          {/* 媒體內容 */}
          <div className="card-media">
            {work.mediaType === 'video' ? (
              <video src={work.mediaUrl} controls loop muted playsInline className="media-element" />
            ) : (
              <img src={work.mediaUrl} alt={work.title} className="media-element" />
            )}
          </div>

          {/* 媒體下方三欄標籤列 */}
          <div className="card-labels-row">
            <span className="label-left">{parseStyledText(work.mediaLabels.left)}</span>
            <span className="label-center">{parseStyledText(work.mediaLabels.center)}</span>
            <span className="label-right">{parseStyledText(work.mediaLabels.right)}</span>
          </div>

          {/* 描述區域 */}
          <div className="card-description-area">
            <div className="desc-spacer"></div>
            <div className="desc-content">
              {parseStyledText(work.description)}
            </div>
          </div>

          {/* 底部三欄標籤列 */}
          <div className="card-labels-row card-labels-bottom">
            <span className="label-left">{parseStyledText(work.bottomLabels.left)}</span>
            <span className="label-center">{parseStyledText(work.bottomLabels.center)}</span>
            <span className="label-right">{parseStyledText(work.bottomLabels.right)}</span>
          </div>
        </div>
      </Html>
    </mesh>
  );
}

function CameraController({ currentIndex }: { currentIndex: number }) {
  const { camera } = useThree();

  useFrame((_state, delta) => {
    const targetX = currentIndex * 2.5;
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, delta * 5);
  });

  return null;
}

function CardsScene({ currentIndex, isMobile, isLandscapeTablet, isPortraitTablet }: { currentIndex: number; isMobile: boolean; isLandscapeTablet: boolean; isPortraitTablet: boolean }) {
  return (
    <>
      <CameraController currentIndex={currentIndex} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={0.5} />
      {privateWorks.map((work, index) => (
        <Card3D
          key={work.id}
          work={work}
          cardIndex={index}
          isMobile={isMobile}
          isLandscapeTablet={isLandscapeTablet}
          isPortraitTablet={isPortraitTablet}
        />
      ))}
    </>
  );
}

export default function Private() {
  // 從 sessionStorage 讀取認證狀態（模組載入時已處理頁面刷新邏輯）
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('privateAuthenticated') === 'true';
  });
  const [isTransitioning, setIsTransitioning] = useState(false); // 過渡動畫狀態
  const [showContent, setShowContent] = useState(() => {
    return sessionStorage.getItem('privateAuthenticated') === 'true';
  }); // 顯示卡片內容
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isLandscapeTablet, setIsLandscapeTablet] = useState(
    window.innerWidth > 768 && window.innerWidth <= 1400 && window.innerHeight < window.innerWidth
  );
  const [isPortraitTablet, setIsPortraitTablet] = useState(
    window.innerWidth > 768 && window.innerWidth <= 1400 && window.innerHeight > window.innerWidth
  );

  // 監聽螢幕尺寸變化
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      setIsLandscapeTablet(
        window.innerWidth > 768 && window.innerWidth <= 1400 && window.innerHeight < window.innerWidth
      );
      setIsPortraitTablet(
        window.innerWidth > 768 && window.innerWidth <= 1400 && window.innerHeight > window.innerWidth
      );
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [triggerReverse, setTriggerReverse] = useState(() => {
    return sessionStorage.getItem('privateAuthenticated') === 'true';
  }); // 倒帶動畫觸發

  const handlePasswordCorrect = () => {
    // 儲存認證狀態到 sessionStorage
    sessionStorage.setItem('privateAuthenticated', 'true');

    // 開始過渡動畫
    setIsTransitioning(true);

    // 延遲後切換到已認證狀態（讓登入畫面先淡出）
    setTimeout(() => {
      setIsAuthenticated(true);
    }, 600);

    // 再延遲後顯示卡片內容（等方塊聚集動畫完成）
    setTimeout(() => {
      setShowContent(true);
    }, 2000);

    // 方塊聚集動畫完成後，觸發倒帶動畫（等待 3.5 秒確保動畫完成）
    setTimeout(() => {
      setTriggerReverse(true);
    }, 3500);
  };

  const handleNext = () => {
    if (currentIndex < privateWorks.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    if (e.deltaY > 0) {
      handleNext();
    } else if (e.deltaY < 0) {
      handlePrev();
    }
  };

  // 觸控滑動支援
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isSwiping = useRef(false);

  const handleTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isSwiping.current = false;
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;

    const deltaX = e.touches[0].clientX - touchStartX.current;
    const deltaY = e.touches[0].clientY - touchStartY.current;

    // 判斷是否為水平滑動（水平移動距離大於垂直移動距離）
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 30) {
      e.preventDefault(); // 阻止頁面捲動
      isSwiping.current = true;
    }
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (touchStartX.current === null || !isSwiping.current) {
      touchStartX.current = null;
      touchStartY.current = null;
      return;
    }

    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const swipeThreshold = 50; // 滑動閾值

    if (deltaX < -swipeThreshold) {
      // 向左滑動 -> 下一張
      handleNext();
    } else if (deltaX > swipeThreshold) {
      // 向右滑動 -> 上一張
      handlePrev();
    }

    touchStartX.current = null;
    touchStartY.current = null;
    isSwiping.current = false;
  };

  useEffect(() => {
    if (isAuthenticated) {
      window.addEventListener('wheel', handleWheel, { passive: false });
      window.addEventListener('touchstart', handleTouchStart, { passive: true });
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd, { passive: true });
      return () => {
        window.removeEventListener('wheel', handleWheel);
        window.removeEventListener('touchstart', handleTouchStart);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isAuthenticated, currentIndex]);

  return (
    <>
      {/* 登入畫面時使用首頁的飄動方塊效果，認證後使用作品集模式 */}
      <Scene
        initialPortfolioMode={false}
        enableHomeUI={false}
        triggerPortfolioAnimation={isTransitioning}
        triggerReverseAnimation={triggerReverse}
      />

      <AnimatePresence>
        {!isAuthenticated && (
          <PasswordModal onCorrectPassword={handlePasswordCorrect} />
        )}
      </AnimatePresence>

      {isAuthenticated && (
        <>
          <motion.div
            className="private-3d-container"
            initial={{ x: '100%' }}
            animate={{ x: showContent ? 0 : '100%' }}
            transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <Canvas camera={{
              position: [0, 0, isMobile ? 2.5 : 4],
              fov: isMobile ? 40 : 50
            }}>
              <CardsScene currentIndex={currentIndex} isMobile={isMobile} isLandscapeTablet={isLandscapeTablet} isPortraitTablet={isPortraitTablet} />
            </Canvas>
          </motion.div>

          {/* Navigation 和 Pagination 移到 Canvas 外部，避免被 Html 元件覆蓋 */}
          <motion.div
            className="navigation-arrows"
            initial={{ opacity: 0 }}
            animate={{ opacity: showContent ? 1 : 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <button
              className="arrow-btn arrow-left"
              onClick={handlePrev}
              disabled={currentIndex === 0}
            >
              ‹
            </button>
            <button
              className="arrow-btn arrow-right"
              onClick={handleNext}
              disabled={currentIndex === privateWorks.length - 1}
            >
              ›
            </button>
          </motion.div>

          <motion.div
            className="pagination-dots"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: showContent ? 1 : 0, y: showContent ? 0 : 20 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            {privateWorks.map((_, index) => (
              <div
                key={index}
                className={`nav-node ${index === currentIndex ? 'active' : ''}`}
                onClick={() => setCurrentIndex(index)}
              />
            ))}
          </motion.div>
        </>
      )}
    </>
  );
}
