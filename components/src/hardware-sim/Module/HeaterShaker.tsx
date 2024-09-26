import { COLORS } from '../../helix-design-system'

export interface HeaterShakerVizProps {
  targetTemp: number | null
}

export function HeaterShaker(props: HeaterShakerVizProps): JSX.Element {
  const { targetTemp } = props
  let ledLightColor: string = COLORS.white
  if (targetTemp != null) ledLightColor = COLORS.red30

  return (
    <g id="heaterShaker">
      <g id="moduleBaseFill">
        <path
          d="M 28.312 87.55 c 0.882 0 1.078 -0.7 1.078 -1.4 v -3.4 c 0 -0.2 -0.196 -0.5 -0.49 -0.5 h -5.096 c -0.196 0 -0.49 -0.2 -0.49 -0.5 v -4.5 c 0 -0.2 -0.196 -0.5 -0.49 -0.5 h -5.586 c -0.98 0 -1.862 -0.8 -1.862 -1.9 V 14.55 c 0 -1 0.784 -1.9 1.862 -1.9 h 5.586 c 0.196 0 0.49 -0.2 0.49 -0.5 V 7.75 c 0 -0.2 0.196 -0.5 0.49 -0.5 H 28.9 c 0.196 0 0.49 -0.2 0.49 -0.5 V 3.45 c 0 -0.8 -0.392 -1.4 -1.078 -1.4 s -23.422 0 -23.422 0 v 85.5 C 4.89 87.55 27.43 87.55 28.312 87.55 z"
          style={{ fill: '#E6E6E6' }}
        ></path>
      </g>
      <g id="moduleOutline">
        <path d="M 149.342 0.05 v 89.6 H 5.478 V 0.05 H 149.342 M 150.322 -1.05 H 4.4 v 91.7 h 145.922 V -1.05 L 150.322 -1.05 z"></path>
      </g>
      <g id="moduleBaseInnerWalls">
        <path d="M 149.832 88.05 H 147.48 v -1.4 H 29.88 c -0.196 1.2 -1.176 1.4 -1.568 1.4 H 4.89 v -1 h 23.324 c 0.294 0 0.686 -0.1 0.686 -0.9 v -0.5 h 119.56 v 1.4 h 1.372 V 88.05 z"></path>
        <path d="M 148.46 3.95 H 28.9 V 3.45 c 0 -0.8 -0.294 -0.9 -0.686 -0.9 H 4.89 v -1 h 23.324 c 0.392 0 1.372 0.1 1.568 1.4 h 117.6 V 1.55 h 2.352 v 1 H 148.46 V 3.95 z"></path>
      </g>
      <g id="statusFill">
        <path
          d="M 9.104 39.25 c 0 -1.1 0.882 -2 1.96 -2 s 1.96 0.9 1.96 2 v 11.2 c 0 1.1 -0.882 2 -1.96 2 s -1.96 -0.9 -1.96 -2 V 39.25 z"
          style={{ fill: ledLightColor }}
        ></path>
      </g>
      <g id="statusOutline">
        <path d="M 11.064 52.65 H 10.966 c -1.176 0 -2.156 -1 -2.156 -2.2 V 39.15 c 0 -1.2 0.98 -2.2 2.156 -2.2 h 0.098 C 12.24 36.95 13.22 37.95 13.22 39.15 v 11.3 C 13.22 51.65 12.24 52.65 11.064 52.65 z M 10.966 37.45 c -0.882 0 -1.666 0.8 -1.666 1.7 v 11.3 c 0 1 0.784 1.7 1.666 1.7 h 0.098 c 0.98 0 1.666 -0.8 1.666 -1.7 V 39.15 c 0 -1 -0.784 -1.7 -1.666 -1.7 H 10.966 z"></path>
      </g>
      <g id="moduleMidFill">
        <path
          d="M 16.258 90.15 L 12.828 84.95 c -0.098 -0.1 -0.098 -0.2 -0.098 -0.3 V 4.95 c 0 -0.1 0 -0.2 0.098 -0.3 l 3.43 -5.2 h 131.516 l 3.43 5.2 c 0.098 0.1 0.098 0.2 0.098 0.3 v 79.7 c 0 0.1 0 0.2 -0.098 0.3 l -3.43 5.2 H 16.258"
          style={{ fill: '#E6E6E6' }}
        ></path>
      </g>
      <g id="moduleMidOutline">
        <path d="M 147.48 0.05 l 3.234 5 v 79.7 l -3.234 5 H 16.454 l -3.234 -5 V 4.95 l 3.234 -4.9 L 147.48 0.05 M 147.97 -1.05 H 15.964 L 12.436 4.35 C 12.338 4.55 12.24 4.75 12.24 4.95 v 79.7 c 0 0.2 0.098 0.4 0.196 0.6 l 3.528 5.4 h 132.104 l 3.528 -5.4 c 0.098 -0.2 0.196 -0.4 0.196 -0.6 V 4.95 c 0 -0.2 -0.098 -0.4 -0.196 -0.6 L 147.97 -1.05 L 147.97 -1.05 z"></path>
      </g>
      <g id="plateBottomFill">
        <path
          d="M 52.518 5.45 c -0.882 0 -1.666 0.6 -1.862 1.6 c -0.392 1.7 -1.862 2.9 -3.626 2.9 s -3.234 -1.2 -3.626 -2.9 c -0.196 -1 -1.078 -1.6 -1.862 -1.6 H 28.312 c -1.568 0 -2.842 1.3 -2.842 2.9 v 72.9 c 0 1.6 1.274 2.9 2.842 2.9 h 13.132 c 0.784 0 1.568 -0.6 1.862 -1.6 c 0.392 -1.7 1.862 -2.9 3.626 -2.9 s 3.234 1.2 3.626 2.9 c 0.196 1 0.98 1.6 1.862 1.6 h 58.996 c 0.882 0 1.666 -0.6 1.862 -1.6 c 0.392 -1.7 1.862 -2.9 3.626 -2.9 c 1.764 0 3.234 1.2 3.626 2.9 c 0.196 1 1.078 1.6 1.862 1.6 H 135.72 c 1.568 0 2.842 -1.3 2.842 -2.9 V 8.35 c 0 -1.6 -1.274 -2.9 -2.842 -2.9 h -13.132 c -0.784 0 -1.568 0.6 -1.862 1.6 c -0.392 1.7 -1.862 2.9 -3.626 2.9 c -1.764 0 -3.234 -1.2 -3.626 -2.9 c -0.196 -1 -0.98 -1.6 -1.862 -1.6 L 52.518 5.45 L 52.518 5.45 z"
          style={{ fill: COLORS.white }}
        ></path>
      </g>
      <g id="plateBottomOutline">
        <path d="M 135.72 84.45 h -13.132 c -0.98 0 -1.764 -0.7 -2.058 -1.7 c -0.392 -1.6 -1.764 -2.7 -3.43 -2.7 s -3.038 1.1 -3.43 2.7 c -0.294 1.1 -1.078 1.7 -2.058 1.7 H 52.518 c -0.98 0 -1.862 -0.7 -2.058 -1.7 c -0.392 -1.6 -1.764 -2.7 -3.43 -2.7 s -3.038 1.1 -3.43 2.7 c -0.294 1 -1.078 1.7 -2.058 1.7 H 28.312 c -1.764 0 -3.136 -1.4 -3.136 -3.2 V 8.35 c 0 -1.8 1.372 -3.2 3.136 -3.2 h 13.132 c 0.98 0 1.764 0.7 2.058 1.7 c 0.392 1.6 1.764 2.7 3.43 2.7 s 3.038 -1.1 3.43 -2.7 c 0.294 -1 0.98 -1.6 1.862 -1.7 l 0 0 h 59.192 c 0.98 0 1.862 0.7 2.058 1.7 c 0.392 1.6 1.764 2.7 3.43 2.7 s 3.038 -1.1 3.43 -2.7 c 0.294 -1 1.078 -1.7 2.058 -1.7 H 135.72 c 1.764 0 3.136 1.4 3.136 3.2 v 72.9 C 138.758 83.05 137.386 84.45 135.72 84.45 z M 117.002 79.55 c 1.862 0 3.43 1.3 3.92 3.1 c 0.196 0.8 0.882 1.4 1.568 1.4 H 135.72 c 1.47 0 2.646 -1.2 2.646 -2.7 v -73 c 0 -1.5 -1.176 -2.7 -2.646 -2.7 h -13.132 c -0.686 0 -1.372 0.6 -1.568 1.4 c -0.49 1.8 -2.058 3.1 -3.92 3.1 s -3.43 -1.3 -3.92 -3.1 c -0.196 -0.8 -0.882 -1.4 -1.666 -1.4 h -58.8 h -0.196 c -0.784 0 -1.372 0.5 -1.666 1.4 c -0.49 1.8 -2.058 3.1 -3.92 3.1 s -3.43 -1.3 -3.92 -3.1 c -0.196 -0.8 -0.882 -1.4 -1.568 -1.4 H 28.312 c -1.47 0 -2.646 1.2 -2.646 2.7 v 72.9 c 0 1.5 1.176 2.7 2.646 2.7 h 13.132 c 0.686 0 1.372 -0.6 1.568 -1.4 c 0.49 -1.8 2.058 -3.1 3.92 -3.1 s 3.43 1.3 3.92 3.1 c 0.196 0.8 0.882 1.4 1.666 1.4 h 58.996 c 0.784 0 1.372 -0.5 1.666 -1.4 C 113.572 80.75 115.14 79.55 117.002 79.55 z"></path>
      </g>
      <g id="plateHolder">
        <path d="M 117.002 1.95 c -2.254 0 -4.018 1.8 -4.018 4.1 s 1.764 4.1 4.018 4.1 s 4.018 -1.8 4.018 -4.1 S 119.256 1.95 117.002 1.95 z M 113.474 6.05 c 0 -0.4 0.098 -0.8 0.196 -1.1 h 6.664 c 0.098 0.4 0.196 0.7 0.196 1.1 c 0 0.2 0 0.4 -0.098 0.6 h -6.958 C 113.572 6.45 113.474 6.25 113.474 6.05 z M 117.002 2.45 c 1.372 0 2.548 0.8 3.136 2 h -6.272 C 114.454 3.25 115.63 2.45 117.002 2.45 z M 117.002 9.65 c -1.568 0 -2.842 -1.1 -3.332 -2.5 h 6.664 C 119.942 8.55 118.57 9.65 117.002 9.65 z M 46.932 1.95 c -2.254 0 -4.018 1.8 -4.018 4.1 s 1.764 4.1 4.018 4.1 s 4.018 -1.8 4.018 -4.1 S 49.186 1.95 46.932 1.95 z M 43.404 6.05 c 0 -0.4 0.098 -0.8 0.196 -1.1 h 6.664 C 50.46 5.25 50.46 5.65 50.46 6.05 c 0 0.2 0 0.4 -0.098 0.6 h -6.958 C 43.502 6.45 43.404 6.25 43.404 6.05 z M 46.932 2.45 c 1.372 0 2.548 0.8 3.136 2 h -6.272 C 44.482 3.25 45.56 2.45 46.932 2.45 z M 46.932 9.65 c -1.568 0 -2.842 -1.1 -3.332 -2.5 h 6.664 C 49.872 8.55 48.5 9.65 46.932 9.65 z M 46.932 79.45 c -2.254 0 -4.018 1.8 -4.018 4.1 s 1.764 4.1 4.018 4.1 s 4.018 -1.8 4.018 -4.1 S 49.186 79.45 46.932 79.45 z M 46.932 79.95 c 1.568 0 2.94 1.1 3.332 2.5 H 43.6 C 44.09 81.05 45.364 79.95 46.932 79.95 z M 50.46 83.55 c 0 0.4 -0.098 0.8 -0.196 1.2 H 43.6 c -0.098 -0.4 -0.196 -0.8 -0.196 -1.2 c 0 -0.2 0 -0.4 0.098 -0.6 H 50.46 C 50.46 83.15 50.46 83.35 50.46 83.55 z M 46.932 87.15 c -1.372 0 -2.548 -0.8 -3.136 -1.9 h 6.174 C 49.48 86.35 48.304 87.15 46.932 87.15 z M 117.002 79.45 c -2.254 0 -4.018 1.8 -4.018 4.1 s 1.764 4.1 4.018 4.1 s 4.018 -1.8 4.018 -4.1 S 119.256 79.45 117.002 79.45 z M 117.002 79.95 c 1.568 0 2.94 1.1 3.332 2.5 h -6.664 C 114.16 81.05 115.434 79.95 117.002 79.95 z M 120.53 83.55 c 0 0.4 -0.098 0.8 -0.196 1.2 h -6.664 c -0.098 -0.4 -0.196 -0.8 -0.196 -1.2 c 0 -0.2 0 -0.4 0.098 -0.6 h 6.958 C 120.53 83.15 120.53 83.35 120.53 83.55 z M 117.002 87.15 c -1.372 0 -2.548 -0.8 -3.136 -1.9 h 6.174 C 119.55 86.35 118.374 87.15 117.002 87.15 z"></path>
      </g>
      <g id="adapterScrew">
        <path
          d="M 82.016 49.45 c -2.548 0 -4.606 -2.1 -4.606 -4.7 s 2.058 -4.7 4.606 -4.7 s 4.606 2.1 4.606 4.7 S 84.466 49.45 82.016 49.45 z M 82.016 40.55 c -2.254 0 -4.116 1.9 -4.116 4.2 s 1.862 4.2 4.116 4.2 c 2.254 0 4.116 -1.9 4.116 -4.2 C 86.132 42.45 84.27 40.55 82.016 40.55 z M 82.016 47.95 c -1.764 0 -3.136 -1.4 -3.136 -3.2 s 1.372 -3.2 3.136 -3.2 s 3.136 1.4 3.136 3.2 C 85.054 46.55 83.682 47.95 82.016 47.95 z M 82.016 42.15 c -1.47 0 -2.646 1.2 -2.646 2.7 s 1.176 2.7 2.646 2.7 s 2.646 -1.2 2.646 -2.7 C 84.564 43.35 83.388 42.15 82.016 42.15 z"
          style={{ fill: '#ADADAD' }}
        ></path>
      </g>
      <g id="leftLatchFill">
        <path
          d="M 18.218 5.55 c 0 -0.4 0.098 -0.8 0.392 -1.2 L 22.824 -1.05 h -6.86 L 12.436 4.35 C 12.338 4.55 12.24 4.75 12.24 4.95 v 79.7 c 0 0.2 0.098 0.4 0.196 0.6 l 3.528 5.4 h 6.86 l -4.214 -5.4 c -0.196 -0.4 -0.392 -0.7 -0.392 -1.2 L 18.218 5.55 L 18.218 5.55 z"
          style={{ fill: '#E6E6E6' }}
        ></path>
      </g>
      <g id="leftLatchOutline">
        <path d="M 20.668 0.05 l -2.842 3.7 c -0.392 0.5 -0.588 1.2 -0.588 1.8 v 78.5 c 0 0.7 0.196 1.3 0.588 1.8 l 2.842 3.7 h -4.214 l -3.234 -5 V 4.95 l 3.234 -4.9 L 20.668 0.05 M 22.824 -1.05 h -6.86 L 12.436 4.35 C 12.338 4.55 12.24 4.75 12.24 4.95 v 79.7 c 0 0.2 0.098 0.4 0.196 0.6 l 3.528 5.4 h 6.86 l -4.214 -5.4 c -0.196 -0.4 -0.392 -0.7 -0.392 -1.2 V 5.55 c 0 -0.4 0.098 -0.8 0.392 -1.2 L 22.824 -1.05 L 22.824 -1.05 z"></path>
      </g>
      <g id="rightLatchFill">
        <path
          d="M 146.794 5.55 c 0 -0.4 -0.098 -0.8 -0.392 -1.2 L 142.188 -1.05 h 6.86 l 3.528 5.4 c 0.098 0.2 0.196 0.4 0.196 0.6 v 79.7 c 0 0.2 -0.098 0.4 -0.196 0.6 l -3.528 5.4 h -6.86 l 4.214 -5.4 c 0.196 -0.4 0.392 -0.7 0.392 -1.2 V 5.55 z"
          style={{ fill: '#E6E6E6' }}
        ></path>
      </g>
      <g id="rightLatchOutline">
        <path d="M 148.558 0.05 l 3.234 5 v 79.7 l -3.234 5 h -4.214 l 2.842 -3.7 c 0.392 -0.5 0.588 -1.2 0.588 -1.8 V 5.55 c 0 -0.7 -0.196 -1.3 -0.588 -1.8 l -2.842 -3.7 L 148.558 0.05 M 149.048 -1.05 h -6.86 l 4.214 5.4 c 0.196 0.4 0.392 0.7 0.392 1.2 v 78.5 c 0 0.4 -0.098 0.8 -0.392 1.2 l -4.214 5.4 h 6.86 l 3.528 -5.4 c 0.098 -0.2 0.196 -0.4 0.196 -0.6 V 4.85 c 0 -0.2 -0.098 -0.4 -0.196 -0.6 L 149.048 -1.05 L 149.048 -1.05 z"></path>
      </g>
    </g>
  )
}
