// Sympathetic Orchestra 
// by Bob Tianqi Wei, Shm Garanganao Almeda, Ethan Tam, Dor Abrahamson and Bjoern Hartmann
// UC Berkeley, 2024

// This is the main file for the Sympathetic Orchestra project.

let sound;
let amp;

let sounds = {};
let sliders = {};
let allLoaded = false;
let masterVolumeSlider;
let isPaused = false;

let cursorX = 0;
let cursorY = 0;

let hideSlidersButton;
let showSlidersButton;

/* Preload sound files */
function preload() {
  for (let i = 0; i < texts.length; i++) {
    let instrument = texts[i];
    sounds[instrument] = loadSound('soundfiles/' + instrument + '.mp3', soundLoaded);
    
    // Add an event listener for when the sound ends
    sounds[instrument].onended(() => soundEnded(i));
  }
}

// soundEnded callback function
function soundEnded(index) {
  colors[index][0] = 255; // Reset the color to white
  colors[index][1] = 255;
  colors[index][2] = 255;
}

function soundLoaded() {
  let loadedCount = 0;
  for (let instrument in sounds) {
    if (sounds[instrument].isLoaded()) {
      loadedCount++;
    }
  }
  if (loadedCount === texts.length) {
    allLoaded = true;
    console.log("All sounds loaded successfully");
  }
}

/* Modify the basic parameters. */
const n_parts = 18;
const n_grid_X = 16, n_grid_Y = 7;
const sizeX = 1440, sizeY = 900;
const globalX = 50, globalY = 50; // The margin size. 

/* Defining the objects and arrays according to the basic parameters above. 
   No need to modify! */
let soundfilePtr = [];
let ampPtr = [];
let unitAttributes = Array.from({ length: n_parts }, () => Array(4).fill(0));
let textAttributes = Array.from({ length: n_parts }, () => Array(2).fill(0));
let colors = Array.from({ length: n_parts }, () => Array(3).fill(0));
let ampvalue = Array(n_parts).fill(0); // The actual values of the output of the soundtracks. 
let ampVals = Array(n_parts).fill(0); // The input values to correct the volume of the soundtracks. 
let ampValCoef = 1;

const unitX = (sizeX - globalX * 2) / n_grid_X;
const unitY = (sizeY - globalY * 2) / n_grid_Y;
const rectRad = 40;
const dX = unitX / 4;
const dY = unitY / 4; // The distance between grids when drawing the rectangles. 

let playTime = 0;
let lastTime;

let lookupTable = Array.from({ length: n_grid_Y + 1 }, () => Array(n_grid_X + 1).fill(0));

let states = [0, 0];

/* Parameters related to analyzing user inputs. */ 
let minY = 0;
let maxY = sizeY;
let minX = 0;
let maxX = sizeX;
const grabThreshold = 0.8;
const releaseThreshold = 0;
const lowVoiceVal = 0.01;
let isPlaying = false;

const gestures = [];
let numGestures = gestures.length;
let cur = 0;
const totalTime = 164000; // Modify according to the duration of the LONGEST soundtrack. 
let gestureFlags = Array(n_parts).fill(0);

/* Defining the GUI. */
let units = [[2, 5, 1, 2, 255],
             [2, 7, 1, 2, 255],
             [2, 9, 1, 2, 255],
             [2, 11, 1, 2, 255],
             [0, 8, 1, 4, 255], 
             [1, 8, 1, 2, 255], 
             [1, 10, 1, 2, 255],
             [1, 12, 1, 1, 255],
             [0, 6, 2, 2, 255],
             [0, 4, 2, 2, 255],
             [1, 3, 2, 1, 255],
             [5, 0, 2, 7, 255],
             [3, 1, 2, 6, 255],
             [3, 7, 2, 4, 255],
             [5, 9, 2, 7, 255],
             [3, 11, 2, 4, 255],
             [2, 4, 1, 1, 255],
             [5, 7, 2, 2, 100]
            ];
// units: {Vertical Axis, Horizontal Axis, Vertical Length, Horizontal Axis, Color(0-255, Gray)}
const texts = ["Flute",
               "Oboe",
               "Clarinet",
               "Bassoon",
               "French Horns",
               "Trumpets",
               "Trombones",
               "Tuba",
               "Timpani",
               "Percussion",
               "Piano",
               "Violin 1",
               "Violin 2",
               "Viola",
               "Cello",
               "Bass",
               "Harp",
               "Conductor"
              ];
// Must ensure: texts.length == units.length
const muted = [false,
               false,
               false,
               false,
               false,
               false,
               false,
               false,
               false,
               true,
               false,
               false,
               false,
               false,
               false,
               false,
               true,
               true,
              ];

/* Function to draw the GUI. */
function deriveAttributes() {
  // Called only in preprocessing. 
  for (let i = units.length - 1; i > -1; --i) {
    unitAttributes[i][0] = globalX + units[i][1] * unitX;
    unitAttributes[i][1] = globalY + units[i][0] * unitY;
    unitAttributes[i][2] = units[i][3] * unitX - dX;
    unitAttributes[i][3] = units[i][2] * unitY - dY;
    textAttributes[i][0] = globalX + (units[i][1] * 2 + units[i][3]) * unitX / 2 - 8 * texts[i].length;
    textAttributes[i][1] = globalY + (units[i][0] * 2 + units[i][2]) * unitY / 2 - 10;
    colors[i][0] = (units[i][4] < 128) ? 255 : 0;
    colors[i][1] = colors[i][0];
    colors[i][2] = colors[i][0];
  }
};

function _deriveColors() {
  for (let i = units.length - 1; i > -1; --i) {
    let instrument = texts[i];
    // *4 to make the color more vibrant
    let enhancedValue = ampvalue[instrument] * 4;
    colors[i][0] = int(_normalize(enhancedValue, 0, 1, 255, 0));
    colors[i][1] = int(_normalize(enhancedValue, 0, 1, 255, 0));
    colors[i][2] = int(_normalize(enhancedValue, 0, 1, 255, 0));
  }
}


function drawParts() {
  noStroke();
  _deriveColors();
	
  for (let i = units.length - 1; i > -1; --i) {
    // Big Units. 
    if (units[i][4] === -1) fill(150, 200, 175);
    else if (gestureFlags[i] === 0) fill(255, 90, 90);
    else fill(units[i][4], units[i][4], units[i][4]);
    rect(unitAttributes[i][0], unitAttributes[i][1], unitAttributes[i][2], unitAttributes[i][3], rectRad);
    
    // Small units. 
    if (i !== 17) {
      fill(colors[i][0], colors[i][1], colors[i][2]);
      for (let j = units[i][2] - 1; j > -1; --j) {
        for (let k = units[i][3] - 1; k > -1; --k) {
          rect(unitAttributes[i][0] + k * unitX + dX / 2, unitAttributes[i][1] + j * unitY + dY / 2, unitX - 2 * dX, unitY - 2 * dY, rectRad);
        }
      }
    }
    
    // Text. 
    let c = (units[i][4] < 128) ? 255 : 0;
    fill(c, c, c);
    textSize(20);
    text(texts[i], textAttributes[i][0], textAttributes[i][1]);
  }
};

/* Functions controlling the soundtracks. */
function playAll() {
  // Start Playing all soundtracks.
  if (isPlaying || playTime > totalTime) return;
  
  for (let i = soundfilePtr.length - 1; i > -1; --i) {
    if (!muted[i]) soundfilePtr[i].play();
  }
  isPlaying = true;
};

function pauseAll() {
  // Pause all soundtracks.
  if (!isPlaying || playTime > totalTime) return;
  for (let i = soundfilePtr.length - 1; i > -1; --i) {
    if (!muted[i]) soundfilePtr[i].pause();
  }
  isPlaying = false;
};

function setAmp(lowerVoice) {
  // Update the amplitudes for all soundtracks.
  if (lowerVoice) {
    for (let i = units.length - 1; i > -1; --i) {
      if (i === 10) soundfilePtr[i].amp(1); 
      else soundfilePtr[i].amp(lowVoiceVal);
    }
  } else {
    for (let i = units.length - 1; i > -1; --i) {
      if (i === 10) soundfilePtr[i].amp(1);
      else soundfilePtr[i].amp(gestureFlags[i] === 1 ? ampVals[i] * ampValCoef : lowVoiceVal);
    }
  }
};

function _updateAmpVal() {
  for (let i = 0; i < texts.length; i++) {
    let instrument = texts[i];
    //console.log(texts[i] + ": " + ampPtr[instrument].getLevel());
    ampvalue[instrument] = ampPtr[instrument].getLevel();
  }
}

function hideMasterVolumeSlider() {
  masterVolumeSlider.style('display', 'none');
}

function showMasterVolumeSlider() {
  masterVolumeSlider.style('display', 'block');
}

function hideInstrumentSliders() {
  for (let instrument in sliders) {
      sliders[instrument].style('display', 'none');
  }
}

function showInstrumentSliders() {
  for (let instrument in sliders) {
      sliders[instrument].style('display', 'block');
  }
}


/* Functions recording time. */
function updateTime() {
  let curTime = millis();
  let timeElapsed = curTime - lastTime;
  lastTime = curTime;
  if (isPlaying) playTime += timeElapsed;
}

function renewGestureFlags() {
  if (cur === numGestures) return;
  if (playTime > gestures[cur][0]) {
    gestureFlags[int(gestures[cur++][1])] = 0;
  }
}

/* Auxiliary Functions. */
function _normalize(x, inf, sup, target_inf, target_sup) {
  return (x - inf) * (target_sup - target_inf) / (sup - inf) + target_inf;
};

function deriveLookupTable() {
  for (let i = lookupTable.length - 1; i > -1; --i) {
    for (let j = lookupTable[0].length - 1; j > -1; --j) {
      lookupTable[i][j] = -1;
    }
  }
  
  for (let i = units.length - 1; i > -1; --i) {
    for (let j = units[i][0]; j < units[i][0] + units[i][2]; ++j) {
      for (let k = units[i][1]; k < units[i][1] + units[i][3]; ++k) {
        lookupTable[j][k] = i;
      }
    }
  }
};

/* Main Functions. */
function setup() {
  for (let i = n_parts - 1; i > -1; --i) gestureFlags[i] = 1;
  /* Initialize the Sound objects. */
  console.log("Load soundtracks.");
//loop through each of the instruments (?)
  for (let i = texts.length - 1; i > -1; --i) {
    console.log(i);
    let instrument = texts[i];
    ampPtr[instrument] = new p5.Amplitude();
    ampPtr[instrument].setInput(sounds[instrument]);
  }

  /* Initialize the GUI. */
  createCanvas(windowWidth, windowHeight);
  deriveAttributes();
  deriveLookupTable();

  /* Create GUI elements */
  let playButton = createButton('Play All');
  playButton.position(10, 10);
  playButton.mousePressed(playAllSounds);

  let pauseButton = createButton('Pause All');
  pauseButton.position(80, 10);
  pauseButton.mousePressed(pauseAllSounds);

  let resumeButton = createButton('Resume All');
  resumeButton.position(150, 10);
  resumeButton.mousePressed(resumeAllSounds);

  masterVolumeSlider = createSlider(0, 1, 0.5, 0.01); // Min, Max, Initial value, Step
  masterVolumeSlider.position(150, 40);
  masterVolumeSlider.input(setMasterVolume);

  let masterLabel = createDiv('Master Volume');
  masterLabel.position(10, 35);

  let yOffset = 70; // Starting position for individual sliders
  for (let i = 0; i < texts.length; i++) {
    let instrument = texts[i];
    
    let label = createDiv(instrument);
    label.position(10, yOffset);
    
    let slider = createSlider(0, 1, 0.5, 0.01);
    slider.position(150, yOffset);
    slider.input(() => setVolume(instrument));
    
    sliders[instrument] = slider;
    yOffset += 30; // Move to the next position
  }

  // Button to hide sliders
  hideSlidersButton = createButton('Hide Sliders');
  hideSlidersButton.position(10, 70);
  hideSlidersButton.mousePressed(() => {
      hideMasterVolumeSlider();
      hideInstrumentSliders();
  });
  
  // Button to show sliders
  showSlidersButton = createButton('Show Sliders');
  showSlidersButton.position(110, 70);
  showSlidersButton.mousePressed(() => {
      showMasterVolumeSlider();
      showInstrumentSliders();
  });
  /* Other Settings. */
  //frameRate(60);

  /* Start the Soundtracks. */
  //playAll();

  /* Initialize Timer. */
  lastTime = millis();
};

function drawDebugInfo() {
  baseX = windowWidth/2;
  fill("black");
  rect(baseX - 20, 10, 600, 400);
  fill("white");
  text("Left Hand Cursor X: " + window.sharedData.leftHandCursorX, baseX, 50);
  text("Left Hand Cursor Y: " + window.sharedData.leftHandCursorY, baseX, 80);

  // Display the right hand cursor data
  text("Right Hand Cursor X: " + window.sharedData.rightHandCursorX, baseX, 130);
  text("Right Hand Cursor Y: " + window.sharedData.rightHandCursorY, baseX, 160);

  // Display the left hand gesture data
  text("Left Hand Gesture Name: " + window.sharedData.leftGestureData.gestureName, baseX, 210);
  text("Left Hand Gesture Score: " + window.sharedData.leftGestureData.gestureScore, baseX, 240);
  text("Left Hand Gesture Handedness: " + window.sharedData.leftGestureData.handedness, baseX, 270);

  // Display the right hand gesture data
  text("Right Hand Gesture Name: " + window.sharedData.rightGestureData.gestureName, baseX, 320);
  text("Right Hand Gesture Score: " + window.sharedData.rightGestureData.gestureScore, baseX, 350);
  text("Right Hand Gesture Handedness: " + window.sharedData.rightGestureData.handedness, baseX, 380);

}

function draw() {

  /* Initialize flags. */
  let playFlag = true;
  let lowerVoice = false;
  let target = -1;
  let tmp = 255;
  states[0] = -1; states[1] = -1;
    
  let leftHand = -1;
  let rightHand = -1;
  
  /* Renew playtime and gestures. */
  updateTime();
  renewGestureFlags();
  background(200);

  /* Update amplitude values */
  _updateAmpVal();

  /* Draw parts */
  drawParts();

  
  // Use the global object stored with the browser window to get cursor coordinates
  let leftHandCursorX = window.sharedData.leftHandCursorX || 0;
  let leftHandCursorY = window.sharedData.leftHandCursorY || 0;
  let rightHandCursorX = window.sharedData.rightHandCursorX || 0;
  let rightHandCursorY = window.sharedData.rightHandCursorY || 0;

  // these range from (0.0 - 1.0) by default -- let's make it proportional to our window size 
  leftHandCursorX = (1 - leftHandCursorX) * windowWidth; // horizontal flip this as well
  leftHandCursorY = leftHandCursorY * windowHeight;

  rightHandCursorX = (1 - rightHandCursorX) * windowWidth; // horizontal flip this as well
  rightHandCursorY = rightHandCursorY * windowHeight;

  // Read gesture data from window.sharedData
  let leftGestureName = window.sharedData.leftGestureData.gestureName;
  let rightGestureName = window.sharedData.rightGestureData.gestureName;

  
  // 检查右手是否指向特定声部
  if (rightGestureName === "Pointing_Up") {
    target = detectInstrument(rightHandCursorX, rightHandCursorY);
    
    // 如果右手指向特定声部，且左手是展开的状态，调整该声部的音量
    if (target !== -1 && leftGestureName === "Open_Palm") {
      let volume = 1 - (leftHandCursorY / windowHeight); // 根据左手Y坐标调整音量
      sliders[texts[target]].value(volume);
      setVolume(texts[target]);
      
      // 改变指向声部的颜色为绿色
      colors[target] = [0, 255, 0];
    }
  } else {
    // 如果右手没有指向任何声部，恢复所有声部颜色
    resetColors();
  }

  // 检查任意一只手是否握拳
  if (leftGestureName === "Closed_Fist" || rightGestureName === "Closed_Fist") {
    // 设置为静音
    setAmp(true);
  } else {
    // 根据手势和位置调整音量
    setAmp(false);
  }

  // Adjust volume based on the hand's y position when the gesture is "Open_Palm"
  if (leftGestureName === "Open_Palm") {
    let volume = 1 - (leftHandCursorY / windowHeight); // Normalize y position to volume (0.0 - 1.0)
    masterVolumeSlider.value(volume);
    setMasterVolume();
  }
  if (rightGestureName === "Open_Palm") {
    let volume = 1 - (rightHandCursorY / windowHeight); // Normalize y position to volume (0.0 - 1.0)
    masterVolumeSlider.value(volume);
    setMasterVolume();
  }

  // Draw left hand cursor based on gesture
  switch (leftGestureName) {
    case "Pointing_Up":
      fill("green");
      triangle(leftHandCursorX, leftHandCursorY, // 新的第一个顶点
         leftHandCursorX + 25, leftHandCursorY + 26, // 新的第二个顶点
         leftHandCursorX + 1, leftHandCursorY + 35); // 新的第三个顶点

      break;
    case "Open_Palm":
      fill("yellow");
      rect(leftHandCursorX - 25, leftHandCursorY - 12.5, 45, 15);
      break;
    case "Closed_Fist":
      fill("red");
      circle(leftHandCursorX, leftHandCursorY, 10); // Smaller circle
      break;
    default:
      fill("red");
      circle(leftHandCursorX, leftHandCursorY, 25); // Default circle
      break;
  }

  // Draw right hand cursor based on gesture
  switch (rightGestureName) {
    case "Pointing_Up":
      fill("green");
      triangle(rightHandCursorX, rightHandCursorY, 
        rightHandCursorX + 25, rightHandCursorY + 26, 
        rightHandCursorX + 1, rightHandCursorY + 35);
      break;
    case "Open_Palm":
      fill("yellow");
      rect(rightHandCursorX - 25, rightHandCursorY - 12.5, 45, 15);
      break;
    case "Closed_Fist":
      fill("blue");
      circle(rightHandCursorX, rightHandCursorY, 10); // Smaller circle
      break;
    default:
      fill("blue");
      circle(rightHandCursorX, rightHandCursorY, 25); // Default circle
      break;
  }

}

// 检测手指指向的声部
function detectInstrument(x, y) {
  for (let i = 0; i < units.length; i++) {
    if (x > unitAttributes[i][0] && x < unitAttributes[i][0] + unitAttributes[i][2] &&
        y > unitAttributes[i][1] && y < unitAttributes[i][1] + unitAttributes[i][3]) {
      return i; // 返回指向的声部索引
    }
  }
  return -1; // 如果没有指向任何声部
}

// 重置所有声部颜色为初始值
function resetColors() {
  for (let i = 0; i < colors.length; i++) {
    colors[i] = [(units[i][4] < 128) ? 255 : 0, (units[i][4] < 128) ? 255 : 0, (units[i][4] < 128) ? 255 : 0];
  }
}


function setAmp(lowerVoice) {
  if (lowerVoice) {
    for (let i = units.length - 1; i > -1; --i) {
      if (i === 10) sounds[texts[i]].setVolume(1); // 钢琴音量始终为100%
      else sounds[texts[i]].setVolume(lowVoiceVal); // 静音或非常低的音量
    }
  } else {
    for (let i = units.length - 1; i > -1; --i) {
      if (i === 10) sounds[texts[i]].setVolume(1);
      else {
        let volume = sliders[texts[i]].value() * masterVolumeSlider.value();
        sounds[texts[i]].setVolume(volume);
      }
    }
  }
}


/* Functions from player start */
function playAllSounds() {
  // Ensure the AudioContext is resumed on user gesture
  if (getAudioContext().state !== 'running') {
    getAudioContext().resume();
  }
  
  if (allLoaded) {
    let currentTime = getAudioContext().currentTime;
    for (let instrument in sounds) {
      if (sounds.hasOwnProperty(instrument)) {
        sounds[instrument].playMode('restart');  // Ensure the sound restarts on play
        sounds[instrument].play(currentTime + 0.1); // Play all sounds at the same time after 0.1 second
      }
    }
    isPaused = false;
  } else {
    console.log("Sounds are not fully loaded yet");
  }
}

function pauseAllSounds() {
  if (allLoaded) {
    for (let instrument in sounds) {
      if (sounds.hasOwnProperty(instrument)) {
        sounds[instrument].pause();  // Pause the sound
      }
    }
    isPaused = true;
  } else {
    console.log("Sounds are not fully loaded yet");
  }
}

function resumeAllSounds() {
  if (allLoaded && isPaused) {
    for (let instrument in sounds) {
      if (sounds.hasOwnProperty(instrument)) {
        sounds[instrument].play();
      }
    }
    isPaused = false;
  } else {
    console.log("Sounds are not fully loaded yet or not paused");
  }
}

function setVolume(instrument) {
  if (instrument === "Piano") {
    sounds[instrument].setVolume(1); // Piano volume is always 100%
  } else {
    let volume = sliders[instrument].value() * masterVolumeSlider.value();
    sounds[instrument].setVolume(volume);
  }
}

function setMasterVolume() {
  for (let instrument in sounds) {
    if (sounds.hasOwnProperty(instrument)) {
      if (instrument === "Piano") {
        sounds[instrument].setVolume(1); // Piano volume is always 100%
      } else {
        let volume = sliders[instrument].value() * masterVolumeSlider.value();
        sounds[instrument].setVolume(volume);
      }
    }
  }
}

/* Functions from player end */
