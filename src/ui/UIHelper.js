/**
 * UIHelper - Static utility class for UI operations
 * 
 * Provides drag and drop utilities, celebration effects, and other UI helpers.
 * 
 * @example
 * import { UIHelper } from 'aeco';
 * 
 * // Make element draggable
 * UIHelper.makeDraggable(element, { value: 100, label: 'Option A' });
 * 
 * // Create drop zone with validation
 * UIHelper.makeDropZone(dropElement, {
 *   correctAnswer: 100,
 *   onCorrect: (data, el) => console.log('Correct!'),
 *   onIncorrect: (data, el) => console.log('Try again')
 * });
 * 
 * // Celebration effects
 * UIHelper.celebrateCorrectAnswer(element);
 */

/**
 * @typedef {Object} DragData
 * @property {*} value - The value associated with the dragged item
 * @property {string} [display] - Display text for the drag operation
 */

/**
 * @typedef {Object} DropZoneConfig
 * @property {*} [correctAnswer] - The correct answer value for validation
 * @property {Function} [onDrop] - Callback when any item is dropped (data, element) => void
 * @property {Function} [onCorrect] - Callback when correct item dropped (data, element) => void
 * @property {Function} [onIncorrect] - Callback when incorrect item dropped (data, element) => void
 * @property {Function} [onDragEnter] - Callback when drag enters zone (element) => void
 * @property {Function} [onDragLeave] - Callback when drag leaves zone (element) => void
 */

/**
 * @typedef {Object} AnimateCoinOptions
 * @property {number} [duration=500] - Animation duration in ms
 * @property {number} [distance=50] - Jump distance in pixels
 * @property {number} [rotation=360] - Rotation degrees
 */
import Paths from "../utils/paths.js";

/**
 * Shared poll loops per app context (operator readiness for UI enable/disable).
 * @type {WeakMap<object, { bindings: Array<{ tick: () => void }>, intervalId: ReturnType<typeof setInterval> | null, pollMs: number }>}
 */
const _operatorPollRegistry = new WeakMap();

/**
 * @param {object} context
 * @returns {{ bindings: Array<{ tick: () => void }>, intervalId: ReturnType<typeof setInterval> | null, pollMs: number }}
 */
function getOperatorPollRegistry(context) {
  let reg = _operatorPollRegistry.get(context);

  if (!reg) {
    reg = { bindings: [], intervalId: null, pollMs: Number.POSITIVE_INFINITY };

    _operatorPollRegistry.set(context, reg);
  }

  return reg;
}

let touchDragState = {
  isDragging: false,
  draggedElement: null,
  draggedData: null,
  ghostElement: null,
  startX: 0,
  startY: 0
};

/**
 * Static utility class for UI operations including drag-and-drop and animations.
 */
class UIHelper {
  
  /**
   * Creates a ghost element for touch dragging
   * @param {HTMLElement} originalElement - The element being dragged
   * @returns {HTMLElement} The ghost element
   */
  static createTouchGhost(originalElement) {
    const ghost = originalElement.cloneNode(true);

    const rect = originalElement.getBoundingClientRect();

    ghost.classList.add('touch-ghost');

    ghost.style.top = `${rect.top}px`;

    ghost.style.left = `${rect.left}px`;

    ghost.style.width = `${rect.width}px`;

    ghost.style.height = `${rect.height}px`;
    
    document.body.appendChild(ghost);

    return ghost;
  }

  /**
   * Finds the drop zone element under a touch point
   * @param {number} x - Touch X coordinate
   * @param {number} y - Touch Y coordinate
   * @returns {HTMLElement|null} The drop zone element or null
   */
  static findDropZoneAtPoint(x, y) {
    
    if (touchDragState.ghostElement) {
      touchDragState.ghostElement.style.display = 'none';
    }
    
    const elementBelow = document.elementFromPoint(x, y);
    
    if (touchDragState.ghostElement) {
      touchDragState.ghostElement.style.display = '';
    }

    let current = elementBelow;

    while (current) {
      if (current.classList && current.classList.contains('DropZone')) {
        return current;
      }

      current = current.parentElement;
    }
    
    return null;
  }

  /**
   * Makes an element draggable with associated data
   * @param {Object} element - UIComponent element to make draggable
   * @param {*} data - Data to transfer when dragging
   * @param {Object} options - Optional configuration
   * @returns {Object} The element for chaining
   */
  static makeDraggable(element, data, options = {}) {
    const dom = element.dom || element;
    
    dom.setAttribute('draggable', 'true');

    dom.classList.add('draggable-item');

    dom._dragData = data;

    dom.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', JSON.stringify(data));

      e.dataTransfer.effectAllowed = 'move';

      dom.classList.add('dragging');
    });
    
    dom.addEventListener('dragend', (e) => {
      dom.classList.remove('dragging');
    });

    dom.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      
      const touch = e.touches[0];

      touchDragState.startX = touch.clientX;

      touchDragState.startY = touch.clientY;

      touchDragState.isDragging = false;

      touchDragState.draggedElement = dom;

      touchDragState.draggedData = data;

      dom.classList.add('touch-active');
    }, { passive: true });
    
    dom.addEventListener('touchmove', (e) => {
      if (!touchDragState.draggedElement || touchDragState.draggedElement !== dom) return;
      
      const touch = e.touches[0];

      const deltaX = Math.abs(touch.clientX - touchDragState.startX);

      const deltaY = Math.abs(touch.clientY - touchDragState.startY);

      if (!touchDragState.isDragging && (deltaX > 10 || deltaY > 10)) {
        touchDragState.isDragging = true;

        dom.classList.add('dragging');

        touchDragState.ghostElement = UIHelper.createTouchGhost(dom);
      }
      
      if (touchDragState.isDragging) {
        e.preventDefault();
 
        if (touchDragState.ghostElement) {
          const rect = dom.getBoundingClientRect();

          touchDragState.ghostElement.style.left = `${touch.clientX - rect.width / 2}px`;

          touchDragState.ghostElement.style.top = `${touch.clientY - rect.height / 2}px`;
        }

        const dropZone = UIHelper.findDropZoneAtPoint(touch.clientX, touch.clientY);

        document.querySelectorAll('.DropZone.drag-over').forEach(dz => {
          dz.classList.remove('drag-over');
        });

        if (dropZone) {
          dropZone.classList.add('drag-over');
        }
      }
    }, { passive: false });
    
    dom.addEventListener('touchend', (e) => {
      dom.classList.remove('touch-active');
      
      if (touchDragState.isDragging && touchDragState.draggedElement === dom) {
        const touch = e.changedTouches[0];

        const dropZone = UIHelper.findDropZoneAtPoint(touch.clientX, touch.clientY);

        if (dropZone && dropZone._dropHandler) {
          dropZone._dropHandler(touchDragState.draggedData);
        }

        document.querySelectorAll('.DropZone.drag-over').forEach(dz => {
          dz.classList.remove('drag-over');
        });

        if (touchDragState.ghostElement) {
          touchDragState.ghostElement.remove();

          touchDragState.ghostElement = null;
        }
        
        dom.classList.remove('dragging');
      }

      touchDragState.isDragging = false;

      touchDragState.draggedElement = null;

      touchDragState.draggedData = null;
    }, { passive: true });
    
    dom.addEventListener('touchcancel', (e) => {
      dom.classList.remove('touch-active', 'dragging');
      
      if (touchDragState.ghostElement) {
        touchDragState.ghostElement.remove();

        touchDragState.ghostElement = null;
      }
      
      document.querySelectorAll('.DropZone.drag-over').forEach(dz => {
        dz.classList.remove('drag-over');
      });
      
      touchDragState.isDragging = false;

      touchDragState.draggedElement = null;

      touchDragState.draggedData = null;
    }, { passive: true });
    
    return element;
  }

  /**
   * Makes an element a drop zone with validation
   * @param {Object} element - UIComponent element to make a drop zone
   * @param {Object} config - Configuration object
   * @param {*} config.correctAnswer - The correct answer to validate against
   * @param {Function} config.onCorrect - Callback when correct answer is dropped
   * @param {Function} config.onIncorrect - Callback when incorrect answer is dropped
   * @param {Function} config.validate - Custom validation function (receives dropped data)
   * @returns {Object} The element for chaining
   */
  static makeDropZone(element, config = {}) {
    const dom = element.dom || element;

    const { correctAnswer, onCorrect, onIncorrect, validate } = config;

    const handleDrop = (droppedData) => {
      dom.classList.remove('drag-over');

      let isCorrect = false;

      if (validate) {
        isCorrect = validate(droppedData);
      } else if (correctAnswer !== undefined) {
        isCorrect = droppedData.value === correctAnswer || droppedData === correctAnswer;
      }
      
      if (isCorrect) {
        UIHelper.markDropZoneCorrect(element, droppedData);

        if (onCorrect) onCorrect(droppedData, element);
      } else {
        UIHelper.markDropZoneIncorrect(element, droppedData);

        if (onIncorrect) onIncorrect(droppedData, element);
      }
    };

    dom._dropHandler = handleDrop;

    dom.addEventListener('dragover', (e) => {
      e.preventDefault();

      e.dataTransfer.dropEffect = 'move';

      dom.classList.add('drag-over');
    });
    
    dom.addEventListener('dragleave', (e) => {
      dom.classList.remove('drag-over');
    });
    
    dom.addEventListener('dragenter', (e) => {
      e.preventDefault();

      dom.classList.add('drag-over');
    });

    dom.addEventListener('drop', (e) => {
      e.preventDefault();
      
      let droppedData;

      try {
        droppedData = JSON.parse(e.dataTransfer.getData('text/plain'));
      } catch (err) {
        droppedData = e.dataTransfer.getData('text/plain');
      }
      
      handleDrop(droppedData);
    });
    
    return element;
  }

  /**
   * Marks a drop zone as correct with celebration
   * @param {Object} element - The drop zone element
   * @param {*} data - The dropped data
   */
  static markDropZoneCorrect(element, data) {
    const dom = element.dom || element;

    const displayValue = data.display || data.value || data;

    dom.innerHTML = `<span class="drop-value">${displayValue}</span>`;

    dom.classList.remove('DropZone', 'incorrect');

    dom.classList.add('correct');

    UIHelper.celebrateCorrectAnswer(dom);
  }

  /**
   * Marks a drop zone as incorrect with feedback
   * @param {Object} element - The drop zone element
   * @param {*} data - The dropped data
   */
  static markDropZoneIncorrect(element, data) {
    const dom = element.dom || element;

    const displayValue = data.display || data.value || data;

    dom.innerHTML = `<span class="drop-value">${displayValue}</span>`;

    dom.classList.add('incorrect');

    setTimeout(() => {
      dom.innerHTML = '';

      dom.classList.remove('incorrect');
    }, 1000);
  }

  /**
   * Celebration effect for correct answers
   * @param {HTMLElement} targetElement - Element to celebrate around
   */
  static celebrateCorrectAnswer(targetElement) {
    
    UIHelper.createConfetti(targetElement);

    targetElement.classList.add('celebrating');

    setTimeout(() => {
      targetElement.classList.remove('celebrating');
    }, 600);

    UIHelper.playSuccessSound();
  }

  /**
   * Creates confetti particles around an element
   * @param {HTMLElement} targetElement - Element to create confetti around
   */
  static createConfetti(targetElement) {
    const rect = targetElement.getBoundingClientRect();

    const centerX = rect.left + rect.width / 2;

    const centerY = rect.top + rect.height / 2;
    
    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];

    const particleCount = 30;
    
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      
      const color = colors[Math.floor(Math.random() * colors.length)];

      const size = Math.random() * 10 + 5;

      const isCircle = Math.random() > 0.5;

      const angle = (Math.PI * 2 * i) / particleCount;

      const velocity = Math.random() * 100 + 50;

      const destX = Math.cos(angle) * velocity;

      const destY = Math.sin(angle) * velocity - 50;
 
      particle.className = `confetti-particle ${isCircle ? 'circle' : 'square'}`;

      particle.style.left = `${centerX}px`;

      particle.style.top = `${centerY}px`;

      particle.style.width = `${size}px`;

      particle.style.height = `${size}px`;

      particle.style.background = color;
      
      document.body.appendChild(particle);

      particle.animate([
        { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
        { transform: `translate(calc(-50% + ${destX}px), calc(-50% + ${destY}px)) scale(0)`, opacity: 0 }
      ], {
        duration: 800 + Math.random() * 400,
        easing: 'cubic-bezier(0, 0.9, 0.57, 1)',
        fill: 'forwards'
      }).onfinish = () => particle.remove();
    }
  }

  /**
   * Animates a coin element by cycling through SVG frames
   * @param {HTMLElement} element - The image element to animate
   * @param {Object} options - Animation options
   */
  static animateCoin(element, options = {}) {
    const dom = element.dom || element;

    if (dom.tagName !== 'IMG') {
      const img = dom.querySelector('img');

      if (!img) return; 

      return UIHelper.animateCoin(img, options);
    }

    const frames = [
      Paths.data('resources/icons/coin/coin_1.svg'),
      Paths.data('resources/icons/coin/coin_2.svg'),
      Paths.data('resources/icons/coin/coin_3.svg'),
      Paths.data('resources/icons/coin/coin_4.svg'),
      Paths.data('resources/icons/coin/coin_5.svg'),
      Paths.data('resources/icons/coin/coin_6.svg')
    ];
    
    let currentFrame = 0;

    const duration = options.duration || 2000; 

    const frameRate = options.frameRate || 100;
 
    const originalSrc = dom.src;

    if (dom._coinAnimationInterval) {
      clearInterval(dom._coinAnimationInterval);
    }
    
    const interval = setInterval(() => {
        currentFrame = (currentFrame + 1) % frames.length;

        dom.src = frames[currentFrame];
    }, frameRate);
    
    dom._coinAnimationInterval = interval;

    setTimeout(() => {
        if (dom._coinAnimationInterval === interval) {
          clearInterval(interval);

          dom._coinAnimationInterval = null;

          dom.src = frames[0];
        }
    }, duration);
  }

  /**
   * Plays a success sound effect
   */
  static playSuccessSound() {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();

      const oscillator = audioContext.createOscillator();

      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);

      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); 

      oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); 

      oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); 
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);

      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
      
      oscillator.start(audioContext.currentTime);

      oscillator.stop(audioContext.currentTime + 0.4);
    } catch (e) {
      
    }
  }

  /**
   * Resets the touch drag state (useful for cleanup)
   */
  static resetTouchDragState() {
    if (touchDragState.ghostElement) {
      touchDragState.ghostElement.remove();
    }
    
    touchDragState = {
      isDragging: false,
      draggedElement: null,
      draggedData: null,
      ghostElement: null,
      startX: 0,
      startY: 0
    };
  }

  /**
   * Gets the current touch drag state (for debugging)
   * @returns {Object} The current touch drag state
   */
  static getTouchDragState() {
    return { ...touchDragState };
  }

  /**
   * Makes an element draggable for scene-based interactions (3D canvas drop)
   * @param {Object} element - UIComponent element to make draggable
   * @param {Object} data - Data to transfer when dragging
   * @param {Object} options - Optional configuration
   * @returns {Object} The element for chaining
   */
  static makeSceneDraggable(element, data, options = {}) {
    const dom = element.dom || element;
    
    dom.setAttribute('draggable', 'true');

    dom.classList.add('scene-draggable');

    dom._sceneDragData = data;

    dom.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', JSON.stringify(data));

      e.dataTransfer.effectAllowed = 'move';

      dom.classList.add('dragging');

      document.body.style.userSelect = 'none';
    });

    dom.addEventListener('dragend', () => {
      dom.classList.remove('dragging');

      document.body.style.userSelect = '';
    });

    let touchStartPos = null;

    let touchDragData = null;

    let dragPreview = null;

    const onDrop = options.onDrop;

    dom.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];

      touchStartPos = { x: touch.clientX, y: touch.clientY };

      touchDragData = data;
    }, { passive: true });

    dom.addEventListener('touchmove', (e) => {
      if (!touchDragData) return;
      
      const touch = e.touches[0];

      const dx = touch.clientX - touchStartPos.x;

      const dy = touch.clientY - touchStartPos.y;

      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        e.preventDefault();

        document.body.style.userSelect = 'none';
        
        if (!dragPreview) {
          dragPreview = dom.cloneNode(true);

          dragPreview.style.cssText = `
            position: fixed;
            pointer-events: none;
            opacity: 0.8;
            z-index: 9999;
            transform: scale(0.9);
          `;

          document.body.appendChild(dragPreview);
        }
        
        dragPreview.style.left = `${touch.clientX - 50}px`;

        dragPreview.style.top = `${touch.clientY - 30}px`;
      }
    }, { passive: false });

    dom.addEventListener('touchend', (e) => {
      document.body.style.userSelect = '';
      
      if (dragPreview) {
        dragPreview.remove();

        dragPreview = null;

        const touch = e.changedTouches[0];

        if (onDrop) {
          onDrop(touch.clientX, touch.clientY, touchDragData);
        }
      }
      
      touchStartPos = null;

      touchDragData = null;
    });

    return element;
  }

  /**
   * Initializes a scene/canvas drop zone for 3D interactions
   * @param {Object} context - Application context with dom and editor
   * @param {Function} onDrop - Callback (clientX, clientY, data) => void
   * @returns {boolean} Whether initialization succeeded
   */
  static initSceneDropZone(context, onDrop) {
    const container = context.dom;

    if (!container || container._sceneDropZoneInitialized) return false;

    const handleDragOver = (e) => {
      e.preventDefault();

      e.stopPropagation();

      e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e) => {
      e.preventDefault();

      e.stopPropagation();
      
      try {
        const data = JSON.parse(e.dataTransfer.getData('text/plain'));

        if (data && onDrop) {
          onDrop(e.clientX, e.clientY, data);
        }
      } catch (err) {}
    };

    container.addEventListener('dragover', handleDragOver);

    container.addEventListener('drop', handleDrop);

    const canvas = context.editor?.renderer?.domElement;

    if (canvas) {
      canvas.addEventListener('dragover', handleDragOver);

      canvas.addEventListener('drop', handleDrop);
    }

    container._sceneDropZoneInitialized = true;

    return true;
  }

  /**
   * Apply locked/unlocked visuals for operator polling (native disabled vs pointer-events).
   * @param {HTMLElement} dom
   * @param {{ setDisabled?: (v: boolean) => void } | null} uiEl
   * @param {boolean} locked
   * @param {string} [lockedTooltip]
   * @param {string} savedTitle
   */
  static _applyOperatorPollLockedState(dom, uiEl, locked, lockedTooltip, savedTitle) {
    const tag = dom.tagName;

    const useNativeDisable =
      tag === "BUTTON" ||
      tag === "INPUT" ||
      tag === "SELECT" ||
      tag === "TEXTAREA" ||
      tag === "FIELDSET";

    if (useNativeDisable) {
      if (uiEl && typeof uiEl.setDisabled === "function") {
        uiEl.setDisabled(locked);
      } else {
        dom.disabled = locked;
      }
    } else {
      dom.style.pointerEvents = locked ? "none" : "";

      dom.style.opacity = locked ? "0.55" : "";

      dom.classList.toggle("operator-poll-locked", locked);
    }

    if (locked) {
      if (lockedTooltip) dom.setAttribute("title", lockedTooltip);
    } else if (savedTitle) {
      dom.setAttribute("title", savedTitle);
    } else {
      dom.removeAttribute("title");
    }
  }

  /**
   * Poll `operators.canExecute` and disable/lock a UI element until the operator is ready.
   * Optionally wraps click with the same check. Use without `onClick` for drop zones (visual only).
   *
   * @param {Object} options
   * @param {{ dom: HTMLElement, onClick?: (cb: (ev: Event) => void) => void, setDisabled?: (v: boolean) => void }} options.element
   * @param {{ canExecute: (id: string, ctx: object, ...args: unknown[]) => boolean }} options.operators
   * @param {object} options.context
   * @param {string} options.operatorId - e.g. `bim.load_model_from_path`
   * @param {() => unknown[] | unknown[]} [options.getArgs] - Constructor args after `context` (same order as `execute`)
   * @param {(ev: Event) => void} [options.onClick]
   * @param {string} [options.lockedTooltip]
   * @param {number} [options.pollMs]
   * @param {(ev: Event) => void} [options.onLocked] - When click fires while locked
   * @param {() => boolean} [options.extraReadyCheck] - If false, element stays locked (e.g. in-flight work)
   * @returns {() => void} Unregister polling for this binding (best-effort)
   */
  static bindOperatorPolling(options = {}) {
    const {
      element,
      operators: ops,
      context,
      operatorId,
      getArgs = () => [],
      onClick,
      lockedTooltip = "Enable Python and BIM (IfcOpenShell) first.",
      pollMs = 300,
      onLocked,
      extraReadyCheck,
    } = options;

    const dom = element?.dom ?? null;

    if (!dom) {
      console.warn("[UIHelper.bindOperatorPolling] Missing element with .dom");

      return () => {};
    }

    const uiEl = element.dom ? element : null;

    const binding = {
      _lastReady: undefined,

      _savedTitle: dom.getAttribute("title") || "",

      tick() {
        if (!dom.isConnected) return;

        let args = [];

        try {
          const raw = typeof getArgs === "function" ? getArgs() : getArgs;

          args = Array.isArray(raw) ? raw : [];
        } catch (e) {
          args = [];
        }

        let operatorReady = false;

        try {
          operatorReady = ops.canExecute(operatorId, context, ...args);
        } catch (e) {
          operatorReady = false;
        }

        let extra = true;

        try {
          extra = typeof extraReadyCheck !== "function" ? true : Boolean(extraReadyCheck());
        } catch (e) {
          extra = false;
        }

        const ready = operatorReady && extra;

        if (ready === binding._lastReady) return;

        binding._lastReady = ready;

        UIHelper._applyOperatorPollLockedState(
          dom,
          uiEl,
          !ready,
          lockedTooltip,
          binding._savedTitle
        );
      },
    };

    if (typeof onClick === "function") {
      const wrappedClick = (ev) => {
        let args = [];

        try {
          const raw = typeof getArgs === "function" ? getArgs() : getArgs;

          args = Array.isArray(raw) ? raw : [];
        } catch (e) {
          args = [];
        }

        let operatorReady = false;

        try {
          operatorReady = ops.canExecute(operatorId, context, ...args);
        } catch (e) {
          operatorReady = false;
        }

        let extra = true;

        try {
          extra = typeof extraReadyCheck !== "function" ? true : Boolean(extraReadyCheck());
        } catch (e) {
          extra = false;
        }

        if (!operatorReady || !extra) {
          if (typeof onLocked === "function") onLocked(ev);

          return;
        }

        return onClick(ev);
      };

      if (uiEl && typeof uiEl.onClick === "function") {
        uiEl.onClick(wrappedClick);
      } else {
        dom.addEventListener("click", wrappedClick);
      }
    }

    const reg = getOperatorPollRegistry(context);

    reg.pollMs = Math.min(reg.pollMs, pollMs);

    reg.bindings.push(binding);

    binding.tick();

    if (reg.intervalId == null) {
      reg.intervalId = setInterval(() => {
        for (const b of reg.bindings) b.tick();
      }, reg.pollMs);
    }

    return () => {
      const idx = reg.bindings.indexOf(binding);

      if (idx !== -1) reg.bindings.splice(idx, 1);

      if (reg.bindings.length === 0 && reg.intervalId != null) {
        clearInterval(reg.intervalId);

        reg.intervalId = null;

        _operatorPollRegistry.delete(context);
      }
    };
  }

  /**
   * Creates a file drop zone for accepting files
   * @param {Object} element - UIComponent element to use as drop zone
   * @param {Object} options - Configuration options
   * @param {string[]} [options.accept] - Array of file extensions to accept (e.g., ['.ifc', '.ifczip'])
   * @param {Function} [options.onFile] - Callback (file, arrayBuffer) => void for each valid file
   * @param {Function} [options.onInvalid] - Callback (file) => void for invalid files
   * @returns {Object} The element for chaining
   */
  static makeFileDropZone(element, options = {}) {
    const dom = element.dom || element;

    const { accept = [], onFile, onInvalid } = options;

    dom.classList.add('DropZone');

    dom.addEventListener('dragover', (e) => {
      e.preventDefault();

      dom.classList.add('drag-over');
    });

    dom.addEventListener('dragleave', (e) => {
      e.preventDefault();

      dom.classList.remove('drag-over');
    });

    dom.addEventListener('drop', (e) => {
      e.preventDefault();

      dom.classList.remove('drag-over');

      const files = e.dataTransfer.files;

      for (const file of files) {
        const ext = '.' + file.name.split('.').pop().toLowerCase();

        const isValid = accept.length === 0 || accept.some(a => ext === a.toLowerCase());

        if (isValid && onFile) {
          const reader = new FileReader();

          reader.onload = () => onFile(file, reader.result);

          reader.readAsArrayBuffer(file);
        } else if (!isValid && onInvalid) {
          onInvalid(file);
        }
      }
    });

    return element;
  }
}

export { UIHelper };
