let mode = 1; 
// 1 = Horizontal Globe Stack
// 2 = Vertical Cylinder Stack
// 3 = Floating Gallery (Free Flow)
// 4 = Cosmos Logo Hexagon (KINETIC VORTEX)

let imgs = [];
let totalImages = 6; 
let nodes = [];

// Shared Variables
let globeRotation = 0;
let lastSwitchFrame = 0;
let switchInterval = 60; 

// Controls automatic image swapping
let autoShuffle = true;

// Ensures every upload gets a unique slot
let uploadCounter = 0;

// Camera control
let camRotX = 0;
let camRotY = 0;
let camDist = 2000; 
let prevMouseX, prevMouseY;
let isDragging = false;

// Export state flags
let exportRatio = 1;
let isExporting = false; 
let aspectMultiplier = 1; 

// Video Recording Variables
let recorder;
let isRecording = false;
let recordingDuration = 300; 
let recordingStartFrame = 0;
let isVideoExport = false; 

// UI Variables
let uploadInput;
let exportSelect;
let exportBtn;
let recordBtn;

// --- CONTROLS ---
let sizeSlider, radiusSlider, layerGapSlider;
let sizeLabel, radiusLabel, gapLabel; 

// UI Visibility Toggle
let isUIVisible = true;

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  
  // NOTE: We do NOT force pixelDensity(1) here. 
  // We want the screen to look sharp (Retina).
  
  noStroke();
  textureMode(NORMAL); 
  
  // --- PREVENT TEXTURE REPEATING ---
  textureWrap(CLAMP);
  
  if (typeof CCapture === 'undefined') {
      loadScript("https://unpkg.com/ccapture.js@1.1.0/build/CCapture.all.min.js", () => {
          console.log("CCapture loaded dynamically.");
      });
  }

  // --- Upload input ---
  uploadInput = createFileInput(handleFileUpload);
  uploadInput.attribute('multiple', 'true'); 
  uploadInput.position(20, height - 40);
  styleUIElement(uploadInput);
  uploadInput.style('width', '180px');

  // --- Export dropdown ---
  exportSelect = createSelect();
  exportSelect.position(220, height - 40);
  updateExportOptions(); 
  styleUIElement(exportSelect);
  exportSelect.style('width', '140px');
  exportSelect.style('cursor', 'pointer');

  // --- Save Image Button ---
  exportBtn = createButton('Save Image');
  exportBtn.position(370, height - 40);
  styleUIElement(exportBtn);
  exportBtn.style('width', '80px');
  exportBtn.style('cursor', 'pointer');
  exportBtn.style('font-weight', 'bold');
  exportBtn.mousePressed(handleExport);
  
  // --- Save Video Button ---
  recordBtn = createButton('Save Video');
  recordBtn.position(460, height - 40); 
  styleUIElement(recordBtn);
  recordBtn.style('width', '80px');
  recordBtn.style('cursor', 'pointer');
  recordBtn.style('font-weight', 'bold');
  recordBtn.mousePressed(handleVideoToggle); 

  // --- Sliders ---
  sizeSlider = createSlider(100, 600, 250, 10); 
  sizeSlider.style('width', '80px');
  sizeLabel = createDiv("Size");
  styleLabel(sizeLabel);

  radiusSlider = createSlider(300, 1500, 650, 10); 
  radiusSlider.style('width', '80px');
  radiusLabel = createDiv("Radius");
  styleLabel(radiusLabel);

  layerGapSlider = createSlider(200, 1000, 400, 10);
  layerGapSlider.style('width', '80px');
  gapLabel = createDiv("Spacing");
  styleLabel(gapLabel);

  positionUI();
  generatePlaceholders();
  changeMode(1);
}

// Helper to inject script
function loadScript(url, callback){
    var script = document.createElement("script");
    script.type = "text/javascript";
    if (script.readyState){ 
        script.onreadystatechange = function(){
            if (script.readyState == "loaded" || script.readyState == "complete"){
                script.onreadystatechange = null;
                callback();
            }
        };
    } else { 
        script.onload = function(){ callback(); };
    }
    script.src = url;
    document.getElementsByTagName("head")[0].appendChild(script);
}

function generatePlaceholders() {
  for (let i = 0; i < totalImages; i++) {
    // --- HIGH RESOLUTION PLACEHOLDERS (2K) ---
    let pg = createGraphics(2048, 1536);
    
    // Maintain density 1 internally 
    pg.pixelDensity(1);

    pg.background(220 + random(-20, 20)); 
    pg.fill(100);
    pg.textAlign(CENTER, CENTER);
    
    pg.textSize(150); 
    pg.text("Upload", pg.width/2, pg.height/2 - 80);
    pg.textSize(80);
    pg.text("Image " + (i + 1), pg.width/2, pg.height/2 + 80);
    
    let img = pg.get();
    img.isPlaceholder = true; 
    let dynamicRadius = min(img.width, img.height) * 0.02;
    imgs[i] = makeRounded(img, dynamicRadius);
    pg.remove(); 
  }
}

function updateExportOptions() {
  exportSelect.html(''); 
  exportSelect.option('Current View (Window)', 'window');
  exportSelect.option('Square (1080x1080)', 'square');
  exportSelect.option('Portrait (1080x1920)', 'portrait');
  exportSelect.option('Landscape (1920x1080)', 'landscape');
  exportSelect.option('Print (2400x3000)', 'print');
}

function styleUIElement(elt) {
  elt.style('font-family', 'Helvetica, sans-serif');
  elt.style('font-size', '12px');
  elt.style('color', '#555');
  elt.style('background', 'transparent');
  elt.style('border', '1px solid #ccc');
  elt.style('border-radius', '4px');
  elt.style('padding', '4px');
  elt.style('opacity', '0.7');
}

function styleLabel(elt) {
  elt.style('font-family', 'Helvetica, sans-serif');
  elt.style('font-size', '10px');
  elt.style('color', '#333');
  elt.style('background', 'transparent');
  elt.style('pointer-events', 'none'); 
  elt.style('text-transform', 'uppercase');
  elt.style('letter-spacing', '1px');
}

function mouseWheel(event) {
  if (mode === 3 || mode === 4) {
    camDist += event.delta;
    camDist = constrain(camDist, 200, 10000);
    return false; 
  }
}

function handleVideoToggle() {
    if (isRecording) {
        stopVideoExport(); 
    } else {
        startVideoExport(); 
    }
}

function startVideoExport() {
    if (typeof CCapture === 'undefined') {
        alert("Video library loading... please wait 2 seconds and try again.");
        return;
    }

    let choice = exportSelect.value();
    let targetW = width;
    let targetH = height;

    if (choice === 'square') { targetW = 1080; targetH = 1080; }
    else if (choice === 'portrait') { targetW = 1080; targetH = 1920; }
    else if (choice === 'landscape') { targetW = 1920; targetH = 1080; }
    else if (choice === 'print') { targetW = 2400; targetH = 3000; }

    resizeCanvas(targetW, targetH);
    
    exportRatio = targetH / windowHeight; 
    aspectMultiplier = 1;
    if (choice !== 'window' && (mode === 1 || mode === 2 || mode === 4)) {
        let currentAspect = windowWidth / windowHeight;
        let targetAspect = targetW / targetH;
        if (targetAspect < currentAspect) {
            aspectMultiplier = currentAspect / targetAspect;
        }
    }
    
    isVideoExport = true; 

    recorder = new CCapture({ format: 'webm', framerate: 30 });
    recorder.start();
    isRecording = true;
    recordingStartFrame = frameCount;
    
    recordBtn.html("Stop"); 
    recordBtn.style('background', '#ffcccc');
    recordBtn.style('color', 'red');
}

function stopVideoExport() {
    if(recorder) {
        recorder.stop();
        recorder.save();
        isRecording = false;
        isVideoExport = false;
        
        recordBtn.html("Save Video");
        recordBtn.style('background', 'transparent');
        recordBtn.style('color', '#555');
        
        resizeCanvas(windowWidth, windowHeight);
        exportRatio = 1;
        aspectMultiplier = 1;
        positionUI();
    }
}

function handleExport() {
  let choice = exportSelect.value();

  let currentW = width;
  let currentH = height;
  let targetW = width;
  let targetH = height;

  if (choice === 'square') { targetW = 1080; targetH = 1080; }
  else if (choice === 'portrait') { targetW = 1080; targetH = 1920; }
  else if (choice === 'landscape') { targetW = 1920; targetH = 1080; }
  else if (choice === 'print') { targetW = 2400; targetH = 3000; }

  exportRatio = targetH / currentH; 
  aspectMultiplier = 1;
  if (choice !== 'window' && (mode === 1 || mode === 2 || mode === 4)) {
      let currentAspect = currentW / currentH;
      let targetAspect = targetW / targetH;
      if (targetAspect < currentAspect) {
          aspectMultiplier = currentAspect / targetAspect;
      }
  }

  isExporting = true; 
  resizeCanvas(targetW, targetH);
  
  // Explicitly redraw with the new size
  draw(); 
  
  save("cosmos_export_" + choice + ".png");
  
  resizeCanvas(windowWidth, windowHeight);
  isExporting = false; 
  exportRatio = 1;
  aspectMultiplier = 1;
  
  positionUI();
}

function handleFileUpload(file) {
  if (file.type === 'image') {
    loadImage(file.data, (loadedImg) => {
      // 1. Stop the shuffler immediately
      autoShuffle = false; 
      
      let dynamicRadius = min(loadedImg.width, loadedImg.height) * 0.02;
      let roundedImg = makeRounded(loadedImg, dynamicRadius);

      // 2. Find target index
      let targetIndex = -1;
      for (let i = 0; i < imgs.length; i++) {
        if (imgs[i].isPlaceholder) {
          targetIndex = i;
          break;
        }
      }
      if (targetIndex === -1) {
         targetIndex = uploadCounter % imgs.length;
      }

      // 3. Update the source array
      imgs[targetIndex] = roundedImg;

      // --- FIX: FORCE UPDATE ALL NODES FOR ALL MODES ---
      // This ensures that even if you are in Mode 1 or 2, 
      // the shapes pick up the new image data immediately.
      
      for (let i = 0; i < nodes.length; i++) {
          let imgIndex = i % imgs.length;
          let currentImg = imgs[imgIndex];
          
          // Re-bind the image. 
          // This updates the reference so it stops showing the old placeholder.
          nodes[i].img = currentImg;
          
          if (currentImg === roundedImg) {
              nodes[i].targetScale = 0.1; // Pop animation
          }

          // Recalculate Dimensions (Prevents distortion)
          // Modes 1 & 2 handle this in Draw(), but we do it here for safety
          // Modes 3 & 4 need this explicitly.
          let ratio = currentImg.width / currentImg.height;
          
          if (mode === 3 || mode === 4) {
              let baseSize = (mode === 4) ? 280 : 400;
              nodes[i].w = baseSize;
              nodes[i].h = baseSize;
              if (ratio >= 1) { nodes[i].h = nodes[i].w / ratio; }
              else { nodes[i].w = nodes[i].h * ratio; }
          }
      }

      uploadCounter++;
    });
  }
}

function makeRounded(img, radius) {
  let mask = createGraphics(img.width, img.height);
  
  // Maintain density 1 internally
  mask.pixelDensity(1);

  mask.clear(); 
  mask.fill(255);      
  mask.noStroke();
  mask.rect(0, 0, img.width, img.height, radius);
  let newImg = img.get();
  newImg.mask(mask);
  mask.remove();
  if(img.isPlaceholder) newImg.isPlaceholder = true;
  return newImg;
}

function getSortedNodeIndices() {
  let candidates = nodes.map((n, index) => {
    let score = 0; 
    if (mode === 3 || mode === 4) {
      if (mode === 3) score = -abs(n.zOff); 
      else score = random(100); 
    } else if (mode === 1) {
      let effectiveAngle = n.angle + globeRotation;
      let viewAngle = -camRotY; 
      score = sin(effectiveAngle - viewAngle + HALF_PI);
    } else if (mode === 2) {
      let effectiveAngle = n.angle; 
      score = cos(effectiveAngle - globeRotation); 
    }
    return { index, score };
  });
  candidates.sort((a, b) => b.score - a.score);
  return candidates.map(c => c.index);
}

function mousePressed() {
  if (mouseY > height - 50) return;
  prevMouseX = mouseX;
  prevMouseY = mouseY;
  isDragging = true;
}

function mouseReleased() {
  isDragging = false;
}

function handleCameraDrag() {
  if (!isDragging) return;
  let sensitivity = 0.005;
  camRotY += (mouseX - prevMouseX) * sensitivity;
  camRotX += (mouseY - prevMouseY) * sensitivity;
  camRotX = constrain(camRotX, -PI / 6, PI / 6);
  if (mode !== 3) camRotY = constrain(camRotY, -PI / 4, PI / 4);
  prevMouseX = mouseX;
  prevMouseY = mouseY;
}

function draw() {
  background(255); 
  
  if (mode === 1) drawHorizontalStack();
  else if (mode === 2) drawVerticalStack();
  else if (mode === 3) drawFloatingGallery(); 
  else if (mode === 4) drawLogoMode(); 
  
  if (isRecording) {
      recorder.capture(document.querySelector('canvas'));
      if (frameCount - recordingStartFrame > recordingDuration) {
          stopVideoExport();
      }
  }
}

function keyPressed() {
  if (key === '1') changeMode(1);
  if (key === '2') changeMode(2);
  if (key === '3') changeMode(3);
  if (key === '4') changeMode(4);
  
  if (key === 'h' || key === 'H') {
      isUIVisible = !isUIVisible;
      toggleUI(isUIVisible);
  }
}

function toggleUI(visible) {
    let displayVal = visible ? 'block' : 'none';
    uploadInput.style('display', displayVal);
    exportSelect.style('display', displayVal);
    exportBtn.style('display', displayVal);
    recordBtn.style('display', displayVal);
    
    if (mode === 1 || mode === 2) {
        sizeSlider.style('display', displayVal);
        radiusSlider.style('display', displayVal);
        layerGapSlider.style('display', displayVal);
        sizeLabel.style('display', displayVal);
        radiusLabel.style('display', displayVal);
        gapLabel.style('display', displayVal);
    }
}

// --- MODE MANAGER ---
function changeMode(newMode) {
  mode = newMode;
  nodes = []; 
  frameCount = 0; 
  camRotX = 0;
  camRotY = 0;
  
  if (mode === 3) {
    camDist = 2000;
  } else if (mode === 4) {
    // Zoom out further for the chaos/expansion
    camDist = 1500;
  } else {
    camDist = 2000;
  }

  updateExportOptions(); 
  
  let showSliders = (mode === 1 || mode === 2);
  if (showSliders) {
      sizeSlider.show(); radiusSlider.show(); layerGapSlider.show();
      sizeLabel.show(); radiusLabel.show(); gapLabel.show();
  } else {
      sizeSlider.hide(); radiusSlider.hide(); layerGapSlider.hide();
      sizeLabel.hide(); radiusLabel.hide(); gapLabel.hide();
  }

  if (imgs.length === 0) return;
  
  let pool = [...imgs]; 
  
  if (mode === 1 || mode === 2) {
      let layers = 3;
      let numPerLayer = 8;
      
      let poolIndex = 0;
      
      for (let l = 0; l < layers; l++) {
          let angleOffset = (l === 1) ? (TWO_PI / numPerLayer) / 2 : 0;
          
          for (let i = 0; i < numPerLayer; i++) {
              let angle = (TWO_PI / numPerLayer) * i + angleOffset;
              let img = pool[poolIndex % pool.length];
              poolIndex++;
              
              if (mode === 1) {
                 addNode(img, angle, 0, 250, 0, 0, 0, 'horizontal', l - 1); 
              } else {
                 addNode(img, angle, 0, 250, 0, 0, 0, 'vertical', l - 1);
              }
          }
      }
      
  } else if (mode === 3) { // Floating Gallery
    let count = min(6, pool.length); 
    for (let i = 0; i < count; i++) {
      let x = random(-800, 800); 
      let y = random(-700, 700); 
      let z = random(-700, 700); 
      let img = pool[i % pool.length];
      addNode(img, 0, 0, 400, x, y, z, 'flat', 0);
      let n = nodes[nodes.length-1];
      n.driftVel = createVector(random(-0.2,0.2), random(-0.2,0.2), random(-0.2,0.2));
    }
  } else if (mode === 4) { // Logo Hexagon
    let baseRadius = 420; 
    for (let i = 0; i < 6; i++) {
      // Create full hexagon logic again
      let angle = (TWO_PI / 6) * i; 
      addNode(pool[i % pool.length], angle, baseRadius, 280, 0, 0, 0, 'flat', 0);
    }
  }
}

function addNode(img, angle, radius, maxSize, xOff, yOff, zOff, curveType, layerIndex) {
  if (!img) return;
  nodes.push({ 
      img, angle, radius, w: maxSize, h: maxSize, 
      targetScale: 1, xOff, yOff, zOff, 
      curveType, layerIndex 
  });
}

// --- DRAW FUNCTIONS ---
function drawHorizontalStack() {
  let userSize = sizeSlider.value();
  let userRadius = radiusSlider.value(); 
  let userLayerGap = layerGapSlider.value();

  let centerY = 0; 
  camera(0, centerY, 0, 0, centerY, -500, 0, 1, 0);

  if (!isExporting && !isRecording) handleCameraDrag();
  rotateX(camRotX);
  rotateY(camRotY);
  
  if (isExporting || isVideoExport) scale(exportRatio);

  if (!isExporting && !isRecording && autoShuffle && frameCount - lastSwitchFrame >= switchInterval) {
    refreshImagesRandomly();
    lastSwitchFrame = frameCount;
  }

  globeRotation += 0.01;

  for (let n of nodes) {
    let ratio = n.img.width / n.img.height;
    if (ratio >= 1) { n.w = userSize; n.h = userSize / ratio; }
    else { n.h = userSize; n.w = userSize * ratio; }

    let yPos = n.layerIndex * userLayerGap; 
    let effectiveRadius = (Math.abs(n.layerIndex) === 0) ? userRadius : userRadius * 0.9;

    push();
    let x = effectiveRadius * cos(n.angle + globeRotation);
    let z = effectiveRadius * sin(n.angle + globeRotation);
    let drift = sin(frameCount * 0.05 + n.angle + yPos) * 10;
    
    translate(x, yPos, z + drift);
    rotateY(-(n.angle + globeRotation) - HALF_PI); 
    drawCurvedPlane(n.img, n.w, n.h, effectiveRadius, 'horizontal');
    pop();
  }
}

function drawVerticalStack() {
  let userSize = sizeSlider.value();
  let userRadius = radiusSlider.value(); 
  let userLayerGap = layerGapSlider.value();

  let centerX = 0; 
  camera(centerX, 0, 0, centerX, 0, -600, 0, 1, 0);

  if (!isExporting && !isRecording) handleCameraDrag();
  rotateX(camRotX);
  rotateY(camRotY);
  
  if (isExporting || isVideoExport) scale(exportRatio);

  globeRotation += 0.01;
  rotateX(globeRotation);

  for (let n of nodes) {
    let ratio = n.img.width / n.img.height;
    if (ratio >= 1) { n.w = userSize; n.h = userSize / ratio; }
    else { n.h = userSize; n.w = userSize * ratio; }

    let xPos = n.layerIndex * userLayerGap;
    let effectiveRadius = userRadius;

    push();
    let drift = sin(frameCount * 0.05 + n.angle + xPos) * 10;
    let y = effectiveRadius * sin(n.angle) + drift;
    let z = effectiveRadius * cos(n.angle);
    
    translate(xPos, y, z);
    rotateX(-n.angle + sin(globeRotation) * 0.15);
    rotateX(PI);
    drawCurvedPlane(n.img, n.w, n.h, effectiveRadius, 'vertical');
    pop();
  }
}

function drawFloatingGallery() {
  let useScale = (isExporting || isVideoExport) ? exportRatio : 1;
  let useAspect = (isExporting || isVideoExport) ? aspectMultiplier : 1;
  let finalDist = camDist * useScale * useAspect;
  
  camera(0, 0, finalDist, 0, 0, 0, 0, 1, 0);
  
  if (!isExporting && !isRecording) handleCameraDrag();
  rotateX(camRotX);
  rotateY(camRotY);
  
  if (isExporting || isVideoExport) scale(exportRatio);

  if (!isExporting && !isRecording && autoShuffle && frameCount - lastSwitchFrame >= switchInterval) {
    refreshImagesRandomly();
    lastSwitchFrame = frameCount;
  }

  for (let n of nodes) {
    push();
    if (!isExporting && !isRecording) {
        n.xOff += n.driftVel.x;
        n.yOff += n.driftVel.y;
        n.zOff += n.driftVel.z;
        if (n.xOff > 1200) n.xOff = -1200;
        if (n.xOff < -1200) n.xOff = 1200;
        if (n.yOff > 1000) n.yOff = -1000;
        if (n.yOff < -1000) n.yOff = 1000;
        if (n.zOff > 1000) n.zOff = -1000;
        if (n.zOff < -1000) n.zOff = 1000;
    }
    translate(n.xOff, n.yOff, n.zOff);
    rotateY(-camRotY);
    rotateX(-camRotX);

    n.targetScale = lerp(n.targetScale, 1, 0.1);
    scale(n.targetScale);
    texture(n.img);
    plane(n.w, n.h);
    pop();
  }
}

// --- MODE 4: KINETIC VORTEX (FERRIS WHEEL STYLE) ---
function drawLogoMode() {
  let useScale = (isExporting || isVideoExport) ? exportRatio : 1;
  let finalDist = camDist * useScale; 
  camera(0, 0, finalDist, 0, 0, 0, 0, 1, 0);
  
  // 1. Global Spin REMOVED so images stay upright
  // rotateZ(frameCount * 0.02); 
  
  // 2. Global Tilt (The Heaving)
  rotateX(sin(frameCount * 0.01) * 0.5); 
  rotateY(cos(frameCount * 0.015) * 0.3);
  
  if (isExporting || isVideoExport) scale(exportRatio);

  // Auto shuffle logic
  if (!isExporting && !isRecording && autoShuffle && frameCount % 20 === 0) {
    let pickNode = floor(random(nodes.length));
    nodes[pickNode].img = random(imgs);
    nodes[pickNode].targetScale = 0.1; 
  }

  for (let i = 0; i < nodes.length; i++) {
    let n = nodes[i];
    push();
    
    // 3. Dynamic Radius (Expansion/Contraction)
    let expansion = sin(frameCount * 0.04 + i) * 200; 
    let currentRadius = n.radius + 300 + expansion;

    // 4. Spiral Motion (Increased speed to compensate for lack of global spin)
    let orbitalAngle = n.angle + (frameCount * 0.03); 
    let x = currentRadius * cos(orbitalAngle);
    let y = currentRadius * sin(orbitalAngle);
    
    // 5. Z-Axis Turbulence
    let z = cos(frameCount * 0.05 + i * 2) * 150; 
    
    translate(x, y, z);

    // --- Kinetic Size Variation (Wavy Effect) ---
    // Scales the image size up and down in a wave pattern
    let sizeWave = map(sin(frameCount * 0.05 + i * 0.5), -1, 1, 0.6, 1.4);
    n.targetScale = lerp(n.targetScale, 1, 0.2);
    scale(n.targetScale * sizeWave);

    // --- Constrained "Wobble" for Legibility ---
    rotateX(sin(frameCount * 0.02 + i) * 0.25); 
    rotateY(cos(frameCount * 0.03 + i) * 0.25); 
    rotateZ(sin(frameCount * 0.01 + i) * 0.1);  
    
    texture(n.img);
    plane(n.w, n.h);
    pop();
  }
}

function drawCurvedPlane(img, w, h, radius, type) {
  texture(img);
  let steps = 15; 
  beginShape(TRIANGLE_STRIP);
  for (let i = 0; i <= steps; i++) {
    let u = i / steps; 
    if (type === 'horizontal') {
      let theta = map(u, 0, 1, -w / (2 * radius), w / (2 * radius));
      let px = radius * sin(theta);
      let pz = -1 * (radius * cos(theta) - radius);
      vertex(px, -h/2, pz, u, 0);
      vertex(px, h/2, pz, u, 1);
    } else if (type === 'vertical') {
      let theta = map(u, 0, 1, -h / (2 * radius), h / (2 * radius));
      let py = radius * sin(theta);
      let pz = -1 * (radius * cos(theta) - radius);
      vertex(-w/2, py, pz, 0, u);
      vertex(w/2, py, pz, 1, u);
    }
  }
  endShape();
}

function refreshImagesRandomly() {
  if (imgs.length === 0) return;
  
  let pickNode = floor(random(nodes.length));
  let pickImg = random(imgs);
  nodes[pickNode].img = pickImg;
  
  if (mode === 4) { nodes[pickNode].w = 280; }
  else if (mode === 3) { nodes[pickNode].w = 400; }
  
  let ratio = pickImg.width / pickImg.height;
  if (mode === 4 || mode === 3) {
      if (ratio >= 1) nodes[pickNode].h = nodes[pickNode].w / ratio;
      else {
          nodes[pickNode].h = nodes[pickNode].w; 
          nodes[pickNode].w = nodes[pickNode].h * ratio;
      }
  }
}

function positionUI() {
  uploadInput.position(20, height - 40);
  exportSelect.position(220, height - 40);
  exportBtn.position(370, height - 40);
  recordBtn.position(460, height - 40);
  
  sizeSlider.position(550, height - 40);
  radiusSlider.position(670, height - 40);
  layerGapSlider.position(790, height - 40);
  
  sizeLabel.position(550, height - 55);
  radiusLabel.position(670, height - 55);
  gapLabel.position(790, height - 55);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  positionUI();
}
