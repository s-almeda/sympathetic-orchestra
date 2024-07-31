let sound;
let amp;

let sounds = {};
let sliders = {};
let allLoaded = false;
let masterVolumeSlider;
let isPaused = false;

let cursorX = 0;
let cursorY = 0;

/* Preload sound files */
function preload() {
  for (let i = 0; i < texts.length; i++) {
    let instrument = texts[i];
    sounds[instrument] = loadSound('soundfiles/' + instrument + '.mp3', soundLoaded);
  }
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

    colors[i][0] = int(_normalize(ampvalue[i], 0, 1, 255, 0));
    colors[i][1] = int(_normalize(ampvalue[i], 0, 1, 255, 0));
    colors[i][2] = int(_normalize(ampvalue[i], 0, 1, 255, 0));
  }
};

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
    console.log(texts[i] + ": " + ampPtr[i].getLevel());
    ampvalue[i] = ampPtr[i].getLevel();
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
  /* Initialize the LeapMotion and Sound objects. */
  //leap = new LeapMotion(this);
  console.log("Load soundtracks.");
//loop through each of the instruments (?)
  for (let i = texts.length - 1; i > -1; --i) {
    console.log(i);
    ampPtr[i] = new p5.Amplitude();
    //soundfilePtr[i] = loadSound("./blablabla/" + texts[i] + ".mp3", () => {
    ampPtr[i].setInput(sounds[i]);
    ampVals[i] = 1;
    //});
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

  /* Other Settings. */
  //frameRate(60);

  /* Start the Soundtracks. */
  //playAll();

  /* Initialize Timer. */
  lastTime = millis();
};

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
  

  fill("red");

  // Use the global object stored with the browser window to get cursor coordinates
  cursorX = window.sharedData.cursorX || 0;
  cursorY = window.sharedData.cursorY || 0;

  // these range from (0.0 - 1.0) by default -- let's make it proportional to our window size 
  cursorX = (1-cursorX)*windowWidth; // horizontal flip this as well
  cursorY = cursorY *windowHeight 


  circle(cursorX, cursorY, 50); // Draw a 50px diameter circle at the coordinates
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
  let volume = sliders[instrument].value() * masterVolumeSlider.value();
  sounds[instrument].setVolume(volume);
}

function setMasterVolume() {
  for (let instrument in sounds) {
    if (sounds.hasOwnProperty(instrument)) {
      let volume = sliders[instrument].value() * masterVolumeSlider.value();
      sounds[instrument].setVolume(volume);
    }
  }
}
/* Functions from player end */
