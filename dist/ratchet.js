/**
 * ==================================
 * Ratchet v1.0.0
 * Licensed under The MIT License
 * http://opensource.org/licenses/MIT
 * ==================================
 */

/* ----------------------------------
 * MODAL v1.0.0
 * Licensed under The MIT License
 * http://opensource.org/licenses/MIT
 * ---------------------------------- */

!function () {
  var findModals = function (target) {
    var i;
    var modals = document.querySelectorAll('a');
    for (; target && target !== document; target = target.parentNode) {
      for (i = modals.length; i--;) { if (modals[i] === target) return target; }
    }
  };

  var getModal = function (event) {
    var modalToggle = findModals(event.target);
    if (modalToggle && modalToggle.hash) return document.querySelector(modalToggle.hash);
  };

  window.addEventListener('touchend', function (event) {
    var modal = getModal(event);
    if (modal) modal.classList.toggle('active');
  });
}();/* ----------------------------------
 * POPOVER v1.0.0
 * Licensed under The MIT License
 * http://opensource.org/licenses/MIT
 * ---------------------------------- */

!function () {

  var popover;

  var findPopovers = function (target) {
    var i, popovers = document.querySelectorAll('a');
    for (; target && target !== document; target = target.parentNode) {
      for (i = popovers.length; i--;) { if (popovers[i] === target) return target; }
    }
  };

  var onPopoverHidden = function () {
    document.body.removeChild(backdrop);
    popover.style.display = 'none';
    popover.removeEventListener('webkitTransitionEnd', onPopoverHidden);
  }

  var backdrop = function () {
    var element = document.createElement('div');

    element.classList.add('backdrop');

    element.addEventListener('touchend', function () {
      popover.addEventListener('webkitTransitionEnd', onPopoverHidden);
      popover.classList.remove('visible');
    });

    return element;
  }();

  var getPopover = function (e) {
    var anchor = findPopovers(e.target);

    if (!anchor || !anchor.hash) return;

    popover = document.querySelector(anchor.hash);

    if (!popover || !popover.classList.contains('popover')) return;

    return popover;
  }

  window.addEventListener('touchend', function (e) {
    var popover = getPopover(e);

    if (!popover) return;

    popover.style.display = 'block';
    popover.offsetHeight;
    popover.classList.add('visible');

    popover.parentNode.appendChild(backdrop);
  });

  window.addEventListener('click', function (e) { if (getPopover(e)) e.preventDefault(); });

}();
/* ----------------------------------
 * PUSH v1.0.0
 * Licensed under The MIT License
 * inspired by chris's jquery.pjax.js
 * http://opensource.org/licenses/MIT
 * ---------------------------------- */

!function () {

  var noop = function () {};


  // Pushstate cacheing
  // ==================

  var isScrolling;
  var maxCacheLength = 20;
  var cacheMapping   = sessionStorage;
  var domCache       = {};
  var transitionMap  = {
    'slide-in'  : 'slide-out',
    'slide-out' : 'slide-in',
    'fade'      : 'fade'
  };
  var bars = {
    bartab             : '.bar-tab',
    bartitle           : '.bar-title',
    barfooter          : '.bar-footer'
  }

  var cacheReplace = function (data, updates) {
    PUSH.id = data.id;
    if (updates) data = getCached(data.id);
    cacheMapping[data.id] = JSON.stringify(data);
    window.history.replaceState(data.id, data.title, data.url);
    domCache[data.id] = document.body.cloneNode(true);
  };

  var cachePush = function () {
    var id = PUSH.id;

    var cacheForwardStack = JSON.parse(cacheMapping.cacheForwardStack || '[]');
    var cacheBackStack    = JSON.parse(cacheMapping.cacheBackStack    || '[]');

    cacheBackStack.push(id);

    while (cacheForwardStack.length)               delete cacheMapping[cacheForwardStack.shift()];
    while (cacheBackStack.length > maxCacheLength) delete cacheMapping[cacheBackStack.shift()];

    window.history.pushState(null, '', cacheMapping[PUSH.id].url);

    cacheMapping.cacheForwardStack = JSON.stringify(cacheForwardStack);
    cacheMapping.cacheBackStack    = JSON.stringify(cacheBackStack);
  };

  var cachePop = function (id, direction) {
    var forward           = direction == 'forward';
    var cacheForwardStack = JSON.parse(cacheMapping.cacheForwardStack || '[]');
    var cacheBackStack    = JSON.parse(cacheMapping.cacheBackStack    || '[]');
    var pushStack         = forward ? cacheBackStack    : cacheForwardStack;
    var popStack          = forward ? cacheForwardStack : cacheBackStack;

    if (PUSH.id) pushStack.push(PUSH.id);
    popStack.pop();

    cacheMapping.cacheForwardStack = JSON.stringify(cacheForwardStack);
    cacheMapping.cacheBackStack    = JSON.stringify(cacheBackStack);
  };

  var getCached = function (id) {
    return JSON.parse(cacheMapping[id] || null) || {};
  };

  var getTarget = function (e) {
    var target = findTarget(e.target);

    if (
      !  target
      || e.which > 1
      || e.metaKey
      || e.ctrlKey
      || isScrolling
      || location.protocol !== target.protocol
      || location.host     !== target.host
      || !target.hash && /#/.test(target.href)
      || target.hash && target.href.replace(target.hash, '') === location.href.replace(location.hash, '')
      || target.getAttribute('data-ignore') == 'push'
    ) return;

    return target;
  };


  // Main event handlers (touchend, popstate)
  // ==========================================

  var touchend = function (e) {
    var target = getTarget(e);

    if (!target) return;

    e.preventDefault();

    PUSH({
      url        : target.href,
      hash       : target.hash,
      timeout    : target.getAttribute('data-timeout'),
      transition : target.getAttribute('data-transition')
    });
  };

  var popstate = function (e) {
    var key;
    var barElement;
    var activeObj;
    var activeDom;
    var direction;
    var transition;
    var transitionFrom;
    var transitionFromObj;
    var id = e.state;

    if (!id || !cacheMapping[id]) return;

    direction = PUSH.id < id ? 'forward' : 'back';

    cachePop(id, direction);

    activeObj = getCached(id);
    activeDom = domCache[id];

    if (activeObj.title) document.title = activeObj.title;

    if (direction == 'back') {
      transitionFrom    = JSON.parse(direction == 'back' ? cacheMapping.cacheForwardStack : cacheMapping.cacheBackStack);
      transitionFromObj = getCached(transitionFrom[transitionFrom.length - 1]);
    } else {
      transitionFromObj = activeObj;
    }

    if (direction == 'back' && !transitionFromObj.id) return PUSH.id = id;

    transition = direction == 'back' ? transitionMap[transitionFromObj.transition] : transitionFromObj.transition;

    if (!activeDom) {
      return PUSH({
        id         : activeObj.id,
        url        : activeObj.url,
        title      : activeObj.title,
        timeout    : activeObj.timeout,
        transition : transition,
        ignorePush : true
      });
    }

    if (transitionFromObj.transition) {
      activeObj = extendWithDom(activeObj, '.content', activeDom.cloneNode(true));
      for (key in bars) {
        barElement = document.querySelector(bars[key])
        if (activeObj[key]) swapContent(activeObj[key], barElement);
        else if (barElement) barElement.parentNode.removeChild(barElement);
      }
    }

    swapContent(
      (activeObj.contents || activeDom).cloneNode(true),
      document.querySelector('.content'),
      transition
    );

    PUSH.id = id;

    document.body.offsetHeight; // force reflow to prevent scroll
  };


  // Core PUSH functionality
  // =======================

  var PUSH = function (options) {
    var key;
    var data = {};
    var xhr  = PUSH.xhr;

    options.container = options.container || options.transition ? document.querySelector('.content') : document.body;

    for (key in bars) {
      options[key] = options[key] || document.querySelector(bars[key]);
    }

    if (xhr && xhr.readyState < 4) {
      xhr.onreadystatechange = noop;
      xhr.abort()
    }

    xhr = new XMLHttpRequest();
    xhr.open('GET', options.url, true);
    xhr.setRequestHeader('X-PUSH', 'true');

    xhr.onreadystatechange = function () {
      if (options._timeout) clearTimeout(options._timeout);
      if (xhr.readyState == 4) xhr.status == 200 ? success(xhr, options) : failure(options.url);
    };

    if (!PUSH.id) {
      cacheReplace({
        id         : +new Date,
        url        : window.location.href,
        title      : document.title,
        timeout    : options.timeout,
        transition : null
      });
    }

    if (options.timeout) {
      options._timeout = setTimeout(function () {  xhr.abort('timeout'); }, options.timeout);
    }

    xhr.send();

    if (xhr.readyState && !options.ignorePush) cachePush();
  };


  // Main XHR handlers
  // =================

  var success = function (xhr, options) {
    var key;
    var barElement;
    var data = parseXHR(xhr, options);

    if (!data.contents) return locationReplace(options.url);

    if (data.title) document.title = data.title;

    if (options.transition) {
      for (key in bars) {
        barElement = document.querySelector(bars[key])
        if (data[key]) swapContent(data[key], barElement);
        else if (barElement) barElement.parentNode.removeChild(barElement);
      }
    }

    swapContent(data.contents, options.container, options.transition, function () {
      cacheReplace({
        id         : options.id || +new Date,
        url        : data.url,
        title      : data.title,
        timeout    : options.timeout,
        transition : options.transition
      }, options.id);
      triggerStateChange();
    });

    if (!options.ignorePush && window._gaq) _gaq.push(['_trackPageview']) // google analytics
    if (!options.hash) return;
  };

  var failure = function (url) {
    throw new Error('Could not get: ' + url)
  };


  // PUSH helpers
  // ============

  var swapContent = function (swap, container, transition, complete) {
    var enter;
    var containerDirection;
    var swapDirection;

    if (!transition) {
      if (container) container.innerHTML = swap.innerHTML;
      else if (swap.classList.contains('content')) document.body.appendChild(swap);
      else document.body.insertBefore(swap, document.querySelector('.content'));
    } else {
      enter  = /in$/.test(transition);

      if (transition == 'fade') {
        container.classList.add('in');
        container.classList.add('fade');
        swap.classList.add('fade');
      }

      if (/slide/.test(transition)) {
        swap.classList.add(enter ? 'right' : 'left');
        swap.classList.add('slide');
        container.classList.add('slide');
      }

      container.parentNode.insertBefore(swap, container);
    }

    if (!transition) complete && complete();

    if (transition == 'fade') {
      container.offsetWidth; // force reflow
      container.classList.remove('in');
      container.addEventListener('webkitTransitionEnd', fadeContainerEnd);

      function fadeContainerEnd() {
        container.removeEventListener('webkitTransitionEnd', fadeContainerEnd);
        swap.classList.add('in');
        swap.addEventListener('webkitTransitionEnd', fadeSwapEnd);
      }
      function fadeSwapEnd () {
        swap.removeEventListener('webkitTransitionEnd', fadeSwapEnd);
        container.parentNode.removeChild(container);
        swap.classList.remove('fade');
        swap.classList.remove('in');
        complete && complete();
      }
    }

    if (/slide/.test(transition)) {
      container.offsetWidth; // force reflow
      swapDirection      = enter ? 'right' : 'left'
      containerDirection = enter ? 'left' : 'right'
      container.classList.add(containerDirection);
      swap.classList.remove(swapDirection);
      swap.addEventListener('webkitTransitionEnd', slideEnd);

      function slideEnd() {
        swap.removeEventListener('webkitTransitionEnd', slideEnd);
        swap.classList.remove('slide');
        swap.classList.remove(swapDirection);
        container.parentNode.removeChild(container);
        complete && complete();
      }
    }
  };

  var triggerStateChange = function () {
    var e = new CustomEvent('push', {
      detail: { state: getCached(PUSH.id) },
      bubbles: true,
      cancelable: true
    });

    window.dispatchEvent(e);
  };

  var findTarget = function (target) {
    var i, toggles = document.querySelectorAll('a');
    for (; target && target !== document; target = target.parentNode) {
      for (i = toggles.length; i--;) { if (toggles[i] === target) return target; }
    }
  };

  var locationReplace = function (url) {
    window.history.replaceState(null, '', '#');
    window.location.replace(url);
  };

  var parseURL = function (url) {
    var a = document.createElement('a'); a.href = url; return a;
  };

  var extendWithDom = function (obj, fragment, dom) {
    var i;
    var result    = {};

    for (i in obj) result[i] = obj[i];

    Object.keys(bars).forEach(function (key) {
      var el = dom.querySelector(bars[key]);
      if (el) el.parentNode.removeChild(el);
      result[key] = el;
    });

    result.contents = dom.querySelector(fragment);

    return result;
  };

  var parseXHR = function (xhr, options) {
    var head;
    var body;
    var data = {};
    var responseText = xhr.responseText;

    data.url = options.url;

    if (!responseText) return data;

    if (/<html/i.test(responseText)) {
      head           = document.createElement('div');
      body           = document.createElement('div');
      head.innerHTML = responseText.match(/<head[^>]*>([\s\S.]*)<\/head>/i)[0]
      body.innerHTML = responseText.match(/<body[^>]*>([\s\S.]*)<\/body>/i)[0]
    } else {
      head           = body = document.createElement('div');
      head.innerHTML = responseText;
    }

    data.title = head.querySelector('title');
    data.title = data.title && data.title.innerText.trim();

    if (options.transition) data = extendWithDom(data, '.content', body);
    else data.contents = body;

    return data;
  };


  // Attach PUSH event handlers
  // ==========================

  window.addEventListener('touchstart', function () { isScrolling = false; });
  window.addEventListener('touchmove', function () { isScrolling = true; })
  window.addEventListener('touchend', touchend);
  window.addEventListener('click', function (e) { if (getTarget(e)) e.preventDefault(); });
  window.addEventListener('popstate', popstate);

}();/* ----------------------------------
 * TABS v1.0.0
 * Licensed under The MIT License
 * http://opensource.org/licenses/MIT
 * ---------------------------------- */

!function () {
  var getTarget = function (target) {
    var i, popovers = document.querySelectorAll('.segmented-controller li a');
    for (; target && target !== document; target = target.parentNode) {
      for (i = popovers.length; i--;) { if (popovers[i] === target) return target; }
    }
  };

  window.addEventListener("touchend", function (e) {
    var activeTab;
    var activeBody;
    var targetBody;
    var targetTab;
    var className     = 'active';
    var classSelector = '.' + className;
    var targetAnchor  = getTarget(e.target);

    if (!targetAnchor) return;

    targetTab = targetAnchor.parentNode;
    activeTab = targetTab.parentNode.querySelector(classSelector);

    if (activeTab) activeTab.classList.remove(className);

    targetTab.classList.add(className);

    if (!targetAnchor.hash) return;

    targetBody = document.querySelector(targetAnchor.hash);

    if (!targetBody) return;

    activeBody = targetBody.parentNode.querySelector(classSelector);

    if (activeBody) activeBody.classList.remove(className);

    targetBody.classList.add(className)
  });

  window.addEventListener('click', function (e) { if (getTarget(e.target)) e.preventDefault(); });
}();/* ----------------------------------
 * SLIDER v1.0.0
 * Licensed under The MIT License
 * Adapted from Brad Birdsall's swipe
 * http://opensource.org/licenses/MIT
 * ---------------------------------- */

!function () {

  var pageX;
  var pageY;
  var slider;
  var deltaX;
  var deltaY;
  var offsetX;
  var lastSlide;
  var startTime;
  var resistance;
  var sliderWidth;
  var slideNumber;
  var isScrolling;
  var scrollableArea;

  var getSlider = function (target) {
    var i, sliders = document.querySelectorAll('.slider ul');
    for (; target && target !== document; target = target.parentNode) {
      for (i = sliders.length; i--;) { if (sliders[i] === target) return target; }
    }
  }

  var getScroll = function () {
    var translate3d = slider.style.webkitTransform.match(/translate3d\(([^,]*)/);
    return parseInt(translate3d ? translate3d[1] : 0)
  };

  var setSlideNumber = function (offset) {
    var round = offset ? (deltaX < 0 ? 'ceil' : 'floor') : 'round';
    slideNumber = Math[round](getScroll() / ( scrollableArea / slider.children.length) );
    slideNumber += offset;
    slideNumber = Math.min(slideNumber, 0);
    slideNumber = Math.max(-(slider.children.length - 1), slideNumber);
  }

  var onTouchStart = function (e) {
    slider = getSlider(e.target);

    if (!slider) return;

    var firstItem  = slider.querySelector('li');

    scrollableArea = firstItem.offsetWidth * slider.children.length;
    isScrolling    = undefined;
    sliderWidth    = slider.offsetWidth;
    resistance     = 1;
    lastSlide      = -(slider.children.length - 1);
    startTime      = +new Date;
    pageX          = e.touches[0].pageX;
    pageY          = e.touches[0].pageY;

    setSlideNumber(0);

    slider.style['-webkit-transition-duration'] = 0;
  };

  var onTouchMove = function (e) {
    if (e.touches.length > 1 || !slider) return; // Exit if a pinch || no slider

    deltaX = e.touches[0].pageX - pageX;
    deltaY = e.touches[0].pageY - pageY;
    pageX  = e.touches[0].pageX;
    pageY  = e.touches[0].pageY;

    if (typeof isScrolling == 'undefined') {
      isScrolling = Math.abs(deltaY) > Math.abs(deltaX);
    }

    if (isScrolling) return;

    offsetX = (deltaX / resistance) + getScroll();

    e.preventDefault();

    resistance = slideNumber == 0         && deltaX > 0 ? (pageX / sliderWidth) + 1.25 :
                 slideNumber == lastSlide && deltaX < 0 ? (Math.abs(pageX) / sliderWidth) + 1.25 : 1;

    slider.style.webkitTransform = 'translate3d(' + offsetX + 'px,0,0)';
  };

  var onTouchEnd = function (e) {
    if (!slider || isScrolling) return;

    setSlideNumber(
      (+new Date) - startTime < 1000 && Math.abs(deltaX) > 15 ? (deltaX < 0 ? -1 : 1) : 0
    );

    offsetX = slideNumber * sliderWidth;

    slider.style['-webkit-transition-duration'] = '.2s';
    slider.style.webkitTransform = 'translate3d(' + offsetX + 'px,0,0)';

    e = new CustomEvent('slide', {
      detail: { slideNumber: Math.abs(slideNumber) },
      bubbles: true,
      cancelable: true
    });

    slider.parentNode.dispatchEvent(e);
  };

  window.addEventListener('touchstart', onTouchStart);
  window.addEventListener('touchmove', onTouchMove);
  window.addEventListener('touchend', onTouchEnd);

}();
/* ----------------------------------
 * TOGGLE v1.0.0
 * Licensed under The MIT License
 * http://opensource.org/licenses/MIT
 * ---------------------------------- */

!function () {

  var start     = {};
  var touchMove = false;
  var distanceX = false;
  var toggle    = false;

  var findToggle = function (target) {
    var i, toggles = document.querySelectorAll('.toggle');
    for (; target && target !== document; target = target.parentNode) {
      for (i = toggles.length; i--;) { if (toggles[i] === target) return target; }
    }
  }

  window.addEventListener('touchstart', function (e) {
    e = e.originalEvent || e;

    toggle = findToggle(e.target);

    if (!toggle) return;

    var handle      = toggle.querySelector('.toggle-handle');
    var toggleWidth = toggle.offsetWidth;
    var handleWidth = handle.offsetWidth;
    var offset      = toggle.classList.contains('active') ? toggleWidth - handleWidth : 0;

    start     = { pageX : e.touches[0].pageX - offset, pageY : e.touches[0].pageY };
    touchMove = false;

    // todo: probably should be moved to the css
    toggle.style['-webkit-transition-duration'] = 0;
  });

  window.addEventListener('touchmove', function (e) {
    e = e.originalEvent || e;

    if (e.touches.length > 1) return; // Exit if a pinch

    if (!toggle) return;

    var handle      = toggle.querySelector('.toggle-handle');
    var current     = e.touches[0];
    var toggleWidth = toggle.offsetWidth;
    var handleWidth = handle.offsetWidth;
    var offset      = toggleWidth - handleWidth;

    touchMove = true;
    distanceX = current.pageX - start.pageX;

    if (Math.abs(distanceX) < Math.abs(current.pageY - start.pageY)) return;

    e.preventDefault();

    if (distanceX < 0)      return handle.style.webkitTransform = 'translate3d(0,0,0)';
    if (distanceX > offset) return handle.style.webkitTransform = 'translate3d(' + offset + 'px,0,0)';

    handle.style.webkitTransform = 'translate3d(' + distanceX + 'px,0,0)';

    toggle.classList[(distanceX > (toggleWidth/2 - handleWidth/2)) ? 'add' : 'remove']('active');
  });

  window.addEventListener('touchend', function (e) {
    if (!toggle) return;

    var handle      = toggle.querySelector('.toggle-handle');
    var toggleWidth = toggle.offsetWidth;
    var handleWidth = handle.offsetWidth;
    var offset      = toggleWidth - handleWidth;
    var slideOn     = (!touchMove && !toggle.classList.contains('active')) || (touchMove && (distanceX > (toggleWidth/2 - handleWidth/2)));

    if (slideOn) handle.style.webkitTransform = 'translate3d(' + offset + 'px,0,0)';
    else handle.style.webkitTransform = 'translate3d(0,0,0)';

    toggle.classList[slideOn ? 'add' : 'remove']('active');

    e = new CustomEvent('toggle', {
      detail: { isActive: slideOn },
      bubbles: true,
      cancelable: true
    });

    toggle.dispatchEvent(e);

    touchMove = false;
    toggle    = false;
  });

}();

/* ----------------------------------
 * PullToRefresh v0.004
 * By Simon Waldherr
 * https://github.com/SimonWaldherr/PullToRefresh
 * Licensed under The MIT License
 * http://opensource.org/licenses/MIT
 * ---------------------------------- */

var ptr_scrollable_parent = false;

function ptr_init() {
  "use strict";
  var  ptr_box, ptr_container, ptr_image, ptr_text, i = 0, scrollables = document.getElementsByClassName('scrollable');
  if ((window.hasOwnProperty('ontouchstart')) || (window.navigator.msPointerEnabled)) {
    document.getElementsByTagName('body')[0].className += ' touch';
  } else {
    document.getElementsByTagName('body')[0].className += ' notouch';
  }

  for (i = 0; i < scrollables.length; i += 1) {
    if (scrollables[i].hasAttribute('data-url') !== false) {
      ptr_box = document.createElement('div');
      ptr_container = document.createElement('div');
      ptr_image = document.createElement('div');
      ptr_text = document.createElement('div');

      ptr_box.appendChild(ptr_container);
      ptr_container.appendChild(ptr_image);
      ptr_container.appendChild(ptr_text);
      ptr_text.innerHTML = 'Pull to refresh';

      ptr_box.className = 'ptr_box';
      ptr_container.className = 'ptr_container';
      ptr_image.className = 'ptr_image';
      ptr_text.className = 'ptr_text';

      scrollables[i].firstElementChild.insertBefore(ptr_box, scrollables[i].firstElementChild.firstChild);
    }
  }

  document.addEventListener('touchstart', function (e) {
    var ptr_box, ptr_container, ptr_image, ptr_text, parent = e.target, i = 0;

    if (parent.className === undefined) {
      return false;
    }

    for (i = 0; i < 10; i += 1) {
      if (parent.className !== undefined) {

        if (parent.className.match('scrollable')) {

          ptr_scrollable_parent = i;
          i = 10;

          if (parent.hasAttribute('data-url') !== false) {
            if (parent.getElementsByClassName('ptr_box')[0] === undefined) {
              ptr_box = document.createElement('div');
              ptr_container = document.createElement('div');
              ptr_image = document.createElement('div');
              ptr_text = document.createElement('div');

              ptr_box.appendChild(ptr_container);
              ptr_container.appendChild(ptr_image);
              ptr_container.appendChild(ptr_text);
              ptr_text.innerHTML = 'Pull to refresh';

              ptr_box.className = 'ptr_box';
              ptr_container.className = 'ptr_container';
              ptr_image.className = 'ptr_image';
              ptr_text.className = 'ptr_text';

              parent.firstElementChild.insertBefore(ptr_box, parent.firstElementChild.firstChild);
            }
          } else if (parent.getElementsByClassName('ptr_box')[0] !== undefined) {
            parent.removeChild(parent.getElementsByClassName('ptr_box')[0]);
          }

          if (parent.scrollTop === 0) {
            parent.scrollTop = 1;
          } else if ((parent.scrollTop + parent.offsetHeight) === parent.scrollHeight) {
            parent.scrollTop = parent.scrollTop - 1;
          }
        }
      }

      if ((parent.parentNode.tagName === undefined)) {
        i = 10;
        return false;
      }
      if ((parent.parentNode.tagName === 'BODY') || (parent.parentNode.tagName === 'HTML')) {
        i = 10;
        return false;
      }

      parent = parent.parentNode;
    }
  });

  document.addEventListener('touchmove', function (e) {
    var parent = e.target, scroll = false, rotate = 90, i = 0, ptr_element, ptr_wrapelement, top, ptr, scrolldistance, ptr_eleId, time, ptrbox, insert, inserted;
    if (ptr_scrollable_parent === false) {
      e.preventDefault();
      return false;
    }

    for (i = 0; i < ptr_scrollable_parent; i += 1) {
      parent = parent.parentNode;
    }

    if ((ptr_scrollable_parent !== false) && (parent.hasAttribute('data-url') !== false)) {

      scroll = true;

      ptr_element = parent;
      ptr_wrapelement = ptr_element.getElementsByClassName('wrap')[0];
      top = ptr_element.scrollTop;
      ptr = ptr_element.getElementsByClassName('ptr_box')[0];
      scrolldistance = Math.abs(parseInt(ptr_element.scrollTop, 10));

      if ((ptr_wrapelement.className.indexOf(' active') === -1) && (!ptr_wrapelement.getElementsByClassName('ptr_image')[0].className.match('loading')) && (ptr_element.scrollTop < 1)) {
        if (ptr_element.scrollTop < -25) {
          rotate = (top < -40) ? -90 : 130 + (top * 12 + 270);
        }

        if (ptr_element.scrollTop < 0) {
          ptr.style.height = (scrolldistance < 55) ? scrolldistance + 'px' : '55px';
          ptr.style.top = (scrolldistance < 55) ? '-' + scrolldistance + 'px' : '-55px';

          ptr_wrapelement.getElementsByClassName('ptr_image')[0].style['-webkit-transform'] = "scale(1) rotate(" + rotate + "deg)";
        }

        if (ptr_element.scrollTop < -51) {
          if (ptr_wrapelement.className.indexOf(' active') === -1) {
            ptr_wrapelement.className += ' active';
            ptr_wrapelement.getElementsByClassName('ptr_text')[0].innerHTML = 'Loading ...';
            ptr_wrapelement.getElementsByClassName('ptr_image')[0].className += ' loading';

            if (parent.getAttribute('data-url') === 'reload') {
              window.location.reload(true);
              return false;
            }

            ptr_element = parent;
            ptr_wrapelement = ptr_element.getElementsByClassName('wrap')[0];
            ptr_eleId = parent.id;
            time = new Date();

            reqwest({
              url: parent.getAttribute('data-url') + '?rt=' + time.getTime(),
              type: 'html',
              method: 'post',
              data: {
                usertime: time.getTime()
              },
              error: function () {
                alert('Could not connect');
                ptr_wrapelement.style.top = '0px';
                ptr.getElementsByClassName('ptr_image')[0].className = ptr.getElementsByClassName('ptr_image')[0].className.replace(' loading', '');
                ptr_wrapelement.className = ptr_wrapelement.className.replace(' active', '');
              },
              success: function (resp) {
                ptrbox = document.getElementById(ptr_eleId).getElementsByClassName('ptr_box')[0];
                insert = document.createElement('div');
                insert.innerHTML = resp;
                insert.className = 'inserted';

                ptr_wrapelement.insertBefore(insert, ptrbox.nextSibling);
                ptr_wrapelement.style.top = '0px';
                ptr.getElementsByClassName('ptr_image')[0].className = ptr.getElementsByClassName('ptr_image')[0].className.replace(' loading', '');
                ptr_wrapelement.className = ptr_wrapelement.className.replace(' active', '');
                inserted = document.getElementsByClassName('inserted')[0];
                ptr_element.scrollTop = inserted.clientHeight - 51;
                ptr_wrapelement.getElementsByClassName('ptr_text')[0].innerHTML = '';
                ptr.style.opacity = 0.0;

                ptr_wrapelement.getElementsByClassName('ptr_image')[0].className = ptr_wrapelement.getElementsByClassName('ptr_image')[0].className.replace(' loading', '');
                ptr_wrapelement.style.top = '0px';

                ptr_scrollable_parent = false;
              }
            });
          }
        } else if (ptr_element.scrollTop !== 0) {
          ptr_wrapelement.className = ptr_wrapelement.className.replace(' active', '');
          ptr_wrapelement.getElementsByClassName('ptr_text')[0].innerHTML = 'Pull to refresh';
        }
      }
    } else if ((ptr_scrollable_parent !== false)) {
      scroll = true;
    }

    if (scroll === false) {
      e.preventDefault();
    }
  });

  document.addEventListener('touchend', function (e) {
    var parent = e.target, i = 0, ptr_element, ptr_wrapelement, ptr_eleId, top, ptr;

    for (i = 0; i < ptr_scrollable_parent; i += 1) {
      parent = parent.parentNode;
    }

    if ((parent.hasAttribute('data-url') !== false) && (ptr_scrollable_parent !== false)) {
      if ((parent.hasAttribute('data-url') !== false)) {
        ptr_element = parent;
        ptr_wrapelement = ptr_element.getElementsByClassName('wrap')[0];
        ptr_eleId = parent.id;
        top = ptr_element.scrollTop;
        ptr = ptr_element.getElementsByClassName('ptr_box')[0];

        if (ptr_wrapelement.getElementsByClassName('ptr_image')[0].className.match('loading')) {
          ptr_wrapelement.className = ptr_wrapelement.className.replace(' active', '');
          ptr_wrapelement.style.top = '51px';
        } else {
          ptr.style.height = '0px';
          ptr.style.top = '0px';
        }
      }
    }
    ptr_scrollable_parent = false;
  });
}
window.onload = function() {
  ptr_init();
}
