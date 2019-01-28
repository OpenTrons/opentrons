// @flow
// icon data
const ICON_DATA_BY_NAME = {
  alert: {
    viewBox: '0 0 24 24',
    path: 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z',
  },
  'arrow-left': {
    viewBox: '0 0 24 24',
    path:
      'M18 11.242v1.516H8.91l4.166 4.166L12 18l-6-6 6-6 1.076 1.076-4.167 4.166z',
  },
  'arrow-right': {
    viewBox: '0 0 24 24',
    path:
      'M4,11V13H16L10.5,18.5L11.92,19.92L19.84,12L11.92,4.08L10.5,5.5L16,11H4Z',
  },
  circle: {
    viewBox: '0 0 24 24',
    path:
      'M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z',
  },
  close: {
    viewBox: '0 0 24 24',
    path:
      'M18 7.209L16.791 6 12 10.791 7.209 6 6 7.209 10.791 12 6 16.791 7.209 18 12 13.209 16.791 18 18 16.791 13.209 12z',
  },
  refresh: {
    viewBox: '0 0 200 200',
    path:
      'M121.9,31.3L129,4.6l56.7,56.7l-77.5,20.8c0,0,7.7-28.6,7.7-28.6c-5.7-1.8-11.7-2.7-17.9-2.7 c-33.5,0-60.8,27.3-60.8,60.8c0,33.5,27.3,60.8,60.8,60.8c26.5,0,50.5-17.7,58.1-43.1l22,6.7c-5.1,16.8-15.7,32-29.8,42.6 c-14.6,11-32,16.8-50.3,16.8c-46.2,0-83.8-37.6-83.8-83.8S51.8,27.9,98,27.9C106.1,27.9,114.1,29.1,121.9,31.3',
  },
  'ot-spinner': {
    viewBox: '0 0 512 512',
    path:
      'M304 48c0 26.51-21.49 48-48 48s-48-21.49-48-48 21.49-48 48-48 48 21.49 48 48zm-48 368c-26.51 0-48 21.49-48 48s21.49 48 48 48 48-21.49 48-48-21.49-48-48-48zm208-208c-26.51 0-48 21.49-48 48s21.49 48 48 48 48-21.49 48-48-21.49-48-48-48zM96 256c0-26.51-21.49-48-48-48S0 229.49 0 256s21.49 48 48 48 48-21.49 48-48zm12.922 99.078c-26.51 0-48 21.49-48 48s21.49 48 48 48 48-21.49 48-48c0-26.509-21.491-48-48-48zm294.156 0c-26.51 0-48 21.49-48 48s21.49 48 48 48 48-21.49 48-48c0-26.509-21.49-48-48-48zM108.922 60.922c-26.51 0-48 21.49-48 48s21.49 48 48 48 48-21.49 48-48-21.491-48-48-48z',
  },
  'ot-water-outline': {
    viewBox: '0 0 24 24',
    path:
      'm 12,3.1972656 -0.650391,0.7304688 c 0,0 -1.33604,1.5032424 -2.6757809,3.4570312 -1.3397408,1.9537888 -2.7636718,4.2980244 -2.7636719,6.4726564 3e-7,3.352541 2.7373029,6.087891 6.0898438,6.08789 3.352541,0 6.089843,-2.735349 6.089844,-6.08789 0,-2.174632 -1.423931,-4.5188676 -2.763672,-6.4726564 C 13.986431,5.4309768 12.650391,3.9277344 12.650391,3.9277344 L 12,3.1972656 Z m 0,2.7265625 c 0.42229,0.4960538 0.947441,1.0669874 1.892578,2.4453125 1.269817,1.8518164 2.457031,4.1835024 2.457031,5.4882814 0,2.412334 -1.937275,4.349609 -4.349609,4.349609 -2.4123345,0 -4.3496092,-1.937275 -4.3496094,-4.349609 0,-1.304779 1.1872144,-3.636465 2.4570314,-5.4882814 C 11.052559,6.9908155 11.57771,6.4198819 12,5.9238281 Z',
  },
  'ot-click-and-drag': {
    viewBox: '0 0 48 48',
    path:
      'M44.1 37.9l-10.9-9.2H37v-4.2h-4.2v3.9l-.1-.1c-.2-.2-.5-.3-.7-.3-.6 0-1 .4-1 1v15c0 .6.4 1 1 1 .2 0 .5-.1.6-.2l2.5-2 2.2 4.7c.2.5.8.7 1.3.5l3.6-1.7c.5-.2.7-.8.5-1.3l-2.2-4.7 3.2-.6c.2 0 .4-.2.6-.3.3-.6.3-1.2-.2-1.5zM3 31.9h4.2v4.2H3zM3 8.5h4.2v4.2H3zM3 15.9h4.2v4.2H3zM3 24.4h4.2v4.2H3zM32.8 8.5H37v4.2h-4.2zM32.8 15.9H37v4.2h-4.2zM32.8 0H37v4.2h-4.2zM25.3 31.9h4.2v4.2h-4.2zM25.3 0h4.2v4.2h-4.2zM3 0h4.2v4.2H3zM17.9 0h4.2v4.2h-4.2zM10.4 31.9h4.2v4.2h-4.2zM17.9 31.9h4.2v4.2h-4.2zM10.4 0h4.2v4.2h-4.2z',
  },
  usb: {
    viewBox: '0 0 24 24',
    path:
      'M15.677 11.32h1.132v2.265h-3.396V4.528h2.264L12.281 0 8.885 4.528h2.264v9.057H7.753v-2.343c.792-.42 1.358-1.223 1.358-2.185 0-1.37-1.12-2.491-2.49-2.491s-2.49 1.12-2.49 2.49c0 .963.565 1.767 1.358 2.186v2.343a2.256 2.256 0 0 0 2.264 2.264h3.396v3.453a2.492 2.492 0 0 0-1.358 2.207 2.49 2.49 0 0 0 4.98 0 2.49 2.49 0 0 0-1.358-2.207v-3.453h3.396a2.256 2.256 0 0 0 2.265-2.264V11.32h1.132V6.792h-4.529v4.529z',
  },
  water: {
    viewBox: '0 0 24 24',
    path:
      'M12,20A6,6 0 0,1 6,14C6,10 12,3.25 12,3.25C12,3.25 18,10 18,14A6,6 0 0,1 12,20Z',
  },
  wifi: {
    viewBox: '0 0 24 24',
    path:
      'M4.8 11.4l1.8 2.4C8.1 12.7 10 12 12 12s3.9.7 5.4 1.8l1.8-2.4C17.2 9.9 14.7 9 12 9s-5.2.9-7.2 2.4zM8.4 16.2L12 21l3.6-4.8c-1-.8-2.2-1.2-3.6-1.2s-2.6.5-3.6 1.2zM12 3C8 3 4.2 4.3 1.2 6.6L3 9c2.5-1.9 5.6-3 9-3s6.5 1.1 9 3l1.8-2.4C19.8 4.3 16 3 12 3z',
  },
  'ot-wifi-0': {
    viewBox: '0 0 24 24',
    path:
      'M12 22.3l-4.3-5.7.4-.3c2.3-1.7 5.5-1.7 7.8 0l.4.3-4.3 5.7zm-2.9-5.5l2.9 3.8 2.9-3.8c-1.7-1.1-4.1-1.1-5.8 0zm8.4-1.8l-.4-.3C15.6 13.6 13.9 13 12 13s-3.6.6-5.1 1.7l-.4.3-2.4-3.2.4-.3C6.7 9.9 9.3 9 12 9s5.3.9 7.5 2.5l.4.3-2.4 3.2zm-12-3l1.2 1.6c1.6-1 3.4-1.6 5.3-1.6s3.7.6 5.3 1.6l1.2-1.6c-1.9-1.3-4.2-2-6.5-2s-4.6.7-6.5 2zm15.6-1.8l-.4-.3C18.2 8 15.2 7 12 7S5.8 8 3.3 9.9l-.4.3L.5 7l.4-.3C4.1 4.3 8 3 12 3s7.9 1.3 11.1 3.7l.4.3-2.4 3.2zM12 6c3.2 0 6.3 1 8.9 2.8l1.2-1.6C19.1 5.1 15.7 4 12 4S4.9 5.1 1.9 7.2l1.2 1.6C5.7 7 8.8 6 12 6z',
  },
  'ot-wifi-1': {
    viewBox: '0 0 24 24',
    path:
      'M8.4 16.7l3.6 4.8 3.6-4.8c-1-.8-2.2-1.2-3.6-1.2s-2.6.4-3.6 1.2zM12 9c-2.7 0-5.3.9-7.5 2.5l-.4.3L6.5 15l.4-.3C8.4 13.6 10.2 13 12 13s3.6.6 5.1 1.7l.4.3 2.4-3.2-.4-.3C17.3 9.9 14.7 9 12 9zm5.3 4.6c-3.2-2.1-7.4-2.1-10.6 0L5.5 12c1.9-1.3 4.2-2 6.5-2s4.6.7 6.5 2l-1.2 1.6zm5.8-6.9C19.9 4.3 16.1 3 12 3S4.1 4.3.9 6.7L.5 7l2.4 3.2.4-.3C5.8 8 8.8 7 12 7s6.2 1 8.7 2.9l.4.3L23.5 7l-.4-.3zm-2.2 2.1C18.3 7 15.2 6 12 6S5.7 7 3.1 8.8L1.9 7.2C4.8 5.1 8.3 4 12 4s7.2 1.1 10.1 3.2l-1.2 1.6z',
  },
  'ot-wifi-2': {
    viewBox: '0 0 24 24',
    path:
      'M4.8 11.9l1.8 2.4c1.5-1.1 3.4-1.8 5.4-1.8s3.9.7 5.4 1.8l1.8-2.4c-2-1.5-4.5-2.4-7.2-2.4s-5.2.9-7.2 2.4zm3.6 4.8l3.6 4.8 3.6-4.8c-1-.8-2.2-1.2-3.6-1.2s-2.6.5-3.6 1.2zm14.7-10C19.9 4.3 16 3 12 3S4.1 4.3.9 6.7L.5 7l2.4 3.2.4-.3C5.8 8 8.8 7 12 7s6.2 1 8.7 2.9l.4.3L23.5 7l-.4-.3zm-2.2 2.1C18.3 7 15.2 6 12 6S5.7 7 3.1 8.8L1.9 7.2C4.9 5.1 8.3 4 12 4s7.1 1.1 10.1 3.2l-1.2 1.6z',
  },
  'ot-wifi-3': {
    viewBox: '0 0 24 24',
    path:
      'M4.8 11.4l1.8 2.4C8.1 12.7 10 12 12 12s3.9.7 5.4 1.8l1.8-2.4C17.2 9.9 14.7 9 12 9s-5.2.9-7.2 2.4zM8.4 16.2L12 21l3.6-4.8c-1-.8-2.2-1.2-3.6-1.2s-2.6.5-3.6 1.2zM12 3C8 3 4.2 4.3 1.2 6.6L3 9c2.5-1.9 5.6-3 9-3s6.5 1.1 9 3l1.8-2.4C19.8 4.3 16 3 12 3z',
  },
  lock: {
    viewBox: '0 0 24 24',
    path:
      'M12,17A2,2 0 0,0 14,15C14,13.89 13.1,13 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V10C4,8.89 4.9,8 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z',
  },
  'flask-outline': {
    viewBox: '0 0 24 24',
    path:
      'M2.44444444,20.4 C2.44444444,21.0627417 2.99165197,21.6 3.66666667,21.6 L18.3333333,21.6 C19.008348,21.6 19.5555556,21.0627417 19.5555556,20.4 C19.5555556,20.148 19.47,19.908 19.3355556,19.716 L12.2222222,7.62 L12.2222222,2.4 L9.77777778,2.4 L9.77777778,7.62 L2.66444444,19.716 C2.53,19.908 2.44444444,20.148 2.44444444,20.4 Z M3.66666667,24 C1.64162258,24 0,22.3882251 0,20.4 C0,19.68 0.22,19.008 0.611111111,18.444 L7.33333333,6.972 L7.33333333,4.8 C6.65831864,4.8 6.11111111,4.2627417 6.11111111,3.6 L6.11111111,2.4 C6.11111111,1.0745166 7.20552617,0 8.55555556,0 L13.4444444,0 C14.7944738,0 15.8888889,1.0745166 15.8888889,2.4 L15.8888889,3.6 C15.8888889,4.2627417 15.3416814,4.8 14.6666667,4.8 L14.6666667,6.972 L21.3888889,18.444 C21.78,19.008 22,19.68 22,20.4 C22,22.3882251 20.3583774,24 18.3333333,24 L3.66666667,24 Z M12.2222222,16.8 L13.86,15.192 L16.2188889,19.2 L5.78111111,19.2 L9.03222222,13.668 L12.2222222,16.8 Z M11.6111111,12 C11.9486185,12 12.2222222,12.2686292 12.2222222,12.6 C12.2222222,12.9313708 11.9486185,13.2 11.6111111,13.2 C11.2736038,13.2 11,12.9313708 11,12.6 C11,12.2686292 11.2736038,12 11.6111111,12 Z',
  },
  'help-circle': {
    viewBox: '0 0 24 24',
    path:
      'M15.07,11.25L14.17,12.17C13.45,12.89 13,13.5 13,15H11V14.5C11,13.39 11.45,12.39 12.17,11.67L13.41,10.41C13.78,10.05 14,9.55 14,9C14,7.89 13.1,7 12,7A2,2 0 0,0 10,9H8A4,4 0 0,1 12,5A4,4 0 0,1 16,9C16,9.88 15.64,10.67 15.07,11.25M13,19H11V17H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12C22,6.47 17.5,2 12,2Z',
  },
  check: {
    viewBox: '0 0 24 24',
    path: 'M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z',
  },
  'check-circle': {
    viewBox: '0 0 24 24',
    path:
      'M9.6,18 L3.6,12 L5.292,10.296 L9.6,14.604 L18.708,5.496 L20.4,7.2 L9.6,18 Z M12,5.32907052e-16 C5.372583,-2.13162821e-15 5.32907052e-16,5.372583 0,12 C-1.59872116e-15,15.1825979 1.26428208,18.2348448 3.51471863,20.4852814 C5.76515517,22.7357179 8.81740212,24 12,24 C15.1825979,24 18.2348448,22.7357179 20.4852814,20.4852814 C22.7357179,18.2348448 24,15.1825979 24,12 C24,8.81740212 22.7357179,5.76515517 20.4852814,3.51471863 C18.2348448,1.26428208 15.1825979,2.66453526e-16 12,5.32907052e-16 Z',
  },
  'checkbox-blank-circle-outline': {
    viewBox: '0 0 24 24',
    path:
      'M12,21.6 C6.6980664,21.6 2.4,17.3019336 2.4,12 C2.4,6.6980664 6.6980664,2.4 12,2.4 C14.5460783,2.4 16.9878759,3.41142567 18.7882251,5.2117749 C20.5885743,7.01212413 21.6,9.4539217 21.6,12 C21.6,17.3019336 17.3019336,21.6 12,21.6 Z M12,5.32907052e-16 C5.372583,-2.13162821e-15 5.32907052e-16,5.372583 0,12 C-1.59872116e-15,15.1825979 1.26428208,18.2348448 3.51471863,20.4852814 C5.76515517,22.7357179 8.81740212,24 12,24 C15.1825979,24 18.2348448,22.7357179 20.4852814,20.4852814 C22.7357179,18.2348448 24,15.1825979 24,12 C24,8.81740212 22.7357179,5.76515517 20.4852814,3.51471863 C18.2348448,1.26428208 15.1825979,2.66453526e-16 12,5.32907052e-16 Z',
  },
  'radiobox-marked': {
    viewBox: '0 0 24 24',
    path:
      'M12 20a8 8 0 0 1-8-8 8 8 0 0 1 8-8 8 8 0 0 1 8 8 8 8 0 0 1-8 8m0-18A10 10 0 0 0 2 12a10 10 0 0 0 10 10 10 10 0 0 0 10-10A10 10 0 0 0 12 2m0 5a5 5 0 0 0-5 5 5 5 0 0 0 5 5 5 5 0 0 0 5-5 5 5 0 0 0-5-5z',
  },
  'radiobox-blank': {
    viewBox: '0 0 24 24',
    path:
      'M12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z',
  },
  'checkbox-marked': {
    viewBox: '0 0 24 24',
    path:
      'M10 17l-5-5 1.4-1.4 3.6 3.6 7.6-7.6L19 8m0-5H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z',
  },
  'checkbox-blank-outline': {
    viewBox: '0 0 24 24',
    path:
      'M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2m0 2v14H5V5h14z',
  },
  'ot-toggle-switch-off': {
    viewBox: '0 0 24 24',
    path:
      'M19.2 7.8h-7.61a6.3 6.3 0 1 0 0 8.4h7.61a4.2 4.2 0 0 0 0-8.4zM6.9 17.3a5.3 5.3 0 1 1 5.3-5.3 5.31 5.31 0 0 1-5.3 5.3z',
  },
  'ot-toggle-switch-on': {
    viewBox: '0 0 24 24',
    path:
      'M17.1,5.7a6.28,6.28,0,0,0-4.69,2.1H4.8a4.2,4.2,0,1,0,0,8.4h7.61A6.3,6.3,0,1,0,17.1,5.7Zm-5.42,9.5H4.8a3.2,3.2,0,1,1,0-6.4h6.88a6.26,6.26,0,0,0,0,6.4Z',
  },
  'chevron-up': {
    viewBox: '0 0 24 24',
    path: 'M7.41 15.857L12 11.615l4.59 4.242L18 14.545 12 9l-6 5.545z',
  },
  'chevron-down': {
    viewBox: '0 0 24 24',
    path: 'M7.41 9L12 13.242 16.59 9 18 10.312l-6 5.545-6-5.545z',
  },
  'chevron-left': {
    viewBox: '0 0 24 24',
    path: 'M15.429 17.019l-4.242-4.59 4.242-4.59-1.312-1.41-5.545 6 5.545 6z',
  },
  'chevron-right': {
    viewBox: '0 0 24 24',
    path: 'M8.571 7.839l4.242 4.59-4.242 4.59 1.312 1.41 5.545-6-5.545-6z',
  },
  'ot-connect': {
    viewBox: '0 0 24 24',
    path:
      'M17.33 9.67C14.89 5.89 12 2 12 2S9.11 5.89 6.67 9.67c-2.11 3.22-2.78 7.22-.11 10A7.4 7.4 0 0 0 12 22a7.4 7.4 0 0 0 5.44-2.33c2.67-2.89 2-6.78-.11-10zm-5.44 10.44h-.33a5.49 5.49 0 0 1-3.67-1.78 5.3 5.3 0 0 1-1.22-3.22c2.67.11 4.89-1.78 6.78-3.44a2.62 2.62 0 0 1 1.78-.78h.22c1.44.44 2.11 2.89 2 4.11a5.34 5.34 0 0 1-5.56 5.11z',
  },
  'ot-file': {
    viewBox: '0 0 24 24',
    path:
      'M20.907 0H3.803C3.334.044 3 .356 3 .822c0 1.822.022 3.645.022 5.467v11.355c0 1.823-.022 3.645-.022 5.467 0 .467.334.8.803.822H7.37c2.051 0 3.88.023 6.199 0 .736 0 1.383-.289 1.918-.777.535-.49 1.048-.956 1.538-1.49a201.554 201.554 0 0 0 2.989-3.177c.379-.4.713-.822 1.025-1.267a3.17 3.17 0 0 0 .58-1.844c.045-4.867.045-9.711.067-14.578.022-.444-.312-.778-.78-.8zm-2.074 16.444c-1.115.312-2.275.312-3.434.334-.424 0-.647.155-.736.555-.045.2-.023.867-.023 1.09-.066 1-.044 1.6-.178 2.6-.134.866-.624 1.51-1.762 1.488-2.586-.022-8.005 0-8.161 0V1.556h15.61v13.222c.022 1-.536 1.466-1.316 1.666z',
  },
  upload: {
    viewBox: '0 0 24 24',
    path:
      'M7.714 18.353v-8.47H2L12 0l10 9.882h-5.714v8.47H7.714zM2 24v-2.824h20V24H2z',
  },
  settings: {
    viewBox: '0 0 24 24',
    path:
      'M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.67 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z',
  },
  'ot-consolidate': {
    viewBox: '0 0 24 24',
    path:
      'M15.5 14.4c-1.6 0-2.6.2-3.3.5-.7.3-1.2.7-1.8 1.2-.4.4-.8.9-1.4 1.4-.7.6-1.6 1.3-2.8 1.8-1.5.7-3.5 1.1-6.2 1.1v-4c2.2 0 3.6-.3 4.6-.7.9-.4 1.6-.9 2.3-1.6.4-.4.9-.9 1.5-1.4-.6-.5-1.1-1-1.5-1.4-.8-.8-1.4-1.3-2.3-1.7-1-.4-2.4-.7-4.6-.7v-4c2.7 0 4.7.4 6.2 1.1 1.2.5 2.1 1.2 2.8 1.8.5.5 1 .9 1.4 1.3.6.6 1.1.9 1.8 1.2.7.3 1.7.5 3.3.5V7.4l8.5 5-8.5 4.9v-2.9',
  },
  'ot-distribute': {
    viewBox: '0 0 24 24',
    path:
      'M15.5 16v-2.9l8.5 5-8.5 4.9v-3c-1.3 0-2.4-.3-3.4-.7-1.1-.4-2.1-1-2.9-1.6-1.7-1.2-3-2.3-4.8-3.1-1.2-.5-2.5-.8-4.4-.8V9.3c1.9 0 3.2-.3 4.4-.8 1.7-.7 3.1-1.9 4.8-3.1.8-.6 1.8-1.2 2.9-1.6 1-.4 2.2-.7 3.4-.7V.4l8.5 5-8.5 4.9V7.1c-1.1.1-1.9.3-2.7.7-.7.3-1.4.8-2.1 1.4-1 .7-2.1 1.6-3.5 2.3 1.4.8 2.5 1.6 3.5 2.3.8.6 1.4 1 2.1 1.4.8.5 1.6.7 2.7.8z',
  },
  'ot-mix': {
    viewBox: '0 0 24 24',
    path:
      'M7.8 2.4v10.3H3.4V2.4h4.4zM5.6 21.5L.4 12.7h10.3l-5.1 8.8zm10.5.1V11.2h4.4v10.4h-4.4zm2.3-19.2l5.2 8.8H13.2l5.2-8.8z',
  },
  pause: {
    viewBox: '0 0 24 24',
    path: 'M9.2 2v19.8H2V2zm13 0v19.8H15V2z',
  },
  'pause-circle': {
    viewBox: '0 0 24 24',
    path:
      'M15 16h-2V8h2m-4 8H9V8h2m1-6A10 10 0 0 0 2 12a10 10 0 0 0 10 10 10 10 0 0 0 10-10A10 10 0 0 0 12 2z',
  },
  pen: {
    viewBox: '0 0 24 24',
    path:
      'M20.71,7.04C20.37,7.38 20.04,7.71 20.03,8.04C20,8.36 20.34,8.69 20.66,9C21.14,9.5 21.61,9.95 21.59,10.44C21.57,10.93 21.06,11.44 20.55,11.94L16.42,16.08L15,14.66L19.25,10.42L18.29,9.46L16.87,10.87L13.12,7.12L16.96,3.29C17.35,2.9 18,2.9 18.37,3.29L20.71,5.63C21.1,6 21.1,6.65 20.71,7.04M3,17.25L12.56,7.68L16.31,11.43L6.75,21H3V17.25Z',
  },
  pencil: {
    viewBox: '0 0 24 24',
    path:
      'M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z',
  },
  'ot-transfer': {
    viewBox: '0 0 24 24',
    path: 'M0 10.8h15.5V8l8.5 5-8.5 4.9v-2.8H0z',
  },
  'menu-down': {
    viewBox: '0 0 24 24',
    path: 'M7,10L12,15L17,10H7Z',
  },
  'cursor-move': {
    viewBox: '0 0 24 24',
    path:
      'M13,6V11H18V7.75L22.25,12L18,16.25V13H13V18H16.25L12,22.25L7.75,18H11V13H6V16.25L1.75,12L6,7.75V11H11V6H7.75L12,1.75L16.25,6H13Z',
  },
  plus: {
    viewBox: '0 0 24 24',
    path: 'M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z',
  },
  minus: {
    viewBox: '0 0 24 24',
    path: 'M19,13H5V11H19V13Z',
  },
  'content-copy': {
    viewBox: '0 0 24 24',
    path:
      'M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z',
  },
  'dots-horizontal': {
    viewBox: '0 0 24 24',
    path:
      'M5.5 10A2.5 2.5 0 1 1 3 12.5 2.5 2.5 0 0 1 5.5 10zm7 0a2.5 2.5 0 1 1-2.5 2.5 2.5 2.5 0 0 1 2.5-2.5zm7 0a2.5 2.5 0 1 1-2.5 2.5 2.5 2.5 0 0 1 2.5-2.5z',
  },
  'ot-calibrate': {
    viewBox: '0 0 24 24',
    path:
      'M17.4 16.3c-1.4-.8-2.9-1.6-4.3-2.5-.2-.1-.2-.2-.2-.4V8.3c0-.4-.1-.5-.5-.5h-.9c-.4 0-.5.2-.5.5v5c0 .2-.1.3-.3.4-1.4.8-2.9 1.7-4.3 2.5-.4.3-.4.5-.2.8.1.2.3.5.4.7.2.4.4.5.8.2 1.4-.8 2.9-1.7 4.3-2.5.2-.1.3-.1.4 0 1.5.8 2.9 1.7 4.4 2.5.4.2.5.2.8-.2.1-.2.3-.5.4-.7.2-.3.2-.5-.3-.7zM3.7 19.8c0-.2.2-.4.4-.7.3-.4.5-.8.8-1.2H3.7c-.1 0-.2 0-.3.2-.2.3-.4.7-.6 1-.2-.4-.4-.7-.6-1 0-.1-.1-.1-.2-.1H.7c.2 0 .2.1.3.2.3.5.6 1 1 1.4 0 .1 0 .2-.1.4-.4.5-.7 1-1 1.5-.1.1-.1.2-.2.3h1.2c.2 0 .3-.1.3-.2.2-.3.4-.7.7-1.1.2.4.5.7.7 1.1 0 .1.1.1.2.1h1.3c-.3-.5-.6-.9-.9-1.3-.2-.2-.5-.4-.5-.6zM13.6 5.8V5h-2v-.1c.1-.1.2-.1.2-.2.6-.6 1.1-1.3 1.7-1.9.1-.1.1-.1.1-.2v-.7h-3.1v.8h1.8l-.2.2c-.6.7-1.1 1.3-1.7 2-.1.1-.2.1-.2.2v.7h3.4zM21.9 17.9c-.2 0-.3.1-.4.2-.2.4-.4.7-.7 1.1-.3-.4-.5-.8-.7-1.1 0-.1-.1-.2-.2-.2h-1.3c.1.1.1.2.2.2l1.2 1.8c.1.2.2.3.2.5v1.3h1.2v-1.4c0-.1 0-.3.1-.4.4-.6.8-1.2 1.3-1.8 0-.1.1-.1.2-.3-.4.1-.7.1-1.1.1z',
  },
  'ot-run': {
    viewBox: '0 0 24 24',
    path:
      'M18.83 11.58V1.89a.6.6 0 0 0-.61-.62H5a.64.64 0 0 0-.62.64v17.34a.62.62 0 0 0 .62.64h5.45a6.06 6.06 0 1 0 8.41-8.31zm-9.36 5.09a6 6 0 0 0 .4 2.1H5.54V2.48h12.14V11a6 6 0 0 0-8.2 5.66zm4.61 2.81v-5.64l3.72 2.76z',
  },
  'ot-logo': {
    viewBox: '0 0 50 50',
    path:
      'M46.79 24.83A21.79 21.79 0 1 1 21.23 3.38l.83 5.31a16.42 16.42 0 1 0 5.87 0l.83-5.31a21.82 21.82 0 0 1 18.03 21.45zm-28.14-3.14c3-4.52 6.34-9.23 6.35-9.23s3.37 4.72 6.35 9.23c2.56 3.9 3.31 8.71.15 12.13a8.76 8.76 0 0 1-6.5 2.83 8.76 8.76 0 0 1-6.46-2.82c-3.19-3.43-2.45-8.24.11-12.14zm0 6.62a5.8 5.8 0 0 0 1.42 3.88 6.29 6.29 0 0 0 4.35 2.16h.45a6.38 6.38 0 0 0 6.59-6.17c.05-1.54-.66-4.47-2.41-5a1.65 1.65 0 0 0-.31-.06 2.93 2.93 0 0 0-2.09.91c-2.17 2.08-4.73 4.46-7.96 4.28z',
  },
  'ot-design': {
    viewBox: '0 0 42 35',
    path:
      'M7.25,4.62962963 L29,4.62962963 L29,1.85185185 L7.25,1.85185185 L7.25,4.62962963 Z M0,10.8796296 L2.71875,10.8796296 L0,14.2824074 L0,15.7407407 L4.53125,15.7407407 L4.53125,14.1203704 L1.8125,14.1203704 L4.53125,10.7175926 L4.53125,9.25925926 L0,9.25925926 L0,10.8796296 Z M1.359375,6.48148148 L2.71875,6.48148148 L2.71875,0 L0,0 L0,1.62037037 L1.359375,1.62037037 L1.359375,6.48148148 Z M0,20.1388889 L0,18.5185185 L4.53125,18.5185185 L4.53125,25 L0,25 L0,23.3796296 L3.02083333,23.3796296 L3.02083333,22.5694444 L1.51041667,22.5694444 L1.51041667,20.9490741 L3.02083333,20.9490741 L3.02083333,20.1388889 L0,20.1388889 Z M29,11 L26.4828564,13.7114681 L26.2150029,14 L7,14 L7,11 L29,11 Z M20,20 L17.1686211,23 L7,23 L7,20 L20,20 Z M40.6263029,13.2874601 C40.0959278,13.8162755 39.581152,14.3295376 39.5655527,14.8427996 C39.5187549,15.3405083 40.04913,15.8537703 40.5483066,16.3359256 C41.2970714,17.1135953 42.030237,17.8134981 41.9990385,18.5756145 C41.9678399,19.3377309 41.1722773,20.130954 40.3767146,20.9086238 L33.9342171,27.3477295 L31.7191211,25.1391473 L38.3488099,18.5445077 L36.8512802,17.0513818 L34.6361842,19.2444105 L28.7864588,13.4118872 L34.7765776,7.45493681 C35.384949,6.8483544 36.3989014,6.8483544 36.9760743,7.45493681 L40.6263029,11.0944313 C41.2346744,11.669907 41.2346744,12.6808777 40.6263029,13.2874601 Z M13,29.1674767 L27.9128998,14.2828774 L33.7626252,20.1154006 L18.8497254,35 L13,35 L13,29.1674767 Z',
  },
  'alert-circle': {
    viewBox: '0 0 24 24',
    path:
      'M12 .33A11.67 11.67 0 1 0 23.67 12 11.67 11.67 0 0 0 12 .33zm1.17 17.5h-2.34V15.5h2.33zm0-4.67h-2.34v-7h2.33z',
  },
  'close-circle': {
    viewBox: '0 0 24 24',
    path:
      'M12 .33A11.67 11.67 0 1 0 23.67 12 11.66 11.66 0 0 0 12 .33zm5.83 15.86l-1.64 1.64L12 13.65l-4.19 4.18-1.64-1.64L10.35 12 6.17 7.81l1.64-1.64L12 10.35l4.19-4.19 1.64 1.64-4.18 4.2z',
  },
  'ot-arrow-up': {
    viewBox: '0 0 24 24',
    path: 'M20 12l-8-8-8 8h4v8h8v-8z',
  },
  'ot-arrow-down': {
    viewBox: '0 0 24 24',
    path: 'M4 12l8 8 8-8h-4V4H8v8z',
  },
  'ot-arrow-left': {
    viewBox: '0 0 24 24',
    path: 'M12 4l-8 8 8 8v-4h8V8h-8z',
  },
  'ot-arrow-right': {
    viewBox: '0 0 24 24',
    path: 'M12 20l8-8-8-8v4H4v8h8z',
  },
  information: {
    viewBox: '0 0 24 24',
    path:
      'M13 9h-2V7h2m0 10h-2v-6h2m-1-9A10 10 0 0 0 2 12a10 10 0 0 0 10 10 10 10 0 0 0 10-10A10 10 0 0 0 12 2z',
  },
  'swap-horizontal': {
    viewBox: '0 0 24 24',
    path: 'M21,9L17,5V8H10V10H17V13M7,11L3,15L7,19V16H14V14H7V11Z',
  },
}

export type IconName = $Keys<typeof ICON_DATA_BY_NAME>

export default ICON_DATA_BY_NAME
