import processing.sound.*;
import de.voidplus.leapmotion.*;

Sound s;
AudioIn in;
Amplitude amp;

/* Modify the basic parameters. */
static final int n_parts = 18;
static final int n_grid_X = 16, n_grid_Y = 7;
static final int sizeX = 1920, sizeY = 1080;
static final int globalX = 50, globalY = 50; // The margin size. 

/* Defining the objects and arrays according to the basic parameters above. 
   No need to modify! */
static SoundFile soundfilePtr[] = new SoundFile[n_parts];
static Amplitude ampPtr[] = new Amplitude[n_parts];
public static int[][] unitAttributes = new int[n_parts][4];
public static float[][] textAttributes = new float[n_parts][2];
public static int[][] colors = new int[n_parts][3];
public static float[] ampvalue = new float[n_parts]; // The actual values of the output of the soundtracks. 
public static float[] ampVals = new float[n_parts]; // The input values to correct the volume of the soundtracks. 
static float ampValCoef = 1;

static LeapMotion leap;

static final int unitX = (sizeX - globalX * 2) / n_grid_X, unitY = (sizeY - globalY * 2) / n_grid_Y, rectRad = 40;
static final int dX = unitX / 4, dY = unitY / 4; // The distance between grids when drawing the rectangles. 

static long playTime = 0;
static long lastTime;

public static int lookupTable[][] = new int[n_grid_Y + 1][n_grid_X + 1];

public static int states[] = new int[2];

/* Parameters related to analyzing user inputs. */ 
static int minY = 0, maxY = sizeY, minX = 0, maxX = sizeX;
static final float grabThreshold = 0.8, releaseThreshold = 0;
static final float lowVoiceVal = 0.01;
static boolean isPlaying = false;








/* Defining the GUI. */
public static int[][] units = {{2, 5, 1, 2, 255},
                               {2, 7, 1, 2, 255},
                               {2, 9, 1, 2, 255},
                               {2, 11, 1, 2, 255},
                               {0, 8, 1, 4, 255}, 
                               {1, 8, 1, 2, 255}, 
                               {1, 10, 1, 2, 255},
                               {1, 12, 1, 1, 255},
                               {0, 6, 2, 2, 255},
                               {0, 4, 2, 2, 255},
                               {1, 3, 2, 1, 255},
                               {5, 0, 2, 7, 255},
                               {3, 1, 2, 6, 255},
                               {3, 7, 2, 4, 255},
                               {5, 9, 2, 7, 255},
                               {3, 11, 2, 4, 255},
                               {2, 4, 1, 1, 255},
                               {5, 7, 2, 2, 100}
                              };

public final static String[] texts = {"Flute",
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
                                    };
// Must ensure: texts.length == units.length
public final static boolean[] muted = {false,
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
                                      };

/* Function to draw the GUI. */
private void deriveAttributes() {
  // Called only in preprocessing. 
  for (int i = units.length - 1; i > -1; --i) {
    unitAttributes[i][0] = globalX + units[i][1] * unitX;
    unitAttributes[i][1] = globalY + units[i][0] * unitY;
    unitAttributes[i][2] = units[i][3] * unitX - dX;
    unitAttributes[i][3] = units[i][2] * unitY - dY;
    textAttributes[i][0] = globalX + (units[i][1] * 2 + units[i][3]) * unitX / 2 - 8 * texts[i].length();
    textAttributes[i][1] = globalY + (units[i][0] * 2 + units[i][2]) * unitY / 2 - 10;
    colors[i][0] = (units[i][4] < 128) ? 255 : 0;
    colors[i][1] = colors[i][0]; colors[i][2] = colors[i][0];
  }


};

private void _deriveColors() {
  _updateAmpVal();
  for (int i = units.length - 1; i > -1; --i) {
    colors[i][0] = int(_normalize(ampvalue[i], 0, 1, 255, 0));
    colors[i][1] = int(_normalize(ampvalue[i], 0, 1, 255, 0));
    colors[i][2] = int(_normalize(ampvalue[i], 0, 1, 255, 0));
    //System.out.println(str(i) + ' ' + str(colors[i][0]));
  };
};

private void drawParts() {
  noStroke();
  _deriveColors();
  for (int i = units.length - 1; i > -1; --i) {
    // Big Units. 
    if (units[i][4] != -1) fill(units[i][4], units[i][4], units[i][4]);
    else fill(150, 200, 175);
    rect(unitAttributes[i][0], unitAttributes[i][1], unitAttributes[i][2], unitAttributes[i][3], rectRad);
    
    // Small units. 
    if (i != 17) {
      fill(colors[i][0], colors[i][1], colors[i][2]);
      for (int j = units[i][2] - 1; j > -1; --j) {
        for (int k = units[i][3] - 1; k > -1; --k) {
          rect(unitAttributes[i][0] + k * unitX + dX / 2, unitAttributes[i][1] + j * unitY + dY / 2, unitX - 2 * dX, unitY - 2 * dY, rectRad);
        }
      }
    }
    
    // Text. 
    int c = (units[i][4] < 128) ? 255 : 0;
    fill(c, c, c);
    textSize(20);
    text(texts[i], textAttributes[i][0], textAttributes[i][1]);
  }
};


/* Functions controlling the soundtracks. */
private static void playAll() {
  // Start Playing all soundtracks.
  if (isPlaying) return;
  
  for (int i = soundfilePtr.length - 1; i > -1; --i) {
    if (!muted[i]) soundfilePtr[i].play();
  }
  isPlaying = true;
};

private static void pauseAll() {
  // Pause all soundtracks.
  if (!isPlaying) return;
  for (int i = soundfilePtr.length - 1; i > -1; --i) {
    if (!muted[i]) soundfilePtr[i].pause();
  }
  isPlaying = false;
};

private static void setAmp(boolean lowerVoice) {
  // Update the amplitudes for all soundtracks.
  if (lowerVoice) {
    for (int i = units.length - 1; i > -1; --i) {
      if (i == 10) soundfilePtr[i].amp(1); 
      else soundfilePtr[i].amp(lowVoiceVal);
    };
  } else {
    for (int i = units.length - 1; i > -1; --i) {
      if (i == 10) soundfilePtr[i].amp(1);
      else soundfilePtr[i].amp(ampVals[i] * ampValCoef);
    };
  }
};



private static void _updateAmpVal() {
  for (int i = units.length - 1; i > -1; --i) {
    ampvalue[i] = ampPtr[i].analyze();
  }
  //System.out.println();
};


/* Functions recording time. */
private static void updateTime(boolean playFlag) {
  long curTime = System.currentTimeMillis();
  long timeElapsed = curTime - lastTime;
  lastTime = curTime;
  if (playFlag) playTime += timeElapsed;
}


/* Functions processing the user inputs. */
private static int _isPointingAt(Hand hand) {
  ArrayList<Finger> fingers = hand.getOutstretchedFingers(); 
  if (fingers.size() > 2 || fingers.size() == 0) return -1;
  int X = int(_normalize(fingers.get(0).getPosition().array()[0], minX, maxX, 0, n_grid_X));
  int Y = int(_normalize(fingers.get(0).getPosition().array()[1], minY, maxY, 0, n_grid_Y));
  return lookupTable[Y][X];
}

private static boolean isOpen(Hand hand) {
  return hand.getGrabStrength() <= releaseThreshold;
}

/* Temporary Codes. */
public static int isPointingAt(Hand hand) {
  int ret = _isPointingAt(hand);
  System.out.println(ret);
  return ret;
}

/* Auxiliary Functions. */
private static float _normalize(float x, float inf, float sup, float target_inf, float target_sup) {
  return (x - inf) * (target_sup - target_inf) / (sup - inf) + target_inf;
};

private static void deriveLookupTable() {
  for (int i = lookupTable.length - 1; i > -1; --i) {
    for (int j = lookupTable[0].length - 1; j > -1; --j) {
      lookupTable[i][j] = -1;
    }
  }
  
  for (int i = units.length - 1; i > -1; --i) {
    for (int j = units[i][0]; j < units[i][0] + units[i][2]; ++j) {
      for (int k = units[i][1]; k < units[i][1] + units[i][3]; ++k) {
        lookupTable[j][k] = i;
      }
    }
  }
};


/* Main Functions. */
void setup() {
  /* Initialize the LeapMotion and Sound objects. */
  leap = new LeapMotion(this);
  System.out.println("Load soundtracks.");
  for (int i = units.length - 1; i > -1; --i) {
    System.out.println(i);
    ampPtr[i] = new Amplitude(this);
    soundfilePtr[i] = new SoundFile(this, "./shortened/" + texts[i] + ".mp3");
    ampPtr[i].input(soundfilePtr[i]);
    ampVals[i] = 1;
  }

  /* Initialize the GUI. */
  size(1920, 1080);
  deriveAttributes();
  deriveLookupTable();

  /* Other Settings. */
  frameRate(60);

  /* Initialize Timer. */
  lastTime = System.currentTimeMillis();
};


void draw() {
  /* Initialize flags. */
  boolean playFlag = true, lowerVoice = false;
  int target = -1, tmp = 255;
  states[0] = -1; states[1] = -1;
    
  int leftHand = -1, rightHand = -1;
  
  /* Capture user inputs. */
  ArrayList<Hand> hands = leap.getHands();
  int handCount = hands.size();
  
  /* Identify the state of both hands. */
  for (int i = hands.size() - 1; i > -1; --i) {
    if (hands.get(i).isLeft()) leftHand = i;
    else if (hands.get(i).isRight()) rightHand = i;
    
    if (hands.get(i).isLeft()) {
      if (hands.get(i).getGrabStrength() <= releaseThreshold) states[0] = 0;
      else if (hands.get(i).getGrabStrength() > grabThreshold) states[0] = 2;
      else states[0] = 1;
    }
    else if (hands.get(i).isRight()) {
      int num_fingers = hands.get(i).getOutstretchedFingers().size();
      if (0 < num_fingers && num_fingers <= 2) states[1] = 0;
      else if (hands.get(i).getGrabStrength() > grabThreshold) states[1] = 2;
      else states[1] = 1;
    }
  }
  
  
  /* Processing the flags. */
  // 1. playFlag
  if (handCount == 0) playFlag = false;
  
  // 2-. Volume related flags.
  if (states[0] == 2 || states[1] == 2) lowerVoice = true;
  
  if (!lowerVoice) {
    if (leftHand != -1 && rightHand != -1) {
      /* 
      Check if the right hand is pointing at a specific part: 
      If part **k** is pointed at, 
        the absolute Y coordinate of the LEFT HAND decides the volume of the pointed part. 
      If NO part is pointed at, 
        Check if left hand is open, 
          If so, the absolute Y coordinate decides the overall volume of all parts. 
          Else, do nothing. 
      */ 
      if ((target = isPointingAt(hands.get(rightHand))) != -1) {
        ampVals[target] = max(min(_normalize(hands.get(leftHand).getPosition().array()[1], maxY, minY, 0, 1), 1), 0);
        tmp = units[target][4];
        units[target][4] = -1; 
      } else
      if (isOpen(hands.get(leftHand))) {
        ampValCoef = max(min(_normalize(hands.get(leftHand).getPosition().array()[1], maxY, minY, 0, 1), 1), 0);
      };
    };
  };
  
  ///* Execute according to the flags. */
  //// 1. playFlag
  if (playFlag) playAll();
  else pauseAll();
  
  //// 2-. Volume related flags. 
  setAmp(lowerVoice);
  
  /* Update the GUI. */
  background(200);
  drawParts();
  
  float LX = 0, LY = 0, RX = 0, RY = 0;
  
  if (leftHand != -1) {
    LX = hands.get(leftHand).getPosition().array()[0]; 
    LY = hands.get(leftHand).getPosition().array()[1];
  }
  if (rightHand != -1) {
    ArrayList<Finger> fingers = hands.get(rightHand).getOutstretchedFingers();
    if (states[1] == 0 && 0 < fingers.size() && fingers.size() <= 2) {
      RX = fingers.get(0).getPosition().array()[0];
      RY = fingers.get(0).getPosition().array()[1];
    } else {
      RX = hands.get(rightHand).getPosition().array()[0];
      RY = hands.get(rightHand).getPosition().array()[1];
    }
  }
  
  switch (states[0]) {
  case 0:
    fill(255, 200, 50);
    rect(LX, LY, 30, 10, 4);
    break;
  case 1:
    fill(50, 50, 200);
    circle(LX, LY, 20);
    break;
  case 2:
    fill(150, 50, 150);
    circle(LX, LY, 3);
    break;
  }
  
  switch (states[1]) {
  case 0:
    fill(50, 150, 100);
    triangle(RX, RY, RX + 10, RY - 20, RX + 20, RY - 10);
    break;
  case 1:
    fill(50, 100, 100);
    circle(RX, RY, 20);
    break;
  case 2:
    fill(125, 50, 125);
    circle(RX, RY, 3);
    break;
  }
  
  /* Some post ops. */
  if (target != -1) units[target][4] = tmp;
}
