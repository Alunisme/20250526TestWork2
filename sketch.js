let video;
let facemesh;
let predictions = [];
let handpose;
let handPredictions = [];
let gesture = 'none'; // 'scissors', 'rock', 'paper', 'none'
let faceImgs = {};
let currentMask = null;
let lastGesture = 'none';

function preload() {
  faceImgs['scissors'] = loadImage('images/face1.jpg');
  faceImgs['rock'] = loadImage('images/face2.png');
  faceImgs['paper'] = loadImage('images/face3.png');
}

function setup() {
  createCanvas(640, 480).position(
    (windowWidth - 640) / 2,
    (windowHeight - 480) / 2
  );
  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide();

  facemesh = ml5.facemesh(video, modelReady);
  facemesh.on('predict', results => {
    predictions = results;
  });

  handpose = ml5.handpose(video, handModelReady);
  handpose.on('predict', results => {
    handPredictions = results;
  });
}

function modelReady() {
  // 模型載入完成，可選擇顯示訊息
}

function handModelReady() {
  // 手部模型載入完成
}

function detectGesture(hand) {
  // 根據手部關鍵點判斷剪刀、石頭、布
  // 這裡用簡單規則：
  // 剪刀：只有食指(8)和中指(12)伸直，其餘彎曲
  // 石頭：五指都彎曲
  // 布：五指都伸直
  // hand.landmarks: [21個點]
  if (!hand) return 'none';
  const tips = [8, 12, 16, 20]; // 食指、中指、無名指、小指指尖
  const base = [6, 10, 14, 18]; // 對應的指根
  let straight = tips.map((tip, i) => {
    return hand.landmarks[tip][1] < hand.landmarks[base[i]][1];
  });
  // 拇指
  let thumbStraight = hand.landmarks[4][0] > hand.landmarks[3][0];

  if (straight[0] && straight[1] && !straight[2] && !straight[3]) return 'scissors';
  if (!straight[0] && !straight[1] && !straight[2] && !straight[3] && !thumbStraight) return 'rock';
  if (straight[0] && straight[1] && straight[2] && straight[3] && thumbStraight) return 'paper';
  return 'none';
}

function draw() {
  image(video, 0, 0, width, height);

  // 手勢偵測
  let detectedGesture = 'none';
  if (handPredictions.length > 0) {
    detectedGesture = detectGesture(handPredictions[0]);
  }

  // 只有偵測到新手勢才切換面罩
  if (['scissors', 'rock', 'paper'].includes(detectedGesture) && detectedGesture !== lastGesture) {
    currentMask = faceImgs[detectedGesture];
    lastGesture = detectedGesture;
  }

  if (predictions.length > 0) {
    const keypoints = predictions[0].scaledMesh;
    if (currentMask) {
      drawFaceMask(keypoints, currentMask);
    } else {
      drawFace(keypoints, lastGesture);
    }
  }
}

// 臉部面罩繪製
function drawFaceMask(keypoints, img) {
  // 臉部輪廓點位（與 Coding Train 範例一致）
  const faceOutline = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
  // 取得臉部輪廓對應的點
  let pts = faceOutline.map(i => keypoints[i]);
  // 設定圖片為貼圖
  texture(img);
  beginShape();
  for (let i = 0; i < pts.length; i++) {
    // 計算對應的貼圖座標（以臉部輪廓的外接矩形做對應）
    let x = pts[i][0];
    let y = pts[i][1];
    // 計算貼圖的 u, v
    // 先找出臉部輪廓的外接矩形
    let minX = Math.min(...pts.map(p => p[0]));
    let minY = Math.min(...pts.map(p => p[1]));
    let maxX = Math.max(...pts.map(p => p[0]));
    let maxY = Math.max(...pts.map(p => p[1]));
    let u = (x - minX) / (maxX - minX);
    let v = (y - minY) / (maxY - minY);
    vertex(x, y, u * img.width, v * img.height);
  }
  endShape(CLOSE);
}

// 臉部繪製函式，參考 Coding Train 範例，並根據 gesture 改變表情
function drawFace(keypoints, gesture) {
  // 臉輪廓點位（Coding Train 範例）
  const faceOutline = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
  // 嘴巴外圈
  const mouthOuter = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 185, 40, 39, 37, 0, 267, 269, 270, 409, 415, 310, 311, 312, 13, 82, 81, 42, 183, 78];
  // 嘴巴內圈
  const mouthInner = [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146, 61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 415, 310, 311, 312, 13, 82, 81, 42, 183, 78];
  // 左眉毛
  const leftBrow = [70, 63, 105, 66, 107, 55, 65, 52, 53, 46];
  // 右眉毛
  const rightBrow = [336, 296, 334, 293, 300, 276, 283, 282, 295, 285];

  // 臉輪廓
  noFill();
  stroke(255, 200, 200);
  strokeWeight(2);
  beginShape();
  for (let i of faceOutline) {
    vertex(keypoints[i][0], keypoints[i][1]);
  }
  endShape(CLOSE);

  // 眉毛
  stroke(80, 40, 40);
  strokeWeight(4);
  drawFeature(leftBrow, keypoints);
  drawFeature(rightBrow, keypoints);

  // 嘴巴
  stroke(200, 50, 50);
  strokeWeight(3);
  let mouth = mouthOuter;
  let mouthOpen = 0;
  // 根據手勢改變嘴巴形狀
  if (gesture === 'rock') {
    // 石頭：嘴巴閉合
    mouthOpen = 0.2;
  } else if (gesture === 'scissors') {
    // 剪刀：嘴巴微笑
    mouthOpen = 1.2;
  } else if (gesture === 'paper') {
    // 布：嘴巴大張
    mouthOpen = 2.2;
  } else {
    mouthOpen = 0.7;
  }
  // 嘴巴上下點（14:上, 17:下）
  let topLip = keypoints[14];
  let bottomLip = keypoints[17];
  let midX = (topLip[0] + bottomLip[0]) / 2;
  let midY = (topLip[1] + bottomLip[1]) / 2;
  // 嘴巴外圈
  beginShape();
  for (let i = 0; i < mouth.length; i++) {
    let idx = mouth[i];
    let pt = keypoints[idx].slice();
    // 嘴巴下半部點往下移動
    if (i > mouth.length / 2) {
      pt[1] += 10 * mouthOpen;
    } else if (i < mouth.length / 2) {
      pt[1] -= 5 * mouthOpen;
    }
    vertex(pt[0], pt[1]);
  }
  endShape(CLOSE);
}

function drawFeature(arr, keypoints) {
  beginShape();
  for (let i of arr) {
    vertex(keypoints[i][0], keypoints[i][1]);
  }
  endShape();
}
