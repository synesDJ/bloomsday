/*
  a common bloom - one-panel ambient realm light

  Inspired by the wiring and serial style in synesDJ_cube.ino, but for one
  8x8 WS2812B panel instead of three panels.

  Wiring:
    DATA_PIN = 6
    One 8x8 WS2812B / NeoPixel panel
    5V power supply sized for your panel
    Arduino GND and LED power supply GND tied together

  Serial protocol, newline terminated:
    REALM:blues             ambient blue/violet realm
    REALM:pentatonic        ambient green/gold realm
    BLOOM:cherry_blossom    blossom with that flower color
    BLOOM:iris
    BLOOM:lotus
    BLOOM:wildflower
    BLOOM:dandelion
    BLOOM:sunflower
    BLOOM:rose
    BLOOM:orchid
    BLOOM:tulip
    BLOOM:poppy
    BLOOM:pink_lily
    BLOOM:moon_iris
    BLOOMRGB:r,g,b          blossom with custom RGB color
    BRIGHT:90               set brightness 0-255
    CLEAR                   return to quiet ambient
    TEST                    quick rainbow pixel test
*/

#include <Adafruit_NeoPixel.h>
#include <math.h>
#include <stdio.h>
#include <string.h>

#define DATA_PIN      6
#define PANEL_W       8
#define PANEL_H       8
#define NUM_LEDS      64
#define BRIGHTNESS    80
#define COLOR_ORDER   NEO_GRB

Adafruit_NeoPixel strip(NUM_LEDS, DATA_PIN, COLOR_ORDER + NEO_KHZ800);

enum Realm {
  REALM_BLUES,
  REALM_PENTATONIC
};

Realm currentRealm = REALM_BLUES;

struct Rgb {
  uint8_t r;
  uint8_t g;
  uint8_t b;
};

struct BloomEvent {
  bool active;
  Rgb color;
  unsigned long startMs;
  unsigned long durationMs;
  float cx;
  float cy;
};

BloomEvent bloom = { false, { 255, 192, 216 }, 0, 4200, 3.5f, 3.5f };

char serialBuf[96];
uint8_t serialPos = 0;

// Same single-panel serpentine orientation as panel 0 in synesDJ_cube.ino.
inline int px(int row, int col) {
  row = 7 - row;
  col = 7 - col;
  int c = (row % 2 == 0) ? col : (7 - col);
  return row * 8 + c;
}

uint32_t rgb(uint8_t r, uint8_t g, uint8_t b) {
  return strip.gamma32(strip.Color(r, g, b));
}

uint32_t rgbScaled(Rgb c, float amount) {
  amount = constrain(amount, 0.0f, 1.0f);
  return rgb(
    (uint8_t)(c.r * amount),
    (uint8_t)(c.g * amount),
    (uint8_t)(c.b * amount)
  );
}

uint32_t addColor(uint32_t a, uint32_t b) {
  return strip.Color(
    min(255, (int)((a >> 16) & 0xFF) + (int)((b >> 16) & 0xFF)),
    min(255, (int)((a >>  8) & 0xFF) + (int)((b >>  8) & 0xFF)),
    min(255, (int)( a        & 0xFF) + (int)( b        & 0xFF))
  );
}

uint32_t blendColor(uint32_t a, uint32_t b, float t) {
  t = constrain(t, 0.0f, 1.0f);
  uint8_t ar = (a >> 16) & 0xFF;
  uint8_t ag = (a >>  8) & 0xFF;
  uint8_t ab =  a        & 0xFF;
  uint8_t br = (b >> 16) & 0xFF;
  uint8_t bg = (b >>  8) & 0xFF;
  uint8_t bb =  b        & 0xFF;
  return strip.Color(
    (uint8_t)(ar + (br - ar) * t),
    (uint8_t)(ag + (bg - ag) * t),
    (uint8_t)(ab + (bb - ab) * t)
  );
}

float smooth01(float t) {
  t = constrain(t, 0.0f, 1.0f);
  return t * t * (3.0f - 2.0f * t);
}

Rgb flowerColor(const char* name) {
  if (!strcmp(name, "cherry_blossom")) return { 255, 192, 216 };
  if (!strcmp(name, "iris"))           return { 255, 162, 117 };
  if (!strcmp(name, "lotus"))          return { 182, 221, 255 };
  if (!strcmp(name, "wildflower"))     return { 221, 243, 163 };
  if (!strcmp(name, "dandelion"))      return { 255, 224, 113 };
  if (!strcmp(name, "sunflower"))      return { 245, 185,  66 };
  if (!strcmp(name, "rose"))           return { 232,  64, 112 };
  if (!strcmp(name, "orchid"))         return { 184, 136, 255 };
  if (!strcmp(name, "tulip"))          return { 255,  85,  68 };
  if (!strcmp(name, "poppy"))          return { 255, 119,  68 };
  if (!strcmp(name, "pink_lily"))      return { 255, 156, 204 };
  if (!strcmp(name, "moon_iris"))      return { 139, 232, 255 };
  return { 214, 244, 238 };
}

uint32_t realmBase(float x, float y, unsigned long now) {
  float driftA = (sin((now * 0.0011f) + x * 0.78f + y * 0.22f) + 1.0f) * 0.5f;
  float driftB = (sin((now * 0.0007f) + x * 0.18f - y * 0.84f) + 1.0f) * 0.5f;
  float shimmer = 0.14f + 0.16f * smooth01((driftA + driftB) * 0.5f);

  if (currentRealm == REALM_PENTATONIC) {
    uint32_t green = rgbScaled({  26,  70,  36 }, 0.85f);
    uint32_t gold  = rgbScaled({ 244, 229, 128 }, 0.56f);
    uint32_t moss  = rgbScaled({ 120, 165,  74 }, 0.42f);
    uint32_t c = blendColor(green, gold, driftA * 0.46f);
    c = blendColor(c, moss, driftB * 0.24f);
    return blendColor(rgb(0, 0, 0), c, shimmer);
  }

  uint32_t deepBlue = rgbScaled({   8,  14,  48 }, 0.96f);
  uint32_t cyan     = rgbScaled({ 135, 245, 255 }, 0.48f);
  uint32_t violet   = rgbScaled({ 176,  98, 255 }, 0.36f);
  uint32_t c = blendColor(deepBlue, cyan, driftA * 0.44f);
  c = blendColor(c, violet, driftB * 0.34f);
  return blendColor(rgb(0, 0, 0), c, shimmer);
}

uint32_t bloomLayer(int row, int col, unsigned long now) {
  if (!bloom.active) return 0;

  float age = (float)(now - bloom.startMs) / (float)bloom.durationMs;
  if (age >= 1.0f) {
    bloom.active = false;
    return 0;
  }

  float open = smooth01(min(age * 1.55f, 1.0f));
  float fade = 1.0f - smooth01(max(0.0f, (age - 0.52f) / 0.48f));
  float dx = col - bloom.cx;
  float dy = row - bloom.cy;
  float dist = sqrt(dx * dx + dy * dy);

  float radius = 0.55f + open * 5.2f;
  float ring = 1.0f - constrain(fabs(dist - radius) / 1.45f, 0.0f, 1.0f);
  float centerGlow = 1.0f - constrain(dist / (1.4f + open * 2.4f), 0.0f, 1.0f);
  float petalPulse = (sin(now * 0.006f + dist * 1.7f) + 1.0f) * 0.5f;
  float amount = (ring * 0.72f + centerGlow * 0.55f + petalPulse * 0.12f) * fade;

  return rgbScaled(bloom.color, amount);
}

void drawAmbient() {
  unsigned long now = millis();
  for (int row = 0; row < PANEL_H; row++) {
    for (int col = 0; col < PANEL_W; col++) {
      float x = (float)col;
      float y = (float)row;
      uint32_t c = realmBase(x, y, now);
      c = addColor(c, bloomLayer(row, col, now));
      strip.setPixelColor(px(row, col), c);
    }
  }

  // Rare quiet sparkle, realm-tinted.
  if (random(1000) < 18) {
    int row = random(8);
    int col = random(8);
    uint32_t sparkle = currentRealm == REALM_PENTATONIC
      ? rgbScaled({ 255, 242, 160 }, 0.42f)
      : rgbScaled({ 182, 221, 255 }, 0.38f);
    strip.setPixelColor(px(row, col), addColor(strip.getPixelColor(px(row, col)), sparkle));
  }

  strip.show();
}

void triggerBloom(Rgb color) {
  bloom.active = true;
  bloom.color = color;
  bloom.startMs = millis();
  bloom.durationMs = 4200;
  bloom.cx = 2.4f + random(0, 23) / 10.0f;
  bloom.cy = 2.4f + random(0, 23) / 10.0f;
}

void setRealmByName(const char* name) {
  if (!strcmp(name, "pentatonic")) {
    currentRealm = REALM_PENTATONIC;
    Serial.println("REALM pentatonic");
  } else {
    currentRealm = REALM_BLUES;
    Serial.println("REALM blues");
  }
  Serial.println("ACK");
}

void runTest() {
  for (int i = 0; i < NUM_LEDS; i++) {
    strip.clear();
    strip.setPixelColor(i, strip.gamma32(strip.ColorHSV((uint16_t)(i * 1024), 255, 180)));
    strip.show();
    delay(18);
  }
  strip.clear();
  strip.show();
}

void handleSerialLine(char* line) {
  while (*line == ' ' || *line == '\t') line++;

  if (!strncmp(line, "REALM:", 6)) {
    setRealmByName(line + 6);
    return;
  }

  if (!strncmp(line, "BLOOMRGB:", 9)) {
    int r = 0;
    int g = 0;
    int b = 0;
    if (sscanf(line + 9, "%d,%d,%d", &r, &g, &b) == 3) {
      triggerBloom({ (uint8_t)constrain(r, 0, 255), (uint8_t)constrain(g, 0, 255), (uint8_t)constrain(b, 0, 255) });
      Serial.println("BLOOMRGB");
      Serial.println("ACK");
    }
    return;
  }

  if (!strncmp(line, "BLOOM:", 6)) {
    triggerBloom(flowerColor(line + 6));
    Serial.print("BLOOM ");
    Serial.println(line + 6);
    Serial.println("ACK");
    return;
  }

  if (!strncmp(line, "BRIGHT:", 7)) {
    int v = atoi(line + 7);
    strip.setBrightness((uint8_t)constrain(v, 0, 255));
    Serial.print("BRIGHT ");
    Serial.println(constrain(v, 0, 255));
    Serial.println("ACK");
    return;
  }

  if (!strcmp(line, "CLEAR")) {
    bloom.active = false;
    strip.clear();
    strip.show();
    Serial.println("CLEAR");
    Serial.println("ACK");
    return;
  }

  if (!strcmp(line, "TEST")) {
    Serial.println("TEST");
    Serial.println("ACK");
    runTest();
    return;
  }
}

void readSerial() {
  while (Serial.available() > 0) {
    char c = (char)Serial.read();
    if (c == '\r') continue;
    if (c == '\n') {
      serialBuf[serialPos] = '\0';
      if (serialPos > 0) handleSerialLine(serialBuf);
      serialPos = 0;
      return;
    }
    if (serialPos < sizeof(serialBuf) - 1) {
      serialBuf[serialPos++] = c;
    }
  }
}

void setup() {
  Serial.begin(115200);
  strip.begin();
  strip.setBrightness(BRIGHTNESS);
  strip.clear();
  strip.show();
  randomSeed(analogRead(A0));
  Serial.println("a common bloom panel ready");
  Serial.println("ACK");
}

void loop() {
  readSerial();
  drawAmbient();
  delay(24);
}
