import * as THREE from 'three'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader'
import { useEffect, useRef } from 'react'
export function SceneWithSVGPath(): JSX.Element {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1, // try making this a smaller value (e.g., 0.01)
      1000
    )
    camera.position.set(0, 0, 10)
    const light = new THREE.AmbientLight(0x404040, 1) // Ambient light
    scene.add(light)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    mountRef.current?.appendChild(renderer.domElement)

    const svgData1 = new SVGLoader().parse(`
        <svg viewBox="-50 150 500 50">
          <g id="screwHoles">
            <path fill="white" stroke="gray" d="M-31.5,162.21c-3.38,0-6.12,2.74-6.12,6.12c0,3.38,2.74,6.12,6.12,6.12s6.12-2.74,6.12-6.12C-25.38,164.95-28.12,162.21-31.5,162.21z M424.5,174.45c3.38,0,6.12-2.74,6.12-6.12c0-3.38-2.74-6.12-6.12-6.12c-3.38,0-6.12,2.74-6.12,6.12C418.38,171.71,421.12,174.45,424.5,174.45z"/>
          </g>
        </svg>
      `)

    const svgData2 = new SVGLoader().parse(`
        <svg viewBox="-50 150 500 50">
          <g id="fixedBase">
            <path d="M506.326,494.546h-619.653V-65.506h68.503V397c0,2.935,2.388,5.324,5.324,5.324H260c2.935,0,5.324-2.388,5.324-5.324V284.5c0-6.99,5.687-12.676,12.677-12.676h154.5c2.936,0,5.324-2.388,5.324-5.324V-65.506h68.503V494.546z"/>
          </g>
        </svg>
      `)

    const parsedSVGs = [svgData1, svgData2]

    parsedSVGs.forEach(svgData => {
      svgData.paths.forEach(path => {
        // Create shapes directly from path
        const shapes = path.toShapes(true)
        shapes.forEach(shape => {
          const geometry = new THREE.ExtrudeGeometry(shape, {
            depth: 0.1,
            bevelEnabled: false,
          })
          const material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide,
          })
          const mesh = new THREE.Mesh(geometry, material)
          scene.add(mesh)
        })
      })
    })

    function animate() {
      requestAnimationFrame(animate)
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      mountRef.current?.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={mountRef} />
}
