/**
 * Hand2World Project Page - Main JavaScript
 * Interactive controls and optimizations
 */

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {
    initLazyVideoLoading();
    initSingleMethodSelectors();
    initDualMethodSelectors();
    initInlineSliders();
    initDatasetSliders();
    initSyncPlayButtons();
    initDatasetTabs();
    initSmoothScrolling();
    initNavigationHighlight();
    initVideoPlayControls();
});

/**
 * Lazy video loading using Intersection Observer
 * Videos are loaded only when they're about to enter the viewport
 */
function initLazyVideoLoading() {
    const videoObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const video = entry.target;
                const source = video.querySelector('source');

                // Load video source from data-src attribute
                if (video.dataset.src && !source.src) {
                    source.src = video.dataset.src;
                    video.load();
                    console.log(`Loaded video: ${video.dataset.src}`);
                }

                // Unobserve once loaded
                videoObserver.unobserve(video);
            }
        });
    }, {
        // Start loading 200px before the video enters viewport
        rootMargin: '200px'
    });

    // Observe all lazy videos
    const lazyVideos = document.querySelectorAll('.lazy-video');
    lazyVideos.forEach(video => {
        videoObserver.observe(video);
    });

    console.log(`Lazy loading initialized for ${lazyVideos.length} videos`);
}

/**
 * Single method selector for dataset reconstruction comparisons
 * Select ONE method to compare against Ground Truth
 */
function initSingleMethodSelectors() {
    document.querySelectorAll('.method-btn-single').forEach(button => {
        button.addEventListener('click', function() {
            const example = this.dataset.example;
            const method = this.dataset.method;
            const label = this.dataset.label;

            // If already active, do nothing
            if (this.classList.contains('active')) {
                return;
            }

            // Deactivate all buttons for this example
            document.querySelectorAll(`.method-btn-single[data-example="${example}"]`).forEach(btn => {
                btn.classList.remove('active');
            });

            // Activate clicked button
            this.classList.add('active');

            // Update the dataset comparison
            updateDatasetComparison(example, method, label);

            console.log(`Dataset example ${example}: selected ${method}`);
        });
    });

    console.log('Single method selectors initialized');
}

/**
 * Update dataset comparison when method selection changes
 */
function updateDatasetComparison(example, method, label) {
    const grid = document.getElementById(`${example}-grid`);
    if (!grid) return;

    const container = grid.querySelector('.inline-video-compare-single');
    if (!container) return;

    const videoUrls = JSON.parse(container.dataset.videos);
    const labelMap = JSON.parse(container.dataset.labels);

    // Update method video in middle column
    const methodVideo = grid.querySelector('.method-video');
    const methodLabel = grid.querySelector('.method-video-label');

    if (methodVideo && videoUrls[method]) {
        const source = methodVideo.querySelector('source');
        const newSrc = videoUrls[method];

        // Get current playback state
        let currentTime = methodVideo.currentTime || 0;
        let wasPlaying = !methodVideo.paused;

        // Update video source
        methodVideo.dataset.src = newSrc;
        source.src = newSrc;
        methodVideo.load();

        methodVideo.addEventListener('loadeddata', function onLoad() {
            methodVideo.currentTime = currentTime;
            if (wasPlaying) methodVideo.play().catch(() => {});
            methodVideo.removeEventListener('loadeddata', onLoad);
        });
    }

    if (methodLabel) {
        methodLabel.textContent = labelMap[method] || label;
    }

    // Update comparison slider left video
    const leftVideo = container.querySelector('.compare-left video');
    const leftLabel = container.querySelector('.hover-label-left');

    if (leftVideo && videoUrls[method]) {
        const source = leftVideo.querySelector('source');
        const newSrc = videoUrls[method];

        // Get current playback state from sibling videos
        const refVideos = grid.querySelectorAll('.sync-video');
        let currentTime = 0;
        let wasPlaying = false;
        for (const v of refVideos) {
            if (v !== leftVideo && v.duration) {
                currentTime = v.currentTime;
                wasPlaying = !v.paused;
                break;
            }
        }

        // Update video source
        leftVideo.dataset.src = newSrc;
        source.src = newSrc;
        leftVideo.load();

        leftVideo.addEventListener('loadeddata', function onLoad() {
            leftVideo.currentTime = currentTime;
            if (wasPlaying) leftVideo.play().catch(() => {});
            leftVideo.removeEventListener('loadeddata', onLoad);
        });
    }

    if (leftLabel) {
        leftLabel.textContent = labelMap[method] || label;
    }
}

/**
 * Initialize dataset comparison sliders
 */
function initDatasetSliders() {
    document.querySelectorAll('.inline-video-compare-single').forEach(container => {
        const slider = container.querySelector('.compare-slider');
        const handle = container.querySelector('.compare-handle');
        const rightSide = container.querySelector('.compare-right');
        const leftVideo = container.querySelector('.compare-left video');
        const rightVideo = container.querySelector('.compare-right video');

        let isDragging = false;

        let rafId = null;
        let containerRect = null;

        function updatePosition(percentage) {
            rightSide.style.clipPath = `inset(0 0 0 ${percentage}%)`;
            slider.style.left = `${percentage}%`;
        }

        function startDrag(e) {
            e.preventDefault();
            e.stopPropagation();
            isDragging = true;
            slider.classList.add('dragging');
            // Cache rect once at drag start
            containerRect = container.getBoundingClientRect();
        }

        function drag(e) {
            if (!isDragging) return;
            e.preventDefault();

            // Cancel previous animation frame if still pending
            if (rafId) {
                cancelAnimationFrame(rafId);
            }

            // Throttle updates using requestAnimationFrame (60fps max)
            rafId = requestAnimationFrame(() => {
                const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
                const x = clientX - containerRect.left;
                const percentage = Math.max(2, Math.min(98, (x / containerRect.width) * 100));
                updatePosition(percentage);
            });
        }

        function stopDrag() {
            isDragging = false;
            slider.classList.remove('dragging');
            // Clean up pending animation frame
            if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
            containerRect = null;
        }

        // Mouse events
        slider.addEventListener('mousedown', startDrag);
        handle.addEventListener('mousedown', startDrag);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', stopDrag);

        // Touch events
        slider.addEventListener('touchstart', startDrag, { passive: false });
        handle.addEventListener('touchstart', startDrag, { passive: false });
        document.addEventListener('touchmove', drag, { passive: false });
        document.addEventListener('touchend', stopDrag);

        // Sync right video time to left video (tight threshold + loop handling)
        leftVideo.addEventListener('timeupdate', () => {
            const drift = rightVideo.currentTime - leftVideo.currentTime;
            const duration = leftVideo.duration || 1;
            // Handle loop boundary (one looped, other didn't)
            if (Math.abs(drift) > duration * 0.5) {
                rightVideo.currentTime = leftVideo.currentTime;
            } else if (Math.abs(drift) > 0.05) {
                rightVideo.currentTime = leftVideo.currentTime;
            }
        });

        // Click on container to play/pause (but not when dragging slider)
        container.addEventListener('click', (e) => {
            if (e.target === slider || e.target === handle) return;
            if (leftVideo.paused) {
                rightVideo.currentTime = leftVideo.currentTime;
                leftVideo.play().catch(() => {});
                rightVideo.play().catch(() => {});
            } else {
                leftVideo.pause();
                rightVideo.pause();
            }
        });

        // Initialize at 50%
        updatePosition(50);
    });

    console.log('Dataset comparison sliders initialized');
}

/**
 * Dual method selector: select exactly 2 methods for inline slider comparison
 */
function initDualMethodSelectors() {
    // Track selection order per example: {exampleId: [oldestMethod, newestMethod]}
    const selections = {};

    // Initialize from active buttons
    document.querySelectorAll('.method-selector-dual').forEach(selector => {
        const example = selector.dataset.example;
        const activeButtons = selector.querySelectorAll('.method-btn-dual.active');
        selections[example] = Array.from(activeButtons).map(btn => btn.dataset.method);

        // Apply initial sorting on page load
        if (selections[example].length === 2) {
            updateInlineSlider(example, selections[example]);
        }
    });

    // Button click handler
    document.querySelectorAll('.method-btn-dual').forEach(button => {
        button.addEventListener('click', function() {
            const example = this.dataset.example;
            const method = this.dataset.method;
            const currentSelections = selections[example];

            // Already selected - do nothing (must always have 2)
            if (this.classList.contains('active')) {
                return;
            }

            // Remove oldest selection if already 2
            if (currentSelections.length >= 2) {
                const removed = currentSelections.shift();
                const removedBtn = document.querySelector(
                    `.method-btn-dual[data-example="${example}"][data-method="${removed}"]`
                );
                if (removedBtn) removedBtn.classList.remove('active');
            }

            // Add new selection
            currentSelections.push(method);
            this.classList.add('active');

            // Update the inline slider
            updateInlineSlider(example, currentSelections);

            console.log(`Example ${example}: comparing ${currentSelections[0]} vs ${currentSelections[1]}`);
        });
    });

    console.log('Dual method selectors initialized');
}

/**
 * Update inline slider videos and labels when method selection changes
 */
function updateInlineSlider(example, selections) {
    const container = document.querySelector(`.inline-video-compare[data-example="${example}"]`);
    if (!container || selections.length < 2) return;

    const videoUrls = JSON.parse(container.dataset.videos);
    const labelMap = JSON.parse(container.dataset.labels);

    // Define button order (left to right)
    const methodOrder = ['interdyn', 'mask2iv', 'coshand', 'wan-control', 'ours'];

    // Sort selections by button position (left to right)
    const sortedMethods = selections.slice().sort((a, b) => {
        return methodOrder.indexOf(a) - methodOrder.indexOf(b);
    });

    const leftMethod = sortedMethods[0];
    const rightMethod = sortedMethods[1];

    const leftVideo = container.querySelector('.compare-left video');
    const rightVideo = container.querySelector('.compare-right video');
    const leftLabel = container.querySelector('.hover-label-left');
    const rightLabel = container.querySelector('.hover-label-right');

    // Get current playback state from sibling sync videos
    const grid = document.getElementById(`example-${example}-grid`);
    const refVideos = grid.querySelectorAll('.sync-video');
    let currentTime = 0;
    let wasPlaying = false;
    for (const v of refVideos) {
        if (v !== leftVideo && v !== rightVideo && v.duration) {
            currentTime = v.currentTime;
            wasPlaying = !v.paused;
            break;
        }
    }

    // Helper to switch a video source
    function switchVideo(video, newSrc) {
        const source = video.querySelector('source');
        const currentSrc = source.src || '';
        // Check if already loaded with this src
        if (currentSrc.endsWith(newSrc)) return;

        video.dataset.src = newSrc;
        source.src = newSrc;
        video.load();
        video.addEventListener('loadeddata', function onLoad() {
            video.currentTime = currentTime;
            if (wasPlaying) video.play().catch(() => {});
            video.removeEventListener('loadeddata', onLoad);
        });
    }

    // Update videos
    if (videoUrls[leftMethod]) switchVideo(leftVideo, videoUrls[leftMethod]);
    if (videoUrls[rightMethod]) switchVideo(rightVideo, videoUrls[rightMethod]);

    // Update labels
    if (leftLabel) leftLabel.textContent = labelMap[leftMethod] || leftMethod;
    if (rightLabel) rightLabel.textContent = labelMap[rightMethod] || rightMethod;
}

/**
 * Initialize inline video comparison sliders (drag to reveal)
 */
function initInlineSliders() {
    document.querySelectorAll('.inline-video-compare').forEach(container => {
        const slider = container.querySelector('.compare-slider');
        const handle = container.querySelector('.compare-handle');
        const rightSide = container.querySelector('.compare-right');
        const leftVideo = container.querySelector('.compare-left video');
        const rightVideo = container.querySelector('.compare-right video');

        let isDragging = false;

        let rafId = null;
        let containerRect = null;

        function updatePosition(percentage) {
            rightSide.style.clipPath = `inset(0 0 0 ${percentage}%)`;
            slider.style.left = `${percentage}%`;
        }

        function startDrag(e) {
            e.preventDefault();
            e.stopPropagation();
            isDragging = true;
            slider.classList.add('dragging');
            // Cache rect once at drag start
            containerRect = container.getBoundingClientRect();
        }

        function drag(e) {
            if (!isDragging) return;
            e.preventDefault();

            // Cancel previous animation frame if still pending
            if (rafId) {
                cancelAnimationFrame(rafId);
            }

            // Throttle updates using requestAnimationFrame (60fps max)
            rafId = requestAnimationFrame(() => {
                const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
                const x = clientX - containerRect.left;
                const percentage = Math.max(2, Math.min(98, (x / containerRect.width) * 100));
                updatePosition(percentage);
            });
        }

        function stopDrag() {
            isDragging = false;
            slider.classList.remove('dragging');
            // Clean up pending animation frame
            if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
            containerRect = null;
        }

        // Mouse events
        slider.addEventListener('mousedown', startDrag);
        handle.addEventListener('mousedown', startDrag);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', stopDrag);

        // Touch events
        slider.addEventListener('touchstart', startDrag, { passive: false });
        handle.addEventListener('touchstart', startDrag, { passive: false });
        document.addEventListener('touchmove', drag, { passive: false });
        document.addEventListener('touchend', stopDrag);

        // Sync right video time to left video (tight threshold + loop handling)
        leftVideo.addEventListener('timeupdate', () => {
            const drift = rightVideo.currentTime - leftVideo.currentTime;
            const duration = leftVideo.duration || 1;
            // Handle loop boundary (one looped, other didn't)
            if (Math.abs(drift) > duration * 0.5) {
                rightVideo.currentTime = leftVideo.currentTime;
            } else if (Math.abs(drift) > 0.05) {
                rightVideo.currentTime = leftVideo.currentTime;
            }
        });

        // Click on container to play/pause (but not when dragging slider)
        container.addEventListener('click', (e) => {
            // Don't toggle play if we were dragging
            if (e.target === slider || e.target === handle) return;
            if (leftVideo.paused) {
                rightVideo.currentTime = leftVideo.currentTime;
                leftVideo.play().catch(() => {});
                rightVideo.play().catch(() => {});
            } else {
                leftVideo.pause();
                rightVideo.pause();
            }
        });

        // Initialize at 50%
        updatePosition(50);
    });

    console.log('Inline video sliders initialized');
}

/**
 * Synchronized video playback with progress bar
 * Plays all videos in a sync group together with active drift correction
 */
function initSyncPlayButtons() {
    const syncContainers = document.querySelectorAll('.sync-play-container');

    syncContainers.forEach(container => {
        const button = container.querySelector('.sync-play-button');
        const progressBar = container.querySelector('.sync-progress-bar');
        const progressFill = container.querySelector('.sync-progress-fill');
        const progressHandle = container.querySelector('.sync-progress-handle');
        const timeDisplay = container.querySelector('.sync-time-display');
        const targetGroup = button.dataset.target;
        const grid = document.querySelector(`[data-sync-group="${targetGroup}"]`);

        if (!grid) {
            console.error(`Sync group not found: ${targetGroup}`);
            return;
        }

        const videos = grid.querySelectorAll('.sync-video');
        if (videos.length === 0) return;

        // Use first video as reference for duration and progress
        const primaryVideo = videos[0];
        let syncRAF = null;
        let isGroupPlaying = false;

        // Format time in MM:SS
        function formatTime(seconds) {
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        }

        // Update progress bar and time display
        function updateProgress() {
            if (!primaryVideo.duration) return;

            const progress = (primaryVideo.currentTime / primaryVideo.duration) * 100;
            progressFill.style.width = `${progress}%`;
            timeDisplay.textContent = `${formatTime(primaryVideo.currentTime)} / ${formatTime(primaryVideo.duration)}`;
        }

        // Active sync loop: keeps all videos aligned to primaryVideo
        function syncLoop() {
            if (!isGroupPlaying) return;

            const refTime = primaryVideo.currentTime;
            const duration = primaryVideo.duration;
            updateProgress();

            videos.forEach(video => {
                if (video === primaryVideo) return;
                if (!video.duration) return;

                const drift = video.currentTime - refTime;

                // Handle loop boundary: if drift is huge, one video looped and the other didn't
                if (Math.abs(drift) > duration * 0.5) {
                    video.currentTime = refTime;
                } else if (Math.abs(drift) > 0.05) {
                    // Correct small drift by seeking
                    video.currentTime = refTime;
                }
            });

            syncRAF = requestAnimationFrame(syncLoop);
        }

        // Start sync loop
        function startSyncLoop() {
            isGroupPlaying = true;
            if (syncRAF) cancelAnimationFrame(syncRAF);
            syncRAF = requestAnimationFrame(syncLoop);
        }

        // Stop sync loop
        function stopSyncLoop() {
            isGroupPlaying = false;
            if (syncRAF) {
                cancelAnimationFrame(syncRAF);
                syncRAF = null;
            }
        }

        // Seek all videos to specific time
        function seekTo(time) {
            videos.forEach(video => {
                video.currentTime = time;
            });
            updateProgress();
        }

        // Handle primary video loop: force all others to restart together
        primaryVideo.addEventListener('seeking', () => {
            if (!isGroupPlaying) return;
            const refTime = primaryVideo.currentTime;
            videos.forEach(video => {
                if (video === primaryVideo) return;
                video.currentTime = refTime;
            });
        });

        // Play button click
        button.addEventListener('click', function() {
            if (isGroupPlaying) {
                // Pause all videos
                videos.forEach(video => video.pause());
                stopSyncLoop();
                button.classList.remove('playing');
                button.querySelector('.play-text').textContent = 'Play';
            } else {
                // Sync all videos to primary before starting
                const startTime = primaryVideo.currentTime;
                const playPromises = [];

                videos.forEach(video => {
                    // Ensure video source is loaded
                    const source = video.querySelector('source');
                    if (!source.src && video.dataset.src) {
                        source.src = video.dataset.src;
                        video.load();
                    }
                    video.currentTime = startTime;
                    playPromises.push(
                        video.play().catch(err => {
                            console.error('Video play error:', err);
                        })
                    );
                });

                // Start sync loop after all videos begin playing
                Promise.all(playPromises).then(() => {
                    startSyncLoop();
                });

                button.classList.add('playing');
                button.querySelector('.play-text').textContent = 'Pause';
            }
        });

        // Progress bar click
        progressBar.addEventListener('click', function(e) {
            if (!primaryVideo.duration) return;

            const rect = progressBar.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const percentage = clickX / rect.width;
            const newTime = percentage * primaryVideo.duration;

            seekTo(newTime);
        });

        // Progress handle drag
        let isDragging = false;

        progressHandle.addEventListener('mousedown', function(e) {
            isDragging = true;
            e.preventDefault();
        });

        document.addEventListener('mousemove', function(e) {
            if (!isDragging || !primaryVideo.duration) return;

            const rect = progressBar.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const percentage = Math.max(0, Math.min(1, mouseX / rect.width));
            const newTime = percentage * primaryVideo.duration;

            seekTo(newTime);
        });

        document.addEventListener('mouseup', function() {
            isDragging = false;
        });

        // Video ended handler
        primaryVideo.addEventListener('ended', () => {
            stopSyncLoop();
            button.classList.remove('playing');
            button.querySelector('.play-text').textContent = 'Play';
        });

        // Load metadata to get duration
        primaryVideo.addEventListener('loadedmetadata', () => {
            updateProgress();
        });

        console.log(`Sync control initialized for group: ${targetGroup}`);
    });

    console.log(`Sync play controls initialized for ${syncContainers.length} groups`);
}

/**
 * Dataset tabs switching (ARCTIC, HOT3D, HOI4D)
 */
function initDatasetTabs() {
    const tabButtons = document.querySelectorAll('.dataset-tab');
    const tabContents = document.querySelectorAll('.dataset-panel');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all tabs and panels
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(panel => panel.classList.remove('active'));

            // Add active class to clicked tab
            button.classList.add('active');

            // Show corresponding panel
            const dataset = button.dataset.dataset;
            const panel = document.getElementById(`${dataset}-content`);
            if (panel) {
                panel.classList.add('active');
            }

            console.log(`Switched to ${dataset.toUpperCase()} dataset`);
        });
    });

    console.log('Dataset tabs initialized');
}

/**
 * Smooth scrolling for anchor links
 */
function initSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();

            const targetId = this.getAttribute('href');
            if (targetId === '#') return;  // Ignore empty hash

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                // Scroll to element with offset for sticky nav
                const navHeight = document.getElementById('navbar').offsetHeight;
                const targetPosition = targetElement.offsetTop - navHeight;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    console.log('Smooth scrolling initialized');
}

/**
 * Highlight active navigation link based on scroll position
 */
function initNavigationHighlight() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-links a');

    function highlightNavigation() {
        const scrollY = window.pageYOffset;
        const navHeight = document.getElementById('navbar').offsetHeight;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;

        let currentSection = '';

        // Check if we're at the bottom of the page (within 50px)
        const isAtBottom = scrollY + windowHeight >= documentHeight - 50;

        if (isAtBottom && sections.length > 0) {
            // If at bottom, highlight the last section
            currentSection = sections[sections.length - 1].getAttribute('id');
        } else {
            // Normal detection: find which section we're in
            sections.forEach(section => {
                const sectionTop = section.offsetTop - navHeight - 100;
                const sectionHeight = section.clientHeight;

                if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
                    currentSection = section.getAttribute('id');
                }
            });
        }

        // Update active class on nav links
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${currentSection}`) {
                link.classList.add('active');
            }
        });
    }

    // Throttle scroll event
    let scrollTimeout;
    window.addEventListener('scroll', () => {
        if (scrollTimeout) {
            window.cancelAnimationFrame(scrollTimeout);
        }
        scrollTimeout = window.requestAnimationFrame(highlightNavigation);
    });

    // Initial highlight
    highlightNavigation();

    console.log('Navigation highlight initialized');
}

/**
 * Video play/pause controls and optimizations
 */
function initVideoPlayControls() {
    const videos = document.querySelectorAll('video');

    videos.forEach(video => {
        // Pause video when it goes out of view (save bandwidth)
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting && !video.paused) {
                    video.pause();
                }
            });
        }, {
            threshold: 0.1
        });

        observer.observe(video);

        // Error handling
        video.addEventListener('error', function(e) {
            console.error('Video loading error:', video.dataset.src || video.src, e);
        });

        // Log when video is ready
        video.addEventListener('loadeddata', function() {
            console.log(`Video loaded: ${video.dataset.src || video.src}`);
        });
    });

    console.log(`Video play controls initialized for ${videos.length} videos`);
}

/**
 * Utility: Debounce function for performance
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Utility: Throttle function for performance
 */
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Log initialization
console.log('Hand2World project page scripts loaded');
