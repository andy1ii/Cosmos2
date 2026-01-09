let mode = 1;

let imgs = [];
let totalImages = 6;
let nodes = [];

let globeRotation = 0;
let lastSwitchFrame = 0;
let switchInterval = 60;

let autoShuffle = true;

let uploadCounter = 0;
let isResetting = false;

let camRotX = 0;
let camRotY = 0;
let camDist = 2000;
let prevMouseX, prevMouseY;
let isDragging = false;

let exportRatio = 1;
let isExporting = false;
let aspectMultiplier = 1;

let recorder;
let isRecording = false;
let recordingDuration = 300;
let recordingStartFrame = 0;
let isVideoExport = false;

let uploadInput;
let exportSelect;
let exportBtn;
let recordBtn;

let sizeSlider, radiusSlider, layerGapSlider;
let sizeLabel, radiusLabel, gapLabel;

let numImagesSlider, numLabel;
let perspectiveSlider, perspLabel;

let isTicking = false;
let tickBtn;

let modeButtons = [];

let isUIVisible = true;

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);

  noStroke();
  textureMode(NORMAL);
  textureWrap(CLAMP);

  if (typeof CCapture === 'undefined') {
      loadScript("https://unpkg.com/ccapture.js@1.1.0/build/CCapture.all.min.js", () => {
          console.log("CCapture loaded dynamically.");
      });
  }

  uploadInput = createFileInput(handleFileUpload);
  uploadInput.attribute('multiple', 'true');
  styleUIElement(uploadInput);
  uploadInput.style('width', '180px');

  uploadInput.elt.onclick = function() { isResetting = true; };

  exportSelect = createSelect();
  updateExportOptions();
  styleUIElement(exportSelect);
  exportSelect.style('width', '140px');

  exportBtn = createButton('Save Image');
  styleUIElement(exportBtn);
  exportBtn.mousePressed(handleExport);

  recordBtn = createButton('Save Video');
  styleUIElement(recordBtn);
  recordBtn.mousePressed(handleVideoToggle);

  sizeSlider = createSlider(50, 600, 150, 10);
  sizeSlider.style('width', '80px');
  sizeLabel = createDiv("Size");
  styleLabel(sizeLabel);

  radiusSlider = createSlider(100, 2000, 650, 10);
  radiusSlider.style('width', '80px');
  radiusLabel = createDiv("Radius");
  styleLabel(radiusLabel);

  layerGapSlider = createSlider(200, 1000, 400, 10);
  layerGapSlider.style('width', '80px');
  gapLabel = createDiv("Spacing");
  styleLabel(gapLabel);

  numImagesSlider = createSlider(6, 13, 6, 1);
  numImagesSlider.style('width', '80px');
  numImagesSlider.input(handleCountChange);
  numLabel = createDiv("Count/Dens");
  styleLabel(numLabel);

  perspectiveSlider = createSlider(10, 150, 60, 1);
  perspectiveSlider.style('width', '80px');
  perspLabel = createDiv("Perspective");
  styleLabel(perspLabel);

  tickBtn = createButton('Motion: Smooth');
  styleUIElement(tickBtn);
  tickBtn.style('width', '110px');
  tickBtn.style('text-align', 'center');
  tickBtn.mousePressed(toggleTickMode);

  setupModeButtons();

  generatePlaceholders();

  positionUI();

  changeMode(1);
}

function setupModeButtons() {
    for (let i = 0; i < 5; i++) {
        let btn = createButton(String(i + 1));

        btn.style('font-family', 'Helvetica, sans-serif');
        btn.style('font-size', '14px');
        btn.style('font-weight', 'bold');
        btn.style('text-align', 'center');
        btn.style('border', '1px solid #ccc');
        btn.style('border-radius', '4px');
        btn.style('cursor', 'pointer');

        btn.style('width', '30px');
        btn.style('height', '30px');
        btn.style('padding', '0');
        btn.style('line-height', '28px');

        btn.mousePressed(() => changeMode(i + 1));

        modeButtons.push(btn);
    }
}

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
    let pg = createGraphics(1024, 1024);
    pg.pixelDensity(1);
    pg.background(220 + random(-20, 20));
    pg.fill(100);
    pg.textAlign(CENTER, CENTER);
    pg.textSize(100);
    pg.text("Upload", pg.width/2, pg.height/2 - 60);
    pg.textSize(60);
    pg.text("Image " + (i + 1), pg.width/2, pg.height/2 + 60);

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
  if (mode === 3 || mode === 4 || mode === 5) {
    camDist += event.delta;

    if (mode === 5) {
        camDist = constrain(camDist, 0.1, 4000);
    } else {
        camDist = constrain(camDist, 200, 10000);
    }
    return false;
  }
}

function toggleTickMode() {
    isTicking = !isTicking;

    if(isTicking) {
        tickBtn.html("Motion: Clock");
        tickBtn.style('background', '#eee');
    } else {
        tickBtn.html("Motion: Smooth");
        tickBtn.style('background', 'transparent');
    }
}

function handleVideoToggle() {
    if (isRecording) stopVideoExport();
    else startVideoExport();
}

function startVideoExport() {
    if (typeof CCapture === 'undefined') {
        alert("Video library loading... please wait 2 seconds and try again.");
        return;
    }
    let choice = exportSelect.value();
    let targetW = width, targetH = height;
    if (choice === 'square') { targetW = 1080; targetH = 1080; }
    else if (choice === 'portrait') { targetW = 1080; targetH = 1920; }
    else if (choice === 'landscape') { targetW = 1920; targetH = 1080; }
    else if (choice === 'print') { targetW = 2400; targetH = 3000; }

    resizeCanvas(targetW, targetH);
    exportRatio = targetH / windowHeight;
    aspectMultiplier = 1;
    if (choice !== 'window' && (mode !== 3)) {
        let currentAspect = windowWidth / windowHeight;
        let targetAspect = targetW / targetH;
        if (targetAspect < currentAspect) aspectMultiplier = currentAspect / targetAspect;
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
        toggleUI(isUIVisible);
    }
}

function handleExport() {
  let choice = exportSelect.value();
  let targetW = width, targetH = height;

  if (choice === 'square') { targetW = 1080; targetH = 1080; }
  else if (choice === 'portrait') { targetW = 1080; targetH = 1920; }
  else if (choice === 'landscape') { targetW = 1920; targetH = 1080; }
  else if (choice === 'print') { targetW = 2400; targetH = 3000; }

  exportRatio = targetH / height;
  aspectMultiplier = 1;
  if (choice !== 'window' && (mode !== 3)) {
      let currentAspect = width / height;
      let targetAspect = targetW / targetH;
      if (targetAspect < currentAspect) aspectMultiplier = currentAspect / targetAspect;
  }

  isExporting = true;
  resizeCanvas(targetW, targetH);
  draw();
  save("cosmos_export_" + choice + ".png");
  resizeCanvas(windowWidth, windowHeight);
  isExporting = false;
  exportRatio = 1;
  aspectMultiplier = 1;
  positionUI();
  toggleUI(isUIVisible);
}

function handleFileUpload(file) {
  if (file.type === 'image') {
    loadImage(file.data, (loadedImg) => {
      autoShuffle = false;

      if (isResetting) {
        imgs = [];
        nodes = [];
        isResetting = false;
        uploadCounter = 0;
      }

      let dynamicRadius = min(loadedImg.width, loadedImg.height) * 0.02;
      let roundedImg = makeRounded(loadedImg, dynamicRadius);

      imgs.push(roundedImg);
      refreshNodesForCurrentMode();

      uploadCounter++;
    });
  }
}

function refreshNodesForCurrentMode() {
  if (mode === 4) {
    rebuildMode4();
  } else if (mode === 5) {
    rebuildMode5();
  } else {
    nodes = [];
    let pool = [...imgs];
    if (pool.length === 0) return;

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
              addNode(img, angle, 0, 250, 0, 0, 0, (mode===1?'horizontal':'vertical'), l - 1);
          }
      }
    } else if (mode === 3) {
      let count = max(6, pool.length);
      for (let i = 0; i < count; i++) {
        let x = random(-800, 800);
        let y = random(-700, 700);
        let z = random(-700, 700);
        let img = pool[i % pool.length];
        addNode(img, 0, 0, 400, x, y, z, 'flat', 0);
        let n = nodes[nodes.length-1];
        n.driftVel = createVector(random(-0.2,0.2), random(-0.2,0.2), random(-0.2,0.2));
      }
    }
  }
}

function makeRounded(img, radius) {
  let mask = createGraphics(img.width, img.height);
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

  if (mode !== 4) {
      perspective(PI / 3.0, width / height, 0.1, 50000);
  }

  if (mode === 1) drawHorizontalStack();
  else if (mode === 2) drawVerticalStack();
  else if (mode === 3) drawFloatingGallery();
  else if (mode === 4) drawLogoMode();
  else if (mode === 5) drawFibonacciSphere();

  if (isRecording) {
      recorder.capture(document.querySelector('canvas'));
      if (frameCount - recordingStartFrame > recordingDuration) stopVideoExport();
  }
}

function keyPressed() {
  if (key === '1') changeMode(1);
  if (key === '2') changeMode(2);
  if (key === '3') changeMode(3);
  if (key === '4') changeMode(4);
  if (key === '5') changeMode(5);

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

    sizeSlider.hide(); sizeLabel.hide();
    radiusSlider.hide(); radiusLabel.hide();
    layerGapSlider.hide(); gapLabel.hide();
    numImagesSlider.hide(); numLabel.hide();
    perspectiveSlider.hide(); perspLabel.hide();
    tickBtn.hide();

    for(let btn of modeButtons) {
        btn.style('display', displayVal);
    }

    if (!visible) return;

    if (mode === 1 || mode === 2 || mode === 5) {
        sizeSlider.show(); sizeLabel.show();
        radiusSlider.show(); radiusLabel.show();
    }

    if (mode === 1 || mode === 2) {
        layerGapSlider.show(); gapLabel.show();
    }

    if (mode === 5) {
        numImagesSlider.show(); numLabel.show();
    }

    if (mode === 4) {
        perspectiveSlider.show(); perspLabel.show();
        tickBtn.show();
    }
}

function handleCountChange() {
    if (mode === 5) rebuildMode5();
}

function rebuildMode4() {
  nodes = [];
  if (imgs.length === 0) return;

  let targetCount = imgs.length;
  let baseRadius = 420;

  for (let i = 0; i < targetCount; i++) {
     let angle = (TWO_PI / targetCount) * i;
     addNode(imgs[i], angle, baseRadius, 280, 0, 0, 0, 'flat', 0);
  }
}

function rebuildMode5() {
  let numNodes = numImagesSlider.value() * 5;
  nodes = [];
  if (imgs.length === 0) return;
  let pool = [...imgs];

  for (let i = 0; i < numNodes; i++) {
    let phi = Math.acos(1 - 2 * (i + 0.5) / numNodes);
    let theta = Math.PI * (1 + Math.sqrt(5)) * i;
    let img = pool[i % pool.length];

    nodes.push({
        img: img,
        phi: phi,
        theta: theta,
        aspect: img.width / img.height,
        targetScale: 1,
        mode5: true
    });
  }
}

function updateModeButtonStyle() {
    for (let i = 0; i < modeButtons.length; i++) {
        if (i + 1 === mode) {
            modeButtons[i].style('background-color', '#333');
            modeButtons[i].style('color', '#fff');
            modeButtons[i].style('border', '1px solid #333');
        } else {
            modeButtons[i].style('background-color', 'rgba(255,255,255,0.8)');
            modeButtons[i].style('color', '#555');
            modeButtons[i].style('border', '1px solid #ccc');
        }
    }
}

function changeMode(newMode) {
  mode = newMode;
  nodes = [];
  frameCount = 0;
  camRotX = 0;
  camRotY = 0;

  if(mode === 4) {
      camDist = 1500;
  } else if (mode === 5) {
      camDist = 0.1;
  } else {
      camDist = 2000;
  }

  updateModeButtonStyle();

  updateExportOptions();
  positionUI();
  toggleUI(isUIVisible);

  refreshNodesForCurrentMode();
}

function addNode(img, angle, radius, maxSize, xOff, yOff, zOff, curveType, layerIndex) {
  if (!img) return;
  let ratio = img.width / img.height;
  let w = maxSize;
  let h = maxSize;
  if (ratio >= 1) h = w / ratio;
  else w = h * ratio;

  nodes.push({
      img, angle, radius, w, h,
      targetScale: 1, xOff, yOff, zOff,
      curveType, layerIndex, aspect: ratio
  });
}

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

function drawLogoMode() {
  let fovVal = perspectiveSlider.value();
  let fov = radians(fovVal);
  let aspect = width / height;
  perspective(fov, aspect, 0.1, 50000);
  let scaleFactor = tan(PI / 6.0) / tan(fov / 2.0);

  let useScale = (isExporting || isVideoExport) ? exportRatio : 1;
  let finalDist = camDist * useScale * scaleFactor;

  camera(0, 0, finalDist, 0, 0, 0, 0, 1, 0);

  if (!isExporting && !isRecording) handleCameraDrag();

  rotateX(camRotX);
  rotateY(camRotY);

  if (isExporting || isVideoExport) scale(exportRatio);

  let rotationOffset = 0;
  if (!isTicking) {
      rotationOffset = frameCount * 0.03;
  } else {
      let stepSize = TWO_PI / nodes.length;
      let period = 60;
      let tickIndex = floor(frameCount / period);
      let t = (frameCount % period) / (period * 0.5);
      t = constrain(t, 0, 1);
      let easedT = 1 - pow(1 - t, 3);
      rotationOffset = (tickIndex + easedT) * stepSize;
  }

  for (let i = 0; i < nodes.length; i++) {
    let n = nodes[i];
    push();

    let expansion = sin(frameCount * 0.04 + i * 0.1) * 200;
    let zOffset = cos(frameCount * 0.05 + i * 0.2) * 150;

    if (isTicking) {
        expansion = 0;
        zOffset = 0;
    }

    let currentRadius = n.radius + 300 + expansion;
    let orbitalAngle = n.angle + rotationOffset;

    let x = currentRadius * cos(orbitalAngle);
    let y = currentRadius * sin(orbitalAngle);
    let z = zOffset;

    translate(x, y, z);

    rotateY(-camRotY);
    rotateX(-camRotX);

    let sizeWave = 1;
    if (!isTicking) {
        sizeWave = map(sin(frameCount * 0.05 + i * 0.5), -1, 1, 0.6, 1.4);
    }

    n.targetScale = lerp(n.targetScale, 1, 0.2);
    scale(n.targetScale * sizeWave);

    texture(n.img);
    plane(n.w, n.h);
    pop();
  }
}

function drawFibonacciSphere() {
  let useScale = (isExporting || isVideoExport) ? exportRatio : 1;
  let finalDist = camDist * useScale;

  let currentRadius = radiusSlider.value();
  let currentSize = sizeSlider.value();

  camera(0, 0, finalDist, 0, 0, 0, 0, 1, 0);

  if (!isExporting && !isRecording) handleCameraDrag();
  rotateX(camRotX);
  rotateY(camRotY);

  rotateY(frameCount * 0.002);

  if (isExporting || isVideoExport) scale(exportRatio);

  if (!isExporting && !isRecording && autoShuffle && frameCount - lastSwitchFrame >= switchInterval) {
    refreshImagesRandomly();
    lastSwitchFrame = frameCount;
  }

  for (let n of nodes) {
    if(!n.mode5) continue;

    push();

    let x = currentRadius * Math.sin(n.phi) * Math.cos(n.theta);
    let y = currentRadius * Math.sin(n.phi) * Math.sin(n.theta);
    let z = currentRadius * Math.cos(n.phi);

    translate(x, y, z);

    let angleY = atan2(x, z);
    let distXZ = sqrt(x * x + z * z);
    let angleX = -atan2(y, distXZ);

    rotateY(angleY);
    rotateX(angleX);

    n.targetScale = lerp(n.targetScale, 1, 0.1);
    scale(n.targetScale);

    let w = currentSize;
    let h = currentSize;
    if (n.aspect >= 1) h = w / n.aspect;
    else w = h * n.aspect;

    texture(n.img);
    plane(w, h);
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

  if (mode === 5) {
      nodes[pickNode].aspect = pickImg.width / pickImg.height;
      nodes[pickNode].targetScale = 0.1;
      return;
  }

  if (mode === 4) { nodes[pickNode].w = 280; }
  else if (mode === 3) { nodes[pickNode].w = 400; }

  let ratio = pickImg.width / pickImg.height;
  if (mode === 3 || mode === 4) {
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
  sizeLabel.position(550, height - 55);

  radiusSlider.position(670, height - 40);
  radiusLabel.position(670, height - 55);

  let slot3X = 790;

  layerGapSlider.position(slot3X, height - 40);
  gapLabel.position(slot3X, height - 55);

  numImagesSlider.position(slot3X, height - 40);
  numLabel.position(slot3X, height - 55);

  perspectiveSlider.position(slot3X, height - 40);
  perspLabel.position(slot3X, height - 55);

  tickBtn.position(slot3X + 90, height - 40);

  let startX = width - 40;
  let btnSize = 30;
  let gap = 10;

  for (let i = modeButtons.length - 1; i >= 0; i--) {
      let pos = startX - ((modeButtons.length - 1 - i) * (btnSize + gap)) - btnSize;
      modeButtons[i].position(pos, 20);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  positionUI();
  toggleUI(isUIVisible);
}
