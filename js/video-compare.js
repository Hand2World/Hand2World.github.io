/**
 * Video Comparison Components
 *
 * 1. SyncVideoPlayer: Side-by-side synchronized video playback
 * 2. VideoSliderCompare: Before/after slider comparison
 */

// ============================================================================
// 1. Synchronized Video Player
// ============================================================================

class SyncVideoPlayer {
    constructor(container) {
        this.container = container;
        this.videos = container.querySelectorAll('video');
        this.playBtn = container.querySelector('.sync-play-btn');
        this.progressBar = container.querySelector('.sync-progress');
        this.timeDisplay = container.querySelector('.sync-time');

        this.isPlaying = false;
        this.init();
    }

    init() {
        // Sync all videos on timeupdate (tight threshold + loop handling)
        this.videos[0].addEventListener('timeupdate', () => {
            const currentTime = this.videos[0].currentTime;
            const duration = this.videos[0].duration;

            // Sync other videos
            this.videos.forEach((video, i) => {
                if (i === 0) return;
                const drift = video.currentTime - currentTime;
                // Handle loop boundary
                if (Math.abs(drift) > duration * 0.5) {
                    video.currentTime = currentTime;
                } else if (Math.abs(drift) > 0.05) {
                    video.currentTime = currentTime;
                }
            });

            // Update progress bar
            if (this.progressBar) {
                const progress = (currentTime / duration) * 100;
                this.progressBar.style.width = `${progress}%`;
            }

            // Update time display
            if (this.timeDisplay) {
                this.timeDisplay.textContent = `${this.formatTime(currentTime)} / ${this.formatTime(duration)}`;
            }
        });

        // Play/pause button
        if (this.playBtn) {
            this.playBtn.addEventListener('click', () => this.togglePlay());
        }

        // Click on videos to play/pause
        this.videos.forEach(video => {
            video.addEventListener('click', () => this.togglePlay());
        });

        // Reset button on end
        this.videos[0].addEventListener('ended', () => {
            this.isPlaying = false;
            this.updatePlayButton();
        });

        // Prevent individual video controls
        this.videos.forEach(video => {
            video.removeAttribute('controls');
        });
    }

    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    play() {
        this.videos.forEach(video => video.play());
        this.isPlaying = true;
        this.updatePlayButton();
    }

    pause() {
        this.videos.forEach(video => video.pause());
        this.isPlaying = false;
        this.updatePlayButton();
    }

    updatePlayButton() {
        if (!this.playBtn) return;

        const icon = this.playBtn.querySelector('.icon');
        if (this.isPlaying) {
            // Pause icon
            icon.innerHTML = `
                <rect x="6" y="4" width="4" height="16"></rect>
                <rect x="14" y="4" width="4" height="16"></rect>
            `;
        } else {
            // Play icon
            icon.innerHTML = `<polygon points="5 3 19 12 5 21 5 3"></polygon>`;
        }
    }

    formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
}

// ============================================================================
// 2. Video Slider Comparison
// ============================================================================

class VideoSliderCompare {
    constructor(container) {
        this.container = container;
        this.leftVideo = container.querySelector('.compare-left video');
        this.rightVideo = container.querySelector('.compare-right video');
        this.slider = container.querySelector('.compare-slider');
        this.handle = container.querySelector('.compare-handle');

        this.isDragging = false;
        this.currentPosition = 50; // percentage

        this.init();
    }

    init() {
        // Sync video playback (tight threshold + loop handling)
        this.leftVideo.addEventListener('timeupdate', () => {
            const currentTime = this.leftVideo.currentTime;
            const drift = this.rightVideo.currentTime - currentTime;
            const duration = this.leftVideo.duration || 1;
            // Handle loop boundary
            if (Math.abs(drift) > duration * 0.5) {
                this.rightVideo.currentTime = currentTime;
            } else if (Math.abs(drift) > 0.05) {
                this.rightVideo.currentTime = currentTime;
            }
        });

        // Click to play/pause both
        this.leftVideo.addEventListener('click', (e) => {
            e.preventDefault();
            this.togglePlay();
        });

        this.rightVideo.addEventListener('click', (e) => {
            e.preventDefault();
            this.togglePlay();
        });

        // Slider dragging
        this.slider.addEventListener('mousedown', (e) => this.startDrag(e));
        this.handle.addEventListener('mousedown', (e) => this.startDrag(e));

        document.addEventListener('mousemove', (e) => this.drag(e));
        document.addEventListener('mouseup', () => this.stopDrag());

        // Touch events
        this.slider.addEventListener('touchstart', (e) => this.startDrag(e));
        this.handle.addEventListener('touchstart', (e) => this.startDrag(e));

        document.addEventListener('touchmove', (e) => this.drag(e));
        document.addEventListener('touchend', () => this.stopDrag());

        // Remove individual controls
        this.leftVideo.removeAttribute('controls');
        this.rightVideo.removeAttribute('controls');

        // Set initial position
        this.updatePosition(50);
    }

    startDrag(e) {
        e.preventDefault();
        this.isDragging = true;
        this.slider.classList.add('dragging');
    }

    drag(e) {
        if (!this.isDragging) return;

        e.preventDefault();

        const rect = this.container.getBoundingClientRect();
        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const x = clientX - rect.left;
        const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));

        this.updatePosition(percentage);
    }

    stopDrag() {
        this.isDragging = false;
        this.slider.classList.remove('dragging');
    }

    updatePosition(percentage) {
        this.currentPosition = percentage;

        // Update clip path
        const rightSide = this.container.querySelector('.compare-right');
        rightSide.style.clipPath = `inset(0 0 0 ${percentage}%)`;

        // Update slider position
        this.slider.style.left = `${percentage}%`;
    }

    togglePlay() {
        if (this.leftVideo.paused) {
            this.leftVideo.play();
            this.rightVideo.play();
        } else {
            this.leftVideo.pause();
            this.rightVideo.pause();
        }
    }
}

// ============================================================================
// Initialize all comparison widgets on page load
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Initialize sync video players
    document.querySelectorAll('.sync-video-container').forEach(container => {
        new SyncVideoPlayer(container);
    });

    // Initialize slider comparisons
    document.querySelectorAll('.video-slider-compare').forEach(container => {
        new VideoSliderCompare(container);
    });
});
