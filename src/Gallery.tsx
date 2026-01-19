import { useRef, Suspense, useState, useEffect, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Plane, useTexture, useVideoTexture, Text, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { EffectComposer, Noise, Bloom, Vignette } from '@react-three/postprocessing';
import './Gallery.css';

// --- ADJUSTABLE CONFIGURATION AREA ---
const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const alphaMapResolution = isMobileDevice ? 150 : 300; // Lower resolution for mobile
const initialViewOpacity = 0.5; // Opacity for all frames in the initial overview

// 手機版專屬：特寫某個 frame 時，其他 frame 的暗度（數值越小越暗，範圍 0.0-1.0）
const mobileUnfocusedFrameOpacity = 0.2; // 預設 0.04，可調整為 0.1、0.2 等讓其他 frame 更明顯

// --- Alpha Map Caching ---
const alphaMapCache = new Map<string, THREE.CanvasTexture>();
const getAlphaMap = (width: number, height: number, cornerRadiusFactor: number = 0.1): THREE.CanvasTexture => {
    const key = `${width}x${height}r${cornerRadiusFactor}`;
    if (alphaMapCache.has(key)) {
        return alphaMapCache.get(key)!;
    }

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
        const dummyCanvas = document.createElement('canvas');
        dummyCanvas.width = 1;
        dummyCanvas.height = 1;
        return new THREE.CanvasTexture(dummyCanvas);
    }
    
    const scaledWidth = width * alphaMapResolution;
    const scaledHeight = height * alphaMapResolution;
    const cornerRadius = cornerRadiusFactor * Math.min(scaledWidth, scaledHeight);

    canvas.width = scaledWidth;
    canvas.height = scaledHeight;

    context.fillStyle = 'black';
    context.fillRect(0, 0, scaledWidth, scaledHeight);
    context.fillStyle = 'white';
    context.beginPath();
    context.moveTo(cornerRadius, 0);
    context.lineTo(scaledWidth - cornerRadius, 0);
    context.quadraticCurveTo(scaledWidth, 0, scaledWidth, cornerRadius);
    context.lineTo(scaledWidth, scaledHeight - cornerRadius);
    context.quadraticCurveTo(scaledWidth, scaledHeight, scaledWidth - cornerRadius, scaledHeight);
    context.lineTo(cornerRadius, scaledHeight);
    context.quadraticCurveTo(0, scaledHeight, 0, scaledHeight - cornerRadius);
    context.lineTo(0, cornerRadius);
    context.quadraticCurveTo(0, 0, cornerRadius, 0);
    context.closePath();
    context.fill();
    
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    alphaMapCache.set(key, tex);
    return tex;
};


interface FrameData {
  id: number;
  position: [number, number, number];
  width: number;
  height: number;
  scale?: number;
  focusDistance?: number;
  textureUrl: string;
  highResTextureUrl: string;
  title: string;
  description: string;
  videoUrl?: string;
  // 手機版專屬設定
  mobilePosition?: [number, number, number];
  mobileScale?: number;
  mobileFocusDistance?: number;
}

const framesData: FrameData[] = [
  {
    id: 0,
    position: [0, 0, 0],
    width: 3.2, height: 1.33,
    scale: 1.0, // Optional: Controls the size of the frame, defaults to 1
    focusDistance: 2.8, // Optional: Distance from camera when focused, defaults to global value
    textureUrl: '/video/megrez.mp4',
    highResTextureUrl: '/video/megrez.mp4',
    title: 'Music Video Direction | Megrez - 《北斗》',
    description: '導演 / 拍攝 / 剪輯 / 調色\n\n負責全片視覺統籌。針對饒舌音樂節奏，\n運用大量動態運鏡與色彩對比，強化藝人個人特質與形象。',
    videoUrl: 'https://vimeo.com/1154526952?share=copy&fl=sv&fe=ci', // Example YouTube URL
    // 手機版設定
    mobilePosition: [0, 0, 0],
    mobileScale: 0.5,
    mobileFocusDistance: 2.8,
  },
  {
    id: 1,
    position: [2.5, 2.0, -2],
    width: 2.5, height: 1.4,
    textureUrl: '/video/flash_cube.mp4',
    highResTextureUrl: '/video/flash_cube.mp4',
    title: 'Zen.V Bot Qi2.2 Fast Charger',
    description: '3D建模 / 動畫 / 剪輯\n\n針對嘖嘖募資平台產品製作的視覺形象片，\n進行了產品3D重建，透過數位動畫的技術，渲染出實拍無法達成的畫面。',
    videoUrl: 'https://www.youtube.com/watch?v=70F8bLD_H4U',
    // 手機版設定
    mobilePosition: [1.5, 1.3, -2],
    mobileScale: 0.7,
    mobileFocusDistance: 3.0,
  },
  {
    id: 2,
    position: [-3.2, -1.7, -1],
    width: 1.5, height: 2.1,
    textureUrl: '/png/blackmarket-poster.png',
    highResTextureUrl: '/png/blackmarket-poster.png',
    title: 'Brand Identity | Black Market Bar',
    description: '插畫 / 品牌識別設計\n\n為「私有市場」酒吧打造品牌視覺體系。\n從主視覺、活動海報到菜單裝幀設計，\n以獨特的視覺語彙詮釋品牌神祕調性，建立強烈的感官識別。',
    // 手機版設定
    mobilePosition: [-1.45, -2.3, -1],
    mobileScale: 0.6,
    mobileFocusDistance: 3.0,
  },
  {
    id: 3,
    position: [3.2, -2.2, -1],
    width: 2.5, height: 1.65,
    textureUrl: '/jpg/skmt-1.jpg',
    highResTextureUrl: '/jpg/skmt-1.jpg',
    title: 'skmt: 坂本龍一とは誰か',
    description: '書籍攝影\n\n運用極簡光影佈局，捕捉特種紙張紋理與裝幀細節，\n在影像中還原靜謐感與藝術張力。',
    // 手機版設定
    mobilePosition: [0.45, -2.35, -1],
    mobileScale: 0.6,
    mobileFocusDistance: 3.0,
  },
  {
    id: 4,
    position: [-2.5, 0.5, 0.3],
    width: 1.6, height: 0.9,
    scale: 1.0,
    focusDistance: 1.8,
    textureUrl: '/jpg/mirror_of_life.jpg',
    highResTextureUrl: '/video/mirror_of_life.mp4',
    title: 'Mirror of Life：職涯之鏡',
    description: '動態拍攝 / 產品攝影 / 剪輯\n\n為嘖嘖募資產品《職涯之鏡》製作產品形象影片。\n透過光影流動呈現溫暖調性，將其「職涯探索」與「諮商」的概念，轉化為具有共鳴的感官語彙。',
    videoUrl: 'https://youtu.be/A-fgp5iu2ik?si=s0obF5EcXCzHRUnG',
    // 手機版設定
    mobilePosition: [-0.2, 0.8, -0.2],
    mobileScale: 0.55,
    mobileFocusDistance: 1.8,
  },
  {
    id: 5,
    position: [5, -0.6, -3],
    width: 1.6, height: 0.9,
    scale: 2,
    focusDistance: 2.8,
    textureUrl: '/jpg/duduba-1.jpg',
    highResTextureUrl: '/video/duduba.mp4',
    title: 'DUDUBAO：磁力片教具套組',
    description: '動態攝影 / 後期剪輯\n\n負責嘖嘖募資影像製作，具備兒童實場拍攝經驗，能有效捕捉不受控現場的自然瞬間。\n專案中著重產品色彩還原的準確性，並結合動態字卡與特效設計，\n將繁複的數理教具 logique 視覺化，呈現具備專業度與功能說服力的影像內容。',
    videoUrl: 'https://www.youtube.com/watch?v=MarAh60dR_I',
    // 手機版設定
    mobilePosition: [0.3, 3.0, -3],
    mobileScale: 1.2,
    mobileFocusDistance: 2.8,
  },
  {
    id: 6,
    position: [-3, 4, -4],
    width: 3.2, height: 1.8,
    scale: 1.3,
    focusDistance: 4.3,
    textureUrl: '/png/ar-1.png',
    highResTextureUrl: '/png/ar-1.png',
    title: '《穿越真實的邊界》 | On the Edge of Reality ',
    description: '3D建模 / AR技術應用 / APP開發\n\n為無獨有偶劇團與德國圖賓根形體劇團於台中國家歌劇院之跨國製作打造互動體驗。\n負責懸絲偶之 3D 建模與 AR 應用程式開發，將虛擬技術注入傳統偶戲，\n在國家級舞台上實現虛實交錯的當代劇場視覺。',
    // 手機版設定
    mobilePosition: [1.45, -1.5, -2.7],
    mobileScale: 0.7,
    mobileFocusDistance: 4.3,
  },
  {
    id: 7,
    position: [0.7, 3, -3],
    width: 2, height: 2,
    scale: 1.7,
    focusDistance: 2.8,
    textureUrl: '/png/skart-1.png',
    highResTextureUrl: '/png/skart-1.png',
    title: 'Graphic Design | Skart Skate Brand',
    description: '圖像設計 / 印刷監修 / 熱轉印實作\n\n為 Skart 滑板品牌設計系列服飾圖像。經由多方廠商諮詢與打樣測試，\n最終採用熱壓工藝自行印製，以掌握圖像在織品上的細節與色彩表現，\n實現從概念開發到成品製作的完整流程，確保設計調性精準轉化為實體。',
    // 手機版設定
    mobilePosition: [-1.15, 0.65, 0.1],
    mobileScale: 1.0,
    mobileFocusDistance: 2.8,
  },
  {
    id: 8,
    position: [5.5, 2.8, -2],
    width: 1.6, height: 0.9,
    scale: 2,
    focusDistance: 3.5,
    textureUrl: '/png/Porco_Rosso.png',
    highResTextureUrl: '/video/Porco_Rosso.mp4',
    title: 'Hotel Adriano - Porco Rosso',
    description: '場景還原 / 剪輯\n\n以 Minecraft 為載體，還原吉卜力經典動畫《紅豬》中的「吉娜旅店」。\n透過方塊構築與虛擬運鏡，在遊戲世界中再現亞得里亞海的浪漫氛圍，\n將動畫中的手繪空間轉譯為可穿梭的數位場景。',
    videoUrl: 'https://www.youtube.com/watch?v=j_A-UjwMQ5U',
    // 手機版設定
    mobilePosition: [5.5, 2.8, -2],
    mobileScale: 1.05,
    mobileFocusDistance: 3.5,
  },
  {
    id: 9,
    position: [-1.3, -2.5, -2.5],
    width: 1.6, height: 0.9,
    scale: 1.3,
    focusDistance: 2.8,
    textureUrl: '/video/tv_noise.mp4',
    highResTextureUrl: '/video/tv_noise.mp4',
    title: 'SIGNAL LOST',
    description: '作品整理中，影像即將重現。',
    // 手機版設定
    mobilePosition: [-1.5, -1.8, -4.5],
    mobileScale: 1.3,
    mobileFocusDistance: 2.8,
  }
];

interface SubFrameData {
  id: number;
  parentFrameId: number;
  type: 'image' | 'text' | 'color-palette';
  content: any;
  position: [number, number, number];
  width?: number;
  height?: number;
  scale?: number;
  // 手機版專屬設定
  mobilePosition?: [number, number, number];
  mobileScale?: number;
}

const subFramesData: SubFrameData[] = [
  {
    id: 100,
    parentFrameId: 0,
    type: 'text' as const,
    content: '「天樞、 天璇、 天璣、 天權、 玉衡，開陽和瑤光」//{...',
    position: [0.7, -0.5, 1.0] as [number, number, number],
    width: 0.035,
    // 手機版設定
    mobilePosition: [-0.25, 0.3, 1.0] as [number, number, number],
  },
  {
    id: 1000,
    parentFrameId: 0,
    type: 'text' as const,
    content: 'Color Palette" \\\\',
    position: [1.25, 0.27, 0.5] as [number, number, number],
    width: 0.04,
    // 手機版設定
    mobilePosition: [0.4, 0.24, 0.5] as [number, number, number],
  },
  {
    id: 1001,
    parentFrameId: 0,
    type: 'color-palette' as const,
    content: [
      {
        color: '#375158',
        position: [0.95, 0.12, 1] as [number, number, number],
        mobilePosition: [0.95, 0.12, 1] as [number, number, number], // 手機版位置
        mobileScale: 0.6 // 手機版縮放
      },
      {
        color: '#8d5a0f',
        position: [1.1, 0.12, 1] as [number, number, number],
        mobilePosition: [1.05, 0.12, 1] as [number, number, number], // 手機版位置
        mobileScale: 0.6 // 手機版縮放
      },
      {
        color: '#752e12',
        position: [1.25, 0.12, 1] as [number, number, number],
        mobilePosition: [1.15, 0.12, 1] as [number, number, number], // 手機版位置
        mobileScale: 0.6 // 手機版縮放
      },
      {
        color: '#5a080a',
        position: [1.4, 0.12, 1] as [number, number, number],
        mobilePosition: [1.25, 0.12, 1] as [number, number, number], // 手機版位置
        mobileScale: 0.6 // 手機版縮放
      }
    ],
    position: [0, 0, 0] as [number, number, number],
    width: 0.05,
    // 手機版設定
    mobilePosition: [-0.65, 0, 0] as [number, number, number],
  },
  {
    id: 101,
    parentFrameId: 0,
    type: 'text' as const,
    content: '- Click to view -',
    position: [0, -0.55, 0.1] as [number, number, number],
    width: 0.06,
    // 手機版設定
    mobilePosition: [0, -0.4, 0.1] as [number, number, number],
  },
  {
    id: 102,
    parentFrameId: 1,
    type: 'text' as const,
    content: '- Click to view -',
    position: [0.0, -0.57, 0.1] as [number, number, number],
    width: 0.05,
    // 手機版設定
    mobilePosition: [0.0, -0.57, 0.1] as [number, number, number],
  },
  {
    id: 103,
    parentFrameId: 4,
    type: 'text' as const,
    content: '- Click to view -',
    position: [0.0, -0.47, 0.1] as [number, number, number],
    width: 0.04,
    // 手機版設定
    mobilePosition: [0.0, -0.27, 0.1] as [number, number, number],
  },
  {
    id: 104,
    parentFrameId: 5,
    type: 'text' as const,
    content: '- Click to view -',
    position: [0.0, -1, 0.1] as [number, number, number],
    width: 0.07,
    // 手機版設定
    mobilePosition: [0.0, -0.6, 0.1] as [number, number, number],
  },
  {
    id: 105,
    parentFrameId: 8,
    type: 'text' as const,
    content: '- Click to view -',
    position: [0.0, -1, 0.1] as [number, number, number],
    width: 0.08,
    // 手機版設定
    mobilePosition: [0.0, -0.55, 0.1] as [number, number, number],
  },
  {
    id: 106,
    parentFrameId: 9,
    type: 'text' as const,
    content: 'SIGNAL LOST...',
    position: [0.0, -0.65, 0.1] as [number, number, number],
    width: 0.07,
    // 手機版設定
    mobilePosition: [0.0, -0.65, 0.1] as [number, number, number],
  },
  {
    id: 200,
    parentFrameId: 2,
    type: 'image' as const,
    content: '/png/blackmarket-menu.png',
    position: [1.8, -1.0, 0.0] as [number, number, number],
    width: 1.2,
    height: 1.7,
    scale: 1.0,
    // 手機版設定
    mobilePosition: [0.7, -1.0, -0.1] as [number, number, number],
    mobileScale: 0.7,
  },
  {
    id: 201,
    parentFrameId: 2,
    type: 'image' as const,
    content: '/png/blackmarket-logo.png',
    position: [1.5, 1.0, 0.0] as [number, number, number],
    width: 1.0,
    height: 1.0,
    // 手機版設定
    mobilePosition: [-0.7, 0.9, -0.1] as [number, number, number],
    mobileScale: 0.75,
  },
  {
    id: 202,
    parentFrameId: 2,
    type: 'image' as const,
    content: '/png/blackmarket-logored.png',
    position: [-1.8, 0.7, 0.0] as [number, number, number],
    width: 1.0,
    height: 1.0,
    scale: 1.3,
    // 手機版設定
    mobilePosition: [0.65, 1.15, 0.0] as [number, number, number],
    mobileScale: 0.9,
  },
  {
    id: 203,
    parentFrameId: 3,
    type: 'image' as const,
    content: '/jpg/skmt-2.jpg',
    position: [-1.7, 1.0, -0.2] as [number, number, number],
    width: 1.8,
    height: 1.0,
    // 手機版設定
    mobilePosition: [0.7, 1.0, -0.2] as [number, number, number],
    mobileScale: 0.7,
  },
  {
    id: 204,
    parentFrameId: 3,
    type: 'image' as const,
    content: '/jpg/skmt-3.jpg',
    position: [1.5, 1.3, 0.2] as [number, number, number],
    width: 1.8,
    height: 1.0,
    // 手機版設定
    mobilePosition: [-0.6, 0.8, 0.2] as [number, number, number],
    mobileScale: 0.55,
  },
  {
    id: 205,
    parentFrameId: 3,
    type: 'image' as const,
    content: '/jpg/skmt-4.jpg',
    position: [2.0, -1.5, -0.15] as [number, number, number],
    width: 1.6,
    height: 1.0,
    // 手機版設定
    mobilePosition: [0.65, -0.95, -0.15] as [number, number, number],
    mobileScale: 0.7,
  },
  {
    id: 206,
    parentFrameId: 4,
    type: 'image' as const,
    content: '/jpg/mirror_of_life-1.jpg',
    position: [-1.4, -0.3, -0.15] as [number, number, number],
    width: 1.2,
    height: 0.9,
    scale: 0.5,
    // 手機版設定
    mobilePosition: [-0.5, -0.45, -0.15] as [number, number, number],
    mobileScale: 0.35,
  },
  {
    id: 207,
    parentFrameId: 4,
    type: 'image' as const,
    content: '/jpg/mirror_of_life-2.jpg',
    position: [0.77, -0.8, 0.2] as [number, number, number],
    width: 1.2,
    height: 0.9,
    scale: 0.6,
    // 手機版設定
    mobilePosition: [0.4, -0.45, 0.2] as [number, number, number],
    mobileScale: 0.35,
  },
  {
    id: 208,
    parentFrameId: 4,
    type: 'image' as const,
    content: '/jpg/mirror_of_life-3.jpg',
    position: [1.0, 0.65, 0.1] as [number, number, number],
    width: 1.2,
    height: 0.9,
    scale: 0.6,
    // 手機版設定
    mobilePosition: [0.38, 0.5, 0.1] as [number, number, number],
    mobileScale: 0.45,
  },
  {
    id: 209,
    parentFrameId: 4,
    type: 'image' as const,
    content: '/jpg/mirror_of_life-4.jpg',
    position: [-1.5, 1.2, -0.75] as [number, number, number],
    width: 1.2,
    height: 0.9,
    scale: 1,
    // 手機版設定
    mobilePosition: [-0.5, 0.9, -0.75] as [number, number, number],
    mobileScale: 0.75,
  },
  {
    id: 210,
    parentFrameId: 8,
    type: 'image' as const,
    content: '/png/Porco_Rosso-1.png',
    position: [1.5, -1.45, 0.55] as [number, number, number],
    width: 1.6,
    height: 0.9,
    scale: 1.2,
    // 手機版設定
    mobilePosition: [-0.4, 0.9, 0.55] as [number, number, number],
    mobileScale: 0.7,
  },
  {
    id: 211,
    parentFrameId: 8,
    type: 'image' as const,
    content: '/png/Porco_Rosso-2.png',
    position: [-2.5, 1.6, -0.7] as [number, number, number],
    width: 1.6,
    height: 0.9,
    scale: 1,
    // 手機版設定
    mobilePosition: [1.0, -1.3, -0.7] as [number, number, number],
    mobileScale: 0.65,
  },
  {
    id: 212,
    parentFrameId: 7,
    type: 'image' as const,
    content: '/png/skart-2.png',
    position: [2, 0.7, -0.7] as [number, number, number],
    width: 1.0,
    height: 1.0,
    scale: 3,
    // 手機版設定
    mobilePosition: [0.95, 0.7, -0.7] as [number, number, number],
    mobileScale: 2,
  },
  {
    id: 213,
    parentFrameId: 7,
    type: 'image' as const,
    content: '/png/skart-3.png',
    position: [-2, 1.1, -0.7] as [number, number, number],
    width: 1,
    height: 1.5,
    scale: 1.4,
    // 手機版設定
    mobilePosition: [-0.955, 0.7, -0.7] as [number, number, number],
    mobileScale: 0.7,
  }
];

const cameraFocusDistance = 3;

// --- VIDEO PLAYER COMPONENT ---
function VideoPlayer({ url, onClose }: { url: string, onClose: () => void }) {
  const getEmbedUrl = (videoUrl: string) => {
    let embedUrl = '';
    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
      const videoId = videoUrl.split('v=')[1]?.split('&')[0] || videoUrl.split('/').pop();
      embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    } else if (videoUrl.includes('vimeo.com')) {
      const videoId = videoUrl.split('/').pop()?.split('?')[0];
      embedUrl = `https://player.vimeo.com/video/${videoId}?autoplay=1`;
    }
    return embedUrl;
  };

  const embedUrl = getEmbedUrl(url);

  if (!embedUrl) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 100
    }}>
      <div style={{ position: 'relative', width: '80%', maxWidth: '960px' }}>
        <button onClick={onClose} style={{
          position: 'absolute',
          top: '-30px',
          right: '0',
          background: 'none',
          border: 'none',
          color: 'white',
          fontSize: '2rem',
          cursor: 'pointer'
        }}>
          &times;
        </button>
        <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
          <iframe
            src={embedUrl}
            frameBorder="0"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
          ></iframe>
        </div>
      </div>
    </div>
  );
}


// --- COMPONENT DEFINITIONS ---

function TextureContent({ url, opacity, alphaMap }: { url: string; opacity: number; alphaMap: THREE.CanvasTexture }) {
  const isVideo = url.endsWith('.mp4');

  // For mobile, only start video playback when opacity > 0.1 (visible)
  const shouldStartVideo = !isMobileDevice || opacity > 0.1;
  const texture = isVideo
    ? useVideoTexture(url, { start: shouldStartVideo, loop: true, muted: true })
    : useTexture(url);

  useMemo(() => {
    if (!texture.image) return;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    const planeAspect = (alphaMap.image.width || 1) / (alphaMap.image.height || 1);
    const imageAspect = (texture.image.videoWidth || texture.image.width) / (texture.image.videoHeight || texture.image.height);

    if (imageAspect > planeAspect) {
      texture.repeat.set(1, planeAspect / imageAspect);
      texture.offset.set(0, (1 - (planeAspect / imageAspect)) / 2);
    } else {
      texture.repeat.set(imageAspect / planeAspect, 1);
      texture.offset.set((1 - (imageAspect / planeAspect)) / 2, 0);
    }
  }, [texture, alphaMap]);

  return (
    <meshBasicMaterial
      map={texture}
      alphaMap={alphaMap}
      color="white"
      transparent={true}
      opacity={opacity}
    />
  );
}

function TextureDisplayer({ url, opacity, alphaMap }: { url: string; opacity: number; alphaMap: THREE.CanvasTexture }) {
  return (
    <Suspense fallback={<meshBasicMaterial color="#333" alphaMap={alphaMap} opacity={0} transparent />}>
      <TextureContent url={url} opacity={opacity} alphaMap={alphaMap} />
    </Suspense>
  );
}

function Frame({
  position, width, height, textureUrl, highResTextureUrl, index,
  isFocused, isInitialView, videoUrl, onFrameClick, scale,
  allFramesReady, mobilePosition, mobileScale
}: {
  position: [number, number, number];
  width: number;
  height: number;
  textureUrl: string;
  highResTextureUrl: string;
  index: number;
  isFocused: boolean;
  isInitialView: boolean;
  videoUrl?: string;
  onFrameClick: (url: string) => void;
  scale?: number;
  allFramesReady: boolean;
  mobilePosition?: [number, number, number];
  mobileScale?: number;
}) {
  const meshRef = useRef<THREE.Group>(null!);
  const [opacity, setOpacity] = useState(0);

  // 使用手機版設定（如果有提供）
  const finalPosition = isMobileDevice && mobilePosition ? mobilePosition : position;
  const finalScale = isMobileDevice && mobileScale !== undefined ? mobileScale : (scale || 1);

  const urlToLoad = isFocused ? highResTextureUrl : textureUrl;
  const alphaMap = useMemo(() => getAlphaMap(width, height), [width, height]);
  const targetPosition = useMemo(() => new THREE.Vector3(...finalPosition), [finalPosition]);

  useEffect(() => {
    if (meshRef.current) {
        // Start far away only if the fly-in animation is active
        const initialZ = allFramesReady ? 100 + Math.random() * 50 : finalPosition[2];
        meshRef.current.position.set(finalPosition[0], finalPosition[1], initialZ);
    }
  }, [allFramesReady, finalPosition]); // Depend on allFramesReady and finalPosition

  useFrame((_, delta) => {
    if (meshRef.current && allFramesReady) {
        const delayFactor = index * 0.05;
        if (_.clock.elapsedTime > delayFactor) {
            meshRef.current.position.lerp(targetPosition, delta * 4);
        }
    } else if (meshRef.current && !allFramesReady) {
        // If not ready, just stick to the final position
        meshRef.current.position.set(...finalPosition);
    }

    let targetOpacity = 0;
    if (allFramesReady) {
      // 手機版使用獨立的暗度設定，桌面版固定使用 0.04
      const unfocusedOpacity = isMobileDevice ? mobileUnfocusedFrameOpacity : 0.04;
      targetOpacity = isInitialView ? initialViewOpacity : (isFocused ? 1.0 : unfocusedOpacity);
    }
    setOpacity(currentOpacity => THREE.MathUtils.lerp(currentOpacity, targetOpacity, delta * 5.0));
  });

  const handleClick = () => {
    if (isFocused && videoUrl) {
      onFrameClick(videoUrl);
    }
  };

  return (
    <group ref={meshRef} onClick={handleClick} scale={finalScale}>
      <Plane args={[width, height]}>
        {/* No longer conditional, render the texture immediately. Preloading handles the waiting. */}
        <TextureDisplayer key={urlToLoad} url={urlToLoad} opacity={opacity} alphaMap={alphaMap} />
      </Plane>
    </group>
  );
}


// --- SUB-FRAME COMPONENT ---
function SubFrame({ data, isParentFocused }: {
  data: SubFrameData;
  isParentFocused: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const textRef = useRef<any>(null);
  const circleMaterialRefs = useRef<(THREE.MeshBasicMaterial | null)[]>([]);

  // 使用手機版設定（如果有提供）
  const finalPosition = isMobileDevice && data.mobilePosition ? data.mobilePosition : data.position;
  const finalScale = isMobileDevice && data.mobileScale !== undefined ? data.mobileScale : (data.scale || 1);

  // Since all textures are preloaded, we can call useTexture directly.
  const texture = data.type === 'image' ? useTexture(data.content) : null;
  if (texture) {
    texture.colorSpace = THREE.SRGBColorSpace;
  }

  const alphaMap = useMemo(() => {
    if (data.type !== 'image' || !data.width || !data.height) {
        const dummyCanvas = document.createElement('canvas');
        dummyCanvas.width = 1;
        dummyCanvas.height = 1;
        return new THREE.CanvasTexture(dummyCanvas);
    }
    return getAlphaMap(data.width, data.height);
  }, [data.width, data.height, data.type]);

  const circleGeometry = useMemo(() => new THREE.CircleGeometry(data.width || 0.08, 32), [data.width]);

  useFrame((_, delta) => {
    const targetOpacity = isParentFocused ? 1 : 0;

    if (materialRef.current) {
      materialRef.current.opacity = THREE.MathUtils.lerp(materialRef.current.opacity, targetOpacity, delta * 5.0);
    }
    if (textRef.current) {
      textRef.current.fillOpacity = THREE.MathUtils.lerp(textRef.current.fillOpacity, targetOpacity, delta * 5.0);
    }
    if (data.type === 'color-palette') {
      circleMaterialRefs.current.forEach(mat => {
        if (mat) {
          mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetOpacity, delta * 4);
        }
      });
    }

    if (groupRef.current) {
      const isCurrentlyVisible = (materialRef.current && materialRef.current.opacity > 0.01) || 
                                 (textRef.current && textRef.current.fillOpacity > 0.01) ||
                                 (data.type === 'color-palette' && circleMaterialRefs.current.some(mat => mat && mat.opacity > 0.01));
      groupRef.current.visible = isCurrentlyVisible;
    }
  });

  return (
    <group ref={groupRef} position={finalPosition} scale={finalScale} visible={false}>
      {data.type === 'image' && data.width && data.height && (
        <Plane args={[data.width, data.height]}>
          <meshBasicMaterial
            ref={materialRef}
            map={texture}
            alphaMap={alphaMap}
            transparent
            opacity={0}
          />
        </Plane>
      )}
      {data.type === 'text' && (
        <Text
          ref={textRef}
          fontSize={data.width || 0.2}
          color="white"
          anchorX="center"
          anchorY="middle"
          fillOpacity={0}
        >
          {data.content}
        </Text>
      )}
      {data.type === 'color-palette' && (
        <group>
          {(data.content as any[]).map((circle, index) => {
            // 使用手機版位置和縮放（如果有提供）
            const circlePosition = isMobileDevice && circle.mobilePosition ? circle.mobilePosition : circle.position;
            const circleScale = isMobileDevice && circle.mobileScale !== undefined ? circle.mobileScale : 1.0;
            return (
              <mesh key={index} position={circlePosition} scale={circleScale} geometry={circleGeometry}>
                <meshBasicMaterial
                  ref={el => { if (el) { circleMaterialRefs.current[index] = el; } }}
                  color={circle.color}
                  transparent={true}
                  opacity={0}
                />
              </mesh>
            );
          })}
        </group>
      )}
    </group>
  );
}

function Experience({ 
    currentIndex, 
    isInitialView, 
    onFrameClick,
    allFramesReady
}: { 
    currentIndex: number, 
    isInitialView: boolean, 
    onFrameClick: (url: string) => void,
    allFramesReady: boolean;
}) {
  const { camera } = useThree();
  const targetLookAt = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    // Only start animating the camera when everything is ready
    if (!allFramesReady) return;

    if (isInitialView) {
      const overviewPosition = new THREE.Vector3(0, 0, 4);
      const overviewLookAt = new THREE.Vector3(0, 0, 0);
      camera.position.lerp(overviewPosition, delta * 1.5);
      targetLookAt.current.lerp(overviewLookAt, delta * 1.5);
      camera.lookAt(targetLookAt.current);
    } else {
      const targetFrame = framesData[currentIndex];
      // 使用手機版設定（如果有提供）
      const framePosition = isMobileDevice && targetFrame.mobilePosition
        ? targetFrame.mobilePosition
        : targetFrame.position;
      const focusDistance = isMobileDevice && targetFrame.mobileFocusDistance !== undefined
        ? targetFrame.mobileFocusDistance
        : (targetFrame.focusDistance || cameraFocusDistance);

      const cameraTargetPosition = new THREE.Vector3(
        framePosition[0],
        framePosition[1],
        framePosition[2] + focusDistance
      );
      const lookAtPosition = new THREE.Vector3(...framePosition);
      camera.position.lerp(cameraTargetPosition, delta * 2.0);
      targetLookAt.current.lerp(lookAtPosition, delta * 2.0);
      camera.lookAt(targetLookAt.current);
    }
  });

  return (
    <Suspense fallback={null}>
      {framesData.map((frame, index) => {
        const isFocused = !isInitialView && index === currentIndex;
        return (
          <group key={frame.id}>
            <Frame
              index={index}
              position={frame.position as [number, number, number]}
              width={frame.width}
              height={frame.height}
              textureUrl={frame.textureUrl}
              highResTextureUrl={frame.highResTextureUrl}
              isFocused={isFocused}
              isInitialView={isInitialView}
              videoUrl={frame.videoUrl}
              onFrameClick={onFrameClick}
              scale={frame.scale}
              allFramesReady={allFramesReady}
              mobilePosition={frame.mobilePosition}
              mobileScale={frame.mobileScale}
            />
            {subFramesData
              .filter(sf => sf.parentFrameId === frame.id)
              .map(subFrame => {
                // SubFrame 的父容器也需要使用手機版位置
                const parentPosition = isMobileDevice && frame.mobilePosition
                  ? frame.mobilePosition
                  : frame.position;
                return (
                  <group key={subFrame.id} position={parentPosition as [number, number, number]}>
                    <SubFrame
                      data={subFrame}
                      isParentFocused={isFocused}
                    />
                  </group>
                );
              })
            }
          </group>
        );
      })}
    </Suspense>
  );
}

import { useProgress, Html } from '@react-three/drei';

function Loader({ loadingProgress }: { loadingProgress: number }) {
    const totalProgress = Math.round(loadingProgress * 100);
  
    const containerStyle: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      width: '100%',
      color: 'white',
    };
  
    const waveContainerStyle: React.CSSProperties = {
      display: 'flex',
      justifyContent: 'center',
      marginBottom: '20px',
    };
  
    const boxStyle: React.CSSProperties = {
      width: '12px',
      height: '12px',
      backgroundColor: 'white',
      margin: '0 4px',
      animation: 'wave 1.5s ease-in-out infinite',
    };
  
    const progressTextStyle: React.CSSProperties = {
      fontSize: '24px',
      fontWeight: 'bold',
      fontFamily: 'monospace',
    };
  
    return (
      <Html center>
        <style>
          {`
            @keyframes wave {
              0%, 60%, 100% {
                transform: initial;
              }
              30% {
                transform: translateY(-15px);
              }
            }
          `}
        </style>
        <div style={containerStyle}>
          <div style={waveContainerStyle}>
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                style={{
                  ...boxStyle,
                  animationDelay: `${i * 0.15}s`,
                }}
              />
            ))}
          </div>
          <p style={progressTextStyle}>{`${totalProgress}%`}</p>
        </div>
      </Html>
    );
  }

// --- MAIN PAGE COMPONENT ---
export default function Video() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isInitialView, setIsInitialView] = useState(true);
  const [hintOpacity, setHintOpacity] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');

  // --- Unified Pre-loading Logic ---
  const [allFramesReady, setAllFramesReady] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  const allImageUrls = useMemo(() => {
    const frameImageUrls = framesData
        .flatMap(f => [f.textureUrl, f.highResTextureUrl])
        .filter(url => url && !url.endsWith('.mp4'));
    
    const subFrameImageUrls = subFramesData
        .filter(sf => sf.type === 'image')
        .map(sf => sf.content);

    // Remove duplicates
    return [...new Set([...frameImageUrls, ...subFrameImageUrls])];
  }, []);

  useEffect(() => {
    const preloadAssets = async () => {
      if (allImageUrls.length === 0) {
        setLoadingProgress(1);
        setAllFramesReady(true);
        return;
      }

      let loadedCount = 0;
      for (const url of allImageUrls) {
        try {
          await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = (err) => {
                console.error(`Failed to load image: ${url}`, err);
                resolve(err); // Resolve even on error to not block the sequence
            };
            img.src = url;
          });
        } catch (error) {
          console.error(`Error in preloading image: ${url}`, error);
        } finally {
            loadedCount++;
            setLoadingProgress(loadedCount / allImageUrls.length);
        }
      }
      
      setAllFramesReady(true);
    };

    preloadAssets();
  }, [allImageUrls]);
  // --- End of Loading Logic ---


  const currentWork = framesData[currentIndex];

  const handleFrameClick = (url: string) => {
    setVideoUrl(url);
    setShowVideo(true);
  };

  const handleCloseVideo = () => {
    setShowVideo(false);
    setVideoUrl('');
  };

  useEffect(() => {
    let lastScrollTime = 0;
    const cooldown = 800;
    const handleWheel = (e: WheelEvent) => {
      if (!allFramesReady) return;
      const now = Date.now();
      if (now - lastScrollTime < cooldown) return;
      if (Math.abs(e.deltaY) < 20) return;
      const isScrollingDown = e.deltaY > 0;
      if (isInitialView) {
        if (isScrollingDown) {
          setIsInitialView(false);
          lastScrollTime = now;
        }
        return;
      }
      if (isScrollingDown) {
        setCurrentIndex(prev => Math.min(prev + 1, framesData.length - 1));
      } else {
        if (currentIndex === 0) {
          setIsInitialView(true);
        } else {
          setCurrentIndex(prev => Math.max(prev - 1, 0));
        }
      }
      lastScrollTime = now;
    };
    let touchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      if (!allFramesReady) return;
      touchStartY = e.touches[0].clientY;
    };
    const handleTouchEnd = (e: TouchEvent) => {
      if (!allFramesReady) return;
      const touchEndY = e.changedTouches[0].clientY;
      const deltaY = touchStartY - touchEndY;
      if (Math.abs(deltaY) > 50) {
        const now = Date.now();
        if (now - lastScrollTime < cooldown) return;
        const isScrollingDown = deltaY > 0;
        if (isInitialView) {
          if (isScrollingDown) {
            setIsInitialView(false);
            lastScrollTime = now;
          }
          return;
        }
        if (isScrollingDown) {
          setCurrentIndex(prev => Math.min(prev + 1, framesData.length - 1));
        } else {
          if (currentIndex === 0) {
            setIsInitialView(true);
          }
          else {
            setCurrentIndex(prev => Math.max(prev - 1, 0));
          }
        }
        lastScrollTime = now;
      }
    };
    window.addEventListener('wheel', handleWheel);
    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isInitialView, currentIndex, allFramesReady]);


  useEffect(() => {
    if (allFramesReady && isInitialView) {
      const timer = setTimeout(() => setHintOpacity(1), 500); // fade in hint after a delay
      return () => clearTimeout(timer);
    } else {
      setHintOpacity(0);
    }
  }, [allFramesReady, isInitialView]);
  

  return (
    <div className="video-container">
      {showVideo && <VideoPlayer url={videoUrl} onClose={handleCloseVideo} />}
      <div style={{
        position: 'absolute',
        bottom: isMobileDevice ? '8vh' : '8vh', // 手機版增加 bottom 值來補償 video-container 的 -5vh transform
        left: isMobileDevice ? '5%' : '40%',
        transform: isMobileDevice ? 'translateX(0)' : 'translateX(-520px)',
        color: 'white',
        zIndex: 10,
        maxWidth: isMobileDevice ? '90%' : '1000px',
        pointerEvents: 'none',
        opacity: isInitialView || !allFramesReady ? 0 : 1,
        transition: 'opacity 0.5s ease-in-out',
      }}>
        <h2 style={{ margin: 0, padding: 0, fontSize: isMobileDevice ? '1rem' : '2rem', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
          {currentWork.title}
        </h2>
        <p style={{ marginTop: '1rem', fontSize: isMobileDevice ? '0.7rem' : '1rem', textShadow: '0 1px 3px rgba(0,0,0,0.8)', whiteSpace: 'pre-line', lineHeight: isMobileDevice ? '1.5' : '1.6' }}>
          {currentWork.description}
        </p>
      </div>
      {!isInitialView && allFramesReady && (
        <div className="nav-nodes">
          {framesData.map((_, index) => (
            <div
              key={_.id}
              onClick={() => setCurrentIndex(index)}
              className={`nav-node ${currentIndex === index ? 'active' : ''}`}
            />
          ))}
        </div>
      )}
      <div style={{
        position: 'absolute',
        bottom: '45%',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        textAlign: 'center',
        opacity: hintOpacity,
        transition: 'opacity 0.5s ease-in-out',
        pointerEvents: 'none',
        zIndex: 10,
      }}>
        <div style={{ fontSize: '14px', letterSpacing: '0.2em', marginBottom: '10px', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
          {isMobileDevice ? '向上滑動' : '向下滑動'}
        </div>
        <div style={{ fontSize: '24px', animation: isMobileDevice ? 'floatUp 2s ease-in-out infinite' : 'float 2s ease-in-out infinite' }}>
          {isMobileDevice ? '↑' : '↓'}
        </div>
      </div>
      <Canvas camera={{ position: [0, 0, 10], fov: 75 }}>
        <color attach="background" args={['#050505']} />
        <ambientLight intensity={0.2} />
        <Suspense fallback={<Loader loadingProgress={loadingProgress} />}>
            <Experience 
                currentIndex={currentIndex} 
                isInitialView={isInitialView} 
                onFrameClick={handleFrameClick}
                allFramesReady={allFramesReady}
            />
        </Suspense>
        {!isMobileDevice && (
          <EffectComposer>
            <Bloom luminanceThreshold={1} intensity={1.2} mipmapBlur />
            <Noise opacity={0.03} />
            <Vignette eskil={false} offset={0.1} darkness={1.0} />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  );
}