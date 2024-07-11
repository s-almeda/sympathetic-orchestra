// adapted from code from here: https://codepen.io/mediapipe-preview/pen/zYamdVd
// Copyright 2023 The MediaPipe Authors.

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at

//      http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import {
  GestureRecognizer,
  HandLandmarker,
  FilesetResolver,
  DrawingUtils
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";

document.addEventListener("DOMContentLoaded", () => {
  let gestureRecognizer;
  let handLandmarker;
  let webcamRunning = false;
  const videoHeight = "360px";
  const videoWidth = "480px";

  const video = document.getElementById("webcam");
  const canvasElement = document.getElementById("output_canvas");
  const canvasCtx = canvasElement.getContext("2d");
  const gestureOutput = document.getElementById("gesture_output");
  const handLandmarkOutput = document.getElementById("hand_landmark_output");
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
        delegate: "GPU"
      },
      runningMode: "VIDEO"
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
        delegate: "GPU"
      },
      runningMode: "VIDEO",
      numHands: 2
    });
  };
  createHandLandmarker();

  // Function to send landmark data to the server
  const sendLandmarksToServer = (landmarkData) => {
    fetch('/landmarks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ landmarks: landmarkData })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.text();
    })
    .then(data => console.log('Success:', data))
    .catch((error) => console.error('Error:', error));
  };


  // Webcam functionality
  const hasGetUserMedia = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

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
      tracks.forEach(track => track.stop());
      video.srcObject = null;
    } else {
      webcamRunning = true;
      enableWebcamButton.innerText = "DISABLE PREDICTIONS";

      const constraints = {
        video: true
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
      const handLandmarkerResults = await handLandmarker.detectForVideo(video, nowInMs);

      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
      const drawingUtils = new DrawingUtils(canvasCtx);

      canvasElement.width = video.videoWidth;
      canvasElement.height = video.videoHeight;
      canvasElement.style.width = videoWidth;
      video.style.width = videoWidth;
      canvasElement.style.height = videoHeight;
      video.style.height = videoHeight;

      if (handLandmarkerResults.landmarks && handLandmarkerResults.landmarks.length > 0) {
        let handLandmarkText = "";
        for (const landmarks of handLandmarkerResults.landmarks) {
          landmarks.forEach((landmark, index) => {
            handLandmarkText += `Landmark ${index}: X=${landmark.x.toFixed(2)}, Y=${landmark.y.toFixed(2)}, Z=${landmark.z.toFixed(2)}<br>`;
          });
          handLandmarkText += "<br>";
        }

        // Update the HTML of the webpage to show this text
        handLandmarkOutput.innerHTML = handLandmarkText;

        // Send landmarks to server
        sendLandmarksToServer(handLandmarkerResults.landmarks);

        for (const landmarks of handLandmarkerResults.landmarks) {
          drawingUtils.drawConnectors(
            landmarks,
            HandLandmarker.HAND_CONNECTIONS,
            {
              color: "#00FF00",
              lineWidth: 5
            }
          );
          drawingUtils.drawLandmarks(landmarks, {
            color: "#FF0000",
            lineWidth: 2
          });
        }
      }

      canvasCtx.restore();

      if (results.gestures.length > 0) {
        gestureOutput.style.display = "block";
        gestureOutput.style.width = videoWidth;
        const categoryName = results.gestures[0][0].categoryName;
        const categoryScore = parseFloat(
          results.gestures[0][0].score * 100
        ).toFixed(2);
        const handedness = results.handednesses[0][0].displayName;
        gestureOutput.innerText = `GestureRecognizer: ${categoryName}\n Confidence: ${categoryScore} %\n Handedness: ${handedness}`;
      } else {
        gestureOutput.style.display = "none";
      }
    }

    if (webcamRunning === true) {
      window.requestAnimationFrame(predictWebcam);
    }
  };
}); // End of DOMContentLoaded event response code
