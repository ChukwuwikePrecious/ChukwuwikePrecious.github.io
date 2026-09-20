/* ============================================================
   Chukwuwike Precious - site scripts
   1. Opening scene          5. Lights down (video)
   2. Light / dark switch    6. Portrait (ring and tilt)
   3. Contact buttons        7. Scroll effects
   4. Galleries and viewer   8. Project chips and tint
   ============================================================ */

/* Lets the CSS know scripts are running, so scroll effects can start hidden */
document.documentElement.classList.add('js');
var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- 1. Opening scene: plays once per visit, tap to skip ---------- */
(function () {
    var slate = document.getElementById('slate');
    var root = document.documentElement;
    if (!slate) return;
    if (!root.classList.contains('slate-on')) { slate.remove(); return; }

    var done = false;
    var timer;
    function finish(skipped) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        if (skipped) root.classList.add('slate-skip');   // hero animations start straight away
        slate.classList.add('open');
        try { sessionStorage.setItem('slate', '1'); } catch (e) {}
        setTimeout(function () { slate.remove(); root.classList.remove('slate-on'); }, 950);
    }
    timer = setTimeout(function () { finish(false); }, 1300);
    slate.addEventListener('click', function () { finish(true); });
    document.addEventListener('keydown', function () { finish(true); }, { once: true });
})();

/* ---------- 2. Light / dark switch (remembers your choice) ---------- */
(function () {
    var root = document.documentElement;
    var btn = document.getElementById('theme-toggle');
    var meta = document.getElementById('theme-color');
    if (!btn) return;
    function apply(theme) {
        root.setAttribute('data-theme', theme);
        if (meta) meta.setAttribute('content', theme === 'dark' ? '#17100B' : '#A94F1C');
        btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    }
    apply(root.getAttribute('data-theme') || 'light');
    btn.addEventListener('click', function () {
        var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        apply(next);
        try { localStorage.setItem('theme', next); } catch (e) {}
    });
})();

/* ---------- 3. Contact buttons (email and number are assembled here, not printed on the page) ---------- */
(function () {
    var phone = ['234', '913', '096', '2043'].join('');
    var email = ['Chukwuwikepreciousg', 'gmail.com'].join('@');
    function whatsapp(text) { return 'https://wa.me/' + phone + '?text=' + encodeURIComponent(text); }

    document.getElementById('wa-link').href = whatsapp('Hi Chukwuwike, I saw your website and would like to talk about a project.');
    document.getElementById('mail-link').href = 'mailto:' + email;

    var needs = {
        website: "Hi Chukwuwike, I saw your website and I'd like a website. Here's what it's for: ",
        visuals: "Hi Chukwuwike, I saw your website and I'd like AI product visuals for my brand. ",
        video: "Hi Chukwuwike, I saw your website and I'd like an AI video ad for my product. "
    };
    Array.prototype.forEach.call(document.querySelectorAll('.need'), function (a) {
        a.href = whatsapp(needs[a.dataset.need] || '');
        a.target = '_blank';
        a.rel = 'noopener';
    });

    var copyBtn = document.getElementById('copy-mail');
    function copied() {
        copyBtn.textContent = 'Copied';
        setTimeout(function () { copyBtn.textContent = 'Copy email'; }, 1800);
    }
    function fallbackCopy() {
        var t = document.createElement('textarea');
        t.value = email;
        t.setAttribute('readonly', '');
        t.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
        document.body.appendChild(t);
        t.select();
        try { if (document.execCommand('copy')) copied(); } catch (e) {}
        t.remove();
    }
    copyBtn.addEventListener('click', function () {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(email).then(copied, fallbackCopy);
        } else {
            fallbackCopy();
        }
    });
})();

/* ---------- 4. Galleries and the image viewer ---------- */
var EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
var fileCache = {};
var lightbox = document.getElementById('lightbox');
var lbImg = document.getElementById('lb-img');
var lbCount = document.getElementById('lb-count');
var lbDots = document.getElementById('lb-dots');
var lb = { g: null, index: 0, token: 0, opener: null };

function pad(n) { return n < 10 ? '0' + n : String(n); }

/* Finds a working file (tries .jpg, .jpeg, .png, .webp). Resolves to the URL, or null. */
function findFile(folder, base) {
    var key = folder + '/' + base;
    if (fileCache[key]) return fileCache[key];
    fileCache[key] = new Promise(function (resolve) {
        var i = 0;
        (function tryNext() {
            if (i >= EXTENSIONS.length) { resolve(null); return; }
            var url = key + '.' + EXTENSIONS[i];
            var probeImg = new Image();
            probeImg.onload = function () { resolve(url); };
            probeImg.onerror = function () { i++; tryNext(); };
            probeImg.src = url;
        })();
    });
    return fileCache[key];
}

/* Full-size image for one item, remembered */
function probe(item) {
    if (item.src) return Promise.resolve(item.src);
    if (item.failed) return Promise.resolve(null);
    return findFile(item.folder, item.base).then(function (url) {
        if (url) { item.src = url; } else { item.failed = true; }
        return url;
    });
}

function showTile(g, item, url) {
    var tile = item.tile;
    if (!item.img.parentNode) tile.appendChild(item.img);
    item.img.src = url;
    tile.classList.remove('missing');
    tile.disabled = false;
    tile.setAttribute('aria-label', 'View ' + g.title + ' image ' + item.n);
}
function hideTile(item) {
    var tile = item.tile;
    if (item.img.parentNode) item.img.remove();
    tile.classList.remove('ready');
    tile.classList.add('missing');
    tile.disabled = true;
    tile.removeAttribute('aria-label');
}

/* Uses the small thumbnail when a "thumbs" folder exists, otherwise the full image */
function paint(g, item) {
    return g.thumbsPromise.then(function (hasThumbs) {
        function useFull() {
            return probe(item).then(function (url) {
                if (url) { showTile(g, item, url); } else { hideTile(item); }
                return !!url;
            });
        }
        if (!hasThumbs) return useFull();
        return new Promise(function (resolve) {
            var thumb = item.folder + '/thumbs/' + item.base + '.jpg';
            var t = new Image();
            t.onload = function () { showTile(g, item, thumb); resolve(true); };
            t.onerror = function () { useFull().then(resolve); };
            t.src = thumb;
        });
    });
}

function retryFailed(g) {
    g.retried = true;
    g.items.forEach(function (it) {
        if (it.failed) {
            it.failed = false;
            delete fileCache[it.folder + '/' + it.base];
            paint(g, it);
        }
    });
}

/* Loads the first images right away, then the hidden ones quietly, so the viewer
   can swipe through all of them even if "View all" is never pressed. */
function loadGallery(g) {
    if (g.started) return;
    g.started = true;
    g.thumbsPromise = new Promise(function (resolve) {
        var t = new Image();
        t.onload = function () { resolve(true); };
        t.onerror = function () { resolve(false); };
        t.src = g.folder + '/thumbs/' + g.prefix + '-01.jpg';
    });
    var first = g.items.slice(0, g.visible);
    var rest = g.items.slice(g.visible);
    Promise.all(first.map(function (it) { return paint(g, it); }))
        .then(function () { return Promise.all(rest.map(function (it) { return paint(g, it); })); })
        .then(function () {
            if (!g.retried) setTimeout(function () { retryFailed(g); }, 1500);   // one automatic retry
        });
}

function buildGallery(el) {
    var count = parseInt(el.dataset.count, 10);
    var g = {
        el: el,
        title: el.dataset.title,
        prefix: el.dataset.prefix,
        folder: el.dataset.folder,
        count: count,
        visible: parseInt(el.dataset.visible || count, 10),
        items: [],
        started: false,
        retried: false,
        thumbsPromise: null
    };
    el._g = g;

    for (var i = 1; i <= count; i++) {
        (function (n) {
            var base = g.prefix + '-' + pad(n);
            var tile = document.createElement('button');
            tile.type = 'button';
            tile.className = 'tile' + (n > g.visible ? ' extra' : '');
            tile.dataset.file = base + '.jpg';

            var img = document.createElement('img');
            img.alt = g.title + ' concept visual ' + n;
            img.decoding = 'async';
            img.addEventListener('load', function () { tile.classList.add('ready'); });   // stops the shimmer

            var item = { n: n, base: base, folder: g.folder, src: null, failed: false, tile: tile, img: img };
            g.items.push(item);
            tile.addEventListener('click', function () { openLightbox(g, n - 1, img); });
            el.appendChild(tile);
        })(i);
    }

    if (count > g.visible) {
        var more = document.createElement('button');
        more.type = 'button';
        more.className = 'btn btn-ghost btn-small gallery-more';
        more.textContent = 'View all ' + count;
        more.setAttribute('aria-expanded', 'false');
        more.addEventListener('click', function () {
            var open = el.classList.toggle('expanded');
            more.textContent = open ? 'Show fewer' : 'View all ' + count;
            more.setAttribute('aria-expanded', String(open));
            loadGallery(g);
            if (open && g.items.some(function (it) { return it.failed; })) retryFailed(g);
        });
        el.insertAdjacentElement('afterend', more);
    }
    return g;
}

var galleries = Array.prototype.map.call(document.querySelectorAll('.gallery'), buildGallery);

if ('IntersectionObserver' in window) {
    var loader = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
            if (!en.isIntersecting) return;
            loader.unobserve(en.target);
            loadGallery(en.target._g);
        });
    }, { rootMargin: '700px 0px' });
    galleries.forEach(function (g) { loader.observe(g.el); });
} else {
    galleries.forEach(loadGallery);
}

/* ----- The viewer ----- */
function buildDots(g) {
    lbDots.innerHTML = '';
    g.items.forEach(function (it, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('aria-label', 'Go to image ' + (i + 1));
        b.addEventListener('click', function () {
            var dir = i > lb.index ? 1 : -1;
            lb.index = i;
            lbShow(dir, 0);
        });
        lbDots.appendChild(b);
    });
}

function lbShow(dir, attempts) {
    var g = lb.g;
    if (!g) return;
    if (attempts >= g.count) { lightbox.close(); return; }    // nothing viewable

    var token = ++lb.token;
    var item = g.items[lb.index];
    probe(item).then(function (url) {
        if (token !== lb.token) return;                        // a newer swipe took over
        if (!url) {                                            // skip files that are missing
            lb.index = (lb.index + (dir || 1) + g.count) % g.count;
            lbShow(dir || 1, attempts + 1);
            return;
        }
        lbImg.src = url;
        lbImg.alt = item.img.alt;
        lbCount.textContent = (lb.index + 1) + ' / ' + g.count;
        Array.prototype.forEach.call(lbDots.children, function (b, i) {
            b.setAttribute('aria-current', i === lb.index ? 'true' : 'false');
        });
        if (dir && !reduceMotion && lbImg.animate) {
            lbImg.animate(
                [{ opacity: 0, transform: 'translateX(' + (dir * 36) + 'px)' }, { opacity: 1, transform: 'none' }],
                { duration: 240, easing: 'ease-out' }
            );
        }
        [1, -1].forEach(function (d) { probe(g.items[(lb.index + d + g.count) % g.count]); });   // warm up neighbours
    });
}

/* Opens the viewer. The image grows out of the tile you tapped where the browser supports it. */
function openLightbox(g, index, tileImg) {
    lb.g = g;
    lb.index = index;
    lb.opener = document.activeElement;
    buildDots(g);

    function reveal() {
        if (tileImg) {
            tileImg.style.viewTransitionName = '';
            lbImg.style.viewTransitionName = 'photo';
            if (tileImg.currentSrc) lbImg.src = tileImg.currentSrc;   // show something instantly, sharpen after
            lbImg.alt = tileImg.alt;
        }
        if (typeof lightbox.showModal === 'function') lightbox.showModal();
        lbShow(0, 0);
    }
    function cleanup() {
        lbImg.style.viewTransitionName = '';
        if (tileImg) tileImg.style.viewTransitionName = '';
    }

    if (tileImg && document.startViewTransition && !reduceMotion) {
        try {
            tileImg.style.viewTransitionName = 'photo';
            document.startViewTransition(reveal).finished.then(cleanup, cleanup);
            return;
        } catch (e) { cleanup(); }
    }
    reveal();
}

function step(dir) {
    if (!lb.g) return;
    lb.index = (lb.index + dir + lb.g.count) % lb.g.count;
    lbShow(dir, 0);
}

document.getElementById('lb-prev').addEventListener('click', function () { step(-1); });
document.getElementById('lb-next').addEventListener('click', function () { step(1); });
document.getElementById('lb-close').addEventListener('click', function () { lightbox.close(); });
lightbox.addEventListener('click', function (e) {
    var t = e.target;
    if (t === lightbox || t.classList.contains('lb-body') || t.classList.contains('lb-stage')) lightbox.close();
});
lightbox.addEventListener('close', function () {
    if (lb.opener && lb.opener.focus) lb.opener.focus();      // put focus back where you were
});

var touchX = null;
lightbox.addEventListener('touchstart', function (e) { touchX = e.changedTouches[0].clientX; }, { passive: true });
lightbox.addEventListener('touchend', function (e) {
    if (touchX === null) return;
    var dx = e.changedTouches[0].clientX - touchX;
    touchX = null;
    if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
}, { passive: true });
document.addEventListener('keydown', function (e) {
    if (!lightbox.open) return;
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
});

/* ---------- 5. Video, and "Lights down" ---------- */
(function () {
    var wrap = document.getElementById('giordani-video');
    var video = wrap.querySelector('video');
    var source = wrap.querySelector('source');
    var btn = document.getElementById('lights-btn');
    var dim = document.getElementById('dim');
    var label = btn.querySelector('span');

    video.addEventListener('loadedmetadata', function () {          // tall videos shrink to fit the height limit
        if (video.videoHeight > video.videoWidth) wrap.classList.add('portrait');
    });
    source.addEventListener('error', function () { wrap.classList.add('missing'); });
    video.addEventListener('contextmenu', function (e) { e.preventDefault(); });   // no "save video" menu

    function lights(down) {
        document.body.classList.toggle('lights-down', down);
        btn.setAttribute('aria-pressed', String(down));
        label.textContent = down ? 'Lights up' : 'Lights down';
        if (down && video.paused && !wrap.classList.contains('missing')) {
            var p = video.play();
            if (p && p.catch) p.catch(function () {});
        }
    }
    btn.addEventListener('click', function () { lights(!document.body.classList.contains('lights-down')); });
    dim.addEventListener('click', function () { lights(false); });
    video.addEventListener('ended', function () { lights(false); });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && document.body.classList.contains('lights-down')) lights(false);
    });
})();

/* ---------- 6. Portrait: rotating ring and a gentle tilt ---------- */
(function () {
    var portrait = document.querySelector('.portrait');
    if (!portrait) return;

    portrait.insertAdjacentHTML('beforeend',
        '<svg class="seal" viewBox="0 0 120 120" role="img" aria-label="Web developer, AI visuals, AI video ads">' +
        '<defs><path id="seal-ring" d="M60,60 m-45,0 a45,45 0 1,1 90,0 a45,45 0 1,1 -90,0"/></defs>' +
        '<circle cx="60" cy="60" r="58" fill="#F8F4EC" stroke="#D9A441" stroke-width="1.5"/>' +
        '<g class="seal-text"><text><textPath href="#seal-ring" textLength="280" lengthAdjust="spacing">Web developer \u2022 AI visuals \u2022 AI video ads \u2022 </textPath></text></g>' +
        '<path d="M60 40 L65 55 L80 60 L65 65 L60 80 L55 65 L40 60 L55 55 Z" fill="#C96A2B"/>' +
        '</svg>');

    var arch = portrait.querySelector('.arch');
    if (!arch || reduceMotion) return;
    function tilt(e) {
        var r = portrait.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        arch.style.setProperty('--ry', (x * 10).toFixed(2) + 'deg');
        arch.style.setProperty('--rx', (-y * 10).toFixed(2) + 'deg');
    }
    function level() {
        arch.style.setProperty('--rx', '0deg');
        arch.style.setProperty('--ry', '0deg');
    }
    portrait.addEventListener('pointermove', tilt);
    portrait.addEventListener('pointerdown', tilt);
    portrait.addEventListener('pointerleave', level);
    portrait.addEventListener('pointerup', level);
    portrait.addEventListener('pointercancel', level);
})();

/* ---------- 7. Scroll effects: progress line, active menu link, floating buttons, step timeline, reveals ---------- */
(function () {
    var progress = document.getElementById('progress');
    var links = document.querySelectorAll('.site-nav a[href^="#"]:not(.btn)');
    var cta = document.getElementById('float-cta');
    var toTop = document.getElementById('to-top');
    var hero = document.querySelector('.hero');
    var process = document.getElementById('process');
    var steps = document.querySelector('.steps');
    var stepItems = steps ? steps.querySelectorAll('li') : [];
    var map = [['about', 'about'], ['work', 'work'], ['process', 'work'], ['faq', null], ['contact', 'contact']];
    var ticking = false;

    function update() {
        var y = window.scrollY;
        var vh = window.innerHeight;
        var max = document.documentElement.scrollHeight - vh;
        progress.style.transform = 'scaleX(' + (max > 0 ? Math.min(y / max, 1) : 0) + ')';

        var current = null;
        map.forEach(function (pair) {
            var s = document.getElementById(pair[0]);
            if (s && s.getBoundingClientRect().top <= vh * 0.35) current = pair[1];
        });
        links.forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === '#' + current); });

        var pastHero = hero.getBoundingClientRect().bottom < 0;
        var nearProcess = process.getBoundingClientRect().top < vh * 0.75;
        cta.classList.toggle('show', pastHero && !nearProcess);
        toTop.classList.toggle('show', y > 900);

        if (steps) {                                        // the line fills as you read the steps
            var r = steps.getBoundingClientRect();
            var fill = Math.max(0, Math.min(1, (vh * 0.7 - r.top) / r.height));
            steps.style.setProperty('--fill', fill.toFixed(3));
            Array.prototype.forEach.call(stepItems, function (li) {
                li.classList.toggle('lit', li.getBoundingClientRect().top < vh * 0.7);
            });
        }
    }
    window.addEventListener('scroll', function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () { update(); ticking = false; });
    }, { passive: true });
    window.addEventListener('resize', update);
    update();

    toTop.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });

    // gentle reveals, only for things that start below the fold
    if (reduceMotion || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
            if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
        });
    }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
    document.querySelectorAll('.about-copy, .what > div, .feature, .web-list > h3, .site-project, .process-head, .faq h2, .faq details').forEach(function (el) {
        if (el.getBoundingClientRect().top > window.innerHeight) {
            el.classList.add('reveal');
            io.observe(el);
        }
    });
})();

/* ---------- 8. Project chips and the faint background tint ---------- */
(function () {
    var work = document.getElementById('work');
    var chips = document.querySelectorAll('.work-jump a');
    var targets = [['presh', '--tint-presh'], ['mister-giordani', '--tint-giordani'], ['websites', '--tint-web']];
    if (!work || !('IntersectionObserver' in window)) return;

    var visible = {};
    var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { visible[e.target.id] = e.isIntersecting; });
        var cur = null;
        targets.forEach(function (t) { if (visible[t[0]]) cur = t; });
        work.style.setProperty('--tint', cur ? 'var(' + cur[1] + ')' : 'transparent');
        Array.prototype.forEach.call(chips, function (a) {
            a.classList.toggle('active', !!cur && a.getAttribute('href') === '#' + cur[0]);
        });
    }, { rootMargin: '-45% 0px -45% 0px' });          // watches the middle of the screen
    targets.forEach(function (t) {
        var el = document.getElementById(t[0]);
        if (el) io.observe(el);
    });
})();
