import { useRef, useMemo, useState, useEffect, Suspense, useLayoutEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer, Vignette, Noise, Bloom } from '@react-three/postprocessing';
import { Text } from '@react-three/drei';
import { useNavigate } from 'react-router-dom';
import LockModel from './LockModel';

const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

const AnimatedText = ({ visible, ...props }: any) => {
  const textRef = useRef<any>();

  useFrame((state, delta) => {
    if (textRef.current) {
      const targetOpacity = visible ? 1 : 0;
      // 使用 lerp 平滑地改變透明度，達成淡入效果
      textRef.current.fillOpacity += (targetOpacity - textRef.current.fillOpacity) * delta * 7;
    }
  });

  // 初始透明度為 0
  return <Text ref={textRef} fillOpacity={0} {...props} />;
};

// 像素風文字輪播元件 (D, O, M, O)
const PixelLogo = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const [index, setIndex] = useState(0);
  
  // 定義 D, O, M, O 的像素圖案 (5x7 grid)
  const patterns = useMemo(() => [
    // D
    ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
    // O
    ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
    // M
    ["10001", "11011", "10101", "10001", "10001", "10001", "10001"],
    // O
    ["01110", "10001", "10001", "10001", "10001", "10001", "01110"]
  ], []);

  // 自動輪播邏輯
  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % patterns.length);
    }, 1000); // 每秒切換一個字
    return () => clearInterval(timer);
  }, [patterns]);

  // 根據當前字母產生體素座標
  const voxels = useMemo(() => {
    const currentPattern = patterns[index];
    const v: [number, number, number][] = [];
    const spacing = 1.2; // 間距因子，大於 1.0 就會有明顯空隙
    currentPattern.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        if (row[x] === '1') {
          // 置中：x (0~4) -> -2~2, y (0~6) -> 3~-3
          // 乘上 spacing 來拉開距離
          v.push([(x - 2) * spacing, (3 - y) * spacing, 0]);
        }
      }
    });
    return v;
  }, [index, patterns]);

  useLayoutEffect(() => {
    if (!meshRef.current) return;
    const temp = new THREE.Object3D();
    
    // 清空所有實例 (將未使用的縮放設為 0)
    for (let i = 0; i < 50; i++) {
      temp.scale.set(0, 0, 0);
      temp.updateMatrix();
      meshRef.current.setMatrixAt(i, temp.matrix);
    }

    // 設定新的體素
    voxels.forEach((pos, i) => {
      temp.position.set(pos[0], pos[1], pos[2]);
      temp.scale.set(1, 1, 1);
      temp.updateMatrix();
      meshRef.current.setMatrixAt(i, temp.matrix);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [voxels]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, 50]}>
      <boxGeometry args={[0.9, 0.9, 0.9]} />
      {/* 使用青色發光材質，營造全息投影的感覺 */}
      <meshStandardMaterial color="white" emissive="white" emissiveIntensity={1.5} toneMapped={false} />
    </instancedMesh>
  );
};

// 貪食蛇元件 (3D VFX 方塊內部)
const VoxelSnake = () => {
  const segmentRefs = useRef<(THREE.Mesh | null)[]>([]);
  
  // 狀態設定
  const snakeLength = 10;
  const gridStep = 0.6; // 網格間距 (9格 * 0.6 = 5.4, 小於方塊大小 6)
  const gridLimit = 4; // 座標範圍 -4 到 4 (共9格)
  
  // 儲存路徑點 (Grid Coordinates)
  // path[0] 是頭部的新目標
  // path[1] 是頭部目前的起點
  // path[i] 是第 i-1 節身體的起點
  // 初始位置設為一直線 (0,0,0), (0,0,1), (0,0,2)...
  const path = useMemo(() => 
    Array.from({ length: snakeLength + 1 }).map((_, i) => new THREE.Vector3(0, 0, i)), 
  [snakeLength]);
  
  const progress = useRef(0);
  const lastDir = useRef(new THREE.Vector3(0, 0, -1)); // 初始移動方向 (配合初始位置)

  useFrame((state, delta) => {
    const speed = 5.0 * delta; // 移動速度
    progress.current += speed;

    if (progress.current >= 1) {
      progress.current = 0;
      
      // 1. 更新身體路徑 (從尾部開始往前移)
      // path[i] 變成 path[i-1]
      for (let i = snakeLength; i > 0; i--) {
        path[i].copy(path[i - 1]);
      }

      // 2. 決定頭部新目標 (path[0])
      const head = path[1]; // 目前頭部位置 (已成為起點)
      
      // 嘗試尋找有效的新方向
      let validMove = false;
      let attempts = 0;
      const possibleDirs = [
        new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0),
        new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0),
        new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1)
      ];

      while (!validMove && attempts < 10) {
        // 隨機選方向，但偏向維持原方向 (避免頻繁回頭或亂轉)
        let nextDir;
        if (Math.random() < 0.7) {
            nextDir = lastDir.current.clone();
        } else {
            nextDir = possibleDirs[Math.floor(Math.random() * possibleDirs.length)];
        }

        // 不能直接回頭
        if (nextDir.clone().add(lastDir.current).lengthSq() < 0.1) {
             attempts++;
             continue;
        }

        const nextPos = head.clone().add(nextDir);
        
        // 邊界檢查 (-4 ~ 4)
        if (Math.abs(nextPos.x) <= gridLimit && 
            Math.abs(nextPos.y) <= gridLimit && 
            Math.abs(nextPos.z) <= gridLimit) {
            
            path[0].copy(nextPos);
            lastDir.current.copy(nextDir);
            validMove = true;
        }
        attempts++;
      }
      
      // 如果卡住了 (找不到路)，就強制隨機跳一個位置 (重置)
      if (!validMove) {
         // 簡單處理：保持原地，下一幀再試
         path[0].copy(head);
      }
    }

    // 更新 Mesh 位置 (插值)
    segmentRefs.current.forEach((mesh, i) => {
      if (mesh) {
        // Segment i 在 path[i+1] (起點) 和 path[i] (終點) 之間移動
        const start = path[i + 1];
        const end = path[i];
        
        // 使用 lerp 插值
        mesh.position.lerpVectors(start, end, progress.current).multiplyScalar(gridStep);
        
        // 確保方塊平行於 3D VFX 正方體 -> 不旋轉
        mesh.rotation.set(0, 0, 0);
      }
    });
  });

  return (
    <group>
      {Array.from({ length: snakeLength }).map((_, i) => {
        const s = 0.5 * (1 - (i / snakeLength) * 0.4); // 從頭到尾慢慢變小 (0.5 -> 0.3)
        return (
          <mesh key={i} ref={(el) => (segmentRefs.current[i] = el)}>
            <boxGeometry args={[s, s, s]} />
            <meshStandardMaterial color="white" emissive="white" emissiveIntensity={1.5} toneMapped={false} />
          </mesh>
        );
      })}
    </group>
  );
};

function Cubes({ count = 4000, stage, focusTarget, portfolioMode, onSpecialCubeClick, initialPortfolioMode }: any) { // 增加數量以填滿空間
  const { camera } = useThree(); // 取得攝影機以計算距離
  const mesh = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const occupied = useRef(new Set<string>()); // 追蹤被佔用的網格位置
  // 儲存 4 個特殊方塊的參考
  const specialRefs = useRef<(THREE.LineSegments | null)[]>([]);
  const videoCubeMeshRef = useRef<THREE.Mesh>(null!); // 3號方塊的噪訊 Mesh 參考
  // 儲存隨機閃爍方塊的參考 (最多 5 個)
  const randomRefs = useRef<(THREE.LineSegments | null)[]>([]);
  const randomIndices = useRef(new Set<number>());
  const [textVisible, setTextVisible] = useState(false);
  const portfolioModeStartTime = useRef(0); // 記錄進入作品集模式的時間

  // 1. 定義參數 (移除控制面板，改為固定數值)
  const spacing = 10; // 大幅增加間距，降低密度 (原本 15)
  const size = 6;     // 方塊大小保持 6
  
  // 大幅增加網格空間 (count * 20)，讓分佈極度稀疏，打破秩序感
  const gridSize = Math.ceil(Math.pow(count * 20, 1/3)); 
  
  // 2. 初始化資料
  const data = useMemo(() => {
    const temp = [];
    const offset = (gridSize * spacing) / 2 - (spacing / 2); // 置中偏移量
    occupied.current.clear(); // 初始化清單

    let i = 0;
    while (i < count) {
      // 隨機挑選網格位置，製造「缺口」或噪訊感
      const x = Math.floor(Math.random() * gridSize);
      const y = Math.floor(Math.random() * gridSize);
      const z = Math.floor(Math.random() * gridSize);
      const key = `${x},${y},${z}`;

      // 如果該位置已經有方塊，就重選
      if (occupied.current.has(key)) continue;

      // 登記初始位置
      occupied.current.add(key);

      const initialPos = new THREE.Vector3(
        x * spacing - offset,
        y * spacing - offset,
        z * spacing - offset
      );

      temp.push({
        currentPos: initialPos.clone(), // 當前視覺位置
        targetPos: initialPos.clone(),  // 目標位置
        startPos: initialPos.clone(),   // 移動起始位置
        gridPos: { x, y, z },           // 當前網格座標
        targetGridPos: { x, y, z },     // 目標網格座標
        isMoving: false,
        progress: 0,
        speed: 2 + Math.random() * 2,   // 移動速度
        waitTimer: Math.random() * 5    // 隨機等待時間
      });
      i++;
    }
    return temp;
  }, [count, gridSize, spacing]);

  // 計算 16:9 螢幕牆的目標位置
  const screenData = useMemo(() => {
    const temp = [];
    const aspect = 16 / 9;
    // 計算行數與列數，讓總數接近 count，且比例接近 16:9
    // count = w * h, w/h = aspect => h = sqrt(count / aspect)
    const rows = Math.floor(Math.sqrt(count / aspect));
    const cols = Math.floor(count / rows);
    
    const xSpacing = 8; // 方塊大小是 6，間距設 8 留一點縫隙
    const ySpacing = 8;
    
    const xOffset = (cols * xSpacing) / 2;
    const yOffset = (rows * ySpacing) / 2;

    for (let i = 0; i < count; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      
      // 排列成平面
      const x = col * xSpacing - xOffset;
      const y = row * ySpacing - yOffset;
      const z = 0; // 都在同一個平面
      temp.push(new THREE.Vector3(x, y, z));
    }
    return temp;
  }, [count]);

  // 建立方塊幾何體 (共用)
  const boxGeometry = useMemo(() => new THREE.BoxGeometry(size, size, size), [size]);

  // 建立線框幾何體 (只顯示 12 條邊)
  const edgesGeometry = useMemo(() => new THREE.EdgesGeometry(boxGeometry), [boxGeometry]);

  // 電視噪訊材質 (Shader)
  const noiseMaterial = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      varying vec2 vUv;
      float random(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
      }
      void main() {
        // 馬賽克長條狀噪訊
        // x 軸切 15 等份 (寬)，y 軸切 80 等份 (細) -> 形成橫向長條馬賽克
        vec2 grid = vec2(15.0, 80.0);
        
        // 離散時間，產生跳動感 (每秒 20 格)
        float t = floor(time * 20.0);
        
        // 計算馬賽克座標並產生噪訊
        vec2 mosaic = floor(vUv * grid);
        float noise = random(mosaic + t);
        
        // 增加對比度，讓雜訊更銳利 (黑白分明)
        noise = step(0.4, noise);
        
        gl_FragColor = vec4(vec3(noise), 1.0);
      }
    `
  }), []);

  const transparentMaterial = useMemo(() => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }), []);

  // 控制文字顯示的延遲：切換鏡位時先隱藏，等鏡頭飛到位後再顯示
  useEffect(() => {
    setTextVisible(false);
    if (stage === 0) return;

    const timer = setTimeout(() => {
      setTextVisible(true);
    }, 1000); // 1秒後顯示文字 (配合鏡頭飛行時間)

    return () => clearTimeout(timer);
  }, [stage]);
  
  // 控制隨機閃爍邏輯：只在首頁 (stage 0) 且非作品集模式時運作
  useEffect(() => {
    if (stage !== 0 || portfolioMode) {
      randomIndices.current.clear();
      // 離開首頁時，隱藏所有隨機線框
      randomRefs.current.forEach(el => {
        if (el) el.visible = false;
      });
      return;
    }

    // 定義挑選邏輯 (不再使用 setInterval)
    const pickRandom = () => {
      // 更新攝影機矩陣以確保視錐體計算正確
      camera.updateMatrixWorld();
      camera.updateProjectionMatrix();

      const frustum = new THREE.Frustum();
      const projScreenMatrix = new THREE.Matrix4();
      projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      frustum.setFromProjectionMatrix(projScreenMatrix);

      // 找出距離攝影機最近的方塊 (排除前 4 個特殊方塊)
      const candidates = [];
      for (let i = 4; i < count; i++) {
        const pos = data[i].currentPos;
        const dist = pos.distanceTo(camera.position);
        // 條件：距離大於 20 (避開太近)、小於 100 (避開太遠)、且在視角內
        if (dist > 20 && dist < 100 && frustum.containsPoint(pos)) {
          candidates.push({ index: i, dist });
        }
      }
      // 依距離排序，取前 50 個最近的作為候選池
      candidates.sort((a, b) => a.dist - b.dist);
      const topCandidates = candidates.slice(0, 50);

      const countToPick = Math.floor(Math.random() * 3) + 3; // 挑選 3 到 5 個
      randomIndices.current.clear();
      
      for (let k = 0; k < countToPick; k++) {
        if (topCandidates.length > 0) {
          const randIdx = Math.floor(Math.random() * topCandidates.length);
          randomIndices.current.add(topCandidates[randIdx].index);
          // 移除已選的，避免重複
          topCandidates.splice(randIdx, 1);
        }
      }
    };

    // 立即執行一次挑選，並且不再重複執行，達成「恆亮」效果
    pickRandom();
  }, [stage, count, portfolioMode, camera, data]);

  // 當進入作品集模式時，重置開始時間
  useEffect(() => {
    if (portfolioMode) {
      portfolioModeStartTime.current = -1;
    }
  }, [portfolioMode]);

  useFrame((state, delta) => {
    // 更新噪訊動畫時間
    noiseMaterial.uniforms.time.value += delta * 20.0;
    
    // 初始化作品集模式的開始時間
    if (portfolioMode && portfolioModeStartTime.current === -1) {
      portfolioModeStartTime.current = state.clock.elapsedTime;
    }
    const timeDiff = portfolioMode ? state.clock.elapsedTime - portfolioModeStartTime.current : 0;

    let randomRefIndex = 0; // 用來追蹤目前使用了幾個隨機線框

    data.forEach((d, i) => {
      // --- 作品集模式 (Portfolio Mode) ---
      if (portfolioMode) {
        // 所有方塊飛向螢幕牆的目標位置
        const target = screenData[i] || screenData[0];
        
        if (initialPortfolioMode) {
           // 如果是初始進入 Profile 頁面，直接定位，不播放動畫
           d.currentPos.copy(target);
        } else {
           // 波浪組建動畫：
           // 根據目標點離中心的距離 (target.length()) 決定延遲時間
           // 離中心越遠，越晚開始移動
           const distFromCenter = target.length();
           const delay = distFromCenter * 0.0025; 

           if (timeDiff > delay) {
              // 開始移動 (速度加快，因為有延遲了)
              d.currentPos.lerp(target, delta * 3);
           }
        }
        
        dummy.position.copy(d.currentPos);
        
        // 旋轉歸位特效：
        // 當方塊還在飛行時 (距離目標 > 1)，讓它旋轉
        // 當接近目標時，自動轉正 (0,0,0)
        const distToTarget = d.currentPos.distanceTo(target);
        if (distToTarget > 1) {
            dummy.rotation.set(distToTarget * 0.2, distToTarget * 0.2, distToTarget * 0.2);
        } else {
            dummy.rotation.set(0, 0, 0);
        }
        
        dummy.scale.setScalar(1);
        dummy.updateMatrix();

        if (i < 4) {
          const el = specialRefs.current[i];
          if (el) {
            el.position.copy(dummy.position);
            el.rotation.copy(dummy.rotation);
            el.scale.copy(dummy.scale);
          }
          // 同步更新 3號方塊 (Index 2) 的噪訊 Mesh
          if (i === 2 && videoCubeMeshRef.current) {
            videoCubeMeshRef.current.position.copy(dummy.position);
            videoCubeMeshRef.current.rotation.copy(dummy.rotation);
            videoCubeMeshRef.current.scale.copy(dummy.scale);
          }
        } else if (mesh.current) {
          mesh.current.setMatrixAt(i - 4, dummy.matrix);
        }
        return;
      }

      // 檢查是否為當前特寫的目標方塊 (stage 1 對應 index 0, stage 2 對應 index 1...)
      const isTarget = stage > 0 && i === (stage - 1);

      if (isTarget) {
        // 如果是目標，強制停止移動 (凍結)
        // 並更新 focusTarget 讓攝影機知道要看哪裡
        focusTarget.current.copy(d.currentPos);
        
        dummy.position.copy(d.currentPos);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(1); // 保持原大小
        dummy.updateMatrix();
        
        // 如果是特殊方塊，更新對應的 LineSegments
        if (i < 4) {
          const el = specialRefs.current[i];
          if (el) {
            el.position.copy(dummy.position);
            el.rotation.copy(dummy.rotation);
            el.scale.copy(dummy.scale);
          }
          // 同步更新 3號方塊 (Index 2) 的噪訊 Mesh
          if (i === 2 && videoCubeMeshRef.current) {
            videoCubeMeshRef.current.position.copy(dummy.position);
            videoCubeMeshRef.current.rotation.copy(dummy.rotation);
            videoCubeMeshRef.current.scale.copy(dummy.scale);
          }
        }
        return; // 跳過後面的移動邏輯
      }

      // 如果是特殊方塊 (1234號)，且不是當前目標，也要強制靜止
      // 避免它們一開始就套用隨機移動效果而跑太遠
      if (i < 4) {
        dummy.position.copy(d.currentPos);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(1);
        
        const el = specialRefs.current[i];
        if (el) {
          el.position.copy(dummy.position);
          el.rotation.copy(dummy.rotation);
          el.scale.copy(dummy.scale);
        }
        // 同步更新 3號方塊 (Index 2) 的噪訊 Mesh
        if (i === 2 && videoCubeMeshRef.current) {
          videoCubeMeshRef.current.position.copy(dummy.position);
          videoCubeMeshRef.current.rotation.copy(dummy.rotation);
          videoCubeMeshRef.current.scale.copy(dummy.scale);
        }
        return;
      }

      // 如果是被選中的隨機閃爍方塊，則停止移動
      if (!randomIndices.current.has(i)) {
        if (d.isMoving) {
          // 移動邏輯：從 startPos 插值移動到 targetPos
          d.progress += d.speed * delta;
          
          if (d.progress >= 1) {
            // 到達目標
            d.progress = 0;
            d.isMoving = false;
            d.currentPos.copy(d.targetPos);
            
            // 移動完成：釋放舊位置
            // 注意：我們在開始移動時就已經預約了新位置，所以現在只要釋放舊的即可
            const oldKey = `${d.gridPos.x},${d.gridPos.y},${d.gridPos.z}`;
            occupied.current.delete(oldKey);
            
            // 更新當前網格座標
            d.gridPos.x = d.targetGridPos.x;
            d.gridPos.y = d.targetGridPos.y;
            d.gridPos.z = d.targetGridPos.z;
            
            d.waitTimer = Math.random() * 2; // 再次等待
          } else {
            // 插值移動 (Lerp)
            // 使用 SmoothStep 曲線進行加減速 (起步慢、中間快、結束慢)
            const ease = d.progress * d.progress * (3 - 2 * d.progress);
            d.currentPos.lerpVectors(d.startPos, d.targetPos, ease);
          }
        } else {
          // 等待邏輯
          d.waitTimer -= delta;
          if (d.waitTimer <= 0) {
            // 決定移動方向 (上下左右前後 6 個方向)
            const gridDirections = [
              [1, 0, 0], [-1, 0, 0],
              [0, 1, 0], [0, -1, 0],
              [0, 0, 1], [0, 0, -1]
            ];
            const dir = gridDirections[Math.floor(Math.random() * gridDirections.length)];
            
            // 隨機決定移動距離 (1 到 6 格)
            const distance = Math.floor(Math.random() * 10) + 1;

            // 計算新的網格座標
            const newGridX = d.gridPos.x + dir[0] * distance;
            const newGridY = d.gridPos.y + dir[1] * distance;
            const newGridZ = d.gridPos.z + dir[2] * distance;
            const newKey = `${newGridX},${newGridY},${newGridZ}`;
            
            // 計算新的世界座標 (用於邊界檢查)
            const targetX = d.currentPos.x + dir[0] * spacing * distance;
            const targetY = d.currentPos.y + dir[1] * spacing * distance;
            const targetZ = d.currentPos.z + dir[2] * spacing * distance;
            
            // 邊界檢查 (稍微放寬一點範圍，讓方塊有空間移動)
            const limit = (gridSize * spacing) / 1.2 + spacing * 2;

            // 檢查：1. 是否超出邊界 2. 目標位置是否已被佔用
            if (!occupied.current.has(newKey) && 
                Math.abs(targetX) < limit && 
                Math.abs(targetY) < limit && 
                Math.abs(targetZ) < limit) {
              
              // 預約新位置
              occupied.current.add(newKey);
              d.targetGridPos = { x: newGridX, y: newGridY, z: newGridZ };
              
              d.startPos.copy(d.currentPos);
              d.targetPos.set(targetX, targetY, targetZ);
              
              // 根據距離調整速度，讓長距離移動不會太快，保持優雅
              d.speed = (1.5 + Math.random()) / Math.sqrt(distance);
              d.isMoving = true;
            } else {
              // 如果被擋住或撞牆，稍作等待再試
              d.waitTimer = 0.5 + Math.random() * 0.5;
            }
          }
        }
      }

      // 計算與攝影機的距離，處理遮擋問題
      const distToCamera = d.currentPos.distanceTo(state.camera.position);
      let scale = 1;
      
      // 1. 避免擋住鏡頭 (加大安全距離)
      if (distToCamera < 35) {
        scale = THREE.MathUtils.smoothstep(distToCamera, 15, 35);
      }

      // 2. 避免與特殊方塊 (1234號) 重疊
      for (let j = 0; j < 4; j++) {
        const distToSpecial = d.currentPos.distanceTo(data[j].currentPos);
        if (distToSpecial < 20) {
           const s = THREE.MathUtils.smoothstep(distToSpecial, 10, 20);
           scale = Math.min(scale, s);
        }
      }

      // 更新 Instance 矩陣
      dummy.position.copy(d.currentPos);
      // 移除旋轉，保持整齊
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(scale); // 套用縮放
      dummy.updateMatrix();
      // 將變換應用到第 i 個實例
      
      if (i < 4) {
        // 更新特殊方塊 (線框)
        const el = specialRefs.current[i];
        if (el) {
          el.position.copy(dummy.position);
          el.rotation.copy(dummy.rotation);
          el.scale.copy(dummy.scale);
        }
      } else {
        // 檢查是否為隨機閃爍方塊
        if (randomIndices.current.has(i)) {
          // 如果是，顯示線框並隱藏實體
          if (randomRefIndex < 5) {
            const el = randomRefs.current[randomRefIndex];
            if (el) {
              el.position.copy(dummy.position);
              el.rotation.copy(dummy.rotation);
              el.scale.copy(dummy.scale); // 使用計算後的縮放 (含遮擋邏輯)
              el.visible = true;
            }
            randomRefIndex++;
          }
          // 隱藏實體方塊 (縮放設為 0)
          dummy.scale.setScalar(0);
          dummy.updateMatrix();
          if (mesh.current) mesh.current.setMatrixAt(i - 4, dummy.matrix);
        } else {
          // 正常顯示實體方塊
          if (mesh.current) {
            mesh.current.setMatrixAt(i - 4, dummy.matrix);
          }
        }
      }
    });

    // 隱藏本幀未使用的隨機線框
    for (let k = randomRefIndex; k < 5; k++) {
      const el = randomRefs.current[k];
      if (el) el.visible = false;
    }

    // 通知 Three.js 實例矩陣已更新
    if (mesh.current) {
      mesh.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* 4 個特殊方塊：白色線框 (12條邊) */}
      {[0, 1, 2, 3].map((idx) => (
        <lineSegments 
          key={idx} 
          ref={(el) => (specialRefs.current[idx] = el)} 
          geometry={edgesGeometry}
          onClick={(e) => {
            e.stopPropagation(); // 阻止事件冒泡
            onSpecialCubeClick(idx); // 使用回呼函式處理點擊
          }}
        >
          {/* 使用 toneMapped={false} 讓顏色突破螢幕亮度限制，配合 Bloom 產生發光效果 */}
          <lineBasicMaterial color="#ffffff" toneMapped={false} />
          
          {/* 在第 1 個方塊 (Profile) 內部加入像素文字 */}
          {idx === 0 && (
            <group position={[0, 0, 0]} rotation={[0, Math.PI / 2, 0]} scale={0.8}>
              <PixelLogo />
            </group>
          )}

          {/* 在第 2 個方塊 (3D VFX) 內部加入貪食蛇 */}
          {idx === 1 && (
            <group>
              <VoxelSnake />
            </group>
          )}

          {/* 在第 4 個方塊 (Private) 內部加入鎖頭 */}
          {idx === 3 && (
            <group scale={0.8}>
              <LockModel />
            </group>
          )}

          {/* 只在對應的 Stage 且延遲時間過後才顯示文字 */}
          {stage === idx + 1 && (
            <group
            position={idx % 2 !== 0 ? [-5, 0, 5] : [5, 0, -5]}
            rotation={[0, Math.PI / 4, 0]}
            >
            <AnimatedText
              visible={textVisible}
              position-y={0.5}
              position-x={idx === 2 ? -0.1 : 0}
              fontSize={1.2}
              color="white"
              anchorX={idx % 2 === 0 ? 'left' : 'right'}
              anchorY="middle"
            >
              {['Profile', '3D VFX', 'Gallery', 'Private'][idx]}
            </AnimatedText>
            <AnimatedText
              visible={textVisible}
              position-y={-0.5}
              position-x={idx === 0 ? 0.1 : 0}
              fontSize={0.5}
              color="white"
              anchorX={idx % 2 === 0 ? 'left' : 'right'}
              anchorY="middle"
            >
              點擊進入
            </AnimatedText>
            </group>
          )}
        </lineSegments>
      ))}

      {/* 3號方塊 (Index 2) 的電視噪訊特效 Mesh */}
      <mesh
        ref={videoCubeMeshRef}
        geometry={boxGeometry}
        material={[noiseMaterial, noiseMaterial, transparentMaterial, transparentMaterial, noiseMaterial, noiseMaterial]}
      />

      {/* 隨機閃爍的方塊池 (最多 5 個) */}
      {[...Array(5)].map((_, i) => (
        <lineSegments key={`rnd-${i}`} ref={(el) => (randomRefs.current[i] = el)} geometry={edgesGeometry} visible={false}>
          {/* 與特殊方塊相同的發光材質 */}
          <lineBasicMaterial color="#ffffff" toneMapped={false} />
        </lineSegments>
      ))}

      {/* 其餘方塊：深灰色實體 */}
      <instancedMesh ref={mesh} args={[undefined, undefined, count - 4]}>
        <boxGeometry args={[size, size, size]} /> 
        <meshStandardMaterial color="#333333" roughness={1} />
      </instancedMesh>
    </group>
  );
}

// 自動運鏡元件
function CameraRig({ stage, focusTarget, portfolioMode }: any) {
  const currentLookAt = useRef(new THREE.Vector3(0, 0, 0)); // 用來平滑視線焦點

  useFrame((state, delta) => {
    if (portfolioMode) {
      // --- 作品集模式：拉遠鏡頭看全貌 ---
      // 目標位置：正對中心，距離拉遠 (Z=500 以容納整個寬度)
      const targetPos = new THREE.Vector3(0, 0, 500);
      
      state.camera.position.lerp(targetPos, delta * 2);
      state.camera.lookAt(0, 0, 0);
      state.camera.up.set(0, 1, 0); // 轉正水平
      return;
    }

    if (stage === 0) {
      // --- 首頁模式：環繞運鏡 ---
      // 增加相位偏移 (Math.PI / 4)，讓起始位置位於右前方 (X+, Z+)
      const t = state.clock.elapsedTime * 0.1 + Math.PI / 4;
      const radius = 120;
      
      // 計算目標位置
      const targetPos = new THREE.Vector3(
        Math.sin(t) * radius,
        Math.sin(t * 0.5) * 20,
        // 調整 Y 軸相位 (Math.PI * 1.5 讓起始值為 -1)，讓鏡頭從下方仰視 (-30)
        Math.sin(t * 0.5 + Math.PI * 1.5) * 30,
        Math.cos(t) * radius
      );

      // 使用 lerp 平滑過渡回軌道 (避免切換時瞬間跳動)
      state.camera.position.lerp(targetPos, delta * 2);
      
      // 破水平效果
      state.camera.up.set(0.2, 1, 0.2); 
      state.camera.lookAt(0, 0, 0);
      
      // 回到首頁時重置焦點
      currentLookAt.current.set(0, 0, 0);
    } else {
      // --- 特寫模式：飛向方塊 ---
      const target = focusTarget.current;
      const t = state.clock.elapsedTime;
      
      // 1. 設定攝影機停在方塊的斜上方 (拉遠距離)
      // 修正：稍微拉遠一點點 (24, 16, 24) 並減少偏移，避免方塊跑出畫面
      const baseOffset = new THREE.Vector3(24, 16, 24); 
      
      // 2. 微幅移動 (呼吸感/漂浮感)
      // 讓鏡頭繞著方塊微微晃動，避免死板
      baseOffset.x += Math.sin(t * 0.5) * 5;
      baseOffset.z += Math.cos(t * 0.5) * 5;
      baseOffset.y += Math.sin(t * 0.3) * 2;

      const camTargetPos = target.clone().add(baseOffset);

      // 3. 加快飛行速度 (delta * 2 -> delta * 4) 提升手機版切換體驗
      state.camera.position.lerp(camTargetPos, delta * 4);
      
      // 4. 調整構圖 (讓方塊不要在正中間)
      // 我們透過改變 lookAt 的目標點來達成偏心效果
      // 如果要方塊靠左上，我們就看方塊的「右下」
      // 修正：大幅減少偏移量 (6 -> 2.5)，讓方塊在手機窄螢幕上也能保持在畫面較佳位置
      const shift = 2.5; 
      const lookOffset = new THREE.Vector3(0, 0, 0);

      // 根據相機角度 (30, 20, 30)，右方約為 (1, 0, -1)，左方約為 (-1, 0, 1)
      if (stage === 1) {
        // 1號靠左上 -> 看右下 (Right, Down)
        lookOffset.set(shift, -shift, -shift);
      } else if (stage === 2) {
        // 2號靠右下 -> 看左上 (Left, Up)
        lookOffset.set(-shift, shift, shift);
      } else if (stage === 3) {
        // 3號靠左下 -> 看右上 (Right, Up)
        lookOffset.set(shift, shift, -shift);
      } else if (stage === 4) {
        // 4號靠右上 -> 看左下 (Left, Down)
        lookOffset.set(-shift, -shift, shift);
      }

      const desiredLookAt = target.clone().add(lookOffset);
      
      // 平滑旋轉視角
      currentLookAt.current.lerp(desiredLookAt, delta * 4);
      state.camera.lookAt(currentLookAt.current);
      
      // 重置水平線，讓特寫時畫面是正的
      state.camera.up.set(0, 1, 0);
    }
  });
  return null;
}

export default function Scene({ initialPortfolioMode = false, enableHomeUI = true }: any) {
  const navigate = useNavigate();
  const [stage, setStage] = useState(0); // 0: 首頁, 1-4: 方塊特寫
  const focusTarget = useRef(new THREE.Vector3(0, 0, 0)); // 儲存目標方塊的位置
  const [portfolioMode, setPortfolioMode] = useState(initialPortfolioMode); // 支援初始模式

  // 監聽重置事件 (從 Navbar 觸發)
  useEffect(() => {
    const handleReset = () => {
      setStage(0);
      setPortfolioMode(false);
    };
    window.addEventListener('go-home', handleReset);
    return () => window.removeEventListener('go-home', handleReset);
  }, []);

  const handleSpecialCubeClick = (idx: number) => {
    const paths = ['/profile', '/3d-vfx', '/gallery', '/private'];
    const path = paths[idx];

    if (path) {
      setPortfolioMode(true); // 開始播放坍塌特效
      // 延遲 2 秒後跳轉，確保使用者能看清楚特效
      setTimeout(() => {
        navigate(path);
      }, 2000);
    }
  };

  // 滾輪與觸控切換邏輯
  useEffect(() => {
    if (!enableHomeUI) return; // 如果不顯示首頁 UI (例如在 Profile 頁面)，則停用滾輪切換鏡頭

    let lastScrollTime = 0; // 加入冷卻時間變數，防止滾動太快

    const handleWheel = (e: WheelEvent) => {
      const now = Date.now();
      // 如果距離上次觸發不到 1 秒，則忽略
      if (now - lastScrollTime < 1000) return;
      // 忽略微小的滾動數值 (防手震)
      if (Math.abs(e.deltaY) < 20) return;

      // 向下滾 (+1), 向上滾 (-1), 限制在 0 ~ 4 之間
      if (e.deltaY > 0) setStage(prev => Math.min(prev + 1, 4));
      else setStage(prev => Math.max(prev - 1, 0));
      lastScrollTime = now; // 更新最後觸發時間
    };

    let touchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touchEndY = e.changedTouches[0].clientY;
      const deltaY = touchStartY - touchEndY;
      
      // 設定滑動門檻值 (例如 50px) 避免誤觸
      if (Math.abs(deltaY) > 50) {
        if (deltaY > 0) {
          // 手指向上滑 (內容往下) -> 下一個 (Next)
          setStage(prev => Math.min(prev + 1, 4));
        } else {
          // 手指向下滑 (內容往上) -> 上一個 (Prev)
          setStage(prev => Math.max(prev - 1, 0));
        }
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
  }, [enableHomeUI]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0, zIndex: 0 }}>
      {/* 調整初始相機位置，使其接近 CameraRig 的起始點 (85, -30, 85)，避免載入時鏡頭大幅跳動 */}
      <Canvas
        gl={{ powerPreference: 'high-performance' }}
        camera={{ position: initialPortfolioMode ? [0, 0, 500] : [85, -30, 85], fov: 50 }}>
        {/* 設定背景顏色，確保後製特效能作用於背景 */}
        <color attach="background" args={['#050505']} />

        <Suspense fallback={null}>
          {/* 加入霧氣效果，顏色需與背景一致 (#1a1a1a)，讓遠處方塊柔和消失 */}
          <fog attach="fog" args={['#050505', 50, 250]} />
          
          <ambientLight intensity={0.5} color="#333333" /> {/* 中性色調環境光 */}
          <directionalLight position={[10, 10, 5]} intensity={1} color="#ffffff" /> {/* 白光主光 */}
          
          <Cubes stage={stage} focusTarget={focusTarget} portfolioMode={portfolioMode} onSpecialCubeClick={handleSpecialCubeClick} initialPortfolioMode={initialPortfolioMode} />
          <CameraRig stage={stage} focusTarget={focusTarget} portfolioMode={portfolioMode} />

          {/* 後製特效：膠片顆粒濾鏡 */}
          <EffectComposer>
            <Bloom luminanceThreshold={0.5} intensity={1.5} mipmapBlur /> {/* 發光特效 */}
            <Noise opacity={0.025} /> {/* 加入極微量的噪訊來消除色彩斷層 (Dithering) */}
            <Vignette eskil={false} offset={0.1} darkness={1.1} /> {/* 暈影效果，讓四角變暗，增加電影感 */}
          </EffectComposer>
        </Suspense>
      </Canvas>

      {/* 首頁標題與向下滑動提示 (只在首頁 stage 0 顯示) */}
      {!portfolioMode && enableHomeUI && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          textAlign: 'center',
          opacity: stage === 0 ? 1 : 0, // 非首頁時隱藏
          transition: 'opacity 0.5s ease-in-out',
          pointerEvents: 'none',
          zIndex: 10,
          width: '100%'
        }}>
          {/* Domo 標題 */}
          <h1 style={{ fontSize: '44px', letterSpacing: '25px', margin: '0 0 40px 0', paddingLeft: '30px', animation: stage === 0 ? 'expandSpacing 1s ease-out' : 'none', display: 'inline-block', transform: 'scaleX(0.8)' }}>DOMO</h1>
          
          {/* 滑動提示 */}
          <div style={{ fontSize: '14px', letterSpacing: '0.2em', marginBottom: '10px', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
            {isMobileDevice ? '向上滑動' : '向下滑動'}
          </div>
          <div style={{ fontSize: '24px', animation: isMobileDevice ? 'floatUp 2s ease-in-out infinite' : 'float 2s ease-in-out infinite' }}>
            {isMobileDevice ? '↑' : '↓'}
          </div>
        </div>
      )}

      {/* 水平導覽節點 (對應 1, 2, 3, 4 鏡位) */}
      {!portfolioMode && enableHomeUI && stage !== 0 && (
        <div className="nav-nodes">
          {[1, 2, 3, 4].map((num) => (
            <div
              key={num}
              onClick={() => setStage(num)}
              className={`nav-node ${stage === num ? 'active' : ''}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}