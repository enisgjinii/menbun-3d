import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
const CONFIG = {
  MODEL_PATH: 'src/models/jersey.glb',
  MAX_TEXTS: 4,
  MAX_IMAGES: 3,
  TEXTURE_SIZE: 1024,
  CAMERA: {
    FOV: 45,
    NEAR: 0.1,
    FAR: 1000,
    POSITION: { x: 0, y: 5, z: 10 },
  },
  LIGHTING: {
    AMBIENT: { color: 0xffffff, intensity: 0.6 },
    DIRECTIONAL: { color: 0xffffff, intensity: 0.8, position: { x: 5, y: 10, z: 7.5 } },
    POINT: { color: 0xffffff, intensity: 0.5, position: { x: -5, y: 5, z: -5 } },
  },
};
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
  scene2D: new THREE.Scene(),
  camera2D: null,
  renderer2D: null,
  controls2D: null,
  mesh2D: null,
  uvMapImage: null,
};
const init = () => {
  state.modelContainer = document.getElementById('model-container');
  if (!state.modelContainer) return;
  state.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  state.renderer.setSize(state.modelContainer.clientWidth, state.modelContainer.clientHeight);
  state.renderer.setPixelRatio(window.devicePixelRatio);
  state.renderer.shadowMap.enabled = true;
  state.modelContainer.appendChild(state.renderer.domElement);
  const { FOV, NEAR, FAR, POSITION } = CONFIG.CAMERA;
  state.camera = new THREE.PerspectiveCamera(FOV, state.modelContainer.clientWidth / state.modelContainer.clientHeight, NEAR, FAR);
  state.camera.position.set(POSITION.x, POSITION.y, POSITION.z);
  state.controls = new OrbitControls(state.camera, state.renderer.domElement);
  state.controls.enableDamping = true;
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
  state.textureCanvas = document.createElement('canvas');
  state.textureCanvas.width = CONFIG.TEXTURE_SIZE;
  state.textureCanvas.height = CONFIG.TEXTURE_SIZE;
  state.textureCtx = state.textureCanvas.getContext('2d');
  state.textureCtx.fillStyle = '#ffffff';
  state.textureCtx.fillRect(0, 0, CONFIG.TEXTURE_SIZE, CONFIG.TEXTURE_SIZE);
  state.texture = new THREE.CanvasTexture(state.textureCanvas);
  state.editorCanvas = document.getElementById('editorCanvas');
  if (!state.editorCanvas) return;
  state.editorCtx = state.editorCanvas.getContext('2d');
  loadUVMap();
  loadModel();
  init2DMeshView();
  setupEventListeners();
  animate();
};
const loadUVMap = () => {
  const uvMapImage = new Image();
  uvMapImage.src = 'src/models/UV.png';
  uvMapImage.onload = () => {
    state.uvMapImage = uvMapImage;
    renderEditorCanvas();
    updateAllCanvases();
  };
};
const init2DMeshView = () => {
  const mesh2DCanvas = document.getElementById('mesh2DCanvas');
  if (!mesh2DCanvas) return;
  state.renderer2D = new THREE.WebGLRenderer({ canvas: mesh2DCanvas, antialias: true, alpha: true });
  state.renderer2D.setSize(mesh2DCanvas.clientWidth, mesh2DCanvas.clientHeight);
  state.renderer2D.setPixelRatio(window.devicePixelRatio);
  state.renderer2D.shadowMap.enabled = false;
  const aspect = mesh2DCanvas.clientWidth / mesh2DCanvas.clientHeight;
  state.camera2D = new THREE.OrthographicCamera(-50 * aspect, 50 * aspect, 50, -50, 1, 1000);
  state.camera2D.position.set(0, 0, 100);
  state.camera2D.lookAt(0, 0, 0);
  state.controls2D = new OrbitControls(state.camera2D, state.renderer2D.domElement);
  state.controls2D.enableRotate = false;
  state.controls2D.enablePan = true;
  state.controls2D.enableZoom = true;
  const gridHelper2D = new THREE.GridHelper(100, 100);
  gridHelper2D.rotation.x = Math.PI / 2;
  gridHelper2D.material.opacity = 0.25;
  gridHelper2D.material.transparent = true;
  state.scene2D.add(gridHelper2D);
  animate2D();
};
const loadModel = () => {
  new GLTFLoader().load(
    CONFIG.MODEL_PATH,
    gltf => {
      state.tshirtModel = gltf.scene;
      state.tshirtModel.traverse(child => {
        if (child.isMesh) {
          child.material.map = state.texture;
          child.material.needsUpdate = true;
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      state.scene.add(state.tshirtModel);
      if (state.mesh2D) state.scene2D.remove(state.mesh2D);
      state.mesh2D = state.tshirtModel.clone();
      state.mesh2D.traverse(child => {
        if (child.isMesh) {
          child.material = new THREE.MeshBasicMaterial({
            map: child.material.map,
            color: child.material.color,
            transparent: child.material.transparent,
            opacity: child.material.opacity,
          });
        }
      });
      state.scene2D.add(state.mesh2D);
      adjustCamera();
      updateAllCanvases();
    },
    undefined,
    error => {
      console.error('Failed to load T-shirt model.', error);
    }
  );
};
const adjustCamera = () => {
  if (!state.tshirtModel) return;
  const box = new THREE.Box3().setFromObject(state.tshirtModel);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  state.controls.target.copy(center);
  state.controls.update();
  state.camera.position.set(center.x, center.y + size.y, center.z + size.z * 2);
  state.camera.lookAt(center);
  const maxDim = Math.max(size.x, size.y, size.z);
  const aspect = state.renderer2D.domElement.clientWidth / state.renderer2D.domElement.clientHeight;
  const viewSize = maxDim * 1.5;
  state.camera2D.left = -viewSize * aspect;
  state.camera2D.right = viewSize * aspect;
  state.camera2D.top = viewSize;
  state.camera2D.bottom = -viewSize;
  state.camera2D.updateProjectionMatrix();
};
const setupEventListeners = () => {
  state.colorPicker = document.getElementById('colorPicker');
  state.colorPicker?.addEventListener('input', updateAllCanvases);
  document.getElementById('addTextBtn')?.addEventListener('click', () => {
    const textInput = document.getElementById('textInput')?.value || '';
    const size = parseInt(document.getElementById('fontSize')?.value, 10) || 30;
    addText(textInput, size);
    document.getElementById('textInput').value = '';
  });
  document.getElementById('addImageBtn')?.addEventListener('click', () => {
    document.getElementById('imageUpload')?.click();
  });
  document.getElementById('imageUpload')?.addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) addImage(file);
    e.target.value = '';
  });
  document.getElementById('animateBtn')?.addEventListener('click', toggleAnimation);
  window.addEventListener('resize', onWindowResize);
  document.addEventListener('keydown', e => (['Delete', 'Backspace'].includes(e.key) && deleteSelectedItem()));
  if (state.editorCanvas) {
    const canvas = state.editorCanvas;
    canvas.addEventListener('mousedown', onCanvasMouseDown);
    canvas.addEventListener('mousemove', onCanvasMouseMove);
    canvas.addEventListener('mouseup', onCanvasMouseUp);
    canvas.addEventListener('mouseleave', onCanvasMouseUp);
    canvas.addEventListener('mousemove', e => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const scaleX = state.textureCanvas.width / canvas.width;
      const scaleY = state.textureCanvas.height / canvas.height;
      const texX = mouseX * scaleX;
      const texY = mouseY * scaleY;
      let hovering = state.images.some(({ width, height, position, rotation }) => {
        const halfW = width / 2;
        const halfH = height / 2;
        const angle = -rotation * Math.PI / 180;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const dx = texX - position.x;
        const dy = texY - position.y;
        const rotatedX = dx * cos - dy * sin;
        const rotatedY = dx * sin + dy * cos;
        return rotatedX > -halfW && rotatedX < halfW && rotatedY > -halfH && rotatedY < halfH;
      }) || state.texts.some(({ content, scale, fontSize, position, rotation }) => {
        const metrics = state.editorCtx.measureText(content);
        const textW = metrics.width * scale;
        const textH = fontSize * scale;
        const halfW = textW / 2;
        const halfH = textH / 2;
        const angle = -rotation * Math.PI / 180;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const dx = texX - position.x;
        const dy = texY - position.y;
        const rotatedX = dx * cos - dy * sin;
        const rotatedY = dx * sin + dy * cos;
        return rotatedX > -halfW && rotatedX < halfW && rotatedY > -halfH && rotatedY < halfH;
      });
      canvas.style.cursor = hovering ? 'move' : 'default';
    });
  }
  setupViewSettings();
};
const setupViewSettings = () => {
  const settings = {
    wireframe: document.getElementById('toggleWireframe'),
    grid: document.getElementById('toggleGrid'),
    shadows: document.getElementById('toggleShadows'),
    ambientLight: document.getElementById('toggleAmbientLight'),
    directionalLight: document.getElementById('toggleDirectionalLight'),
    spotlights: document.getElementById('toggleSpotlights'),
    modelVisibility: document.getElementById('toggleModelVisibility'),
  };
  settings.wireframe?.addEventListener('change', e => {
    state.tshirtModel?.traverse(child => child.isMesh && (child.material.wireframe = e.target.checked));
  });
  settings.grid?.addEventListener('change', e => {
    if (!state.gridHelper) {
      state.gridHelper = new THREE.GridHelper(100, 100);
      state.gridHelper.rotation.x = Math.PI / 2;
      state.gridHelper.material.opacity = 0.5;
      state.gridHelper.material.transparent = true;
      state.scene.add(state.gridHelper);
    }
    state.gridHelper.visible = e.target.checked;
  });
  settings.shadows?.addEventListener('change', e => {
    state.renderer.shadowMap.enabled = e.target.checked;
    state.tshirtModel?.traverse(child => child.isMesh && (child.castShadow = child.receiveShadow = e.target.checked));
    // state.lights.directional?.castShadow = e.target.checked;
    // state.lights.point?.castShadow = e.target.checked;
  });
  settings.ambientLight?.addEventListener('change', e => {
    state.lights.ambient.visible = e.target.checked;
  });
  settings.directionalLight?.addEventListener('change', e => {
    state.lights.directional.visible = e.target.checked;
  });
  settings.spotlights?.addEventListener('change', e => {
    if (!state.lights.spotlights && e.target.checked) {
      state.lights.spotlights = Array.from({ length: 2 }, () => {
        const spot = new THREE.SpotLight(0xffffff, 0.5);
        spot.position.set(10, 20, 10);
        spot.castShadow = true;
        state.scene.add(spot);
        return spot;
      });
    }
    state.lights.spotlights?.forEach(spot => (spot.visible = e.target.checked));
  });
  settings.modelVisibility?.addEventListener('change', e => {
    state.tshirtModel.visible = e.target.checked;
  });
};
const onWindowResize = () => {
  const { modelContainer, camera, renderer, camera2D, renderer2D } = state;
  camera.aspect = modelContainer.clientWidth / modelContainer.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(modelContainer.clientWidth, modelContainer.clientHeight);
  // const mesh2DCanvas = document.getElementById('mesh2DCanvas');
  if (mesh2DCanvas && camera2D && renderer2D) {
    renderer2D.setSize(mesh2DCanvas.clientWidth, mesh2DCanvas.clientHeight);
    const aspect = mesh2DCanvas.clientWidth / mesh2DCanvas.clientHeight;
    const viewSize = 50;
    camera2D.left = -viewSize * aspect;
    camera2D.right = viewSize * aspect;
    camera2D.top = viewSize;
    camera2D.bottom = -viewSize;
    camera2D.updateProjectionMatrix();
  }
  resizeEditorCanvas();
};
const resizeEditorCanvas = () => {
  const { editorCanvas, textureCanvas } = state;
  if (editorCanvas && textureCanvas) {
    editorCanvas.width = 600;
    editorCanvas.height = 800;
    state.uvMapImage && state.editorCtx.drawImage(state.uvMapImage, 0, 0, editorCanvas.width, editorCanvas.height);
    renderEditorCanvas();
  }
};
const animate = () => {
  requestAnimationFrame(animate);
  if (state.isAnimating && state.tshirtModel) state.tshirtModel.rotation.y += 0.01;
  state.controls.update();
  state.renderer.render(state.scene, state.camera);
};
const animate2D = () => {
  requestAnimationFrame(animate2D);
  state.controls2D.update();
  state.renderer2D.render(state.scene2D, state.camera2D);
};
const updateAllCanvases = () => {
  updateTexture();
  renderEditorCanvas();
};
const updateTexture = () => {
  const { textureCtx, textureCanvas, texts, images, colorPicker } = state;
  textureCtx.clearRect(0, 0, textureCanvas.width, textureCanvas.height);
  textureCtx.fillStyle = colorPicker?.value || '#ffffff';
  textureCtx.fillRect(0, 0, textureCanvas.width, textureCanvas.height);
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
  const { editorCtx, editorCanvas, texts, images, selectedItem } = state;
  const scaleX = state.textureCanvas.width / editorCanvas.width;
  const scaleY = state.textureCanvas.height / editorCanvas.height;
  editorCtx.clearRect(0, 0, editorCanvas.width, editorCanvas.height);
  state.uvMapImage && editorCtx.drawImage(state.uvMapImage, 0, 0, editorCanvas.width, editorCanvas.height);
  state.gridHelper?.visible && drawGrid(editorCtx, editorCanvas.width, editorCanvas.height);
  texts.forEach((textObj, index) => {
    editorCtx.save();
    editorCtx.font = `${textObj.fontStyle} ${textObj.fontSize / scaleY}px ${textObj.fontFamily}`;
    editorCtx.fillStyle = textObj.color;
    editorCtx.textAlign = textObj.align;
    editorCtx.textBaseline = 'middle';
    editorCtx.translate(textObj.position.x / scaleX, textObj.position.y / scaleY);
    editorCtx.rotate((textObj.rotation * Math.PI) / 180);
    editorCtx.scale(textObj.scale, textObj.scale);
    editorCtx.fillText(textObj.content, 0, 0);
    if (selectedItem?.type === 'text' && selectedItem.index === index) {
      const metrics = editorCtx.measureText(textObj.content);
      const textWidth = metrics.width;
      const textHeight = textObj.fontSize / scaleY;
      editorCtx.strokeStyle = 'red';
      editorCtx.lineWidth = 1;
      editorCtx.strokeRect(-textWidth / 2, -textHeight / 2, textWidth, textHeight);
    }
    editorCtx.restore();
  });
  images.forEach((imgObj, index) => {
    editorCtx.save();
    editorCtx.translate(imgObj.position.x / scaleX, imgObj.position.y / scaleY);
    editorCtx.rotate((imgObj.rotation * Math.PI) / 180);
    editorCtx.scale(imgObj.scale, imgObj.scale);
    editorCtx.drawImage(imgObj.image, -imgObj.width / (2 * scaleX), -imgObj.height / (2 * scaleY), imgObj.width / scaleX, imgObj.height / scaleY);
    if (selectedItem?.type === 'image' && selectedItem.index === index) {
      editorCtx.strokeStyle = 'red';
      editorCtx.lineWidth = 1;
      editorCtx.strokeRect(-imgObj.width / (2 * scaleX), -imgObj.height / (2 * scaleY), imgObj.width / scaleX, imgObj.height / scaleY);
    }
    editorCtx.restore();
  });
};
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
const addText = (content, fontSize) => {
  if (state.texts.length >= CONFIG.MAX_TEXTS || !content.trim()) return;
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
};
const addImage = file => {
  if (state.images.length >= CONFIG.MAX_IMAGES || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.src = e.target.result;
    img.onload = () => {
      let { width, height } = img;
      const maxDim = 300;
      if (width > maxDim || height > maxDim) {
        const aspect = width / height;
        width = aspect > 1 ? maxDim : maxDim * aspect;
        height = aspect > 1 ? maxDim / aspect : maxDim;
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
    };
  };
  reader.readAsDataURL(file);
};
const toggleAnimation = () => {
  state.isAnimating = !state.isAnimating;
  const btn = document.getElementById('animateBtn');
  btn && (btn.innerHTML = state.isAnimating ? '<i class="bi bi-pause-circle"></i> Stop' : '<i class="bi bi-play-circle"></i> Animate');
};
const deleteSelectedItem = () => {
  const { selectedItem, texts, images } = state;
  if (!selectedItem) return;
  selectedItem.type === 'text' ? texts.splice(selectedItem.index, 1) : images.splice(selectedItem.index, 1);
  state.selectedItem = null;
  updateAllCanvases();
  updatePropertiesPanel();
};
const onCanvasMouseDown = e => {
  const { editorCanvas, editorCtx, images, texts } = state;
  const rect = editorCanvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  const scaleX = state.textureCanvas.width / editorCanvas.width;
  const scaleY = state.textureCanvas.height / editorCanvas.height;
  const texX = mouseX * scaleX;
  const texY = mouseY * scaleY;
  let found = false;
  for (let i = images.length - 1; i >= 0; i--) {
    const { width, height, position, rotation } = images[i];
    const halfW = width / 2, halfH = height / 2;
    const angle = -rotation * Math.PI / 180, cos = Math.cos(angle), sin = Math.sin(angle);
    const dx = texX - position.x, dy = texY - position.y;
    const rotatedX = dx * cos - dy * sin, rotatedY = dx * sin + dy * cos;
    if (rotatedX > -halfW && rotatedX < halfW && rotatedY > -halfH && rotatedY < halfH) {
      state.isDragging = true;
      state.dragTarget = { type: 'image', index: i };
      state.dragOffset = { x: position.x - texX, y: position.y - texY };
      state.selectedItem = { type: 'image', index: i };
      updatePropertiesPanel();
      found = true;
      break;
    }
  }
  if (!found) {
    for (let i = texts.length - 1; i >= 0; i--) {
      const { content, scale, fontSize, position, rotation } = texts[i];
      const metrics = editorCtx.measureText(content);
      const textW = metrics.width * scale, textH = fontSize * scale;
      const halfW = textW / 2, halfH = textH / 2;
      const angle = -rotation * Math.PI / 180, cos = Math.cos(angle), sin = Math.sin(angle);
      const dx = texX - position.x, dy = texY - position.y;
      const rotatedX = dx * cos - dy * sin, rotatedY = dx * sin + dy * cos;
      if (rotatedX > -halfW && rotatedX < halfW && rotatedY > -halfH && rotatedY < halfH) {
        state.isDragging = true;
        state.dragTarget = { type: 'text', index: i };
        state.dragOffset = { x: position.x - texX, y: position.y - texY };
        state.selectedItem = { type: 'text', index: i };
        updatePropertiesPanel();
        break;
      }
    }
  }
  if (!found && !state.selectedItem) updatePropertiesPanel();
};
const onCanvasMouseMove = e => {
  if (!state.isDragging || !state.dragTarget) return;
  const { editorCanvas, dragOffset, dragTarget } = state;
  const rect = editorCanvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  const scaleX = state.textureCanvas.width / editorCanvas.width;
  const scaleY = state.textureCanvas.height / editorCanvas.height;
  const newX = mouseX * scaleX + dragOffset.x;
  const newY = mouseY * scaleY + dragOffset.y;
  dragTarget.type === 'image'
    ? (state.images[dragTarget.index].position = { x: newX, y: newY })
    : (state.texts[dragTarget.index].position = { x: newX, y: newY });
  updateAllCanvases();
};
const onCanvasMouseUp = () => {
  state.isDragging = false;
  state.dragTarget = null;
};
const updatePropertiesPanel = () => {
  const textsList = document.getElementById('textsList');
  const imagesList = document.getElementById('imagesList');
  const editPanel = document.getElementById('editProperties');
  if (!textsList || !imagesList || !editPanel) return;
  textsList.innerHTML = '';
  imagesList.innerHTML = '';
  state.texts.forEach((text, index) => {
    const li = document.createElement('li');
    li.className = `list-group-item list-group-item-action ${state.selectedItem?.type === 'text' && state.selectedItem.index === index ? 'active' : ''}`;
    li.textContent = `Text ${index + 1}: ${text.content}`;
    li.style.cursor = 'pointer';
    li.onclick = () => {
      state.selectedItem = { type: 'text', index };
      updateEditProperties();
      updatePropertiesPanel();
    };
    textsList.appendChild(li);
  });
  state.images.forEach((image, index) => {
    const li = document.createElement('li');
    li.className = `list-group-item list-group-item-action ${state.selectedItem?.type === 'image' && state.selectedItem.index === index ? 'active' : ''}`;
    li.textContent = `Image ${index + 1}`;
    li.style.cursor = 'pointer';
    li.onclick = () => {
      state.selectedItem = { type: 'image', index };
      updateEditProperties();
      updatePropertiesPanel();
    };
    imagesList.appendChild(li);
  });
  updateEditProperties();
};
const updateEditProperties = () => {
  const editPanel = document.getElementById('editProperties');
  if (!editPanel) return;
  editPanel.innerHTML = state.selectedItem
    ? state.selectedItem.type === 'text'
      ? `
        <h5>Edit Text</h5>
        <div class="form-group mb-2">
          <label for="editTextContent">Content</label>
          <input type="text" id="editTextContent" class="form-control" value="${sanitizeHTML(state.texts[state.selectedItem.index].content)}">
        </div>
        <div class="form-group mb-2">
          <label for="editFontSize">Font Size</label>
          <input type="range" id="editFontSize" class="form-range" min="10" max="100" value="${state.texts[state.selectedItem.index].fontSize}">
        </div>
        <div class="form-group mb-2">
          <label for="editTextColor">Color</label>
          <input type="color" id="editTextColor" class="form-control form-control-color" value="${state.texts[state.selectedItem.index].color}" title="Choose text color">
        </div>
        <button id="saveTextBtn" class="btn btn-primary w-100">Save</button>
      `
      : `
        <h5>Edit Image</h5>
        <p>Drag the image on the editor canvas to reposition.</p>
        <div class="form-group mb-2">
          <label for="editImageRotation">Rotation</label>
          <input type="range" id="editImageRotation" class="form-range" min="0" max="360" value="${state.images[state.selectedItem.index].rotation}">
        </div>
        <div class="form-group mb-2">
          <label for="editImageScale">Scale</label>
          <input type="range" id="editImageScale" class="form-range" min="0.5" max="2" step="0.1" value="${state.images[state.selectedItem.index].scale}">
        </div>
        <button id="saveImageBtn" class="btn btn-primary w-100">Save</button>
        <button id="duplicateImageBtn" class="btn btn-secondary w-100 mt-2">Duplicate</button>
      `
    : '<p>Select an element to edit its properties.</p>';
  if (state.selectedItem) {
    if (state.selectedItem.type === 'text') {
      document.getElementById('saveTextBtn')?.addEventListener('click', () => {
        const newContent = document.getElementById('editTextContent').value.trim();
        const newFontSize = parseInt(document.getElementById('editFontSize').value, 10);
        const newColor = document.getElementById('editTextColor').value;
        if (newContent) {
          Object.assign(state.texts[state.selectedItem.index], { content: newContent, fontSize: newFontSize, color: newColor });
          updateAllCanvases();
        }
      });
    } else if (state.selectedItem.type === 'image') {
      document.getElementById('saveImageBtn')?.addEventListener('click', () => {
        const newRotation = parseInt(document.getElementById('editImageRotation').value, 10);
        const newScale = parseFloat(document.getElementById('editImageScale').value);
        Object.assign(state.images[state.selectedItem.index], { rotation: newRotation, scale: newScale });
        updateAllCanvases();
      });
      document.getElementById('duplicateImageBtn')?.addEventListener('click', () => {
        const img = state.images[state.selectedItem.index];
        state.images.push({ ...img, id: Date.now(), position: { ...img.position } });
        updateAllCanvases();
      });
    }
  }
};
const sanitizeHTML = str => {
  const temp = document.createElement('div');
  temp.textContent = str;
  return temp.innerHTML;
};
document.addEventListener('DOMContentLoaded', init);
