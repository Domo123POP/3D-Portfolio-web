import { useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import Scene from './Scene';
import './Private.css';

interface WorkSection {
  label: string;
  content: string;
}

interface Work {
  id: number;
  title: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  sections: WorkSection[];
}

const CORRECT_PASSWORD = '1234';

const privateWorks: Work[] = [
  {
    id: 1,
    title: 'Private Project 1',
    mediaUrl: '/path/to/media1.jpg',
    mediaType: 'image',
    sections: [
      { label: 'Client', content: 'Confidential Client A' },
      { label: 'Role', content: 'Lead VFX Artist' },
      { label: 'Description', content: 'Detailed description of the private project...' },
      { label: 'Tools', content: 'Houdini, Nuke, Maya' },
    ]
  },
  {
    id: 2,
    title: 'Private Project 2',
    mediaUrl: '/path/to/media2.mp4',
    mediaType: 'video',
    sections: [
      { label: 'Client', content: 'Confidential Client B' },
      { label: 'Role', content: 'VFX Supervisor' },
      { label: 'Description', content: 'Another private project description...' },
      { label: 'Tools', content: 'Cinema 4D, After Effects' },
    ]
  },
  {
    id: 3,
    title: 'Private Project 3',
    mediaUrl: '/path/to/media3.jpg',
    mediaType: 'image',
    sections: [
      { label: 'Client', content: 'Confidential Client C' },
      { label: 'Role', content: 'Technical Artist' },
      { label: 'Description', content: 'Third private project details...' },
      { label: 'Tools', content: 'Unreal Engine, Substance' },
    ]
  },
  {
    id: 4,
    title: 'Private Project 4',
    mediaUrl: '/path/to/media4.jpg',
    mediaType: 'image',
    sections: [
      { label: 'Client', content: 'Confidential Client D' },
      { label: 'Role', content: 'Compositor' },
      { label: 'Description', content: 'Fourth project information...' },
      { label: 'Tools', content: 'Nuke, Photoshop' },
    ]
  },
  {
    id: 5,
    title: 'Private Project 5',
    mediaUrl: '/path/to/media5.mp4',
    mediaType: 'video',
    sections: [
      { label: 'Client', content: 'Confidential Client E' },
      { label: 'Role', content: '3D Generalist' },
      { label: 'Description', content: 'Fifth project overview...' },
      { label: 'Tools', content: 'Blender, Houdini, Redshift' },
    ]
  },
];

function PasswordModal({ onCorrectPassword }: { onCorrectPassword: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === CORRECT_PASSWORD) {
      onCorrectPassword();
    } else {
      setError(true);
      setTimeout(() => setError(false), 500);
    }
  };

  return (
    <motion.div
      className="password-modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className={`password-modal-cube ${error ? 'shake' : ''}`}
        initial={{ scale: 0, rotateY: 0 }}
        animate={{ scale: 1, rotateY: 360 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        <div className="cube-face cube-front">
          <h2>Private Portfolio</h2>
          <form onSubmit={handleSubmit}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter Password"
              className="password-input"
              autoFocus
            />
            <button type="submit" className="password-submit">
              Enter
            </button>
          </form>
          {error && <p className="error-message">Incorrect password</p>}
        </div>
      </motion.div>
    </motion.div>
  );
}

function Card3D({ work, cardIndex }: {
  work: Work;
  cardIndex: number;
}) {
  return (
    <mesh position={[cardIndex * 2.5, 0, 0]}>
      <planeGeometry args={[4, 5.66]} />
      <meshBasicMaterial transparent opacity={0} />
      <Html
        transform
        distanceFactor={1.2}
        style={{
          width: '90vw',
          maxWidth: '800px',
          height: 'calc(100vh - 120px)',
          maxHeight: '1130px',
          pointerEvents: 'auto',
        }}
      >
        <div className="card-3d-content">
          <h2 className="card-title">{work.title}</h2>

          <div className="card-media">
            {work.mediaType === 'video' ? (
              <video src={work.mediaUrl} controls loop muted playsInline className="media-element" />
            ) : (
              <img src={work.mediaUrl} alt={work.title} className="media-element" />
            )}
          </div>

          <div className="card-sections">
            {work.sections.map((section, idx) => (
              <div key={idx} className="section-row">
                <div className="section-label">{section.label}</div>
                <div className="section-content">{section.content}</div>
              </div>
            ))}
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

function CardsScene({ currentIndex }: { currentIndex: number }) {
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
        />
      ))}
    </>
  );
}

export default function Private() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePasswordCorrect = () => {
    setIsAuthenticated(true);
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

  useEffect(() => {
    if (isAuthenticated) {
      window.addEventListener('wheel', handleWheel, { passive: false });
      return () => window.removeEventListener('wheel', handleWheel);
    }
  }, [isAuthenticated, currentIndex]);

  return (
    <>
      <Scene initialPortfolioMode={true} enableHomeUI={false} />

      <AnimatePresence>
        {!isAuthenticated && (
          <PasswordModal onCorrectPassword={handlePasswordCorrect} />
        )}
      </AnimatePresence>

      {isAuthenticated && (
        <div className="private-3d-container">
          <Canvas camera={{ position: [0, 0, 4], fov: 50 }}>
            <CardsScene currentIndex={currentIndex} />
          </Canvas>

          <div className="navigation-arrows">
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
          </div>

          <div className="pagination-dots">
            {privateWorks.map((_, index) => (
              <div
                key={index}
                className={`nav-node ${index === currentIndex ? 'active' : ''}`}
                onClick={() => setCurrentIndex(index)}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
