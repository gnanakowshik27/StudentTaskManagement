(() => {
    'use strict';

    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const $ = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => [...r.querySelectorAll(s)];
    const mouse = { x: innerWidth / 2, y: innerHeight / 2 };

    if (fine && !reduce) document.body.classList.add('has-pointer');
    addEventListener('pointermove', e => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });

    /* ---------------------------------------------------------
       Split headings into masked words
       --------------------------------------------------------- */
    function splitWords(el) {
        let idx = 0;
        const nodes = [...el.childNodes];
        el.textContent = '';
        const wrap = content => {
            const w = document.createElement('span');
            w.className = 'w';
            const inner = document.createElement('span');
            inner.style.setProperty('--wi', idx++);
            if (typeof content === 'string') inner.textContent = content;
            else inner.appendChild(content);
            w.appendChild(inner);
            return w;
        };
        nodes.forEach(n => {
            if (n.nodeType === 3) {
                n.textContent.split(/\s+/).filter(Boolean).forEach(word => {
                    el.appendChild(wrap(word));
                    el.appendChild(document.createTextNode(' '));
                });
            } else {
                el.appendChild(wrap(n));
                el.appendChild(document.createTextNode(' '));
            }
        });
    }
    $$('[data-split]').forEach(splitWords);

    /* ---------------------------------------------------------
       Intro + reveal on scroll
       --------------------------------------------------------- */
    requestAnimationFrame(() => {
        document.body.classList.add('ready');
        setTimeout(() => $('#heroSplit').classList.add('in-view'), 250);
    });

    // stagger children inside grids
    ['.bento', '.steps', '.num-grid', '.faq'].forEach(sel => {
        const g = $(sel);
        if (g) [...g.children].forEach((c, i) => c.style.setProperty('--d', i * 90 + 'ms'));
    });

    const scrambleChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&*+';
    function scramble(el) {
        const final = el.textContent;
        let frame = 0;
        const total = 22;
        const id = setInterval(() => {
            frame++;
            el.textContent = [...final].map((ch, i) =>
                ch === ' ' ? ' ' : (i < final.length * frame / total ? ch : scrambleChars[Math.random() * scrambleChars.length | 0])
            ).join('');
            if (frame >= total) { clearInterval(id); el.textContent = final; }
        }, 35);
    }

    function countUp(el) {
        const to = +el.dataset.to;
        const suffix = el.dataset.suffix || '';
        if (reduce) { el.textContent = to + suffix; return; }
        const dur = 1500, t0 = performance.now();
        const f = t => {
            const p = Math.min((t - t0) / dur, 1);
            const e = 1 - Math.pow(1 - p, 3);
            el.textContent = Math.round(to * e) + suffix;
            if (p < 1) requestAnimationFrame(f);
        };
        requestAnimationFrame(f);
    }

    const io = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (!e.isIntersecting) return;
            const el = e.target;
            el.classList.add('in-view');
            if (el.classList.contains('reveal')) setTimeout(() => el.classList.add('settled'), 1400);
            if (el.classList.contains('eyebrow') && !reduce) scramble(el);
            $$('.count', el).forEach(countUp);
            io.unobserve(el);
        });
    }, { threshold: 0.18 });
    $$('.reveal, [data-split]:not(#heroSplit), .eyebrow').forEach(el => io.observe(el));

    /* ---------------------------------------------------------
       Rotating typewriter word
       --------------------------------------------------------- */
    (() => {
        const el = $('#typed');
        if (!el || reduce) return;
        const words = ['done.', 'organized.', 'finished.', 'crushed.', 'planned.'];
        let wi = 0, ci = words[0].length, deleting = false;
        const step = () => {
            const word = words[wi];
            if (!deleting) {
                ci++;
                el.textContent = word.slice(0, ci);
                if (ci >= word.length) { deleting = true; return setTimeout(step, 1800); }
                return setTimeout(step, 85);
            }
            ci--;
            el.textContent = word.slice(0, ci);
            if (ci <= 0) { deleting = false; wi = (wi + 1) % words.length; return setTimeout(step, 250); }
            setTimeout(step, 40);
        };
        setTimeout(() => { deleting = true; step(); }, 2200);
    })();

    /* ---------------------------------------------------------
       Particle network background (reacts to the mouse)
       --------------------------------------------------------- */
    (() => {
        const c = $('#fx');
        if (!c || reduce) return;
        const ctx = c.getContext('2d');
        let w, h, dpr, parts = [];

        function resize() {
            dpr = Math.min(devicePixelRatio || 1, 2);
            w = c.width = innerWidth * dpr;
            h = c.height = innerHeight * dpr;
            c.style.width = innerWidth + 'px';
            c.style.height = innerHeight + 'px';
            const n = Math.round(Math.min(95, innerWidth * innerHeight / 15000));
            parts = Array.from({ length: n }, () => ({
                x: Math.random() * w, y: Math.random() * h,
                vx: (Math.random() - .5) * .35 * dpr, vy: (Math.random() - .5) * .35 * dpr,
                r: (Math.random() * 1.5 + .6) * dpr,
                col: Math.random() < .5 ? '167,139,250' : '103,232,249'
            }));
        }
        resize();
        addEventListener('resize', resize);

        function frame() {
            ctx.clearRect(0, 0, w, h);
            const mx = mouse.x * dpr, my = mouse.y * dpr;
            const link = 125 * dpr, mlink = 190 * dpr;

            for (const p of parts) {
                const dx = p.x - mx, dy = p.y - my, d = Math.hypot(dx, dy);
                if (d < 140 * dpr && d > 0) {
                    p.vx += dx / d * .05 * dpr;
                    p.vy += dy / d * .05 * dpr;
                }
                p.vx *= .985; p.vy *= .985;
                p.x += p.vx; p.y += p.vy;
                if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
                if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
                ctx.beginPath();
                ctx.fillStyle = `rgba(${p.col},.75)`;
                ctx.arc(p.x, p.y, p.r, 0, 6.283);
                ctx.fill();
            }

            ctx.lineWidth = dpr;
            for (let i = 0; i < parts.length; i++) {
                const a = parts[i];
                for (let j = i + 1; j < parts.length; j++) {
                    const b = parts[j];
                    const d = Math.hypot(a.x - b.x, a.y - b.y);
                    if (d < link) {
                        ctx.strokeStyle = `rgba(${a.col},${(1 - d / link) * .22})`;
                        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
                    }
                }
                const dm = Math.hypot(a.x - mx, a.y - my);
                if (dm < mlink) {
                    ctx.strokeStyle = `rgba(103,232,249,${(1 - dm / mlink) * .5})`;
                    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mx, my); ctx.stroke();
                }
            }
            requestAnimationFrame(frame);
        }
        frame();
    })();

    /* ---------------------------------------------------------
       Confetti
       --------------------------------------------------------- */
    const confetti = (() => {
        const cv = $('#confetti');
        const cx = cv.getContext('2d');
        let bits = [], running = false;
        const colors = ['#a78bfa', '#67e8f9', '#6ee7b7', '#f0abfc', '#fdba74', '#ffffff'];
        const size = () => { cv.width = innerWidth; cv.height = innerHeight; };
        size();
        addEventListener('resize', size);

        function tick() {
            cx.clearRect(0, 0, cv.width, cv.height);
            bits = bits.filter(b => b.life > 0 && b.y < cv.height + 40);
            for (const b of bits) {
                b.vx *= .992; b.vy += b.g;
                b.x += b.vx; b.y += b.vy; b.rot += b.vr; b.life -= .007;
                cx.save();
                cx.globalAlpha = Math.max(Math.min(b.life * 1.6, 1), 0);
                cx.translate(b.x, b.y);
                cx.rotate(b.rot);
                cx.fillStyle = b.c;
                if (b.round) { cx.beginPath(); cx.arc(0, 0, b.w / 2, 0, 6.283); cx.fill(); }
                else cx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
                cx.restore();
            }
            if (bits.length) requestAnimationFrame(tick);
            else { running = false; cx.clearRect(0, 0, cv.width, cv.height); }
        }

        return function burst(x, y, count = 150) {
            if (reduce) return;
            for (let i = 0; i < count; i++) {
                const a = Math.random() * 6.283, s = Math.random() * 10 + 4;
                bits.push({
                    x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 7, g: .3,
                    rot: Math.random() * 6, vr: (Math.random() - .5) * .45,
                    w: Math.random() * 8 + 4, h: Math.random() * 5 + 3,
                    c: colors[i % colors.length], life: 1, round: Math.random() < .3
                });
            }
            if (!running) { running = true; requestAnimationFrame(tick); }
        };
    })();

    // confetti on launch buttons, then go
    $$('[data-confetti]').forEach(a => a.addEventListener('click', e => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        if (reduce) return;
        e.preventDefault();
        confetti(e.clientX, e.clientY, 170);
        setTimeout(() => { location.href = a.href; }, 650);
    }));

    // logo easter egg
    $('#logo').addEventListener('click', e => {
        e.preventDefault();
        const r = e.currentTarget.getBoundingClientRect();
        confetti(r.left + 20, r.top + 20, 90);
        scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    });

    /* ---------------------------------------------------------
       Live, clickable demo
       --------------------------------------------------------- */
    (() => {
        const grid = $('#pvTasks');
        if (!grid) return;
        const data = [
            { n: 'Complete DAA assignment', p: 'High' },
            { n: 'Revise DBMS notes', p: 'Medium', over: true },
            { n: 'Submit lab record', p: 'Low' },
            { n: 'Prepare mini-project demo', p: 'High' }
        ];
        const state = data.map(() => 0);
        const names = ['To Do', 'In Progress', 'Done'];
        const cls = ['t-todo', 't-prog', 't-done'];
        const pcls = { High: 't-high', Medium: 't-med', Low: 't-low' };

        grid.innerHTML = data.map((d, i) => `
            <div class="pv-task" data-s="0" data-i="${i}" role="button" tabindex="0" aria-label="${d.n}: To Do. Activate to advance.">
                <span class="ck">✓</span>
                <h4>${d.n}</h4>
                <div class="tags">
                    <span class="tag ${pcls[d.p]}">${d.p}</span>
                    <span class="tag st t-todo">To Do</span>
                    ${d.over ? '<span class="tag t-over">⚠ Overdue</span>' : ''}
                </div>
            </div>`).join('');
        const cards = $$('.pv-task', grid);

        const els = { prog: $('#pvProg'), done: $('#pvDone'), over: $('#pvOver'), pct: $('#pvPct'), fill: $('#pvFill') };
        const shown = { prog: 0, done: 0, over: 1 };

        function tween(el, key, to, suffix = '') {
            const from = shown[key] ?? 0;
            shown[key] = to;
            if (reduce || from === to) { el.textContent = to + suffix; return; }
            const t0 = performance.now(), dur = 500;
            const f = t => {
                const p = Math.min((t - t0) / dur, 1);
                el.textContent = Math.round(from + (to - from) * p) + suffix;
                if (p < 1) requestAnimationFrame(f);
            };
            requestAnimationFrame(f);
        }

        let celebrated = false, resetTimer = null, lastInteract = 0, active = false;

        function render(changed) {
            cards.forEach((card, i) => {
                const s = state[i];
                card.dataset.s = s;
                const st = $('.st', card);
                st.textContent = names[s];
                st.className = 'tag st ' + cls[s];
                card.setAttribute('aria-label', `${data[i].n}: ${names[s]}. Activate to advance.`);
                if (changed === i && !reduce) {
                    card.classList.remove('pop'); void card.offsetWidth; card.classList.add('pop');
                }
            });
            const done = state.filter(s => s === 2).length;
            const prog = state.filter(s => s === 1).length;
            const over = data.filter((d, i) => d.over && state[i] !== 2).length;
            const pct = Math.round(done / data.length * 100);
            tween(els.prog, 'prog', prog);
            tween(els.done, 'done', done);
            tween(els.over, 'over', over);
            tween(els.pct, 'pct', pct, '%');
            els.fill.style.width = pct + '%';

            if (done === data.length && !celebrated) {
                celebrated = true;
                const r = $('#demo').getBoundingClientRect();
                confetti(r.left + r.width / 2, r.top + r.height / 2, 200);
                resetTimer = setTimeout(() => {
                    state.fill(0);
                    celebrated = false;
                    render();
                }, 4200);
            }
        }

        function advance(i) {
            state[i] = (state[i] + 1) % 3;
            if (celebrated && state.some(s => s !== 2)) {
                celebrated = false;
                clearTimeout(resetTimer);
            }
            render(i);
        }

        cards.forEach((card, i) => {
            card.addEventListener('click', () => { lastInteract = Date.now(); advance(i); });
            card.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); lastInteract = Date.now(); advance(i); }
            });
        });

        if (reduce) { state[0] = 2; state[1] = 1; render(); return; }

        new IntersectionObserver(es => { active = es[0].isIntersecting; }, { threshold: 0.3 }).observe($('#demo'));

        function auto() {
            if (active && !celebrated && Date.now() - lastInteract > 5000) {
                const inProg = state.findIndex(s => s === 1);
                const todo = state.findIndex(s => s === 0);
                let pick = -1;
                if (inProg !== -1 && (todo === -1 || Math.random() < .5)) pick = inProg;
                else if (todo !== -1) pick = todo;
                if (pick !== -1) advance(pick);
            }
            setTimeout(auto, 1500);
        }
        render();
        setTimeout(auto, 1800);
    })();

    /* ---------------------------------------------------------
       Pointer effects: spotlight, tilt, magnetic, chips
       --------------------------------------------------------- */
    if (fine && !reduce) {
        $$('.spot').forEach(el => el.addEventListener('pointermove', e => {
            const r = el.getBoundingClientRect();
            el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
            el.style.setProperty('--my', (e.clientY - r.top) + 'px');
        }));

        $$('[data-tilt]').forEach(el => {
            el.addEventListener('pointermove', e => {
                const r = el.getBoundingClientRect();
                const px = (e.clientX - r.left) / r.width - .5;
                const py = (e.clientY - r.top) / r.height - .5;
                el.style.transform = `perspective(800px) rotateX(${(-py * 9).toFixed(2)}deg) rotateY(${(px * 11).toFixed(2)}deg) translateY(-4px)`;
            });
            el.addEventListener('pointerleave', () => { el.style.transform = ''; });
        });

        const pw = $('#previewWrap'), pv = $('#demo');
        pw.addEventListener('pointermove', e => {
            const r = pw.getBoundingClientRect();
            const px = (e.clientX - r.left) / r.width - .5;
            const py = (e.clientY - r.top) / r.height - .5;
            pv.style.setProperty('--rx', (6 - py * 12).toFixed(2) + 'deg');
            pv.style.setProperty('--ry', (px * 14).toFixed(2) + 'deg');
        });
        pw.addEventListener('pointerleave', () => {
            pv.style.removeProperty('--rx');
            pv.style.removeProperty('--ry');
        });

        $$('[data-magnetic]').forEach(el => {
            el.addEventListener('pointermove', e => {
                const r = el.getBoundingClientRect();
                const dx = (e.clientX - (r.left + r.width / 2)) * .28;
                const dy = (e.clientY - (r.top + r.height / 2)) * .35;
                el.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;
            });
            el.addEventListener('pointerleave', () => { el.style.transform = ''; });
        });
    }

    $$('[data-chipgroup]').forEach(g => g.addEventListener('click', e => {
        const chip = e.target.closest('.chip');
        if (!chip) return;
        $$('.chip', g).forEach(c => c.classList.remove('on'));
        chip.classList.add('on');
    }));

    /* ---------------------------------------------------------
       Frame loop: scroll progress, parallax, marquee skew, glow
       --------------------------------------------------------- */
    if (!reduce) {
        const bar = $('#scrollProgress');
        const aurora = $('#aurora');
        const glow = $('#cursorGlow');
        const chips = $$('.fc');
        const rows = $$('.mrow');
        let lastY = scrollY, skew = 0, gx = mouse.x, gy = mouse.y;

        const loop = () => {
            const y = scrollY;
            const dy = y - lastY;
            lastY = y;
            const max = document.documentElement.scrollHeight - innerHeight;
            bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;

            const nx = mouse.x / innerWidth - .5;
            aurora.style.transform = `translate3d(${(nx * -30).toFixed(1)}px, ${(-y * .12).toFixed(1)}px, 0)`;

            chips.forEach(c => {
                const s = +c.dataset.speed;
                c.style.transform = `translate3d(${(nx * -s * 220).toFixed(1)}px, ${(-y * s).toFixed(1)}px, 0)`;
            });

            skew += (Math.max(-9, Math.min(9, dy * .22)) - skew) * .12;
            rows.forEach(r => { r.style.transform = `skewX(${skew.toFixed(2)}deg)`; });

            if (fine) {
                gx += (mouse.x - gx) * .12;
                gy += (mouse.y - gy) * .12;
                glow.style.transform = `translate3d(${gx.toFixed(1)}px, ${gy.toFixed(1)}px, 0)`;
            }
            requestAnimationFrame(loop);
        };
        loop();
    }

    /* ---------------------------------------------------------
       Tab title easter egg
       --------------------------------------------------------- */
    const title = document.title;
    document.addEventListener('visibilitychange', () => {
        document.title = document.hidden ? 'Come back! Your tasks miss you ✦' : title;
    });
})();
