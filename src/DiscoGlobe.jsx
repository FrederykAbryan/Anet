import { useEffect, useRef, useState } from 'react';
import fallbackGlobe from '../assets/art/disco-ball.svg';

function makeMirrorTexture(THREE) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  const tile = 32;
  const reflections = ['#dbe6f2', '#f4d5e4', '#b9d0e2', '#f6f3f7', '#8fa3bd', '#d3c7df'];

  for (let row = 0; row < canvas.height / tile; row += 1) {
    for (let column = 0; column < canvas.width / tile; column += 1) {
      const x = column * tile;
      const y = row * tile;
      const color = reflections[(column * 5 + row * 3 + (column % 2 ? row : 0)) % reflections.length];
      const face = context.createLinearGradient(x, y, x + tile, y + tile);
      face.addColorStop(0, '#fff');
      face.addColorStop(0.18, color);
      face.addColorStop(0.68, color);
      face.addColorStop(1, '#68758d');
      context.fillStyle = face;
      context.fillRect(x + 1, y + 1, tile - 2, tile - 2);
      context.fillStyle = 'rgba(255,255,255,.72)';
      context.fillRect(x + 2, y + 2, tile - 4, 2);
      context.fillStyle = 'rgba(31,43,64,.38)';
      context.fillRect(x + 2, y + tile - 4, tile - 4, 2);
      context.strokeStyle = 'rgba(255,255,255,.66)';
      context.lineWidth = 1;
      context.strokeRect(x + 1.5, y + 1.5, tile - 3, tile - 3);
      if ((row + column) % 13 === 0) {
        context.fillStyle = 'rgba(255,255,255,.92)';
        context.fillRect(x + 12, y + 9, 2, 2);
        context.fillRect(x + 15, y + 12, 2, 2);
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

export default function DiscoGlobe({ className = '' }) {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const [webglReady, setWebglReady] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    const canvasMount = canvasRef.current;
    if (!root || !canvasMount) return undefined;

    let disposed = false;
    let initialized = false;
    let visible = false;
    let frame = 0;
    let renderer;
    let scene;
    let camera;
    let globe;
    let geometry;
    let material;
    let texture;
    let observer;
    let resizeObserver;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const render = () => {
      if (disposed || !renderer || !camera || !scene) return;
      renderer.render(scene, camera);
    };

    const animate = () => {
      frame = 0;
      if (disposed || !renderer || !globe || !visible || reducedMotion.matches) return;
      globe.rotation.y += 0.008;
      render();
      frame = window.requestAnimationFrame(animate);
    };

    const startAnimation = () => {
      if (!frame && visible && !reducedMotion.matches) {
        frame = window.requestAnimationFrame(animate);
      }
    };

    const resize = () => {
      if (!renderer || !camera) return;
      const { width, height } = root.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      render();
    };

    const handleMotionChange = () => {
      if (reducedMotion.matches) {
        window.cancelAnimationFrame(frame);
        frame = 0;
        render();
      } else {
        startAnimation();
      }
    };

    const initialize = async () => {
      if (initialized || disposed) return;
      initialized = true;
      try {
        const THREE = await import('three');
        if (disposed) return;

        const { width, height } = root.getBoundingClientRect();
        if (!width || !height) {
          initialized = false;
          return;
        }

        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        renderer.setSize(width, height, false);
        renderer.setClearColor(0x000000, 0);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.1;
        renderer.domElement.setAttribute('aria-hidden', 'true');
        renderer.domElement.style.cssText = 'display:block;width:100%;height:100%';
        canvasMount.replaceChildren(renderer.domElement);

        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(32, width / height, 0.1, 30);
        camera.position.set(0, 0, 3.25);
        scene.add(new THREE.HemisphereLight(0xf5f2ff, 0x525568, 1.5));

        const keyLight = new THREE.DirectionalLight(0xffffff, 2.6);
        keyLight.position.set(-2.5, 3, 4);
        scene.add(keyLight);
        const pinkLight = new THREE.PointLight(0xffa6cf, 2.1, 8);
        pinkLight.position.set(-2, -1, 2.5);
        scene.add(pinkLight);
        const blueLight = new THREE.PointLight(0x9be8ff, 2.2, 8);
        blueLight.position.set(2, 1.2, 2);
        scene.add(blueLight);

        texture = makeMirrorTexture(THREE);
        geometry = new THREE.SphereGeometry(0.84, 64, 48);
        material = new THREE.MeshPhysicalMaterial({
          map: texture,
          metalness: 0.52,
          roughness: 0.22,
          clearcoat: 0.85,
          clearcoatRoughness: 0.16,
        });
        globe = new THREE.Mesh(geometry, material);
        globe.rotation.x = 0.08;
        scene.add(globe);

        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(root);
        reducedMotion.addEventListener('change', handleMotionChange);
        setWebglReady(true);
        render();
        startAnimation();
      } catch {
        initialized = false;
      }
    };

    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible) {
          if (!initialized) initialize();
          else startAnimation();
        } else {
          window.cancelAnimationFrame(frame);
          frame = 0;
        }
      }, { rootMargin: '120px' });
      observer.observe(root);
    } else {
      visible = true;
      initialize();
    }

    return () => {
      disposed = true;
      observer?.disconnect();
      resizeObserver?.disconnect();
      reducedMotion.removeEventListener('change', handleMotionChange);
      window.cancelAnimationFrame(frame);
      geometry?.dispose();
      material?.dispose();
      texture?.dispose();
      renderer?.dispose();
      renderer?.domElement.remove();
    };
  }, []);

  return <span ref={rootRef} className={`disco-globe ${className}${webglReady ? ' disco-globe-ready' : ''}`} aria-hidden="true">
    <img className="disco-globe-fallback" src={fallbackGlobe} alt="" />
    <span ref={canvasRef} className="disco-globe-canvas" />
  </span>;
}
