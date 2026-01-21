import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import Scene from './Scene';
import headshotWebp from '../media/webp/headshot.webp';
import './Profile.css';

export default function Profile() {
  const containerRef = useRef<HTMLDivElement>(null);

  // 頁面載入時滾動到最上方
  useEffect(() => {
    // 禁用瀏覽器的自動滾動恢復功能
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    // 使用 ref 直接控制滾動
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }

    return () => {
      // 組件卸載時恢復自動滾動恢復
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'auto';
      }
    };
  }, []);

  return (
    <>
      {/* 進入 Profile 頁面時，使用漂浮方塊背景，並隱藏首頁 UI */}
      <Scene enableHomeUI={false} />

      <div ref={containerRef} className="profile-container">
        <motion.div
          className="profile-card"
          initial={{ opacity: 1, scale: 0.95 }} // 保持可見但稍微縮小
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.0, duration: 0.8, ease: "easeOut" }} // 延遲 1 秒，等方塊牆組建好再浮現
        >
          {/* 左側欄位：照片與基本資料（手機版只包含照片、標題、簡介） */}
          <div className="profile-left-col profile-left-col-card">
            {/* 照片區塊 */}
            <motion.div
              className="profile-image-wrapper"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <img src={headshotWebp} alt="Profile" className="profile-image" />
            </motion.div>

            <h1>Domo</h1>
            <p className="subtitle">Visual Artist / Director of Photography</p>

            {/* 手機板的簡化介紹 */}
            <div className="simplified-biography hide-on-desktop">
              <p>
              影像創作者，擅長攝影、剪輯、3D動畫與視覺特效。致力於透過影像美學與技術，創造富有敘事性與溝通效率的視覺作品。
              </p>
            </div>

            {/* 桌面版的 CONTACT */}
            <div className="contact-info-wrapper hide-on-mobile">
              <div className="contact-section">
                <h3>CONTACT</h3>
                <p>
                  Taipei, Taiwan<br />
                  domogod123@gmail.com<br />
                </p>
              </div>
              {/* --- 圖標區域 --- */}
              <div className="social-icons">

                {/* Instagram */}
                <a href="https://www.instagram.com/domo___x/" target="_blank" rel="noopener noreferrer" className="social-icon">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                  </svg>
                </a>

                {/* LINE - 使用 SVG 或 簡單文字圖標 */}
                <a href="https://line.me/ti/p/Lgktej1ZAN" target="_blank" rel="noopener noreferrer" className="social-icon">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="28"
                    height="28"
                    viewBox="0 0 256 256"
                  >
                    <g fill="#ffffff" fillRule="nonzero">
                      <g transform="scale(5.12,5.12)">
                        <path d="M9,4c-2.76,0 -5,2.24 -5,5v32c0,2.76 2.24,5 5,5h32c2.76,0 5,-2.24 5,-5v-32c0,-2.76 -2.24,-5 -5,-5zM25,11c8.27,0 15,5.35922 15,11.94922c0,2.63 -1.0407,5.01156 -3.2207,7.35156c-1.57,1.78 -4.11875,3.73938 -6.46875,5.35938c-2.35,1.6 -4.51055,2.85945 -5.31055,3.18945c-0.32,0.13 -0.56,0.18945 -0.75,0.18945c-0.66,0 -0.60078,-0.69828 -0.55078,-0.98828c0.04,-0.22 0.2207,-1.26172 0.2207,-1.26172c0.05,-0.37 0.09922,-0.95813 -0.05078,-1.32812c-0.17,-0.41 -0.84008,-0.6207 -1.33008,-0.7207c-7.2,-0.94 -12.53906,-5.89101 -12.53906,-11.79102c0,-6.59 6.73,-11.94922 15,-11.94922zM23.99219,18.99805c-0.50381,0.00935 -0.99219,0.39383 -0.99219,1.00195v6c0,0.552 0.448,1 1,1c0.552,0 1,-0.448 1,-1v-2.87891l2.18555,3.45898c0.566,0.792 1.81445,0.39292 1.81445,-0.58008v-6c0,-0.552 -0.448,-1 -1,-1c-0.552,0 -1,0.448 -1,1v3l-2.18555,-3.58008c-0.21225,-0.297 -0.51998,-0.42748 -0.82227,-0.42187zM15,19c-0.552,0 -1,0.448 -1,1v6c0,0.552 0.448,1 1,1h3c0.552,0 1,-0.448 1,-1c0,-0.552 -0.448,-1 -1,-1h-2v-5c0,-0.552 -0.448,-1 -1,-1zM21,19c-0.552,0 -1,0.448 -1,1v6c0,0.552 0.448,1 1,1c0.552,0 1,-0.448 1,-1v-6c0,-0.552 -0.448,-1 -1,-1zM31,19c-0.552,0 -1,0.448 -1,1v6c0,0.552 0.448,1 1,1h3c0.552,0 1,-0.448 1,-1c0,-0.552 -0.448,-1 -1,-1h-2v-1h2c0.553,0 1,-0.448 1,-1c0,-0.552 -0.447,-1 -1,-1h-2v-1h2c0.552,0 1,-0.448 1,-1c0,-0.552 -0.448,-1 -1,-1z"></path>
                      </g>
                    </g>
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* 右側欄位：詳細履歷 */}
          <div className="profile-right-col">

            {/* 學歷 */}
            <div className="profile-section">
              <h2>EDUCATION</h2>
              <div className="education-item">
                <h3>國立台南藝術大學</h3>
                <p>動畫藝術與影像美學研究所 | Master's Degree</p>
              </div>
            </div>

            {/* 專長 (標籤式排版) */}
            <div className="profile-section">
              <h2>EXPERTISE</h2>
              <div className="expertise-tags">
                {['動態攝影', '調光調色', '剪輯', '3D建模', '動畫製作'].map((skill, i) => (
                  <motion.span
                    key={skill}
                    className="expertise-tag"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 + 1.2 }}
                  >
                    {skill}
                  </motion.span>
                ))}
              </div>
            </div>

            {/* 軟體技能 (動態進度條) */}
            <div className="profile-section">
              <h2>SOFTWARE</h2>
              <div className="software-skills-grid">
                {[
                  { name: 'DaVinci Resolve', val: 4.5 },
                  { name: 'After Effects', val: 4 },
                  { name: 'Premiere Pro', val: 4 },
                  { name: 'Photoshop', val: 4 },
                  { name: 'Lightroom', val: 4 },
                  { name: 'Blender', val: 4 },
                  { name: 'Unity', val: 3 },
                ].map((item) => (
                  <div key={item.name}>
                    <div className="skill-item-info">
                      <span>{item.name}</span>
                      <span>{item.val}</span>
                    </div>
                    <div className="skill-progress-bar">
                      <motion.div
                        className="skill-progress"
                        initial={{ width: 0 }}
                        whileInView={{ width: `${(item.val / 5) * 100}%` }}
                        transition={{ duration: 3.0, delay: 1.8, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 自傳 */}
            <div className="biography desktop-biography">
              <h2>BIOGRAPHY</h2>
              <p>
                我是一名從事影像拍攝與剪輯的創作者，關注影像作為媒介所能呈現與其視界之外的邊界。結合影像美學的學術訓練與實務經驗，我逐步建立對影像結構、敘事條件與觀看經驗之間關係的理解。
                <br /><br />
                在實務製作中，我同時進行動態影像拍攝、剪輯，以及 3D 建模、動畫與視覺特效製作，並將色彩視為影像組織的重要元素。透過色彩管理與節奏控制，將概念轉化為清楚且具溝通效率的影像成果，以回應實際商業需求。
              </p>
            </div>

          </div>
        </motion.div>

        {/* 手機版的右側欄位 - 在框外 */}
        <div className="profile-right-col-mobile hide-on-desktop">
          <div className="profile-section">
            <h2>EDUCATION</h2>
            <div className="education-item">
              <h3>國立台南藝術大學</h3>
              <p>動畫藝術與影像美學研究所<br />Master's Degree</p>
            </div>
          </div>

          <div className="profile-section">
            <h2>EXPERTISE</h2>
            <div className="expertise-tags">
              {['動態攝影', '調光調色', '剪輯', '3D建模', '動畫製作'].map((skill, i) => (
                <motion.span
                  key={skill}
                  className="expertise-tag"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                >
                  {skill}
                </motion.span>
              ))}
            </div>
          </div>

          <div className="profile-section">
            <h2>SOFTWARE</h2>
            <div className="software-skills-grid">
              {[
                { name: 'DaVinci Resolve', val: 4.5 },
                { name: 'After Effects', val: 4 },
                { name: 'Premiere Pro', val: 4 },
                { name: 'Photoshop', val: 4 },
                { name: 'Lightroom', val: 4 },
                { name: 'Blender', val: 4 },
                { name: 'Unity', val: 3 },
              ].map((item) => (
                <div key={item.name}>
                  <div className="skill-item-info">
                    <span>{item.name}</span>
                    <span>{item.val}</span>
                  </div>
                  <div className="skill-progress-bar">
                    <motion.div
                      className="skill-progress"
                      initial={{ width: 0 }}
                      whileInView={{ width: `${(item.val / 5) * 100}%` }}
                      viewport={{ once: true, amount: 0.3 }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 手機版的 CONTACT - 在框外，放在最下方 */}
        <div className="contact-info-wrapper-mobile hide-on-desktop">
          <div className="contact-section">
            <h3>CONTACT</h3>
            <p>
              Taipei, Taiwan<br />
              domogod123@gmail.com<br />
            </p>
          </div>
          <div className="social-icons">
            <a href="https://www.instagram.com/domo___x/" target="_blank" rel="noopener noreferrer" className="social-icon" tabIndex={-1}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
            </a>
            <a href="https://line.me/ti/p/Lgktej1ZAN" target="_blank" rel="noopener noreferrer" className="social-icon" tabIndex={-1}>
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 256 256">
                <g fill="#ffffff" fillRule="nonzero">
                  <g transform="scale(5.12,5.12)">
                    <path d="M9,4c-2.76,0 -5,2.24 -5,5v32c0,2.76 2.24,5 5,5h32c2.76,0 5,-2.24 5,-5v-32c0,-2.76 -2.24,-5 -5,-5zM25,11c8.27,0 15,5.35922 15,11.94922c0,2.63 -1.0407,5.01156 -3.2207,7.35156c-1.57,1.78 -4.11875,3.73938 -6.46875,5.35938c-2.35,1.6 -4.51055,2.85945 -5.31055,3.18945c-0.32,0.13 -0.56,0.18945 -0.75,0.18945c-0.66,0 -0.60078,-0.69828 -0.55078,-0.98828c0.04,-0.22 0.2207,-1.26172 0.2207,-1.26172c0.05,-0.37 0.09922,-0.95813 -0.05078,-1.32812c-0.17,-0.41 -0.84008,-0.6207 -1.33008,-0.7207c-7.2,-0.94 -12.53906,-5.89101 -12.53906,-11.79102c0,-6.59 6.73,-11.94922 15,-11.94922zM23.99219,18.99805c-0.50381,0.00935 -0.99219,0.39383 -0.99219,1.00195v6c0,0.552 0.448,1 1,1c0.552,0 1,-0.448 1,-1v-2.87891l2.18555,3.45898c0.566,0.792 1.81445,0.39292 1.81445,-0.58008v-6c0,-0.552 -0.448,-1 -1,-1c-0.552,0 -1,0.448 -1,1v3l-2.18555,-3.58008c-0.21225,-0.297 -0.51998,-0.42748 -0.82227,-0.42187zM15,19c-0.552,0 -1,0.448 -1,1v6c0,0.552 0.448,1 1,1h3c0.552,0 1,-0.448 1,-1c0,-0.552 -0.448,-1 -1,-1h-2v-5c0,-0.552 -0.448,-1 -1,-1zM21,19c-0.552,0 -1,0.448 -1,1v6c0,0.552 0.448,1 1,1c0.552,0 1,-0.448 1,-1v-6c0,-0.552 -0.448,-1 -1,-1zM31,19c-0.552,0 -1,0.448 -1,1v6c0,0.552 0.448,1 1,1h3c0.552,0 1,-0.448 1,-1c0,-0.552 -0.448,-1 -1,-1h-2v-1h2c0.553,0 1,-0.448 1,-1c0,-0.552 -0.447,-1 -1,-1h-2v-1h2c0.552,0 1,-0.448 1,-1c0,-0.552 -0.448,-1 -1,-1z"></path>
                  </g>
                </g>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </>
  );
}