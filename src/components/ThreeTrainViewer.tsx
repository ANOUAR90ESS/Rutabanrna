import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { Play, Pause, Volume2, Sun, Moon, Eye, RotateCcw, Gauge, ShieldAlert, Sparkles, X } from 'lucide-react';
import { LiveVehicle, Language } from '../types/transit';
import { translations } from '../i18n/translations';
import { playTrainDoorChime, playTrainHorn, playBusBell } from '../utils/sound';

interface ThreeTrainViewerProps {
  vehicle?: LiveVehicle | null;
  onClose?: () => void;
  lang: Language;
}

export type CameraMode = 'orbit' | 'cab' | 'chase' | 'interior';
export type VehicleModelType = 'civia_train' | 'metro_9000' | 'bus_articulated';

export const ThreeTrainViewer: React.FC<ThreeTrainViewerProps> = ({
  vehicle,
  onClose,
  lang
}) => {
  const t = translations[lang];
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Simulation state
  const [modelType, setModelType] = useState<VehicleModelType>(
    vehicle?.model === 'metro_9000' ? 'metro_9000' :
    vehicle?.model === 'bus_articulated' ? 'bus_articulated' : 'civia_train'
  );
  const [cameraMode, setCameraMode] = useState<CameraMode>('orbit');
  const [isNight, setIsNight] = useState<boolean>(true);
  const [speed, setSpeed] = useState<number>(vehicle?.speedKmH || 65);
  const [doorsOpen, setDoorsOpen] = useState<boolean>(false);
  const [isMoving, setIsMoving] = useState<boolean>(true);
  const [headlightsOn, setHeadlightsOn] = useState<boolean>(true);

  // References for Three.js animation loop
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const trainGroupRef = useRef<THREE.Group | null>(null);
  const trackGroupRef = useRef<THREE.Group | null>(null);
  const wheelsRef = useRef<THREE.Mesh[]>([]);
  const headlightsRef = useRef<THREE.SpotLight[]>([]);
  const interiorLightsRef = useRef<THREE.PointLight[]>([]);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight | null>(null);

  // Mouse orbit control refs
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const orbitAnglesRef = useRef({ theta: Math.PI / 4, phi: Math.PI / 6, radius: 18 });

  // Update model if external vehicle changes
  useEffect(() => {
    if (vehicle) {
      if (vehicle.model === 'metro_9000') setModelType('metro_9000');
      else if (vehicle.model === 'bus_articulated') setModelType('bus_articulated');
      else setModelType('civia_train');
      setSpeed(vehicle.speedKmH);
    }
  }, [vehicle]);

  // Horn action
  const handleHorn = useCallback(() => {
    if (modelType === 'bus_articulated') {
      playBusBell();
    } else {
      playTrainHorn();
    }
  }, [modelType]);

  // Doors action
  const handleToggleDoors = useCallback(() => {
    playTrainDoorChime();
    setDoorsOpen((prev) => !prev);
  }, []);

  // Set up Three.js Scene
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    cameraRef.current = camera;
    camera.position.set(12, 6, 14);

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      powerPreference: 'high-performance'
    });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Build Environment: Sky, Ground, Rails & Distant City
    setupEnvironment(scene, isNight);

    // Build 3D Train Model
    buildVehicleModel(scene, modelType);

    // Animation Loop
    let animationFrameId: number;
    let trackOffset = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      // Animate track passing under vehicle to create movement illusion
      if (isMoving && speed > 0 && trackGroupRef.current) {
        const moveDist = (speed * (1000 / 3600)) * delta * 0.4;
        trackOffset -= moveDist;
        if (trackOffset < -20) trackOffset += 20;
        trackGroupRef.current.position.z = trackOffset;

        // Rotate wheels
        wheelsRef.current.forEach((wheel) => {
          wheel.rotation.x += moveDist * 2.5;
        });
      }

      // Camera choreography based on selected view mode
      if (cameraRef.current && trainGroupRef.current) {
        if (cameraMode === 'orbit') {
          const { theta, phi, radius } = orbitAnglesRef.current;
          cameraRef.current.position.x = radius * Math.sin(theta) * Math.cos(phi);
          cameraRef.current.position.y = Math.max(1, radius * Math.sin(phi));
          cameraRef.current.position.z = radius * Math.cos(theta) * Math.cos(phi);
          cameraRef.current.lookAt(0, 1.8, 0);
        } else if (cameraMode === 'cab') {
          // Inside front driver cab looking forward onto the rails
          cameraRef.current.position.set(0, 2.3, 5.2);
          cameraRef.current.lookAt(0, 1.2, 35);
        } else if (cameraMode === 'chase') {
          // Follow cam just behind and above train
          cameraRef.current.position.set(0, 4.5, -12);
          cameraRef.current.lookAt(0, 2, 8);
        } else if (cameraMode === 'interior') {
          // Inside passenger carriage looking forward down aisle
          cameraRef.current.position.set(0, 1.9, -1.5);
          cameraRef.current.lookAt(0, 1.9, 4);
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // Resize handler
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      const newWidth = containerRef.current.clientWidth;
      const newHeight = containerRef.current.clientHeight;
      cameraRef.current.aspect = newWidth / newHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [modelType]);

  // Update Day / Night lighting
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    if (isNight) {
      scene.background = new THREE.Color(0x060913);
      scene.fog = new THREE.FogExp2(0x060913, 0.018);
      if (sunLightRef.current) sunLightRef.current.intensity = 0.2;
      if (hemiLightRef.current) hemiLightRef.current.intensity = 0.3;

      headlightsRef.current.forEach((hl) => { hl.intensity = 3.5; });
      interiorLightsRef.current.forEach((il) => { il.intensity = 2.0; });
    } else {
      scene.background = new THREE.Color(0x87CEEB);
      scene.fog = new THREE.FogExp2(0xb0d8ea, 0.008);
      if (sunLightRef.current) sunLightRef.current.intensity = 1.6;
      if (hemiLightRef.current) hemiLightRef.current.intensity = 1.0;

      headlightsRef.current.forEach((hl) => { hl.intensity = 1.2; });
      interiorLightsRef.current.forEach((il) => { il.intensity = 0.8; });
    }
  }, [isNight]);

  // Update Headlights toggle
  useEffect(() => {
    headlightsRef.current.forEach((hl) => {
      hl.intensity = headlightsOn ? (isNight ? 3.5 : 1.2) : 0;
    });
  }, [headlightsOn, isNight]);

  // Setup environment (Sky, track rails, ties, overhead catenary, city backdrop)
  function setupEnvironment(scene: THREE.Scene, night: boolean) {
    // Clear old env
    const existingEnv = scene.getObjectByName('environment_group');
    if (existingEnv) scene.remove(existingEnv);

    const envGroup = new THREE.Group();
    envGroup.name = 'environment_group';

    // Sky & Fog
    scene.background = new THREE.Color(night ? 0x060913 : 0x87CEEB);
    scene.fog = new THREE.FogExp2(night ? 0x060913 : 0xb0d8ea, night ? 0.018 : 0.008);

    // Hemispherical ambient light
    const hemiLight = new THREE.HemisphereLight(
      night ? 0x1e293b : 0xffffff,
      night ? 0x090d16 : 0x64748b,
      night ? 0.3 : 1.0
    );
    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;

    // Directional Sun / Moon
    const sunLight = new THREE.DirectionalLight(
      night ? 0x93c5fd : 0xfff7ed,
      night ? 0.2 : 1.6
    );
    sunLight.position.set(25, 35, 20);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 5;
    sunLight.shadow.camera.far = 80;
    sunLight.shadow.camera.left = -20;
    sunLight.shadow.camera.right = 20;
    sunLight.shadow.camera.top = 20;
    sunLight.shadow.camera.bottom = -20;
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    // Ground platform / ballast bed
    const groundGeo = new THREE.PlaneGeometry(120, 200);
    const groundMat = new THREE.MeshStandardMaterial({
      color: night ? 0x0f172a : 0x334155,
      roughness: 0.9,
      metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    envGroup.add(ground);

    // Repeatable railway track structure
    const trackGroup = new THREE.Group();
    trackGroup.name = 'track_group';

    // Ballast bed
    const ballastGeo = new THREE.BoxGeometry(4.2, 0.25, 240);
    const ballastMat = new THREE.MeshStandardMaterial({
      color: night ? 0x1e293b : 0x475569,
      roughness: 0.95
    });
    const ballast = new THREE.Mesh(ballastGeo, ballastMat);
    ballast.position.y = 0.1;
    ballast.receiveShadow = true;
    trackGroup.add(ballast);

    // Rails (Standard European Gauge 1435mm ~ 1.43m)
    const railMat = new THREE.MeshStandardMaterial({
      color: 0xc0c0c0,
      metalness: 0.9,
      roughness: 0.2
    });
    const railGeo = new THREE.BoxGeometry(0.1, 0.18, 240);

    const leftRail = new THREE.Mesh(railGeo, railMat);
    leftRail.position.set(-0.72, 0.3, 0);
    leftRail.castShadow = true;
    trackGroup.add(leftRail);

    const rightRail = new THREE.Mesh(railGeo, railMat);
    rightRail.position.set(0.72, 0.3, 0);
    rightRail.castShadow = true;
    trackGroup.add(rightRail);

    // Concrete Sleepers / Ties
    const sleeperGeo = new THREE.BoxGeometry(2.6, 0.14, 0.3);
    const sleeperMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.85
    });

    for (let z = -120; z <= 120; z += 1.0) {
      const sleeper = new THREE.Mesh(sleeperGeo, sleeperMat);
      sleeper.position.set(0, 0.22, z);
      sleeper.receiveShadow = true;
      trackGroup.add(sleeper);
    }

    // Overhead catenary poles and overhead electric line
    const catenaryMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.7, roughness: 0.3 });
    const wireMat = new THREE.MeshBasicMaterial({ color: 0xb91c1c });

    for (let z = -100; z <= 100; z += 25) {
      const poleGeo = new THREE.CylinderGeometry(0.08, 0.08, 5.5);
      const pole = new THREE.Mesh(poleGeo, catenaryMat);
      pole.position.set(2.4, 2.75, z);
      pole.castShadow = true;
      trackGroup.add(pole);

      const armGeo = new THREE.BoxGeometry(2.6, 0.08, 0.08);
      const arm = new THREE.Mesh(armGeo, catenaryMat);
      arm.position.set(1.2, 5.2, z);
      trackGroup.add(arm);

      // Railway Signal Lamp
      const signalHousing = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.7, 0.25),
        new THREE.MeshStandardMaterial({ color: 0x0f172a })
      );
      signalHousing.position.set(2.2, 3.8, z);
      trackGroup.add(signalHousing);

      const signalGreen = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0x10b981 })
      );
      signalGreen.position.set(2.2, 3.65, z + 0.14);
      trackGroup.add(signalGreen);
    }

    // Overhead power contact wire
    const wireGeo = new THREE.CylinderGeometry(0.015, 0.015, 240);
    const wire = new THREE.Mesh(wireGeo, wireMat);
    wire.rotation.x = Math.PI / 2;
    wire.position.set(0, 5.0, 0);
    trackGroup.add(wire);

    trackGroupRef.current = trackGroup;
    envGroup.add(trackGroup);

    // Distant 3D Barcelona Skyline Buildings (Sagrada Família-like spires, modern blocks)
    const buildingMat = new THREE.MeshStandardMaterial({
      color: night ? 0x090d16 : 0x94a3b8,
      roughness: 0.7
    });

    const bldgGroup = new THREE.Group();
    for (let i = 0; i < 45; i++) {
      const bHeight = 8 + Math.random() * 25;
      const bWidth = 4 + Math.random() * 8;
      const bDepth = 4 + Math.random() * 8;
      const bldg = new THREE.Mesh(
        new THREE.BoxGeometry(bWidth, bHeight, bDepth),
        buildingMat
      );
      const side = i % 2 === 0 ? 1 : -1;
      const x = side * (16 + Math.random() * 25);
      const z = -70 + (i * 3.5);
      bldg.position.set(x, bHeight / 2, z);
      bldgGroup.add(bldg);

      // Night building window glowing dots
      if (night && Math.random() > 0.4) {
        const windowLight = new THREE.Mesh(
          new THREE.PlaneGeometry(bWidth * 0.8, bHeight * 0.6),
          new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.15 })
        );
        windowLight.position.set(x - (side * 0.1), bHeight / 2, z);
        windowLight.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
        bldgGroup.add(windowLight);
      }
    }
    envGroup.add(bldgGroup);

    scene.add(envGroup);
  }

  // Construct detailed procedural 3D Vehicle Models
  function buildVehicleModel(scene: THREE.Scene, type: VehicleModelType) {
    const existingTrain = scene.getObjectByName('train_root');
    if (existingTrain) scene.remove(existingTrain);

    const trainGroup = new THREE.Group();
    trainGroup.name = 'train_root';
    trainGroupRef.current = trainGroup;

    wheelsRef.current = [];
    headlightsRef.current = [];
    interiorLightsRef.current = [];

    if (type === 'civia_train') {
      buildRenfeCiviaTrain(trainGroup);
    } else if (type === 'metro_9000') {
      buildTMBMetro9000(trainGroup);
    } else {
      buildArticulatedBus(trainGroup);
    }

    scene.add(trainGroup);
  }

  // 1. RODALIES RENFE CIVIA TRAIN
  function buildRenfeCiviaTrain(parent: THREE.Group) {
    const renfeWhite = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.4, roughness: 0.3 });
    const renfeOrange = new THREE.MeshStandardMaterial({ color: 0xf97316, metalness: 0.3, roughness: 0.4 });
    const windowMat = new THREE.MeshPhysicalMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.1, transmission: 0.6, transparent: true, opacity: 0.85 });
    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.3 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9, roughness: 0.2 });
    const glassGlow = new THREE.MeshBasicMaterial({ color: 0xfef08a });

    // Lead Carriage
    const carLength = 12;
    const carWidth = 2.8;
    const carHeight = 3.2;

    const cab = new THREE.Group();
    cab.position.set(0, 2.0, 0);

    // Streamlined body
    const bodyGeo = new THREE.BoxGeometry(carWidth, carHeight, carLength);
    const body = new THREE.Mesh(bodyGeo, renfeWhite);
    body.castShadow = true;
    body.receiveShadow = true;
    cab.add(body);

    // Orange Renfe accent stripe along bottom and roof line
    const stripeBottomGeo = new THREE.BoxGeometry(carWidth + 0.02, 0.45, carLength + 0.02);
    const stripeBottom = new THREE.Mesh(stripeBottomGeo, renfeOrange);
    stripeBottom.position.y = -1.1;
    cab.add(stripeBottom);

    const stripeRoofGeo = new THREE.BoxGeometry(carWidth + 0.02, 0.35, carLength + 0.02);
    const stripeRoof = new THREE.Mesh(stripeRoofGeo, renfeOrange);
    stripeRoof.position.y = 1.45;
    cab.add(stripeRoof);

    // Curved aerodynamic aerodynamic nose
    const noseGeo = new THREE.CylinderGeometry(0.8, 1.4, 2.2, 16, 1, false, 0, Math.PI);
    const nose = new THREE.Mesh(noseGeo, renfeWhite);
    nose.rotation.z = Math.PI / 2;
    nose.rotation.y = -Math.PI / 2;
    nose.position.set(0, 0, carLength / 2 + 1.0);
    nose.scale.set(1.4, 1.4, 1.0);
    cab.add(nose);

    // Front Driver Windshield
    const windshieldGeo = new THREE.PlaneGeometry(2.1, 1.1);
    const windshield = new THREE.Mesh(windshieldGeo, windowMat);
    windshield.rotation.x = -Math.PI / 8;
    windshield.position.set(0, 0.6, carLength / 2 + 1.4);
    cab.add(windshield);

    // LED Rollsign Display ("R1 MATARÓ")
    const signGeo = new THREE.BoxGeometry(1.6, 0.35, 0.05);
    const signMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(0, 1.25, carLength / 2 + 1.25);
    cab.add(sign);

    const textLed = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4, 0.22),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b })
    );
    textLed.position.set(0, 1.25, carLength / 2 + 1.28);
    cab.add(textLed);

    // Side Windows
    for (let z = -4.5; z <= 3.5; z += 1.8) {
      // Left window
      const winL = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.1), windowMat);
      winL.rotation.y = -Math.PI / 2;
      winL.position.set(-carWidth / 2 - 0.02, 0.2, z);
      cab.add(winL);

      // Right window
      const winR = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.1), windowMat);
      winR.rotation.y = Math.PI / 2;
      winR.position.set(carWidth / 2 + 0.02, 0.2, z);
      cab.add(winR);
    }

    // Dual Headlights
    const hlLeft = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), glassGlow);
    hlLeft.position.set(-0.85, -0.6, carLength / 2 + 1.55);
    cab.add(hlLeft);

    const hlRight = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), glassGlow);
    hlRight.position.set(0.85, -0.6, carLength / 2 + 1.55);
    cab.add(hlRight);

    // Volumetric Spotlight Beams
    const spotL = new THREE.SpotLight(0xfff7ed, 3.5, 55, Math.PI / 6, 0.4);
    spotL.position.set(-0.85, 1.4, carLength / 2 + 1.6);
    spotL.target.position.set(-0.85, 0, 45);
    cab.add(spotL);
    cab.add(spotL.target);
    headlightsRef.current.push(spotL);

    const spotR = new THREE.SpotLight(0xfff7ed, 3.5, 55, Math.PI / 6, 0.4);
    spotR.position.set(0.85, 1.4, carLength / 2 + 1.6);
    spotR.target.position.set(0.85, 0, 45);
    cab.add(spotR);
    cab.add(spotR.target);
    headlightsRef.current.push(spotR);

    // Roof Pantograph (Articulated diamond metal arms)
    const pantoBase = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.15, 1.8), darkMetal);
    pantoBase.position.set(0, carHeight / 2 + 0.1, -2.5);
    cab.add(pantoBase);

    const pantoArm1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.6), darkMetal);
    pantoArm1.rotation.x = Math.PI / 4;
    pantoArm1.position.set(0, carHeight / 2 + 0.7, -2.8);
    cab.add(pantoArm1);

    const pantoArm2 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.6), darkMetal);
    pantoArm2.rotation.x = -Math.PI / 4;
    pantoArm2.position.set(0, carHeight / 2 + 1.25, -2.2);
    cab.add(pantoArm2);

    const pantoShoe = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 0.25), new THREE.MeshStandardMaterial({ color: 0xb45309, metalness: 0.9 }));
    pantoShoe.position.set(0, carHeight / 2 + 1.78, -2.2);
    cab.add(pantoShoe);

    // Bogies & Wheels (Front and rear bogie sets)
    [-4, 4].forEach((bogieZ) => {
      const bogieFrame = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.3, 2.5), darkMetal);
      bogieFrame.position.set(0, -1.6, bogieZ);
      cab.add(bogieFrame);

      [-0.85, 0.85].forEach((wZ) => {
        [-1.15, 1.15].forEach((wX) => {
          const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.15, 20), wheelMat);
          wheel.rotation.z = Math.PI / 2;
          wheel.position.set(wX, -1.65, bogieZ + wZ);
          wheel.castShadow = true;
          cab.add(wheel);
          wheelsRef.current.push(wheel);
        });
      });
    });

    // Interior Warm Fluorescent Light
    const intLight = new THREE.PointLight(0xfef3c7, 2.0, 15);
    intLight.position.set(0, 0.5, 0);
    cab.add(intLight);
    interiorLightsRef.current.push(intLight);

    parent.add(cab);
  }

  // 2. TMB METRO 9000 SERIES
  function buildTMBMetro9000(parent: THREE.Group) {
    const tmbWhite = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.3, roughness: 0.2 });
    const tmbRed = new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.2, roughness: 0.4 });
    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.2 });
    const windowMat = new THREE.MeshPhysicalMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.1, transmission: 0.5, transparent: true, opacity: 0.8 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });

    const car = new THREE.Group();
    car.position.set(0, 1.9, 0);

    // Car Body
    const carBody = new THREE.Mesh(new THREE.BoxGeometry(2.7, 3.0, 13), tmbWhite);
    carBody.castShadow = true;
    car.add(carBody);

    // TMB Iconic Red Front and Skirts
    const skirtGeo = new THREE.BoxGeometry(2.72, 0.6, 13.02);
    const skirt = new THREE.Mesh(skirtGeo, tmbRed);
    skirt.position.y = -1.1;
    car.add(skirt);

    // Curved front cab with distinctive TMB red mask
    const frontMask = new THREE.Mesh(new THREE.BoxGeometry(2.68, 2.8, 1.2), tmbRed);
    frontMask.position.set(0, 0.1, 6.5);
    car.add(frontMask);

    // Front Windshield
    const windshield = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.4), windowMat);
    windshield.position.set(0, 0.4, 7.12);
    car.add(windshield);

    // Metro Line Rollsign ("L1 HOSPITAL DE BELLVITGE")
    const ledSign = new THREE.Mesh(
      new THREE.PlaneGeometry(1.8, 0.28),
      new THREE.MeshBasicMaterial({ color: 0xe11c24 })
    );
    ledSign.position.set(0, 1.25, 7.12);
    car.add(ledSign);

    // Headlights
    const hlLeft = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    hlLeft.position.set(-0.85, -0.65, 7.12);
    car.add(hlLeft);

    const hlRight = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    hlRight.position.set(0.85, -0.65, 7.12);
    car.add(hlRight);

    // Headlight Spotlights
    const spotL = new THREE.SpotLight(0xffffff, 3.5, 45, Math.PI / 6, 0.3);
    spotL.position.set(-0.85, 1.2, 7.2);
    spotL.target.position.set(-0.85, 0, 35);
    car.add(spotL);
    car.add(spotL.target);
    headlightsRef.current.push(spotL);

    const spotR = new THREE.SpotLight(0xffffff, 3.5, 45, Math.PI / 6, 0.3);
    spotR.position.set(0.85, 1.2, 7.2);
    spotR.target.position.set(0.85, 0, 35);
    car.add(spotR);
    car.add(spotR.target);
    headlightsRef.current.push(spotR);

    // Automatic Sliding Passenger Doors (4 sets each side)
    for (let z = -4.5; z <= 4.5; z += 3.0) {
      // Left Door
      const doorL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.1, 1.3), darkMetal);
      doorL.position.set(-1.37, -0.2, z);
      car.add(doorL);

      // Right Door
      const doorR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.1, 1.3), darkMetal);
      doorR.position.set(1.37, -0.2, z);
      car.add(doorR);
    }

    // Bogies and Steel Wheels
    [-4.5, 4.5].forEach((bogieZ) => {
      const bogie = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.25, 2.4), darkMetal);
      bogie.position.set(0, -1.5, bogieZ);
      car.add(bogie);

      [-0.8, 0.8].forEach((wZ) => {
        [-1.1, 1.1].forEach((wX) => {
          const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.15, 20), wheelMat);
          wheel.rotation.z = Math.PI / 2;
          wheel.position.set(wX, -1.58, bogieZ + wZ);
          car.add(wheel);
          wheelsRef.current.push(wheel);
        });
      });
    });

    // Interior Metro Neon Tube
    const intLight = new THREE.PointLight(0xffffff, 2.2, 14);
    intLight.position.set(0, 0.6, 0);
    car.add(intLight);
    interiorLightsRef.current.push(intLight);

    parent.add(car);
  }

  // 3. TMB ARTICULATED HYBRID BUS (H12 / V15)
  function buildArticulatedBus(parent: THREE.Group) {
    const busRed = new THREE.MeshStandardMaterial({ color: 0xd91023, metalness: 0.2, roughness: 0.4 });
    const busWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.1, roughness: 0.3 });
    const rubberMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });
    const windowMat = new THREE.MeshPhysicalMaterial({ color: 0x090d16, metalness: 0.8, roughness: 0.1, transmission: 0.5, transparent: true, opacity: 0.85 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.8, roughness: 0.3 });

    const bus = new THREE.Group();
    bus.position.set(0, 1.8, 0);

    // Front Section
    const frontBody = new THREE.Mesh(new THREE.BoxGeometry(2.55, 2.8, 7.5), busWhite);
    frontBody.position.set(0, 0, 3.8);
    bus.add(frontBody);

    const frontSkirt = new THREE.Mesh(new THREE.BoxGeometry(2.57, 0.8, 7.52), busRed);
    frontSkirt.position.set(0, -0.9, 3.8);
    bus.add(frontSkirt);

    // Articulated Bellows (rubber accordion joint)
    const accordion = new THREE.Mesh(new THREE.BoxGeometry(2.45, 2.7, 1.2), rubberMat);
    accordion.position.set(0, 0, -0.3);
    bus.add(accordion);

    // Rear Section
    const rearBody = new THREE.Mesh(new THREE.BoxGeometry(2.55, 2.8, 6.5), busWhite);
    rearBody.position.set(0, 0, -4.0);
    bus.add(rearBody);

    const rearSkirt = new THREE.Mesh(new THREE.BoxGeometry(2.57, 0.8, 6.52), busRed);
    rearSkirt.position.set(0, -0.9, -4.0);
    bus.add(rearSkirt);

    // Panoramic Windshield
    const windshield = new THREE.Mesh(new THREE.PlaneGeometry(2.35, 1.6), windowMat);
    windshield.position.set(0, 0.3, 7.56);
    bus.add(windshield);

    // LED Route Rollsign ("H12 BESÒS VERNEDA")
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(1.8, 0.35),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b })
    );
    sign.position.set(0, 1.25, 7.57);
    bus.add(sign);

    // Headlights
    const hlLeft = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    hlLeft.position.set(-0.9, -0.7, 7.57);
    bus.add(hlLeft);

    const hlRight = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    hlRight.position.set(0.9, -0.7, 7.57);
    bus.add(hlRight);

    // Bus Headlights Spotlight
    const spot = new THREE.SpotLight(0xfff7ed, 3.0, 40, Math.PI / 5, 0.4);
    spot.position.set(0, 0.8, 7.6);
    spot.target.position.set(0, 0, 30);
    bus.add(spot);
    bus.add(spot.target);
    headlightsRef.current.push(spot);

    // Rubber Wheels with Alloy Rims (3 Axles: Front, Middle, Rear)
    [6.0, 1.5, -5.5].forEach((axleZ) => {
      [-1.28, 1.28].forEach((wheelX) => {
        const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.28, 24), rubberMat);
        tire.rotation.z = Math.PI / 2;
        tire.position.set(wheelX, -1.35, axleZ);
        tire.castShadow = true;

        const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.29, 16), rimMat);
        rim.rotation.z = Math.PI / 2;
        rim.position.set(wheelX, -1.35, axleZ);

        bus.add(tire);
        bus.add(rim);
        wheelsRef.current.push(tire);
        wheelsRef.current.push(rim);
      });
    });

    // Interior Ambient Warm Glow
    const intLight = new THREE.PointLight(0xfef3c7, 1.8, 14);
    intLight.position.set(0, 0.4, 1.5);
    bus.add(intLight);
    interiorLightsRef.current.push(intLight);

    parent.add(bus);
  }

  // Mouse interaction for Orbit camera
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || cameraMode !== 'orbit') return;
    const deltaX = e.clientX - previousMousePositionRef.current.x;
    const deltaY = e.clientY - previousMousePositionRef.current.y;

    orbitAnglesRef.current.theta -= deltaX * 0.008;
    orbitAnglesRef.current.phi = Math.max(0.1, Math.min(Math.PI / 2.2, orbitAnglesRef.current.phi + deltaY * 0.008));

    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (cameraMode !== 'orbit') return;
    orbitAnglesRef.current.radius = Math.max(5, Math.min(35, orbitAnglesRef.current.radius + e.deltaY * 0.02));
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-950 overflow-hidden select-none" ref={containerRef}>
      {/* 3D Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing block"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />

      {/* Top Floating Bar: Vehicle Title & Status */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10">
        <div className="pointer-events-auto bg-slate-900/80 backdrop-blur-md border border-slate-700/60 rounded-xl px-4 py-2.5 shadow-xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 font-bold font-tech text-sm">
            {vehicle?.lineCode || (modelType === 'civia_train' ? 'R1' : modelType === 'metro_9000' ? 'L1' : 'H12')}
          </div>
          <div>
            <div className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <span>{modelType === 'civia_train' ? t.modelRodalies : modelType === 'metro_9000' ? t.modelMetro : t.modelBus}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <span>{t.destination}: <strong className="text-slate-200">{vehicle?.destination || 'Barcelona'}</strong></span>
              <span>·</span>
              <span>{t.nextStop}: <strong className="text-slate-200">{vehicle?.nextStationName || 'Plaça de Catalunya'}</strong></span>
            </div>
          </div>
        </div>

        {/* Top-Right Control Buttons */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Day / Night Toggle */}
          <button
            onClick={() => setIsNight(!isNight)}
            title={t.dayNight}
            className={`p-2.5 rounded-xl border transition-all duration-200 shadow-lg ${
              isNight
                ? 'bg-slate-900/80 border-slate-700/60 text-amber-300 hover:bg-slate-800'
                : 'bg-white/90 border-slate-300 text-slate-800 hover:bg-white'
            }`}
          >
            {isNight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>

          {/* Close Viewer */}
          {onClose && (
            <button
              onClick={onClose}
              title={t.close}
              className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-rose-500/20 border border-slate-700/60 hover:border-rose-500/40 text-slate-300 hover:text-rose-400 transition-all shadow-lg"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Driver Cab Speedometer HUD (When in Cab mode or overlay) */}
      <div className="absolute top-20 right-4 pointer-events-auto bg-slate-950/85 backdrop-blur-md border border-slate-800/80 rounded-xl p-3 shadow-2xl flex flex-col gap-2 min-w-[170px]">
        <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-1.5">
          <span className="flex items-center gap-1 font-medium">
            <Gauge className="w-3.5 h-3.5 text-sky-400" />
            <span>TELEMETRÍA</span>
          </span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${vehicle?.isDelayed ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}`}>
            {vehicle?.isDelayed ? `+${vehicle.delayMinutes}m` : t.onTime}
          </span>
        </div>

        <div className="flex items-baseline justify-between">
          <span className="text-3xl font-tech font-bold tracking-wider text-white">
            {speed}
          </span>
          <span className="text-xs text-slate-400 font-mono">km/h</span>
        </div>

        {/* Speed Bar */}
        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-sky-400 via-emerald-400 to-amber-500 h-full transition-all duration-300"
            style={{ width: `${Math.min(100, (speed / 120) * 100)}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
          <span>{doorsOpen ? t.doorsOpen : t.doorsClosed}</span>
          <span className={`w-2 h-2 rounded-full ${doorsOpen ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
        </div>
      </div>

      {/* Bottom Floating Dashboard: Model Selector, Camera Views & Interactive Vehicle Controls */}
      <div className="absolute bottom-4 left-4 right-4 flex flex-col md:flex-row items-center justify-between gap-3 pointer-events-none z-10">
        {/* Model Switcher & Camera Views */}
        <div className="pointer-events-auto bg-slate-900/85 backdrop-blur-md border border-slate-700/60 rounded-xl p-1.5 flex items-center gap-1 shadow-2xl">
          {/* Model Switcher */}
          <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700/40">
            <button
              onClick={() => setModelType('civia_train')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                modelType === 'civia_train'
                  ? 'bg-sky-500 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Rodalies
            </button>
            <button
              onClick={() => setModelType('metro_9000')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                modelType === 'metro_9000'
                  ? 'bg-red-500 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Metro L1
            </button>
            <button
              onClick={() => setModelType('bus_articulated')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                modelType === 'bus_articulated'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Bus H12
            </button>
          </div>

          <div className="w-[1px] h-5 bg-slate-700 mx-1"></div>

          {/* Camera Angles */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCameraMode('orbit')}
              title={t.cameraOrbit}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                cameraMode === 'orbit' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.cameraOrbit}</span>
            </button>

            <button
              onClick={() => setCameraMode('cab')}
              title={t.cameraCab}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                cameraMode === 'cab' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.cameraCab}</span>
            </button>

            <button
              onClick={() => setCameraMode('chase')}
              title={t.cameraChase}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                cameraMode === 'chase' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="hidden sm:inline">{t.cameraChase}</span>
            </button>

            <button
              onClick={() => setCameraMode('interior')}
              title={t.cameraInterior}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                cameraMode === 'interior' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="hidden sm:inline">{t.cameraInterior}</span>
            </button>
          </div>
        </div>

        {/* Train Physics / Audio / Doors controls */}
        <div className="pointer-events-auto bg-slate-900/85 backdrop-blur-md border border-slate-700/60 rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-2xl">
          {/* Accelerate / Brake Speed Slider */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">{t.speed}</span>
            <input
              type="range"
              min="0"
              max="120"
              value={speed}
              onChange={(e) => {
                const val = Number(e.target.value);
                setSpeed(val);
                setIsMoving(val > 0);
              }}
              className="w-20 sm:w-28 accent-sky-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
            />
          </div>

          <div className="w-[1px] h-5 bg-slate-700"></div>

          {/* Start / Stop Toggle */}
          <button
            onClick={() => {
              if (isMoving) {
                setIsMoving(false);
                setSpeed(0);
              } else {
                setIsMoving(true);
                setSpeed(65);
              }
            }}
            title={isMoving ? t.brakes : t.throttle}
            className={`p-2 rounded-lg border transition-colors ${
              isMoving
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30'
            }`}
          >
            {isMoving ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          {/* Train Horn Button */}
          <button
            onClick={handleHorn}
            title={t.honkHorn}
            className="p-2 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30 hover:bg-sky-500/30 transition-colors"
          >
            <Volume2 className="w-4 h-4" />
          </button>

          {/* Doors Chime / Toggle */}
          <button
            onClick={handleToggleDoors}
            title={t.toggleDoors}
            className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
              doorsOpen
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {doorsOpen ? 'PUERTAS: ABIERTAS' : 'PUERTAS: CERRADAS'}
          </button>
        </div>
      </div>
    </div>
  );
};
