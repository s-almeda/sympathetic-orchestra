//Sympathetic Orchestra 
//by Bob Tianqi Wei, Shm Garanganao Almeda, Ethan Tam, Dor Abrahamson and Bjoern Hartmann
//UC Berkeley, 2024

// This is the code for the hand gesture recognition model.

import {
  GestureRecognizer,
  HandLandmarker,
  FilesetResolver,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";

window.sharedData = {
  leftHandCursorX: 0,
  leftHandCursorY: 0,
  rightHandCursorX: 0,
  rightHandCursorY: 0,
  leftGestureData: {
    gestureName: "",
    gestureScore: 0,
    handedness: ""
  },
  rightGestureData: {
    gestureName: "",
    gestureScore: 0,
    handedness: ""
  }
};

document.addEventListener("DOMContentLoaded", () => {
  let gestureRecognizer;
  let handLandmarker;
  let webcamRunning = false;
  // I think that setting this to the same size as the p5js canvas makes the tracking better...
  const videoHeight = "1440px";
  const videoWidth = "900px";

  const video = document.getElementById("webcam");
  const enableWebcamButton = document.getElementById("webcamButton");

  // Initialize the gesture recognizer
  const createGestureRecognizer = async () => {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
    );
    gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
        delegate: "GPU",
      },
      runningMode: "VIDEO",
    });
  };
  createGestureRecognizer();

  // Initialize the hand landmarker
  const createHandLandmarker = async () => {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
    );
    handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numHands: 2,
    });
  };
  createHandLandmarker();

  // Webcam functionality
  const hasGetUserMedia = () =>
    !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

  const enableCam = async () => {
    if (!gestureRecognizer || !handLandmarker) {
      alert("Please wait for models to load");
      return;
    }

    if (webcamRunning) {
      webcamRunning = false;
      enableWebcamButton.innerText = "ENABLE PREDICTIONS";
      const stream = video.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach((track) => track.stop());
      video.srcObject = null;
    } else {
      webcamRunning = true;
      enableWebcamButton.innerText = "DISABLE PREDICTIONS";

      const constraints = {
        video: true,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      video.srcObject = stream;
      video.addEventListener("loadeddata", predictWebcam);
    }
  };

  enableWebcamButton.addEventListener("click", enableCam);

  let lastVideoTime = -1;
  let results = undefined;

  const predictWebcam = async () => {
    if (!webcamRunning) return;

    const nowInMs = Date.now();
    if (video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime;
      results = gestureRecognizer.recognizeForVideo(video, nowInMs);
      const handLandmarkerResults = await handLandmarker.detectForVideo(
        video,
        nowInMs
      );

      if (handLandmarkerResults.landmarks && handLandmarkerResults.landmarks.length > 0) {
        handLandmarkerResults.landmarks.forEach((landmarks, index) => {
          const eighthLandmark = landmarks[8];
          if (index === 0) {
            window.sharedData.leftHandCursorX = eighthLandmark.x;
            window.sharedData.leftHandCursorY = eighthLandmark.y;
          } else if (index === 1) {
            window.sharedData.rightHandCursorX = eighthLandmark.x;
            window.sharedData.rightHandCursorY = eighthLandmark.y;
          }
        });
      }

      if (results.gestures.length > 0) {
        results.gestures.forEach((gesture, index) => {
          const categoryName = gesture[0].categoryName;
          const categoryScore = parseFloat(
            gesture[0].score * 100
          ).toFixed(2);
          const handedness = results.handednesses[index][0].displayName;

          if (index === 0) {
            window.sharedData.leftGestureData.gestureName = categoryName;
            window.sharedData.leftGestureData.gestureScore = categoryScore;
            window.sharedData.leftGestureData.handedness = handedness;
          } else if (index === 1) {
            window.sharedData.rightGestureData.gestureName = categoryName;
            window.sharedData.rightGestureData.gestureScore = categoryScore;
            window.sharedData.rightGestureData.handedness = handedness;
          }
        });
      }
    }

    if (webcamRunning === true) {
      window.requestAnimationFrame(predictWebcam);
    }
  };
});

// p5.js part
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
}
