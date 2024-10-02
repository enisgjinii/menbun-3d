// src/main.js
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Configuration
const CONFIG = {
  MODEL_PATH: '/src/models/jersey.glb',
  MAX_TEXTS: 4,
  MAX_IMAGES: 3,
  TEXTURE_SIZE: 1024,
  EDITOR_SCALE_FACTOR: 3,
  CAMERA: { FOV: 45, NEAR: 0.1, FAR: 1000, POSITION: { x: 0, y: 5, z: 10 } },
  LIGHTING: {
    AMBIENT: { color: 0xffffff, intensity: 0.6 },
    DIRECTIONAL: { color: 0xffffff, intensity: 0.8, position: { x: 5, y: 10, z: 7.5 } },
    POINT: { color: 0xffffff, intensity: 0.5, position: { x: -5, y: 5, z: -5 } },
  },
};

// State Management
const state = {
  scene: new THREE.Scene(),
  camera: null,
  renderer: null,
  controls: null,
  modelContainer: null,
  tshirtModel: null,
  isAnimating: false,
  texture: null,
  textureCanvas: null,
  textureCtx: null,
  texts: [],
  images: [],
  isDragging: false,
  dragTarget: null,
  dragOffset: { x: 0, y: 0 },
  colorPicker: null,
  selectedItem: null,
  gridHelper: null,
  lights: {},
};

// Initialization
const init = () => {
  state.modelContainer = document.getElementById('model-container');
  if (!state.modelContainer) return showToast('Error', 'Model container not found!', 'danger');

  // Renderer
  state.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  state.renderer.setSize(state.modelContainer.clientWidth, state.modelContainer.clientHeight);
  state.renderer.setPixelRatio(window.devicePixelRatio);
  state.renderer.shadowMap.enabled = true;
  state.modelContainer.appendChild(state.renderer.domElement);

  // Camera
  const { FOV, NEAR, FAR, POSITION } = CONFIG.CAMERA;
  state.camera = new THREE.PerspectiveCamera(FOV, state.modelContainer.clientWidth / state.modelContainer.clientHeight, NEAR, FAR);
  state.camera.position.set(POSITION.x, POSITION.y, POSITION.z);

  // Controls
  state.controls = new OrbitControls(state.camera, state.renderer.domElement);
  state.controls.enableDamping = true;

  // Lighting
  const { AMBIENT, DIRECTIONAL, POINT } = CONFIG.LIGHTING;
  state.lights.ambient = new THREE.AmbientLight(AMBIENT.color, AMBIENT.intensity);
  state.scene.add(state.lights.ambient);

  state.lights.directional = new THREE.DirectionalLight(DIRECTIONAL.color, DIRECTIONAL.intensity);
  state.lights.directional.position.set(DIRECTIONAL.position.x, DIRECTIONAL.position.y, DIRECTIONAL.position.z);
  state.lights.directional.castShadow = true;
  state.scene.add(state.lights.directional);

  state.lights.point = new THREE.PointLight(POINT.color, POINT.intensity);
  state.lights.point.position.set(POINT.position.x, POINT.position.y, POINT.position.z);
  state.scene.add(state.lights.point);

  // Texture
  state.textureCanvas = document.createElement('canvas');
  state.textureCanvas.width = CONFIG.TEXTURE_SIZE;
  state.textureCanvas.height = CONFIG.TEXTURE_SIZE;
  state.textureCtx = state.textureCanvas.getContext('2d');
  state.textureCtx.fillStyle = '#ffffff';
  state.textureCtx.fillRect(0, 0, CONFIG.TEXTURE_SIZE, CONFIG.TEXTURE_SIZE);
  state.texture = new THREE.CanvasTexture(state.textureCanvas);

  // Editor Canvas
  state.editorCanvas = document.getElementById('editorCanvas');
  if (!state.editorCanvas) return showToast('Error', 'Editor canvas not found!', 'danger');
  state.editorCtx = state.editorCanvas.getContext('2d');

  // Load Model
  loadModel();

  // Event Listeners
  setupEventListeners();

  // Animation Loop
  animate();
};

// Load T-Shirt Model
const loadModel = () => {
  new GLTFLoader().load(
    CONFIG.MODEL_PATH,
    (gltf) => {
      state.tshirtModel = gltf.scene;
      state.tshirtModel.traverse((child) => {
        if (child.isMesh) {
          child.material.map = state.texture;
          child.material.needsUpdate = true;
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      state.scene.add(state.tshirtModel);
      adjustCamera();
      updateAllCanvases();
    },
    undefined,
    (error) => {
      showToast('Error', 'Failed to load T-shirt model.', 'danger');
      console.error(error);
    }
  );
};

// Adjust Camera to Fit Model
const adjustCamera = () => {
  if (!state.tshirtModel) return;
  const box = new THREE.Box3().setFromObject(state.tshirtModel);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  state.controls.target.copy(center);
  state.controls.update();

  state.camera.position.set(center.x, center.y + size.y, center.z + size.z * 2);
  state.camera.lookAt(center);
};

// Setup Event Listeners
const setupEventListeners = () => {
  // Color Picker
  state.colorPicker = document.getElementById('colorPicker');
  state.colorPicker?.addEventListener('input', updateAllCanvases);

  // Add Text
  document.getElementById('addTextBtn')?.addEventListener('click', () => {
    const text = document.getElementById('textInput')?.value;
    const size = parseInt(document.getElementById('fontSize')?.value, 10);
    addText(text, size);
    document.getElementById('textInput').value = '';
  });

  // Add Image
  document.getElementById('addImageBtn')?.addEventListener('click', () => {
    document.getElementById('imageUpload')?.click();
  });

  document.getElementById('imageUpload')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) addImage(file);
    e.target.value = '';
  });

  // Animate Button
  document.getElementById('animateBtn')?.addEventListener('click', toggleAnimation);

  // Window Resize
  window.addEventListener('resize', onWindowResize);

  // Delete Key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Delete' || e.key === 'Backspace') deleteSelectedItem();
  });

  // Editor Canvas Events
  state.editorCanvas.addEventListener('mousedown', onCanvasMouseDown);
  state.editorCanvas.addEventListener('mousemove', onCanvasMouseMove);
  state.editorCanvas.addEventListener('mouseup', onCanvasMouseUp);
  state.editorCanvas.addEventListener('mouseleave', onCanvasMouseUp);

  // View Settings
  setupViewSettings();
};

// View Settings Handlers
const setupViewSettings = () => {
  const settings = {
    wireframe: document.getElementById('toggleWireframe'),
    grid: document.getElementById('toggleGrid'),
    shadows: document.getElementById('toggleShadows'),
    ambientLight: document.getElementById('toggleAmbientLight'),
    directionalLight: document.getElementById('toggleDirectionalLight'),
    spotlights: document.getElementById('toggleSpotlights'),
    modelVisibility: document.getElementById('toggleModelVisibility'),
    backgroundColor: document.getElementById('backgroundColorPicker'), // Ensure this exists in your HTML
  };

  // Wireframe Mode
  settings.wireframe?.addEventListener('change', (e) => {
    state.tshirtModel?.traverse((child) => {
      if (child.isMesh) child.material.wireframe = e.target.checked;
    });
    showToast('View Settings', `Wireframe mode ${e.target.checked ? 'enabled' : 'disabled'}.`, 'info');
  });

  // Grid Visibility
  settings.grid?.addEventListener('change', (e) => {
    if (!state.gridHelper) {
      state.gridHelper = new THREE.GridHelper(100, 100);
      state.scene.add(state.gridHelper);
    }
    state.gridHelper.visible = e.target.checked;
    showToast('View Settings', `Grid ${e.target.checked ? 'shown' : 'hidden'}.`, 'info');
  });

  // Shadows
  settings.shadows?.addEventListener('change', (e) => {
    state.renderer.shadowMap.enabled = e.target.checked;
    state.tshirtModel?.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = e.target.checked;
        child.receiveShadow = e.target.checked;
      }
    });
    state.lights.directional.castShadow = e.target.checked;
    state.lights.point.castShadow = e.target.checked;
    showToast('View Settings', `Shadows ${e.target.checked ? 'enabled' : 'disabled'}.`, 'info');
  });

  // Ambient Light
  settings.ambientLight?.addEventListener('change', (e) => {
    state.lights.ambient.visible = e.target.checked;
    showToast('View Settings', `Ambient Light ${e.target.checked ? 'enabled' : 'disabled'}.`, 'info');
  });

  // Directional Light
  settings.directionalLight?.addEventListener('change', (e) => {
    state.lights.directional.visible = e.target.checked;
    showToast('View Settings', `Directional Light ${e.target.checked ? 'enabled' : 'disabled'}.`, 'info');
  });

  // Spotlights
  settings.spotlights?.addEventListener('change', (e) => {
    if (!state.lights.spotlights) {
      state.lights.spotlights = [];
      for (let i = 0; i < 2; i++) { // Example: adding two spotlights
        const spot = new THREE.SpotLight(0xffffff, 0.5);
        spot.position.set(10, 20, 10);
        spot.castShadow = true;
        state.scene.add(spot);
        state.lights.spotlights.push(spot);
      }
    }
    state.lights.spotlights.forEach(spot => spot.visible = e.target.checked);
    showToast('View Settings', `Spotlights ${e.target.checked ? 'enabled' : 'disabled'}.`, 'info');
  });

  // Model Visibility
  settings.modelVisibility?.addEventListener('change', (e) => {
    if (state.tshirtModel) state.tshirtModel.visible = e.target.checked;
    showToast('View Settings', `Model visibility ${e.target.checked ? 'shown' : 'hidden'}.`, 'info');
  });

  // Background Color Picker
  settings.backgroundColor?.addEventListener('input', (e) => {
    state.scene.background.set(e.target.value);
    showToast('View Settings', `Background color changed.`, 'info');
  });
};

// Window Resize Handler
const onWindowResize = () => {
  const { modelContainer, camera, renderer } = state;
  camera.aspect = modelContainer.clientWidth / modelContainer.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(modelContainer.clientWidth, modelContainer.clientHeight);
};

// Animation Loop
const animate = () => {
  requestAnimationFrame(animate);
  if (state.isAnimating && state.tshirtModel) state.tshirtModel.rotation.y += 0.01;
  state.controls.update();
  state.renderer.render(state.scene, state.camera);
};

// Rendering Functions
const updateAllCanvases = () => {
  updateTexture();
  renderEditorCanvas();
};

const updateTexture = () => {
  const { textureCtx, textureCanvas, texts, images, colorPicker } = state;
  textureCtx.clearRect(0, 0, textureCanvas.width, textureCanvas.height);

  // Base Color
  const baseColor = colorPicker.value || '#ffffff';
  textureCtx.fillStyle = baseColor;
  textureCtx.fillRect(0, 0, textureCanvas.width, textureCanvas.height);

  // Draw Texts
  texts.forEach(({ content, fontStyle, fontSize, fontFamily, color, align, position, scale, rotation }) => {
    textureCtx.save();
    textureCtx.font = `${fontStyle} ${fontSize}px ${fontFamily}`;
    textureCtx.fillStyle = color;
    textureCtx.textAlign = align;
    textureCtx.textBaseline = 'middle';
    textureCtx.translate(position.x, position.y);
    textureCtx.rotate((rotation * Math.PI) / 180);
    textureCtx.scale(scale, scale);
    textureCtx.fillText(content, 0, 0);
    textureCtx.restore();
  });

  // Draw Images
  images.forEach(({ image, width, height, position, scale, rotation }) => {
    textureCtx.save();
    textureCtx.translate(position.x, position.y);
    textureCtx.rotate((rotation * Math.PI) / 180);
    textureCtx.scale(scale, scale);
    textureCtx.drawImage(image, -width / 2, -height / 2, width, height);
    textureCtx.restore();
  });

  state.texture.needsUpdate = true;
};

const renderEditorCanvas = () => {
  const { editorCtx, editorCanvas, textureCanvas, texts, images, selectedItem, gridHelper } = state;
  const scaleFactor = textureCanvas.width / editorCanvas.width;
  editorCtx.clearRect(0, 0, editorCanvas.width, editorCanvas.height);

  // Draw Grid if visible
  if (gridHelper && gridHelper.visible) drawGrid(editorCtx, editorCanvas.width, editorCanvas.height);

  // Draw Texts
  texts.forEach((textObj, index) => {
    const { content, fontStyle, fontSize, fontFamily, color, align, position, scale, rotation } = textObj;
    editorCtx.save();
    editorCtx.font = `${fontStyle} ${fontSize / CONFIG.EDITOR_SCALE_FACTOR}px ${fontFamily}`;
    editorCtx.fillStyle = color;
    editorCtx.textAlign = align;
    editorCtx.textBaseline = 'middle';
    editorCtx.translate(position.x / scaleFactor, position.y / scaleFactor);
    editorCtx.rotate((rotation * Math.PI) / 180);
    editorCtx.scale(scale / CONFIG.EDITOR_SCALE_FACTOR, scale / CONFIG.EDITOR_SCALE_FACTOR);
    editorCtx.fillText(content, 0, 0);

    // Bounding Box if selected
    if (selectedItem?.type === 'text' && selectedItem.index === index) {
      const metrics = editorCtx.measureText(content);
      const textWidth = metrics.width;
      const textHeight = fontSize / CONFIG.EDITOR_SCALE_FACTOR;
      editorCtx.strokeStyle = 'red';
      editorCtx.lineWidth = 1;
      editorCtx.strokeRect(-textWidth / 2, -textHeight / 2, textWidth, textHeight);
    }
    editorCtx.restore();
  });

  // Draw Images
  images.forEach((imgObj, index) => {
    const { image, width, height, position, scale, rotation } = imgObj;
    editorCtx.save();
    editorCtx.translate(position.x / scaleFactor, position.y / scaleFactor);
    editorCtx.rotate((rotation * Math.PI) / 180);
    editorCtx.scale(scale / CONFIG.EDITOR_SCALE_FACTOR, scale / CONFIG.EDITOR_SCALE_FACTOR);
    editorCtx.drawImage(
      image,
      -width / (2 * CONFIG.EDITOR_SCALE_FACTOR),
      -height / (2 * CONFIG.EDITOR_SCALE_FACTOR),
      width / CONFIG.EDITOR_SCALE_FACTOR,
      height / CONFIG.EDITOR_SCALE_FACTOR
    );

    // Bounding Box if selected
    if (selectedItem?.type === 'image' && selectedItem.index === index) {
      editorCtx.strokeStyle = 'red';
      editorCtx.lineWidth = 1;
      editorCtx.strokeRect(
        -width / (2 * CONFIG.EDITOR_SCALE_FACTOR),
        -height / (2 * CONFIG.EDITOR_SCALE_FACTOR),
        width / CONFIG.EDITOR_SCALE_FACTOR,
        height / CONFIG.EDITOR_SCALE_FACTOR
      );
    }
    editorCtx.restore();
  });
};

// Draw Grid on Editor Canvas
const drawGrid = (ctx, width, height, gridSize = 50) => {
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 1;
  for (let x = 0; x <= width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
};

// Interaction Functions
const addText = (content, fontSize) => {
  if (state.texts.length >= CONFIG.MAX_TEXTS) return showToast('Limit Reached', `Maximum of ${CONFIG.MAX_TEXTS} texts allowed.`, 'warning');
  if (!content.trim()) return showToast('Invalid Input', 'Text content cannot be empty.', 'warning');

  state.texts.push({
    id: Date.now(),
    content,
    fontSize: fontSize || 30,
    fontFamily: 'Arial',
    fontStyle: 'normal',
    color: '#000000',
    align: 'center',
    position: { x: CONFIG.TEXTURE_SIZE / 2, y: CONFIG.TEXTURE_SIZE / 2 },
    scale: 1,
    rotation: 0,
  });
  updateAllCanvases();
  showToast('Success', 'Text added successfully!', 'success');
};

const addImage = (file) => {
  if (state.images.length >= CONFIG.MAX_IMAGES) return showToast('Limit Reached', `Maximum of ${CONFIG.MAX_IMAGES} images allowed.`, 'warning');
  if (!file.type.startsWith('image/')) return showToast('Invalid File', 'Please upload a valid image file.', 'warning');

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.src = e.target.result;
    img.onload = () => {
      const maxDim = 300;
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const aspect = width / height;
        if (aspect > 1) { width = maxDim; height = maxDim / aspect; }
        else { height = maxDim; width = maxDim * aspect; }
      }
      state.images.push({
        id: Date.now(),
        image: img,
        width,
        height,
        position: { x: CONFIG.TEXTURE_SIZE / 2, y: CONFIG.TEXTURE_SIZE / 2 },
        scale: 1,
        rotation: 0,
      });
      updateAllCanvases();
      showToast('Success', 'Image added successfully!', 'success');
    };
    img.onerror = () => showToast('Error', 'Failed to load image.', 'danger');
  };
  reader.onerror = () => showToast('Error', 'Failed to read image file.', 'danger');
  reader.readAsDataURL(file);
};

const toggleAnimation = () => {
  state.isAnimating = !state.isAnimating;
  const btn = document.getElementById('animateBtn');
  if (btn) {
    btn.innerHTML = state.isAnimating
      ? '<i class="bi bi-pause-circle"></i> Stop'
      : '<i class="bi bi-play-circle"></i> Animate';
    showToast('Animation', state.isAnimating ? 'Animation started.' : 'Animation stopped.', 'info');
  }
};

const deleteSelectedItem = () => {
  const { selectedItem, texts, images } = state;
  if (!selectedItem) return;

  if (selectedItem.type === 'text') {
    texts.splice(selectedItem.index, 1);
    showToast('Deleted', 'Selected text has been deleted.', 'info');
  } else if (selectedItem.type === 'image') {
    images.splice(selectedItem.index, 1);
    showToast('Deleted', 'Selected image has been deleted.', 'info');
  }

  state.selectedItem = null;
  updateAllCanvases();
  updatePropertiesPanel();
};

// Editor Canvas Event Handlers
const onCanvasMouseDown = (e) => {
  const { editorCanvas, editorCtx, images, texts } = state;
  const rect = editorCanvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  const scaleFactor = CONFIG.TEXTURE_SIZE / editorCanvas.width;

  const isInside = (x, y, obj) => {
    const angle = -obj.rotation * Math.PI / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const dx = x - obj.position.x / scaleFactor;
    const dy = y - obj.position.y / scaleFactor;
    const rotatedX = dx * cos - dy * sin;
    const rotatedY = dx * sin + dy * cos;
    const halfW = (obj.width || editorCtx.measureText(obj.content).width) * obj.scale / (2 * CONFIG.EDITOR_SCALE_FACTOR);
    const halfH = (obj.height || obj.fontSize) * obj.scale / (2 * CONFIG.EDITOR_SCALE_FACTOR);
    return rotatedX > -halfW && rotatedX < halfW && rotatedY > -halfH && rotatedY < halfH;
  };

  // Check Images First
  for (let i = images.length - 1; i >= 0; i--) {
    if (isInside(mouseX, mouseY, images[i])) {
      state.isDragging = true;
      state.dragTarget = { type: 'image', index: i };
      state.dragOffset = { x: images[i].position.x / scaleFactor - mouseX, y: images[i].position.y / scaleFactor - mouseY };
      state.selectedItem = { type: 'image', index: i };
      updatePropertiesPanel();
      showToast('Selected', 'Image selected for editing.', 'info');
      return;
    }
  }

  // Check Texts Next
  for (let i = texts.length - 1; i >= 0; i--) {
    const text = texts[i];
    const textWidth = editorCtx.measureText(text.content).width * text.scale / CONFIG.EDITOR_SCALE_FACTOR;
    const textHeight = text.fontSize * text.scale / CONFIG.EDITOR_SCALE_FACTOR;
    const textX = text.position.x / scaleFactor;
    const textY = text.position.y / scaleFactor;

    if (mouseX > textX - textWidth / 2 && mouseX < textX + textWidth / 2 &&
        mouseY > textY - textHeight / 2 && mouseY < textY + textHeight / 2) {
      state.isDragging = true;
      state.dragTarget = { type: 'text', index: i };
      state.dragOffset = { x: textX - mouseX, y: textY - mouseY };
      state.selectedItem = { type: 'text', index: i };
      updatePropertiesPanel();
      showToast('Selected', 'Text selected for editing.', 'info');
      return;
    }
  }

  // If No Selection
  state.selectedItem = null;
  updatePropertiesPanel();
};

const onCanvasMouseMove = (e) => {
  if (!state.isDragging || !state.dragTarget) return;
  const { editorCanvas, dragOffset, dragTarget } = state;
  const rect = editorCanvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  const scaleFactor = CONFIG.TEXTURE_SIZE / editorCanvas.width;
  const newX = (mouseX + dragOffset.x) * scaleFactor;
  const newY = (mouseY + dragOffset.y) * scaleFactor;

  if (dragTarget.type === 'image') {
    state.images[dragTarget.index].position = { x: newX, y: newY };
  } else if (dragTarget.type === 'text') {
    state.texts[dragTarget.index].position = { x: newX, y: newY };
  }

  updateAllCanvases();
};

const onCanvasMouseUp = () => {
  state.isDragging = false;
  state.dragTarget = null;
};

// Properties Panel Update
const updatePropertiesPanel = () => {
  const panel = document.getElementById('propertiesPanel');
  if (!panel) return showToast('Error', 'Properties panel not found!', 'danger');

  const { selectedItem, texts, images } = state;
  if (!selectedItem) {
    panel.innerHTML = '<p>Select an element to edit its properties.</p>';
    return;
  }

  const item = selectedItem.type === 'text' ? texts[selectedItem.index] : images[selectedItem.index];
  if (!item) {
    panel.innerHTML = '<p>Select an element to edit its properties.</p>';
    return;
  }

  // Generate HTML based on item type
  panel.innerHTML = `
    <h5 class="mb-3">Edit Properties</h5>
    ${selectedItem.type === 'text' ? `
      <div class="mb-3">
        <label for="propContent" class="form-label">Text Content:</label>
        <input type="text" id="propContent" value="${sanitizeHTML(item.content)}" class="form-control" placeholder="Enter text">
      </div>
      <div class="mb-3">
        <label for="propFontSize" class="form-label">Font Size:</label>
        <input type="number" id="propFontSize" value="${item.fontSize}" class="form-control" min="10" max="100">
      </div>
      <div class="mb-3">
        <label for="propColor" class="form-label">Color:</label>
        <input type="color" id="propColor" value="${item.color}" class="form-control form-control-color" title="Choose text color">
      </div>
    ` : `
      <div class="mb-3">
        <p>Image can be repositioned by dragging on the canvas or adjusted using the sliders below.</p>
      </div>
    `}
    <div class="mb-3">
      <label for="propScale" class="form-label">Scale:</label>
      <input type="range" id="propScale" min="0.1" max="5" step="0.1" value="${item.scale}" class="form-range">
    </div>
    <div class="mb-3">
      <label for="propRotation" class="form-label">Rotation:</label>
      <input type="range" id="propRotation" min="0" max="360" step="1" value="${item.rotation}" class="form-range">
    </div>
    <button id="deleteItemBtn" class="btn btn-danger w-100">
      <i class="bi bi-trash me-2"></i> Delete
    </button>
  `;

  // Event Listeners
  if (selectedItem.type === 'text') {
    document.getElementById('propContent')?.addEventListener('input', (e) => {
      item.content = e.target.value;
      updateAllCanvases();
    });
    document.getElementById('propFontSize')?.addEventListener('input', (e) => {
      item.fontSize = parseInt(e.target.value, 10) || item.fontSize;
      updateAllCanvases();
    });
    document.getElementById('propColor')?.addEventListener('input', (e) => {
      item.color = e.target.value;
      updateAllCanvases();
    });
  }

  document.getElementById('propScale')?.addEventListener('input', (e) => {
    item.scale = parseFloat(e.target.value) || item.scale;
    updateAllCanvases();
  });

  document.getElementById('propRotation')?.addEventListener('input', (e) => {
    item.rotation = parseFloat(e.target.value) || item.rotation;
    updateAllCanvases();
  });

  document.getElementById('deleteItemBtn')?.addEventListener('click', deleteSelectedItem);
};

// Utility Functions
const showToast = (title, message, type = 'info') => {
  const toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) return console.error('Toast container not found!');

  const toastEl = document.createElement('div');
  toastEl.className = `toast align-items-center text-bg-${type} border-0`;
  toastEl.setAttribute('role', 'alert');
  toastEl.setAttribute('aria-live', 'assertive');
  toastEl.setAttribute('aria-atomic', 'true');

  toastEl.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">
        <strong>${title}:</strong> ${message}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `;

  toastContainer.appendChild(toastEl);
  new bootstrap.Toast(toastEl, { delay: 3000 }).show();
  toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
};

const sanitizeHTML = (str) => {
  const temp = document.createElement('div');
  temp.textContent = str;
  return temp.innerHTML;
};

// Start Initialization on DOM Content Loaded
document.addEventListener('DOMContentLoaded', init);
