let instruments = ["Flute", "Oboe", "Clarinet", "Bassoon", "French Horns", "Trumpets", "Trombones", "Tuba", "Timpani", "Piano", "Violin 1", "Violin 2", "Viola", "Cello", "Bass"];
let sounds = {};
let sliders = {};
let amplitudeAnalyzers = {};
let allLoaded = false;
let masterVolumeSlider;
let isPaused = false;

function preload() {
  for (let i = 0; i < instruments.length; i++) {
    let instrument = instruments[i];
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
  if (loadedCount === instruments.length) {
    allLoaded = true;
    console.log("All sounds loaded successfully");
  }
}

function setup() {
  createCanvas(400, 850); // Increase canvas height to accommodate sliders

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
  for (let i = 0; i < instruments.length; i++) {
    let instrument = instruments[i];
    
    let label = createDiv(instrument);
    label.position(10, yOffset);
    
    let slider = createSlider(0, 1, 0.5, 0.01);
    slider.position(150, yOffset);
    slider.input(() => setVolume(instrument));
    
    sliders[instrument] = slider;
    yOffset += 30; // Move to the next position

    // Create an amplitude analyzer for each instrument
    amplitudeAnalyzers[instrument] = new p5.Amplitude();
    amplitudeAnalyzers[instrument].setInput(sounds[instrument]);
  }
}

function draw() {
  background(255);
  
  let yOffset = 70; // Starting position for individual sliders and amplitude bars
  for (let i = 0; i < instruments.length; i++) {
    let instrument = instruments[i];
    
    // Display the amplitude bar
    let level = amplitudeAnalyzers[instrument].getLevel();
    let barHeight = map(level * 5, 0, 1, 0, 100); // Multiply by a number to make the amplitude more noticeable
    fill(0, 255, 0);
    rect(300, yOffset, barHeight, 10);
    
    yOffset += 30; // Move to the next position
  }
}

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
