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
  gestureData: {
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
        const categoryName = results.gestures[0][0].categoryName;
        const categoryScore = parseFloat(
          results.gestures[0][0].score * 100
        ).toFixed(2);
        const handedness = results.handednesses[0][0].displayName;

        window.sharedData.gestureData.gestureName = categoryName;
        window.sharedData.gestureData.gestureScore = categoryScore;
        window.sharedData.gestureData.handedness = handedness;

        /*console.log(
          `GestureRecognizer: ${categoryName}\n Confidence: ${categoryScore} %\n Handedness: ${handedness}`
        );*/
      }
    }

    if (webcamRunning === true) {
      window.requestAnimationFrame(predictWebcam);
    }
  };
});
