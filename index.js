import * as THREE from "three";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";

function isMobile() {
  const userAgent = navigator?.userAgent || navigator?.vendor || window?.opera;

  // Check for common mobile user agents
  return /android|iPad|iPhone|iPod|Opera Mini|IEMobile|WPDesktop/i.test(
    userAgent
  );
}

// Grab canvas element to be used
const canvas = document.getElementById("canvas");
const loadingScreeen = document.getElementById("loading-screen");
const percentLoaded = document.getElementById("percent");

// Resize canvas to fit current viewport
const resizeCanvas = () => {
  canvas.style.height = `${window.innerHeight}px`;
  canvas.style.width = `${window.innerWidth}px`;
};

// Rescale camera and rerender on resize
const onWindowResize = () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
};
resizeCanvas();

// Remove load screen if scene has been loaded
const loadingManager = new THREE.LoadingManager();
loadingManager.onLoad = function () {
  loadingScreeen.style.display = "none";
  animate();
  // renderer.render(scene, camera);
};
loadingManager.onProgress = function (_, itemsLoaded, itemsTotal) {
  // console.log(`Loaded ${itemsLoaded} of ${itemsTotal} files.`);
  percentLoaded.innerHTML = Math.round((itemsLoaded / itemsTotal) * 100) + "%";
};
loadingManager.onError = function (url) {
  console.error(`Error loading ${url}`);
};

// Texture Loader
const textureLoader = new THREE.TextureLoader(loadingManager);

// Font Loader
const loader = new FontLoader(loadingManager);

// Add Resize Event Listener
window.addEventListener("resize", () => {
  resizeCanvas();
  onWindowResize();
});

// Create Scene
const scene = new THREE.Scene();
const backgroundTexture = textureLoader.load(
  "https://cdn.prod.website-files.com/673abe3b1503d827f7ae6c52/677d1f68bd303a22adb0eba0_background.jpg"
);

// Create a large plane geometry
const planeGeometry = new THREE.PlaneGeometry(15, 8); // Adjust size as needed
const planeMaterial = new THREE.MeshBasicMaterial({ map: backgroundTexture });

const backgroundMesh = new THREE.Mesh(planeGeometry, planeMaterial);

// Scale the plane to control the texture size
backgroundMesh.scale.set(2, 2, 1); // Scale the plane (adjust as needed)

// Position the background mesh behind the camera
backgroundMesh.position.z = -10; // Move it back
backgroundMesh.material.depthTest = false; // Ensure it doesn't interfere with other objects
backgroundMesh.material.depthWrite = false; // Ensure it doesn't interfere with other objects

scene.add(backgroundMesh);

const camera = new THREE.PerspectiveCamera(
  40,
  canvas.offsetWidth / canvas.offsetHeight,
  0.1,
  1000
);
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
});

// Set scene aspect ratio and dimensions
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);

// Vertex shader
const vertexShader = `
  varying vec2 vUV;
  varying vec3 vNormal;

  void main() {
      vUV = uv;
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
// Fragment shader
const fragmentShader = `
  uniform sampler2D dayTexture;
  uniform sampler2D nightTexture;
  uniform sampler2D bumpMap;

  varying vec2 vUV;
  varying vec3 vNormal;

  void main() {
      vec3 bump = texture2D(bumpMap, vUV).rgb;
      vec3 adjustedNormal = normalize(vNormal + bump * 2.0 - 1.0);

      float intensity = 1.05 - dot(vNormal, vec3(0.0, 0.0, 1.0));
      vec3 atmosphere = vec3(0.3, 0.6, 1.0) * pow(intensity, 1.5);

      vec4 dayColor = vec4(atmosphere + texture2D(dayTexture, vUV).xyz, 1.0);
      vec4 nightColor = vec4(atmosphere + texture2D(nightTexture, vUV).xyz, 1.0);

      // Calculate the feathered border based on the spherical coordinates
      float featherWidth = 0.2; // Adjust this value for feathering width
      float blendFactor = smoothstep(-featherWidth, featherWidth, vNormal.x);

      // Create a spherical feathering effect
      float distanceFromCenter = length(vNormal); // Distance from the center of the sphere
      float feather = smoothstep(0.5 - featherWidth, 0.5 + featherWidth, distanceFromCenter);

      // Combine the blend factors
      float finalBlendFactor = blendFactor * feather;

      // Mix the colors based on the final blend factor
      gl_FragColor = mix(nightColor, dayColor, finalBlendFactor);
  }
`;
// Base Earth
const dayTexture = textureLoader.load(
  "https://cdn.prod.website-files.com/673abe3b1503d827f7ae6c52/677d22205a2dceb34423b0d6_world.jpg"
);
const nightTexture = textureLoader.load(
  "https://cdn.prod.website-files.com/673abe3b1503d827f7ae6c52/677d221cbd303a22adb38817_world_night.jpg"
);
const bumpMap = textureLoader.load(
  "https://cdn.prod.website-files.com/673abe3b1503d827f7ae6c52/677d221664ddf1be97a2a5d6_world_bump.jpg"
);

const earthGeometry = new THREE.SphereGeometry(1.7, 60, 60);

// Define the uniforms for the shader
const uniforms = {
  dayTexture: { value: dayTexture },
  nightTexture: { value: nightTexture },
  bumpMap: { value: bumpMap },
  bumpScale: { value: 1.0 },
};

// Create the shader material
const material = new THREE.ShaderMaterial({
  uniforms,
  vertexShader,
  fragmentShader,
});

const earth = new THREE.Mesh(earthGeometry, material);

// Earth Clouds
const cloudTexture = textureLoader.load(
  "https://cdn.prod.website-files.com/673abe3b1503d827f7ae6c52/677d21fc230c352c32994be9_clouds.jpg"
); // Your image with black and white parts

const cloudGeometry = new THREE.SphereGeometry(1.622, 60, 60);

const cloudUniforms = {
  time: { value: 0.0 },
  cloudTexture: { value: cloudTexture },
  alphaMap: {
    value: cloudTexture,
  },
  transparency: { value: 1.0 },
};
const cloudVertexShader = `
  varying vec2 vUV;

  void main() {
      vUV = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const cloudFragmentShader = `
  uniform float time;
  uniform sampler2D cloudTexture;

  varying vec2 vUV;

  void main() {
    vec4 color = texture2D(cloudTexture, vUV);
    float alpha = texture2D(cloudTexture, vUV).r;
    gl_FragColor = vec4(color.rgb, color.a * alpha);
  }
`;
const cloudMaterial = new THREE.ShaderMaterial({
  uniforms: cloudUniforms,
  vertexShader: cloudVertexShader,
  fragmentShader: cloudFragmentShader,
  transparent: true,
});

const cloudSphere = new THREE.Mesh(cloudGeometry, cloudMaterial);
cloudSphere.scale.set(1.05, 1.05, 1.05);

// Create the atmosphere sphere
const atmosphereGeometry = new THREE.SphereGeometry(1.7, 60, 60); // Slightly larger
const atmosphereVertexShader = `
  varying vec3 vNormal;

  void main() {
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const atmosphereFragmentShader = `
  varying vec3 vNormal;

  void main() {
      float intensity = pow(0.7 - dot(vNormal, vec3(0, 0, 1.0)), 2.0);
      gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity;
  }
`;
const atmosphereMaterial = new THREE.ShaderMaterial({
  vertexShader: atmosphereVertexShader,
  fragmentShader: atmosphereFragmentShader,
  blending: THREE.AdditiveBlending,
  side: THREE.BackSide,
  transparent: true,
});
const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
atmosphere.scale.set(1.2, 1.2, 1.2);

// Earth Group
const earthGroup = new THREE.Group();
earthGroup.name = 8;
earthGroup.add(earth);
earthGroup.add(cloudSphere);
earthGroup.add(atmosphere);

// Planet Vertex and Fragment Shader
const planetFragmentShader = `
  uniform sampler2D planetTexture;
  uniform sampler2D bumpMap;
  uniform float uShadowFactor;
  uniform vec3 atmosphereColor;

  varying vec2 vUV;
  varying vec3 vNormal;

  void main() {
      vec3 bump = texture2D(bumpMap, vUV).rgb;
      // vec3 adjustedNormal = normalize(vNormal + bump * 2.0 - 1.0);

      float intensity = 1.05 - dot(vNormal, vec3(0.0, 0.0, 1.0));
      vec3 atmosphere = atmosphereColor * pow(intensity, 1.5);

      vec4 dayTex = vec4(atmosphere + texture2D(planetTexture, vUV).xyz, 1.0);
      vec4 nightTex = vec4(texture2D(planetTexture, vUV).xyz * (1.0 - uShadowFactor) + atmosphere, 1.0);

      // Calculate the feathered border based on the spherical coordinates
      float featherWidth = 0.2; // Adjust this value for feathering width
      float blendFactor = smoothstep(-featherWidth, featherWidth, vNormal.x);

      // Create a spherical feathering effect
      float distanceFromCenter = length(vNormal); // Distance from the center of the sphere
      float feather = smoothstep(0.5 - featherWidth, 0.5 + featherWidth, distanceFromCenter);

      // Combine the blend factors
      float finalBlendFactor = blendFactor * feather;

      // Mix the colors based on the final blend factor
      gl_FragColor = mix(nightTex, dayTex, finalBlendFactor);
  }
`;

const ringVertexShader = `
  varying vec2 vUV;
  uniform float rotation;
  uniform float innerRadius;
  uniform float outerRadius;

  void main() {
      // Calculate the angle and radius
      float angle = atan(position.y, position.x) +  1.0;// rotation; // Rotate around the ring
      float radius = length(position.xy); // Get the radius

      // Map UVs: u based on radius, v based on angle
      vUV.x = (radius - innerRadius) / (outerRadius - innerRadius); // Normalize radius to [0, 1]
      vUV.y = (angle + 3.14159265) / (2.0 * 3.14159265); // Normalize angle to [0, 1]

      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Planet Vertex and Fragment Shader
const ringFragmentShader = `
  uniform sampler2D planetTexture;
  uniform float opacity;

  varying vec2 vUV;

  const float blurSize = 0.01;

  void main() {
      vec4 color = vec4(0.0);

      float total = 0.0;

      // Sample the texture at multiple offsets
      for (float x = -1.0; x <= 1.0; x += 1.0) {
          for (float y = -1.0; y <= 1.0; y += 1.0) {
              vec2 offset = vec2(x, y) * blurSize;
              color += texture2D(planetTexture, vUV + offset);
              total += 1.0;
          }
      }

      // Mix the colors based on the final blend factor
      gl_FragColor = vec4(color.rgb/total, opacity);
  }
`;

// Planet geometry
const planetGeometry = new THREE.SphereGeometry(0.5, 60, 60);

// Calculate Angle and Distance From a Selected Object
const angleDistCalc = (disFromObject, deg) => {
  const initialAngle = Math.round(deg * (Math.PI / 180) * 1000) / 1000; // Change this angle as needed (e.g., 60 degrees)
  const x = Math.round(disFromObject * Math.cos(initialAngle) * 1000) / 1000;
  const z = Math.round(disFromObject * Math.sin(initialAngle) * 1000) / 1000;
  return { x, z };
};

let pos;
let posY = 0;

// Saturn
const saturnTexture = textureLoader.load(
  "https://cdn.prod.website-files.com/673abe3b1503d827f7ae6c52/677d21d2bd303a22adb34bcd_saturn.jpg"
);
const saturnUniforms = {
  planetTexture: { value: saturnTexture },
  uShadowFactor: { value: 0.6 },
  atmosphereColor: { value: new THREE.Vector3(0.867, 0.808, 0.678) },
};
const saturnMaterial = new THREE.ShaderMaterial({
  uniforms: saturnUniforms,
  vertexShader: vertexShader,
  fragmentShader: planetFragmentShader,
});
const saturn = new THREE.Mesh(planetGeometry, saturnMaterial);
pos = angleDistCalc(7, 0);
saturn.position.set(pos.x, posY, pos.z);

// Saturn's rings
const saturnRingTexture = textureLoader.load(
  "https://cdn.prod.website-files.com/673abe3b1503d827f7ae6c52/677d21a505787e2385cc9f0e_saturnringcolorflip.jpg"
);
const saturnRingUniform = {
  planetTexture: { value: saturnRingTexture },
  innerRadius: { value: 0.6 },
  outerRadius: { value: 1.0 },
  opacity: { value: 0.9 },
  rotation: { value: 0.0 },
};
const saturnRingMaterial = new THREE.ShaderMaterial({
  uniforms: saturnRingUniform,
  vertexShader: ringVertexShader,
  fragmentShader: ringFragmentShader,
  transparent: true,
  side: THREE.DoubleSide,
});
const saturnRingGeometry = new THREE.RingGeometry(0.6, 1.0, 60);
const saturnRing = new THREE.Mesh(saturnRingGeometry, saturnRingMaterial);
saturnRing.position.set(pos.x, posY, pos.z);
saturnRing.rotation.x = Math.PI / -2; // Rotate the rings to be horizontal
saturnRing.rotation.y = Math.PI / -12; // Rotate the rings to be horizontal

// Saturn Group
const saturnGroup = new THREE.Group();
saturnGroup.add(saturn);
saturnGroup.add(saturnRing);
saturnGroup.name = 0;

// Mercury
const mercuryTexture = textureLoader.load(
  "https://cdn.prod.website-files.com/673abe3b1503d827f7ae6c52/677d2180f04cde61dc1e272e_mercury.jpg"
);
const mercuryUniforms = {
  planetTexture: { value: mercuryTexture },
  uShadowFactor: { value: 0.5 },
  atmosphereColor: { value: new THREE.Vector3(1.0, 1.0, 1.0) },
};
const mercuryMaterial = new THREE.ShaderMaterial({
  uniforms: mercuryUniforms,
  vertexShader: vertexShader,
  fragmentShader: planetFragmentShader,
});
const mercury = new THREE.Mesh(planetGeometry, mercuryMaterial);
pos = angleDistCalc(7, 45);
mercury.position.set(pos.x, posY, pos.z);
const mercuryGroup = new THREE.Group();
mercuryGroup.add(mercury);
mercuryGroup.name = 1;

// Mars
const marsTexture = textureLoader.load(
  "https://cdn.prod.website-files.com/673abe3b1503d827f7ae6c52/677d215868f7310824427ea2_mars.jpg"
);
const marsUniforms = {
  planetTexture: { value: marsTexture },
  uShadowFactor: { value: 0.5 },
  atmosphereColor: { value: new THREE.Vector3(0.526, 0.377, 0.333) },
};
const marsMaterial = new THREE.ShaderMaterial({
  uniforms: marsUniforms,
  vertexShader: vertexShader,
  fragmentShader: planetFragmentShader,
});
const mars = new THREE.Mesh(planetGeometry, marsMaterial);
pos = angleDistCalc(7, 90);
mars.position.set(pos.x, posY, pos.z);
const marsGroup = new THREE.Group();
marsGroup.add(mars);
marsGroup.name = 2;

// Venus
const venusTexture = textureLoader.load(
  "https://cdn.prod.website-files.com/673abe3b1503d827f7ae6c52/677d206774d919ae98a61ae8_venus.jpg"
);
const venusUniforms = {
  planetTexture: { value: venusTexture },
  uShadowFactor: { value: 0.5 },
  atmosphereColor: { value: new THREE.Vector3(0.953, 0.682, 0.224) },
};
const venusMaterial = new THREE.ShaderMaterial({
  uniforms: venusUniforms,
  vertexShader: vertexShader,
  fragmentShader: planetFragmentShader,
});
const venus = new THREE.Mesh(planetGeometry, venusMaterial);
pos = angleDistCalc(7, 135);
venus.position.set(pos.x, posY, pos.z);
const venusGroup = new THREE.Group();
venusGroup.add(venus);
venusGroup.name = 3;

// Jupiter
const jupiterTexture = textureLoader.load(
  "https://cdn.prod.website-files.com/673abe3b1503d827f7ae6c52/677d2041b9d9021db7b9552a_jupiter.jpg"
);
const jupiterUniforms = {
  planetTexture: { value: jupiterTexture },
  uShadowFactor: { value: 0.5 },
  atmosphereColor: { value: new THREE.Vector3(0.75, 0.663, 0.518) },
};
const jupiterMaterial = new THREE.ShaderMaterial({
  uniforms: jupiterUniforms,
  vertexShader: vertexShader,
  fragmentShader: planetFragmentShader,
});
const jupiter = new THREE.Mesh(planetGeometry, jupiterMaterial);
pos = angleDistCalc(7, 180);
jupiter.position.set(pos.x, posY, pos.z);
const jupiterGroup = new THREE.Group();
jupiterGroup.add(jupiter);
jupiterGroup.name = 4;

// Pluto
const plutoTexture = textureLoader.load(
  "https://cdn.prod.website-files.com/673abe3b1503d827f7ae6c52/677d2016e88d104feeb195d5_pluto.jpg"
);
const plutoUniforms = {
  planetTexture: { value: plutoTexture },
  uShadowFactor: { value: 0.5 },
  atmosphereColor: { value: new THREE.Vector3(0.678, 0.604, 0.588) },
};
const plutoMaterial = new THREE.ShaderMaterial({
  uniforms: plutoUniforms,
  vertexShader: vertexShader,
  fragmentShader: planetFragmentShader,
});
const pluto = new THREE.Mesh(planetGeometry, plutoMaterial);
pos = angleDistCalc(7, 225);
pluto.position.set(pos.x, posY, pos.z);
const plutoGroup = new THREE.Group();
plutoGroup.add(pluto);
plutoGroup.name = 5;

// Neptune
const neptuneTexture = textureLoader.load(
  "https://cdn.prod.website-files.com/673abe3b1503d827f7ae6c52/677d1fe9b9d9021db7b912d9_neptune.jpg"
);
const neptuneUniforms = {
  planetTexture: { value: neptuneTexture },
  uShadowFactor: { value: 0.5 },
  atmosphereColor: { value: new THREE.Vector3(0.396, 0.533, 0.8) },
};
const neptuneMaterial = new THREE.ShaderMaterial({
  uniforms: neptuneUniforms,
  vertexShader: vertexShader,
  fragmentShader: planetFragmentShader,
});
const neptune = new THREE.Mesh(planetGeometry, neptuneMaterial);
pos = angleDistCalc(7, 270);
neptune.position.set(pos.x, posY, pos.z);
const neptuneGroup = new THREE.Group();
neptuneGroup.add(neptune);
neptuneGroup.name = 6;

// Uranus
const uranusTexture = textureLoader.load(
  "https://cdn.prod.website-files.com/673abe3b1503d827f7ae6c52/677d1fcdb1515ae7399a7bf1_uranus.jpg"
);
const uranusUniforms = {
  planetTexture: { value: uranusTexture },
  uShadowFactor: { value: 0.5 },
  atmosphereColor: { value: new THREE.Vector3(0.596, 0.737, 0.792) },
};
const uranusMaterial = new THREE.ShaderMaterial({
  uniforms: uranusUniforms,
  vertexShader: vertexShader,
  fragmentShader: planetFragmentShader,
});
const uranus = new THREE.Mesh(planetGeometry, uranusMaterial);
pos = angleDistCalc(7, 315);
uranus.position.set(pos.x, posY, pos.z);

// Uranus' rings
const uranusRingTexture = textureLoader.load(
  "https://cdn.prod.website-files.com/673abe3b1503d827f7ae6c52/677d1fa9a6e4d8ca25888591_uranusringcolourflip.jpg"
);
const uranusRingUniform = {
  planetTexture: { value: uranusRingTexture },
  innerRadius: { value: 0.6 },
  outerRadius: { value: 0.65 },
  opacity: { value: 0.8 },
  rotation: { value: 0.0 },
};
const uranusRingMaterial = new THREE.ShaderMaterial({
  uniforms: uranusRingUniform,
  vertexShader: ringVertexShader,
  fragmentShader: ringFragmentShader,
  transparent: true,
  side: THREE.DoubleSide,
});
const uranusRingGeometry = new THREE.RingGeometry(0.6, 0.65, 60);
const uranusRing = new THREE.Mesh(uranusRingGeometry, uranusRingMaterial);
uranusRing.position.set(pos.x, posY, pos.z);
uranusRing.rotation.x = Math.PI / -3; // Rotate the rings to be horizontal
uranusRing.rotation.y = Math.PI / -6; // Rotate the rings to be horizontal

// Uranus Group
const uranusGroup = new THREE.Group();
uranusGroup.add(uranus);
uranusGroup.add(uranusRing);
uranusGroup.name = 7;

const planetNameMap = new Map([
  [0, ["Company", "Statutory"]],
  [1, ["Deadline", "Management"]],
  [2, ["Workforce", "Suite"]],
  [3, ["Payroll"]],
  [4, ["Taxation"]],
  [5, ["Audit", "Management"]],
  [6, ["Management", "Reporting"]],
  [7, ["Financial", "Statements"]],
  [8, ["Fintura"]],
]);

const planetAddToGroup = new Map([
  [
    0,
    (obj) => {
      saturnGroup.add(obj);
    },
  ],
  [
    1,
    (obj) => {
      mercuryGroup.add(obj);
    },
  ],
  [
    2,
    (obj) => {
      marsGroup.add(obj);
    },
  ],
  [
    3,
    (obj) => {
      venusGroup.add(obj);
    },
  ],
  [
    4,
    (obj) => {
      jupiterGroup.add(obj);
    },
  ],
  [
    5,
    (obj) => {
      plutoGroup.add(obj);
    },
  ],
  [
    6,
    (obj) => {
      neptuneGroup.add(obj);
    },
  ],
  [
    7,
    (obj) => {
      uranusGroup.add(obj);
    },
  ],
  [
    8,
    (obj) => {
      earthGroup.add(obj);
    },
  ],
]);

loader.load(
  "https://cdn.jsdelivr.net/gh/cmshaki/fintura_script@main/Poppins_Bold.json",
  (font) => {
    let textArr;
    let textGeometry;
    let textObject;
    const textMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    let textMesh;
    let angle = 0;
    let textNameCount = 100;

    const characterPositioning = (text, font, textObj, isEarth) => {
      // Position the text around the sphere
      const radius = 0.65; // Radius of the sphere
      const textLength = text.length;
      let totalWidth;
      const widths = [];

      // Calculate the starting angle for characters
      let currentAngle;
      if (!isEarth) {
        currentAngle = (angle - 60) * (-Math.PI / 180);
      } else {
        currentAngle = 44 * (-Math.PI / 180);
      }

      // Get the total width of each character
      for (let i = 0; i < textLength; i++) {
        const char = text[i];
        const charGeometry = new TextGeometry(char, {
          font: font,
          size: isEarth ? 0.5 : 0.1,
          depth: 0,
          curveSegments: 12,
          bevelEnabled: false,
        });
        charGeometry.computeBoundingBox();
        const width =
          charGeometry.boundingBox.max.x - charGeometry.boundingBox.min.x;
        widths.push(width);
        totalWidth += width;
      }

      for (let i = 0; i < textLength; i++) {
        const char = text[i];
        const charGeometry = new TextGeometry(char, {
          font: font,
          size: isEarth ? 0.5 : 0.1,
          depth: 0,
          curveSegments: 12,
          bevelEnabled: false,
        });
        const charMesh = new THREE.Mesh(charGeometry, textMaterial);

        // Set the position based on the current angle
        if (!isEarth) {
          charMesh.position.set(
            radius * Math.sin(currentAngle),
            0,
            radius * Math.cos(currentAngle)
          );
        } else {
          charMesh.position.set(
            1.9 * Math.sin(currentAngle),
            0,
            1.9 * Math.cos(currentAngle)
          );
        }

        // Rotate the character to face outward
        const outwardNormal = new THREE.Vector3(
          Math.sin(currentAngle),
          0,
          Math.cos(currentAngle)
        );
        if (!isEarth) {
          charMesh.lookAt(outwardNormal);
        } else {
          charMesh.lookAt(camera.position);
        }
        textObj.add(charMesh);

        // Update the current angle based on the width of the character
        // scale different letters differently
        const wRegex = /W|T/g;
        const mpfRegex = /M|P|F|C|R|S/g;
        const nurRegex = /n|u|r/g;
        const ilRegex = /i|l/g;
        const xyRegex = /x|y/g;
        const nuRegex = /n|u/g;
        const tRegex = /t/g;
        if (!isEarth) {
          currentAngle += wRegex.test(char)
            ? widths[i] * 1.6
            : mpfRegex.test(char)
            ? widths[i] * 1.8
            : xyRegex.test(char)
            ? widths[i] * 1.6
            : nurRegex.test(char)
            ? widths[i] * 1.9
            : ilRegex.test(char)
            ? widths[i] * 2.5
            : widths[i] * 1.75; // Increment the angle by the width of the character
        } else {
          currentAngle += ilRegex.test(char)
            ? widths[i] * 0.9
            : nuRegex.test(char)
            ? widths[i] * 0.65
            : tRegex.test(char)
            ? widths[i] * 0.6
            : widths[i] * 0.8;
        }
      }
    };

    const createTextParentObject = (ind, len, isEarth) => {
      textObject = new THREE.Object3D();
      textObject.position.sub(earth.position);
      textObject.name = textNameCount;
      textNameCount += 1;
      const currentY = len < 2 ? -0.05 : ind == 0 ? 0 : -0.17;
      textObject.position.set(pos.x, !isEarth ? currentY : -0.25, pos.z);
      // if (ind != 3 && ind != 2 && ind != 8) {
      //   textObject.visible = false;
      // }
      return textObject;
    };

    for (let i = 0; i < 9; i++) {
      textArr = planetNameMap.get(i);

      if (i < 8) {
        pos = angleDistCalc(7.0, angle);
      } else {
        pos = angleDistCalc(0, angle);
      }
      for (let n = 0; n < textArr.length; n++) {
        const txtPar = createTextParentObject(n, textArr.length, i == 8);
        characterPositioning(textArr[n], font, txtPar, i == 8);
        // if (i == 8) {
        //   console.log(txtPar.position);
        // }
        planetAddToGroup.get(i)(txtPar);
      }
      angle += 45;
    }
  }
);

// Add all Groups
scene.add(earthGroup);
scene.add(saturnGroup);
scene.add(mercuryGroup);
scene.add(marsGroup);
scene.add(venusGroup);
scene.add(jupiterGroup);
scene.add(plutoGroup);
scene.add(neptuneGroup);
scene.add(uranusGroup);

// Stars
const starGeometry = new THREE.BufferGeometry();
const starVertexShader = `
  attribute float size;
  varying vec3 vNormal;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size; // Set the size of the point
    gl_Position = projectionMatrix * mvPosition; // Set the position
  }
`;
const starFragmentShader = `
  varying vec3 vNormal;

  void main() {
    float intensity = 1.05 - dot(vNormal, vec3(0.0, 0.0, 1.0));
    vec3 glow = vec3(1.0, 1.0, 1.0) * pow(intensity, 1.5);

    gl_FragColor = vec4(glow, 1.0); // rgba
  }
`;
const starMaterial = new THREE.ShaderMaterial({
  vertexShader: starVertexShader,
  fragmentShader: starFragmentShader,
});
const pointsCount = 1000;
const starPositions = new Float32Array(pointsCount * 3);
const starSizes = new Float32Array(pointsCount);

for (let i = 0; i < pointsCount; i++) {
  starPositions[i * 3] = (Math.random() - 0.5) * 100;
  starPositions[i * 3 + 1] = (Math.random() - 0.5) * 100;
  starPositions[i * 3 + 2] = -Math.random() * 100;
  starSizes[i] = Math.random() * 4;
}

starGeometry.setAttribute(
  "position",
  new THREE.BufferAttribute(starPositions, 3)
);
starGeometry.setAttribute("size", new THREE.BufferAttribute(starSizes, 1));
const stars = new THREE.Points(starGeometry, starMaterial);
scene.add(stars);

camera.position.z = 10;

let planetNo = null;

// A simple map with functions to rotate each planet on its axis
const axisAnimationMap = new Map([
  [
    0,
    () => {
      rotateOnAxis(saturn.rotation, axisRotationSpeed);
    },
  ],
  [
    1,
    () => {
      rotateOnAxis(mercury.rotation, axisRotationSpeed);
    },
  ],
  [
    2,
    () => {
      rotateOnAxis(mars.rotation, axisRotationSpeed);
    },
  ],
  [
    3,
    () => {
      rotateOnAxis(venus.rotation, axisRotationSpeed);
    },
  ],
  [
    4,
    () => {
      rotateOnAxis(jupiter.rotation, axisRotationSpeed);
    },
  ],
  [
    5,
    () => {
      rotateOnAxis(pluto.rotation, axisRotationSpeed);
    },
  ],
  [
    6,
    () => {
      rotateOnAxis(neptune.rotation, axisRotationSpeed);
    },
  ],
  [
    7,
    () => {
      rotateOnAxis(uranus.rotation, axisRotationSpeed);
    },
  ],
  [
    8,
    () => {
      rotateOnAxis(earth.rotation, axisRotationSpeed);
      rotateOnAxis(cloudSphere.rotation, -axisRotationSpeed - 0.0005);
    },
  ],
]);

// Creating a raycaster to be used in mouse event listeners
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let isClicked = false;

// Create current object variable to be use in mouse event listeneres
let currentObject = [];

// Filter out all planet groups
const allPlanets = scene.children.filter(
  (val) =>
    (val.type != "string" && val.name != "" && val.name < 9) || val.name === 0
);

const onMouseMove = (event) => {
  event.preventDefault();

  // Calculate mouse position in normalized device coordinates (-1 to +1) for both components
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  // Calculate objects intersecting the picking ray
  const intersects = raycaster.intersectObjects(allPlanets);
  const intersectedObjectName = intersects[0]?.object.parent.name;

  // Update the raycaster with the camera and mouse position
  raycaster.setFromCamera(mouse, camera);

  if (
    currentObject.includes(intersectedObjectName) ||
    intersectedObjectName === 8 ||
    intersectedObjectName > 99
  ) {
    document.body.style.cursor = "pointer"; // Change cursor to pointer
  } else {
    document.body.style.cursor = "auto"; // Change cursor to pointer
  }
};
document.addEventListener("mouseleave", () => {
  document.body.style.cursor = "auto";
});

const onMouseClick = (event) => {
  event.preventDefault();
  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects(allPlanets);
  const intersectedObjectName =
    intersects[0]?.object.parent.name > 99
      ? intersects[0]?.object.parent.parent.name
      : intersects[0]?.object.parent.name;

  if (!isClicked) {
    if (
      (currentObject.includes(intersectedObjectName) &&
        planetNo != intersectedObjectName) ||
      intersectedObjectName === 8
    ) {
      if (!isClicked) {
        isClicked = true;
        planetNo = intersectedObjectName;
      }
    }
  } else {
    if (
      (currentObject.includes(intersectedObjectName) &&
        intersects.length > 0 &&
        planetNo != intersectedObjectName) ||
      (intersectedObjectName === 8 && planetNo !== 8)
    ) {
      planetNo = intersectedObjectName;
    } else {
      isClicked = false;
      planetNo = null;
    }
  }
};

// Add event listeners for mouse movements and clicks
window.addEventListener("mousemove", onMouseMove, false);
if (isMobile()) {
  window.addEventListener("touchstart", onMouseClick, false);
} else {
  window.addEventListener("mousedown", onMouseClick, false);
}

const rotateOnAxis = (object, s) => {
  gsap.to(object, {
    y: object.y + s,
    ease: "easeIn",
  });
};

let prevPlanet = 2;
let nextPlanet = 4;

// Orbit around the earth
const orbitEarth = (planet, rotationSpeed, worldPosition) => {
  // Calculate position as distance from the earth's psoition
  // Where current distance is
  planet.position.sub(earth.position);
  // Rotate planet around earth
  planet.rotation.y += rotationSpeed;

  // Make sure planetary text stays at one place
  if (planet.name < 8) {
    // Check distance from camera
    const distance =
      Math.round(camera.position.distanceTo(worldPosition) * 1000) / 1000;
    if (currentObject.indexOf(planet.name) != 0) {
      // Check if distance from camera is 3.45
      if (distance < 4) {
        // Check that the planet is on the positive side of the X axis
        if (worldPosition.x < 0) {
          prevPlanet = planet.name > 0 ? planet.name - 1 : 7;
          nextPlanet = planet.name < 7 ? planet.name + 1 : 0;

          currentObject[0] = planet.name;
          currentObject[1] = nextPlanet;
        }
      }
    }
  }
};

// Gets the current position of the planet from the matrix world elements
const getWorldPosition = (matrixWorldElements) => ({
  x: matrixWorldElements[12],
  y: matrixWorldElements[13],
  z: matrixWorldElements[14],
});

// Axis and orbit speeds
const axisRotationSpeed = 0.008;
const orbitSpeed = 0.003;

// Scene Animation
const animate = () => {
  requestAnimationFrame(animate);

  // If there is no planet number animate whole scene
  if (planetNo === null) {
    // Axis rotation for
    for (let i = 0; i < 9; i++) {
      axisAnimationMap.get(i)();
    }

    // Planet Orbit Rotation
    orbitEarth(
      saturnGroup,
      orbitSpeed,
      getWorldPosition(saturn.matrixWorld.elements)
    );
    orbitEarth(
      mercuryGroup,
      orbitSpeed,
      getWorldPosition(mercury.matrixWorld.elements)
    );
    orbitEarth(
      marsGroup,
      orbitSpeed,
      getWorldPosition(mars.matrixWorld.elements)
    );
    orbitEarth(
      venusGroup,
      orbitSpeed,
      getWorldPosition(venus.matrixWorld.elements)
    );
    orbitEarth(
      jupiterGroup,
      orbitSpeed,
      getWorldPosition(jupiter.matrixWorld.elements)
    );
    orbitEarth(
      plutoGroup,
      orbitSpeed,
      getWorldPosition(pluto.matrixWorld.elements)
    );
    orbitEarth(
      neptuneGroup,
      orbitSpeed,
      getWorldPosition(neptune.matrixWorld.elements)
    );
    orbitEarth(
      uranusGroup,
      orbitSpeed,
      getWorldPosition(uranus.matrixWorld.elements)
    );
  } else {
    axisAnimationMap.get(planetNo)();
  }
  renderer.render(scene, camera);
};
