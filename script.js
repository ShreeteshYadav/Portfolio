document.addEventListener('DOMContentLoaded', () => {

    /* -------------------------------------------------------------------------- */
    /*                               THEME HANDLING                               */
    /* -------------------------------------------------------------------------- */
    const themeBtn = document.getElementById('theme-btn');
    const themeIcon = themeBtn ? themeBtn.querySelector('i') : null;

    // Check local storage or system preference
    const savedTheme = localStorage.getItem('theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Set initial state
    if (savedTheme === 'dark' || (!savedTheme && systemDark)) {
        document.body.classList.add('dark-mode');
        if (themeIcon) themeIcon.className = 'ph ph-sun';
    } else {
        if (themeIcon) themeIcon.className = 'ph ph-moon';
    }

    // Toggle logic
    themeBtn?.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');

        if (themeIcon) themeIcon.className = isDark ? 'ph ph-sun' : 'ph ph-moon';
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });

    /* -------------------------------------------------------------------------- */
    /*                             MOBILE MENU MGT                                */
    /* -------------------------------------------------------------------------- */
    const mobileToggle = document.querySelector('.mobile-toggle');
    const navMenu = document.querySelector('.nav-menu');

    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            const icon = mobileToggle.querySelector('i');
            if (navMenu.classList.contains('active')) {
                icon.className = 'ph ph-x';
            } else {
                icon.className = 'ph ph-list';
            }
        });
    }

    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            if (navMenu.classList.contains('active')) {
                navMenu.classList.remove('active');
                mobileToggle.querySelector('i').className = 'ph ph-list';
            }
        });
    });

    /* -------------------------------------------------------------------------- */
    /*                           CUSTOM CURSOR LOGIC                              */
    /* -------------------------------------------------------------------------- */
    if (window.matchMedia("(pointer: fine)").matches) {
        const follower = document.createElement('div');
        follower.id = 'cursor-follower';
        document.body.appendChild(follower);

        let mouseX = 0, mouseY = 0;
        let followerX = 0, followerY = 0;

        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;

            // Update background position variables (percentage)
            const xPct = (mouseX / window.innerWidth) * 100;
            const yPct = (mouseY / window.innerHeight) * 100;
            document.documentElement.style.setProperty('--bg-x', `${xPct}%`);
            document.documentElement.style.setProperty('--bg-y', `${yPct}%`);

            // Initial show
            if (follower.style.opacity === '0' || follower.style.opacity === '') {
                follower.style.opacity = '1';
            }
        });

        // Use a lerp factor for delayed "weight"
        const cursorLerp = 0.12;

        function animateCursor() {
            followerX += (mouseX - followerX) * cursorLerp;
            followerY += (mouseY - followerY) * cursorLerp;

            // Sub-pixel rendering for smoothness
            follower.style.transform = `translate(${followerX}px, ${followerY}px) translate(-50%, -50%)`;

            requestAnimationFrame(animateCursor);
        }
        animateCursor();

        const interactiveElements = document.querySelectorAll('a, button, .card, input, textarea');
        interactiveElements.forEach(el => {
            el.addEventListener('mouseenter', () => {
                document.body.classList.add('hovering-clickable');
            });
            el.addEventListener('mouseleave', () => {
                document.body.classList.remove('hovering-clickable');
            });
        });
    }

    /* -------------------------------------------------------------------------- */
    /*                               PHYSICS TILT                                 */
    /* -------------------------------------------------------------------------- */
    // A physics-based tilt to avoid "stiffness".
    // We update target values on mouse move, and loop to interpolate current values.

    const cards = document.querySelectorAll('.card');
    const isReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (cards.length > 0 && !isReducedMotion) {

        // Configuration
        const TILT_MAX = 5;      // Max tilt degrees
        const LIFT_AMOUNT = -10; // Pixels to lift
        const LERP_FACTOR = 0.1; // Softer, floating response

        // Store active state for each card
        const cardStates = new Map();

        cards.forEach(card => {
            cardStates.set(card, {
                currentX: 0,
                currentY: 0,
                currentLift: 0,
                targetX: 0,
                targetY: 0,
                targetLift: 0,
                hovering: false
            });

            card.addEventListener('mouseenter', () => {
                const state = cardStates.get(card);
                state.hovering = true;
                state.targetLift = LIFT_AMOUNT;
            });

            card.addEventListener('mouseleave', () => {
                const state = cardStates.get(card);
                state.hovering = false;
                state.targetX = 0;
                state.targetY = 0;
                state.targetLift = 0;
            });

            card.addEventListener('mousemove', (e) => {
                const state = cardStates.get(card);
                if (!state.hovering) return;

                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                const centerX = rect.width / 2;
                const centerY = rect.height / 2;

                // Normalize (-1 to 1)
                const normX = (x - centerX) / centerX;
                const normY = (y - centerY) / centerY;

                // Y mouse affects X rotation (Look up/down)
                // X mouse affects Y rotation (Look left/right)
                state.targetX = normY * -TILT_MAX;
                state.targetY = normX * TILT_MAX;

                // Update CSS variables for spotlight effect
                card.style.setProperty('--mouse-x', `${x}px`);
                card.style.setProperty('--mouse-y', `${y}px`);
            });
        });

        // Global Animation Loop for Cards
        function animateCards() {
            cards.forEach(card => {
                const state = cardStates.get(card);
                if (!state) return;

                // Interpolate
                state.currentX += (state.targetX - state.currentX) * LERP_FACTOR;
                state.currentY += (state.targetY - state.currentY) * LERP_FACTOR;
                state.currentLift += (state.targetLift - state.currentLift) * LERP_FACTOR;

                // Optim: Stop applying if close to zero and not hovering
                const isNearZero = Math.abs(state.currentX) < 0.01 &&
                    Math.abs(state.currentY) < 0.01 &&
                    Math.abs(state.currentLift) < 0.01;

                if (!state.hovering && isNearZero) {
                    card.style.transform = ''; // Clear inline style to let CSS take over (if any) or simply rest
                    return;
                }

                // Apply
                // Use a slight scale for "pop", e.g., using lift to determine scale
                // Map -10 lift to 1.02 scale
                const scale = 1 + (Math.abs(state.currentLift) / 100) * 0.2;

                card.style.transform = `perspective(1000px) rotateX(${state.currentX.toFixed(3)}deg) rotateY(${state.currentY.toFixed(3)}deg) translateY(${state.currentLift.toFixed(2)}px) scale3d(${scale.toFixed(3)}, ${scale.toFixed(3)}, 1)`;
            });

            requestAnimationFrame(animateCards);
        }

        animateCards();
    }

    /* -------------------------------------------------------------------------- */
    /*                           PAGE ENTRY ANIMATIONS                            */
    /* -------------------------------------------------------------------------- */
    // Fade in elements nicely
    const fadeElements = document.querySelectorAll('.card, h1, p, .btn, .timeline-item');

    // Use an observer to trigger the class
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Here we reset the opacity/transform control to CSS if we want, or do JS
                // Let's rely on the JS initialization we did below
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    fadeElements.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = `opacity 0.4s ease-out ${index * 0.02}s, transform 0.4s ease-out ${index * 0.02}s`;
        observer.observe(el);
    });

    /* -------------------------------------------------------------------------- */
    /*                           MOBILE BACK BUTTON                               */
    /* -------------------------------------------------------------------------- */
    // Helper to inject the back button if we are not on the home page (optional logic)
    // or just always, but hide on home via CSS or JS checks.
    // Let's hide it on index.html
    const currentPath = window.location.pathname;
    const isHome = currentPath === '/' || currentPath.endsWith('index.html') || currentPath.endsWith('Portfolio/');

    if (!isHome) {
        const backBtn = document.createElement('div');
        backBtn.className = 'mobile-back-btn';
        backBtn.innerHTML = '<i class="ph ph-arrow-left"></i>';
        backBtn.onclick = () => {
            // Check if there is history to go back to
            if (window.history.length > 1) {
                window.history.back();
            } else {
                // Fallback to home
                window.location.href = 'index.html';
            }
        };
        document.body.appendChild(backBtn);
    }

    /* -------------------------------------------------------------------------- */
    /*                              FLIP CLOCK LOGIC                              */
    /* -------------------------------------------------------------------------- */
    function updateFlip(id, val) {
        const el = document.getElementById(id);
        if (!el) return;

        const top = el.querySelector('.top');
        const bottom = el.querySelector('.bottom');
        const topFlip = el.querySelector('.top-flip');
        const bottomFlip = el.querySelector('.bottom-flip');

        const current = top.innerText;
        const next = val.toString().padStart(2, '0');

        if (current === next) return;

        // Setup initial state for animation
        topFlip.innerText = current;
        bottomFlip.innerText = next;

        // Trigger Animation
        el.classList.add('flipping');

        // On animation end, update static values and reset
        setTimeout(() => {
            top.innerText = next;
            bottom.innerText = next;
            topFlip.innerText = next;
            bottomFlip.innerText = next;
            el.classList.remove('flipping');
        }, 500); // Match CSS duration (0.5s)
    }

    function updateClock() {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();

        updateFlip('clock-h', hours);
        updateFlip('clock-m', minutes);
    }

    if (document.querySelector('.mini-flip-clock')) {
        setInterval(updateClock, 1000); // Check every second so we catch the minute change exactly
        updateClock(); // Init
    }

    /* -------------------------------------------------------------------------- */
    /*                         LOGO ANIMATION (8s SWAP)                           */
    /* -------------------------------------------------------------------------- */
    setInterval(() => {
        const logo = document.querySelector('.nav-logo');
        if (logo) {
            logo.classList.toggle('reversed');

            // Optional: Re-trigger spin animation on icon when swapping
            const icons = logo.querySelectorAll('i');
            icons.forEach(icon => {
                // Reset animation
                icon.style.animation = 'none';
                icon.offsetHeight; /* trigger reflow */
                icon.style.animation = 'logo-spin 0.6s ease-in-out';
            });
        }
    }, 8000);

    /* -------------------------------------------------------------------------- */
    /*                         CV DOWNLOAD INTERCEPTION                           */
    /* -------------------------------------------------------------------------- */
    const downloadLinks = document.querySelectorAll('a[href*="resume.pdf"]');

    downloadLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            showToast('Will be uploaded soon, work still ongoing.');
        });
    });

    function showToast(message) {
        // Remove existing toast if any
        const existingToast = document.querySelector('.toast');
        if (existingToast) existingToast.remove();

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `<i class="ph-fill ph-info"></i> <span>${message}</span>`;

        document.body.appendChild(toast);

        // Force reflow
        toast.offsetHeight;

        // Show
        setTimeout(() => toast.classList.add('show'), 10);

        // Hide after 3s
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400); // Wait for transition
        }, 3000);
    }
});
