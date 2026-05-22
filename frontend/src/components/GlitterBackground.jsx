import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useMemo, useRef } from 'react'

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = `
  uniform float iTime;
  uniform vec2 iResolution;
  uniform sampler2D iChannel0;
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;
    float result = 0.0;

    result += texture2D(iChannel0, uv * 1.1 + vec2(iTime * -0.005)).r;
    result *= texture2D(iChannel0, uv * 0.9 + vec2(iTime * 0.005)).g;

    result = pow(result, 12.0);

    float alpha = clamp(result * 20.0, 0.0, 1.0);
    gl_FragColor = vec4(vec3(5.0) * result, alpha);
  }
`

function generateNoiseTexture(size = 512) {
  const data = new Uint8Array(size * size * 4)
  for (let i = 0; i < size * size; i++) {
    const stride = i * 4
    data[stride]     = Math.random() * 255
    data[stride + 1] = Math.random() * 255
    data[stride + 2] = Math.random() * 255
    data[stride + 3] = 255
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.needsUpdate = true
  return texture
}

function SparklesPlane({ speed = 1 }) {
  const meshRef = useRef(null)
  const noiseTexture = useMemo(() => generateNoiseTexture(512), [])

  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      iTime:       { value: 0 },
      iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      iChannel0:   { value: noiseTexture },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    side: THREE.DoubleSide,
  }), [noiseTexture])

  useFrame((state) => {
    if (meshRef.current?.material instanceof THREE.ShaderMaterial) {
      meshRef.current.material.uniforms.iTime.value = state.clock.elapsedTime * speed
      meshRef.current.material.uniforms.iResolution.value.set(state.size.width, state.size.height)
    }
  })

  return (
    <mesh ref={meshRef} material={material}>
      <planeGeometry args={[10, 10]} />
    </mesh>
  )
}

export default function GlitterBackground({ speed = 0.75 }) {
  return (
    <div
      className="absolute inset-0 w-full h-full pointer-events-none scale-125 opacity-40 mix-blend-lighten"
      style={{ zIndex: 0 }}
    >
      <Canvas
        camera={{ position: [0, 0, 8], fov: 35 }}
        style={{ width: '100%', height: '100%' }}
        gl={{ alpha: true, powerPreference: 'high-performance' }}
      >
        <SparklesPlane speed={speed} />
      </Canvas>
    </div>
  )
}
