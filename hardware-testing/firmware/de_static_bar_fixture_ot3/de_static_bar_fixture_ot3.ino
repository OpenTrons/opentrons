// (sigler) this was made for an Arduino Uno and a Power Relay Module
//         https://www.adafruit.com/product/2935

#define PIN_OUTLET (12)
#define PIN_STATE_ON (HIGH)
#define PIN_STATE_OFF (LOW)
#define ON_TIME_MS (1000)

String TRIGGER = "enable";
uint8_t trigger_idx = 0;
unsigned long triggered_timestamp = 0;

bool is_scary_static_bar_timer_running() {
  if (!triggered_timestamp) {
    return false;
  }
  return (millis() - triggered_timestamp < ON_TIME_MS);
}

void turn_on_the_scary_static_bar_timer() {
  digitalWrite(PIN_OUTLET, PIN_STATE_ON);
  triggered_timestamp = millis();
}

void empty_serial_buffer() {
  while (Serial.available()) {
    Serial.read();
    delay(2);
  }
}

bool check_serial_for_trigger() {
  if (!Serial.available()) {
    return false;
  }
  char c = Serial.read();
  if (c == '?') {
    if (is_scary_static_bar_timer_running()) {
      Serial.println("on");
    } else {
      Serial.println("off");
    }
  }
  else if (c == TRIGGER[trigger_idx]) {
    trigger_idx += 1;
  } else {
    trigger_idx = 0;
  }
  if (trigger_idx == TRIGGER.length()) {
    trigger_idx = 0;
    empty_serial_buffer();
    return true;
  } else {
    return false;
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_OUTLET, OUTPUT);
}

void loop() {
  // if the timer is OFF, always explicitely write the GPIO to OFF
  // to be on the safe side of things...
  if (!is_scary_static_bar_timer_running()) {
    digitalWrite(PIN_OUTLET, PIN_STATE_OFF);
  }
  // if timer is currently OFF and trigger is received, turn timer ON
  // else if timer is currently ON, empty the serial buffer (ignoring messages)
  if (check_serial_for_trigger() && !is_scary_static_bar_timer_running()) {
    turn_on_the_scary_static_bar_timer();
  }
}
