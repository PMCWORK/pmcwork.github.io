/**
 * Global Keyboard Typeahead Navigation for Dropdowns & Selects (HeroUI & ARIA)
 * 
 * Rules & Behavior:
 * 1. ONLY active when an actual dropdown / popover / select listbox is open.
 *    If no dropdown is open, keystrokes are ignored completely and NEVER touch the site UI (e.g. sidebar navigation).
 * 2. Pressing a letter key (e.g. 'c' or 'C') highlights and previews the matching option.
 * 3. Pressing the same letter key repeatedly cycles through ALL matching options in full sequence without getting stuck.
 * 4. Pressing ArrowDown / ArrowUp navigates through options sequentially.
 * 5. Pressing Enter or Space commits the active option and closes the dropdown.
 * 6. Responsive, smooth, and lightweight.
 */

let isInitialized = false;

/**
 * Detect if a HeroUI / ARIA dropdown or select is currently OPEN.
 * Returns null if no dropdown is open, ensuring site UI is NEVER hijacked.
 */
function getActiveOpenDropdown() {
  // Check if any trigger is open
  const activeTrigger =
    document.querySelector('[data-slot="trigger"][data-open="true"]') ||
    document.querySelector('[data-slot="trigger"][aria-expanded="true"]');

  // Find candidate listboxes strictly inside active popovers / dialog overlays
  const popovers = Array.from(
    document.querySelectorAll(
      '[data-slot="popover"], [data-overlay-container="true"] [role="listbox"], [data-slot="content"] [role="listbox"]'
    )
  ).filter((el) => {
    // Explicitly reject sidebar, main navigation rails, and persistent aside containers
    if (
      el.closest('aside') ||
      el.closest('nav') ||
      el.closest('[aria-label="Workspace Navigation"]') ||
      el.getAttribute('aria-label') === 'Workspace Navigation'
    ) {
      return false;
    }
    const style = window.getComputedStyle(el);
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      el.getBoundingClientRect().height > 0
    );
  });

  // If no trigger is open AND no active overlay popovers exist -> NO dropdown is open
  if (!activeTrigger && popovers.length === 0) {
    return null;
  }

  // Find interactive listbox container
  let container = null;
  for (let i = popovers.length - 1; i >= 0; i--) {
    const el = popovers[i];
    if (el.getAttribute('role') === 'listbox') {
      container = el;
      break;
    }
    const listbox = el.querySelector('[role="listbox"], [role="menu"]');
    if (listbox) {
      container = listbox;
      break;
    }
  }

  if (!container && activeTrigger) {
    const controlsId = activeTrigger.getAttribute('aria-controls');
    if (controlsId) {
      const target = document.getElementById(controlsId);
      if (target) {
        container = target.querySelector('[role="listbox"]') || target;
      }
    }
  }

  if (!container) return null;

  return { trigger: activeTrigger, container };
}

/**
 * Retrieve all selectable, non-disabled items in the listbox container
 */
function getSelectableItems(container) {
  return Array.from(
    container.querySelectorAll('[role="option"], [role="menuitem"], [data-slot="item"]')
  ).filter((item) => {
    if (
      item.getAttribute('aria-disabled') === 'true' ||
      item.hasAttribute('disabled') ||
      item.getAttribute('data-disabled') === 'true' ||
      item.getAttribute('role') === 'presentation' ||
      item.getAttribute('role') === 'separator' ||
      item.getAttribute('data-slot') === 'header'
    ) {
      return false;
    }
    const style = window.getComputedStyle(item);
    return style.display !== 'none' && style.visibility !== 'hidden';
  });
}

/**
 * Find the next matching item index for a search character.
 * Cycles through ALL matching options across the entire list.
 */
function findNextMatchingIndex(items, searchChar) {
  const matchingIndices = [];
  items.forEach((item, idx) => {
    const rawText = (
      item.getAttribute('textValue') ||
      item.getAttribute('data-label') ||
      item.getAttribute('data-key') ||
      item.getAttribute('aria-label') ||
      item.innerText ||
      item.textContent ||
      ''
    ).trim().toLowerCase();

    // Match starting letter of entire text or starting letter of any word
    const cleanText = rawText.replace(/^[^a-z0-9]+/i, '');
    const words = rawText.split(/\s+/);
    const matchesWord = words.some((w) => w.replace(/^[^a-z0-9]+/i, '').startsWith(searchChar));

    if (rawText.startsWith(searchChar) || cleanText.startsWith(searchChar) || matchesWord) {
      matchingIndices.push(idx);
    }
  });

  if (matchingIndices.length === 0) return -1;

  // Identify currently active item index in the list
  const currentActiveIdx = items.findIndex((item) =>
    item.getAttribute('data-typeahead-active') === 'true' ||
    item.getAttribute('data-hover') === 'true' ||
    item.getAttribute('data-focus') === 'true' ||
    item.getAttribute('data-focused') === 'true' ||
    item.getAttribute('data-selected') === 'true' ||
    item.getAttribute('aria-selected') === 'true'
  );

  // If currently on one of the matches, advance to next match in sequence
  const posInMatches = matchingIndices.indexOf(currentActiveIdx);
  if (posInMatches !== -1) {
    const nextPos = (posInMatches + 1) % matchingIndices.length;
    return matchingIndices[nextPos];
  }

  // If current item is between matches, pick first match that comes after it
  if (currentActiveIdx !== -1) {
    const after = matchingIndices.find((idx) => idx > currentActiveIdx);
    if (after !== undefined) return after;
  }

  // Default to the first match
  return matchingIndices[0];
}

/**
 * Apply active styling, visual preview, and scroll smoothly to target item
 */
function applyItemHighlight(targetItem, items, activeTrigger) {
  if (!targetItem) return;

  // Clear previous typeahead active state from siblings
  items.forEach((el) => {
    el.removeAttribute('data-typeahead-active');
    el.removeAttribute('data-hover');
    el.removeAttribute('data-focus');
    el.removeAttribute('data-focused');
    el.removeAttribute('data-focus-visible');
    el.classList.remove(
      'ring-2',
      'ring-primary/50',
      'bg-primary-50',
      'dark:bg-primary-900/30',
      'text-primary',
      'font-semibold'
    );
  });

  // Apply highlight to target
  targetItem.setAttribute('data-typeahead-active', 'true');
  targetItem.setAttribute('data-hover', 'true');
  targetItem.setAttribute('data-focus', 'true');
  targetItem.setAttribute('data-focused', 'true');
  targetItem.setAttribute('data-focus-visible', 'true');
  targetItem.classList.add(
    'ring-2',
    'ring-primary/50',
    'bg-primary-50',
    'dark:bg-primary-900/30',
    'text-primary',
    'font-semibold'
  );

  // Focus target item natively
  try {
    targetItem.focus({ preventScroll: true });
  } catch (_) {}

  // Update visual preview on trigger button if present
  if (activeTrigger) {
    const valueSpan = activeTrigger.querySelector('[data-slot="value"]');
    const itemText =
      targetItem.getAttribute('textValue') ||
      targetItem.getAttribute('data-label') ||
      targetItem.textContent?.trim();
    if (valueSpan && itemText) {
      valueSpan.textContent = itemText;
    }
  }

  // Scroll smoothly inside dropdown listbox
  targetItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

export function initDropdownTypeahead() {
  if (isInitialized || typeof window === 'undefined') return;
  isInitialized = true;

  // Clear typeahead highlights when moving mouse
  window.addEventListener(
    'mousemove',
    () => {
      const activeItems = document.querySelectorAll('[data-typeahead-active="true"]');
      activeItems.forEach((el) => {
        el.removeAttribute('data-typeahead-active');
        el.classList.remove(
          'ring-2',
          'ring-primary/50',
          'bg-primary-50',
          'dark:bg-primary-900/30'
        );
      });
    },
    { passive: true }
  );

  window.addEventListener(
    'keydown',
    (e) => {
      const key = e.key;
      const isArrowDown = key === 'ArrowDown';
      const isArrowUp = key === 'ArrowUp';
      const isEnterKey = key === 'Enter';
      const isSpaceKey = key === ' ' || key === 'Spacebar';
      const isCharKey = key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && key !== ' ';

      if (!isCharKey && !isEnterKey && !isSpaceKey && !isArrowDown && !isArrowUp) return;

      // 1. Ignore if typing in text inputs or textareas
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'TEXTAREA' ||
          (activeEl.tagName === 'INPUT' &&
            !activeEl.hasAttribute('aria-haspopup') &&
            activeEl.type !== 'button' &&
            activeEl.type !== 'checkbox' &&
            activeEl.type !== 'radio'))
      ) {
        return;
      }

      // 2. ONLY proceed if an actual dropdown is currently open
      const dropdown = getActiveOpenDropdown();
      if (!dropdown) {
        // Dropdown is not open -> DO NOTHING, never hijack site UI or sidebar
        return;
      }

      const { trigger: activeTrigger, container } = dropdown;
      const items = getSelectableItems(container);
      if (items.length === 0) return;

      // 3. Enter or Space commits selection and closes dropdown
      if (isEnterKey || (isSpaceKey && container.querySelector('[data-typeahead-active="true"]'))) {
        const highlighted = items.find(
          (el) =>
            el.getAttribute('data-typeahead-active') === 'true' ||
            el.getAttribute('data-focus') === 'true' ||
            el.getAttribute('data-focused') === 'true' ||
            el === document.activeElement
        );
        if (highlighted) {
          e.preventDefault();
          e.stopPropagation();
          highlighted.click();
        }
        return;
      }

      // 4. Arrow keys navigate through list
      if (isArrowDown || isArrowUp) {
        e.preventDefault();
        e.stopPropagation();

        const currentIndex = items.findIndex(
          (el) =>
            el.getAttribute('data-typeahead-active') === 'true' ||
            el.getAttribute('data-focus') === 'true' ||
            el.getAttribute('data-selected') === 'true' ||
            el.getAttribute('aria-selected') === 'true' ||
            el === document.activeElement
        );

        let nextIndex = 0;
        if (isArrowDown) {
          nextIndex = currentIndex >= 0 ? (currentIndex + 1) % items.length : 0;
        } else {
          nextIndex = currentIndex >= 0 ? (currentIndex - 1 + items.length) % items.length : items.length - 1;
        }

        applyItemHighlight(items[nextIndex], items, activeTrigger);
        return;
      }

      // 5. Letter Typeahead Cycling logic
      if (!isCharKey) return;

      const searchChar = key.toLowerCase();
      const nextMatchIndex = findNextMatchingIndex(items, searchChar);

      if (nextMatchIndex === -1) return;

      const targetItem = items[nextMatchIndex];
      if (!targetItem) return;

      e.preventDefault();
      e.stopPropagation();

      applyItemHighlight(targetItem, items, activeTrigger);
    },
    true // Capture phase to handle before bubbling
  );
}
