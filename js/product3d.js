/* VELURA - product3d.js
   Cena 3D (Three.js): modelo GLB do aparelho, cameras por secao, animacoes e pontos de toque. */
function init3D(gltf) {
  let R;
  try {
    R = new THREE.WebGLRenderer({ canvas: $("#cv"), antialias: true, alpha: true });
  } catch (e) {
    noGL();
    return;
  }
  R.setPixelRatio(Math.min(devicePixelRatio, 2));
  R.outputEncoding = THREE.sRGBEncoding;
  R.toneMapping = THREE.ACESFilmicToneMapping;
  R.toneMappingExposure = 1.1;
  const S = new THREE.Scene(),
    C = new THREE.PerspectiveCamera(30, 1, 0.1, 60),
    pm = new THREE.PMREMGenerator(R),
    es = new THREE.Scene();
  es.background = new THREE.Color(0x35302b);
  [
    [0, 7, 2, 8, 0.2, 5, 0xffffff, 14],
    [-7, 1, 3, 0.2, 6, 6, 0xffe6dc, 7],
    [7, 0, -3, 0.2, 6, 6, 0xe9dcc4, 6],
    [0, -5, 0, 8, 0.2, 8, 0xffffff, 2.5],
  ].forEach((a) => {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(a[3], a[4], a[5]),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(a[6]).multiplyScalar(a[7]) }),
    );
    m.position.set(a[0], a[1], a[2]);
    es.add(m);
  });
  S.environment = pm.fromScene(es).texture;
  const dl = new THREE.DirectionalLight(0xffffff, 0.6);
  dl.position.set(3, 5, 6);
  S.add(dl);
  /* Modelo: models/velura.glb (Blender). Estrutura: "DEPILADOR" (corpo, botao, visor, base, cabecote de lamina)
     e "CABECA CIRCULAR" solta ao lado. Aqui as pecas sao redistribuidas em grupos animaveis (ver G/parts).
     O GLB esta em metros, Y para cima, frente em +Z, 0 a 0,169 m de altura: SC/DY o levam para as unidades da cena
     (base em y = -1.78, topo do cabecote em y = 1.42), que e o que as cameras e animacoes abaixo esperam. */
  const SC = 18.9,
    DY = -1.78,
    M = new THREE.Group();
  S.add(M);
  const parts = {};
  const G = (k) => {
    const g = new THREE.Group(),
      inner = new THREE.Group();
    inner.scale.setScalar(SC);
    inner.position.y = DY;
    g.add(inner);
    parts[k] = { g, inner, m: [], d: 1 };
    M.add(g);
    return g;
  };
  const body = G("body"),
    btn = G("btn"),
    led = G("led"),
    port = G("port"),
    foil = G("foil"),
    round = G("round");
  const model = gltf.scene,
    byName = (re) => {
      let r = null;
      model.traverse((o) => {
        if (!r && re.test(o.name)) r = o;
      });
      return r;
    },
    stray = byName(/^Cube/),
    main = byName(/^DEPILADOR/),
    disc = byName(/^CABE.A_CIRCULAR/);
  if (stray) stray.parent.remove(stray);
  [...main.children].forEach((o) => {
    const k = /^CABE.OTE/.test(o.name)
      ? "foil"
      : /^Bot/.test(o.name)
        ? "btn"
        : /^Visor/.test(o.name)
          ? "led"
          : /^Base/.test(o.name)
            ? "port"
            : "body";
    parts[k].inner.add(o);
  });
  /* a cabeca circular vem deitada ao lado; aqui ela entra no pescoco (centro x = 0, z = -0,002; base do cabecote em y = 0,1353) */
  disc.position.set(0, 0.1441, -0.0017);
  parts.round.inner.add(disc);
  /* cada malha ganha material proprio (o GLB reaproveita materiais entre pecas, e o destaque/esmaecimento e por peca) */
  const tint = [];
  for (const k in parts)
    parts[k].inner.traverse((o) => {
      if (!o.isMesh) return;
      const m = (o.material = o.material.clone());
      m.userData.em = m.emissive ? m.emissive.clone() : null;
      if (/^LED/.test(m.name)) {
        m.userData.em = m.color.clone().multiplyScalar(0.55); // digitos e barras acesos
      }
      if (/^(ABS|Metal|Visor|Junta)/.test(m.name)) {
        /* versao azul: mesma luminosidade do material, matiz azul (calculado em sRGB; em linear a saturacao se perde) */
        const hsl = {};
        m.userData.pink = m.color.clone();
        m.color.clone().convertLinearToSRGB().getHSL(hsl);
        m.userData.blue = new THREE.Color().setHSL(0.58, Math.max(0.65, hsl.s), hsl.l * 0.9).convertSRGBToLinear();
        tint.push(m);
      }
      parts[k].m.push(m);
    });
  const sh = document.createElement("canvas");
  sh.width = sh.height = 128;
  const cx = sh.getContext("2d"),
    gr = cx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(0,0,0,.45)");
  gr.addColorStop(1, "rgba(0,0,0,0)");
  cx.fillStyle = gr;
  cx.fillRect(0, 0, 128, 128);
  const bs = new THREE.Mesh(
    new THREE.CircleGeometry(1.4, 48),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sh), transparent: true, depthWrite: false }),
  );
  bs.rotation.x = -Math.PI / 2;
  bs.position.y = -1.82;
  M.add(bs);
  const ln = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0)]),
    new THREE.LineBasicMaterial({ color: 0xc7b28a, transparent: true, opacity: 0 }),
  );
  ln.position.y = 0.85;
  M.add(ln);
  const dot = new THREE.Mesh(
    new THREE.SphereGeometry(0.035, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xc7b28a, transparent: true, opacity: 0 }),
  );
  dot.position.set(0, 0.87, 0);
  M.add(dot);
  /* scenes: keyframes [start,end]; scroll interpolates between them, the same product travels throughout */
  const IV = [246, 242, 234],
    CH = [36, 35, 33],
    CR = [237, 230, 218],
    BL = [216, 182, 174];
  /* layout de celular em pe (isMob e fitMob ficam em main.js); celular deitado (altura < 520) usa o layout largo */
  let mob = isMob(),
    K;
  /* no celular o aparelho sobe e encolhe nas secoes com texto, para o texto ficar na metade de baixo */
  const kf = (o) =>
    Object.assign({ x: 0, y: mob ? 0.45 : 0, s: mob ? 0.8 : 1, ry: -0.3, rx: 0, hm: 0, cz: 10, cy: 0.2, ty: 0, bg: IV }, o);
  function mkK() {
    mob = isMob();
    /* compra: o aparelho fica no meio da metade esquerda; meia-largura visivel em z = 0 e 10 * tan(15 graus) * aspecto */
    const w = mob ? 0 : -0.55 * 2.679 * (innerWidth / innerHeight),
      cl = { y: 0, s: 1 },
      m0 = mob ? fitMob(0) : {},
      m1 = mob ? fitMob(1) : {},
      m2 = mob ? fitMob(2) : {},
      /* close da cabeca foil no inicio de "Swap the head": a camera mergulha nela e depois se afasta para a troca.
         Centro da cabeca no mundo = y + 1,18 * s (o cabecote vai de ~0,95 a 1,42 no modelo). */
      y1 = mob ? m1.y : 0,
      s1 = mob ? m1.s : 1,
      hy = y1 + 1.18 * s1;
    K = [
      [kf({ ...m0 })],
      [
        /* no celular um pouco mais longe: a cabeca cabe entre o menu e o texto */
        kf({ ...m1, bg: CH, ry: 0.55, rx: 0.12, cz: (mob ? 2.4 : 1.75) * s1, cy: hy + 0.3 * s1, ty: hy }),
        kf({ ...m1, bg: CH, ry: 0.5 }),
        kf({ ...m1, bg: CH, ry: -0.4, hm: 1 }),
      ],
      [kf({ ...m2, bg: CR, ry: -0.5, hm: 1 })],
      [kf({ ...cl, bg: CH, ry: 0, hm: 1, cz: 3.9, cy: 0.45, ty: mob ? -0.05 : 0.35 })],
      [kf({ ...cl, bg: BL, ry: 0.35, rx: -0.4, hm: 1, cz: 3.9, cy: -3.2, ty: mob ? -1.0 : -1.3 })],
      [kf({ bg: IV, x: w, ry: -0.5, hm: 1, y: mob ? 1.03 : 0, s: mob ? 0.4 : 1 })],
    ].map((a) => (a.length > 1 ? a : [a[0], a[0]]));
  }
  let AN = [];
  function mkA() {
    AN = [];
    secs.forEach((el, i) => {
      const t = el.offsetTop,
        h = el.offsetHeight,
        at = K[i].length === 3 ? [0.15, 0.45, 0.8] : [0.25, 0.75];
      K[i].forEach((k, j) => AN.push({ y: i || j ? t + at[j] * h : 0, k }));
    });
  }
  const cur = kf({ bg: IV.slice() }),
    tgt = kf({}),
    sm = (t) => t * t * (3 - 2 * t);
  function sample() {
    const y = scrollY + innerHeight * 0.5;
    let j = 0;
    while (j < AN.length - 2 && AN[j + 1].y <= y) j++;
    const a = AN[j],
      b = AN[j + 1],
      f = sm(c01((y - a.y) / Math.max(1, b.y - a.y)));
    for (const k of ["x", "y", "s", "ry", "rx", "hm", "cz", "cy", "ty"]) tgt[k] = a.k[k] + (b.k[k] - a.k[k]) * f;
    tgt.bg = a.k.bg.map((v, i) => v + (b.k.bg[i] - v) * f);
    fadeText();
    /* area de compra mais alta que a tela (telas baixas): o menu ganha fundo para nao ficar sobre o texto que rola */
    document.body.classList.toggle("navbg", secs[5].getBoundingClientRect().top < -2);
    $("#hsw").style.opacity = op[2];
    $("#hsw").style.visibility = op[2] > 0.02 ? "visible" : "hidden";
    /* ao sair da secao "Explore as pecas", solta selecao, hover e "segure" para o modelo voltar ao normal */
    if (op[2] < 0.05 && (sel || hov || holding)) {
      sel = hov = null;
      hset(false);
      panel();
    }
    /* movimento reduzido: sem dedo, so um toque ao entrar na secao */
    if (RM && op[3] > 0.7 && !shot) {
      shot = true;
      fire();
    }
    if (op[3] < 0.2) shot = false;
    /* depois da area de compra o canvas some (as secoes comuns tem fundo proprio) e o loop pula o desenho */
    cvOff = secs[5].getBoundingClientRect().bottom < 0;
    $("#cv").style.visibility = halo.style.visibility = vig.style.visibility = cvOff ? "hidden" : "visible";
  }
  function size() {
    const w = innerWidth,
      h = innerHeight;
    R.setSize(w, h, false);
    C.aspect = w / h;
    C.setViewOffset(w, h, 0, isMob() ? h * 0.13 : 0, w, h);
    C.updateProjectionMatrix();
    mkK();
    mkA();
    heroFit();
  }
  size();
  addEventListener("resize", size);
  /* o texto muda de altura quando a fonte carrega e quando troca o idioma: recalcula so o enquadramento */
  window.relayout = () => {
    mkK();
    mkA();
    heroFit();
  };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(window.relayout);
  if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener("loadingdone", window.relayout);
  let px = 0,
    py = 0,
    rx = 0,
    rY = 0;
  addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch") return;
    px = RM ? 0 : (e.clientX / innerWidth - 0.5) * 2;
    py = RM ? 0 : (e.clientY / innerHeight - 0.5) * 2;
  });
  /* iOS e navegadores dentro de apps podem derrubar o contexto WebGL (memoria, aba em segundo plano): vira o modo sem 3D */
  let dead = false;
  R.domElement.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    dead = true;
    noGL();
  });
  /* brilho atras do aparelho: segue o centro dele na tela */
  const halo = $("#halo"),
    vig = $("#vig"),
    hc = new THREE.Vector3();
  let first = true;
  const HS = {
    foil: { g: foil, l: [0, 1.05, 0.36], n: [0, 0, 1] },
    round: { g: round, l: [0, 1.15, 0.4], n: [0, 0, 1] },
    body: { g: body, l: [0, -0.3, 0.26], n: [0, 0, 1] },
    btn: { g: btn, l: [0, 0.034, 0.3], n: [0, 0, 1] },
    led: { g: led, l: [0, -1.19, 0.26], n: [0, 0, 1] },
    port: { g: port, l: [0, -1.8, 0], n: [0, -1, 0] },
  };
  const hbs = {};
  $$(".hs").forEach((b) => (hbs[b.dataset.k] = b));
  const v = new THREE.Vector3(),
    n = new THREE.Vector3();
  let cvOff = false,
    last = performance.now(),
    t0 = last,
    ex = 0,
    th = 0, // 0 = rosa, 1 = azul
    thShown = -1;
  function frame(now) {
    if (dead) return;
    requestAnimationFrame(frame);
    if (document.hidden) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    /* com o poster na tela, o 3D entra ja no lugar (o poster faz a entrada e some por cima); sem ele, sobe e aparece */
    if (first && $("#poster").classList.contains("in")) t0 = now - 1900;
    sample();
    if (cvOff) return;
    const k = RM ? 1 : 1 - Math.exp(-dt * 6);
    for (const q of ["x", "y", "s", "ry", "rx", "cz", "cy", "ty"]) cur[q] += (tgt[q] - cur[q]) * k;
    const hmT =
      op[2] > 0.5 && (sel === "foil" || hov === "foil")
        ? 0
        : op[2] > 0.5 && (sel === "round" || hov === "round")
          ? 1
          : tgt.hm;
    cur.hm += (hmT - cur.hm) * k;
    for (let i = 0; i < 3; i++) cur.bg[i] += (tgt.bg[i] - cur.bg[i]) * k;
    const bgc = `rgb(${cur.bg.map(Math.round)})`;
    document.body.style.background = bgc;
    document.documentElement.style.setProperty("--bg", bgc);
    const lum = (0.2126 * cur.bg[0] + 0.7152 * cur.bg[1] + 0.0722 * cur.bg[2]) / 255;
    document.body.classList.toggle("dkbg", lum < 0.6);
    /* quanto mais escuro o fundo, mais as bordas apagam (a luz fica so no aparelho) */
    vig.style.opacity = c01((0.6 - lum) / 0.4);
    ex += ((holding ? 1 : 0) - ex) * (RM ? 1 : Math.min(1, dt * 4));
    const it = RM ? 1 : 1 - Math.pow(1 - c01((now - t0) / 1900), 3);
    rx += (px - rx) * k;
    rY += (py - rY) * k;
    press = Math.max(0, press - dt * (RM ? 4 : 2.2));
    const pe = press * press;
    M.position.set(cur.x, cur.y - (1 - it) * 1.6, 0);
    M.scale.setScalar(cur.s * (1 + (1 - it) * 0.1) * (1 - 0.03 * pe));
    M.rotation.y = cur.ry + rx * 0.105;
    M.rotation.x = cur.rx + rY * 0.105;
    C.position.set(0, cur.cy, cur.cz);
    C.lookAt(0, cur.ty, 0);
    const hm = cur.hm,
      pf = 1 - sm(c01(hm / 0.6)),
      pr = sm(c01((hm - 0.4) / 0.6)),
      Lf = REM ? 1.7 : 0,
      rex = REM ? ex : 0,
      fa = hm < 0.5,
      fy = hm * Lf,
      ry = (1 - hm) * Lf;
    foil.position.set(fa ? 0 : -1.25 * rex, fa ? fy + rex * 1.2 : fy + (1 - fy) * rex, 0);
    round.position.set(fa ? 1.25 * rex : 0, fa ? ry + (1 - ry) * rex : ry + rex * 1.2, 0);
    /* a troca de cabecas e opaca: a que sai encolhe ate sumir e a que entra cresce (opacidade deixava a cabeca fantasma) */
    const sf = Math.max(1 - sm(c01((hm - 0.25) / 0.3)), rex),
      sr = Math.max(sm(c01((hm - 0.45) / 0.3)), rex);
    foil.scale.setScalar(Math.max(sf, 0.001));
    foil.position.y += 1.15 * (1 - sf);
    round.scale.setScalar(Math.max(sr, 0.001));
    round.position.y += 1.15 * (1 - sr);
    btn.position.z = -0.025 * pe;
    const ay = (fa ? foil : round).position.y;
    ln.scale.y = Math.max(0.01, ay);
    ln.material.opacity = REM ? Math.max(rex, 4 * hm * (1 - hm)) * 0.9 : 0;
    dot.material.opacity = ln.material.opacity;
    const pres = {
        body: 1,
        btn: 1,
        led: 1,
        port: 1,
        foil: sf,
        round: sr,
      },
      act = op[2] > 0.3 ? sel || hov : null;
    for (const key in parts) {
      const p = parts[key],
        dim = act ? (act === key ? 1 : key === "led" ? 0.8 : 0.45) : 1;
      p.d += (dim - p.d) * k;
      const o = (key === "foil" || key === "round" ? 1 : pres[key]) * p.d * it,
        e = act === key ? 0.12 : 0;
      p.g.visible = pres[key] * p.d * it > 0.01;
      for (const m of p.m) {
        if (m.opacity !== o) {
          m.opacity = o;
          const tr = o < 0.995;
          if (m.transparent !== tr) {
            m.transparent = tr;
            m.needsUpdate = true;
          }
        }
        if (m.emissive) {
          m.emissive.copy(m.userData.em);
          if (e) m.emissive.r += e * 0.78, (m.emissive.g += e * 0.7), (m.emissive.b += e * 0.54);
        }
      }
    }
    if (CONFIG.COLOR_OPTIONS_CONFIRMED) {
      th += ((colorT === 0xa9c7e0 ? 1 : 0) - th) * (RM ? 1 : 0.08);
      if (Math.abs(th - thShown) > 0.002) {
        thShown = th;
        for (const m of tint) m.color.copy(m.userData.pink).lerp(m.userData.blue, th);
      }
    }
    R.render(S, C);
    if (first) {
      first = false;
      loadP(1);
      document.body.classList.add("gl");
    }
    hc.set(0, -0.18, 0).applyMatrix4(M.matrixWorld).project(C);
    halo.style.transform = `translate(${(hc.x * 0.5 + 0.5) * innerWidth}px,${(-hc.y * 0.5 + 0.5) * innerHeight}px) translate(-50%,-50%) scale(${Math.min(1.8, (cur.s * 10) / cur.cz)})`;
    const w = innerWidth,
      h = innerHeight,
      vis = op[2] > 0.2;
    for (const key in HS) {
      const d = HS[key],
        b = hbs[key];
      let show =
        vis && (key !== "foil" || pf > 0.5 || rex > 0.5) && (key !== "round" || pr > 0.5 || rex > 0.5);
      if (show) {
        d.g.updateWorldMatrix(true, false);
        v.set(...d.l).applyMatrix4(d.g.matrixWorld);
        n.set(...d.n).applyQuaternion(M.quaternion);
        show = n.dot(C.position.clone().sub(v).normalize()) > 0.1;
        v.project(C);
        b.style.transform = `translate(${(v.x * 0.5 + 0.5) * w}px,${(-v.y * 0.5 + 0.5) * h}px)`;
      }
      b.classList.toggle("off", !show);
    }
    if (op[3] > 0.05) {
      btn.updateWorldMatrix(true, false);
      v.set(0, 0.034, 0.3).applyMatrix4(btn.matrixWorld).project(C);
      const bx = (v.x * 0.5 + 0.5) * w,
        by = (-v.y * 0.5 + 0.5) * h;
      rp.style.left = bx + "px";
      rp.style.top = by + "px";
      /* dedo: entra, toca o botao (fire no meio do toque), solta e sai; repete enquanto a secao esta na tela */
      const fg = $("#fg");
      if (!RM && op[3] > 0.35) {
        if (now - tapT0 > 4400) {
          tapT0 = now;
          tapFired = false;
        }
        const t = (now - tapT0) / 1000,
          ez = (x) => 1 - Math.pow(1 - c01(x), 3),
          fs = mob ? 0.8 : 1;
        let off = 0,
          sc = 1,
          a = 1;
        if (t < 0.9) {
          off = 1 - ez(t / 0.9);
          a = c01(t / 0.35);
        } else if (t < 1.5) {
          sc = t < 1.05 ? 1 - 0.1 * ((t - 0.9) / 0.15) : 0.9 + 0.1 * ez((t - 1.05) / 0.45);
          if (t >= 1 && !tapFired) {
            tapFired = true;
            fire();
          }
        } else if (t < 2.5) {
          off = ez((t - 1.5) / 0.9);
          a = 1 - c01((t - 1.7) / 0.7);
        } else a = 0;
        const press = t > 0.9 && t < 1.3 ? 5 : 0;
        fg.style.opacity = a * c01(op[3] * 2);
        fg.style.transform = `translate(${bx + off * 150 * fs - press}px,${by + off * 190 * fs - press}px) rotate(-28deg) scale(${sc * fs})`;
      } else {
        fg.style.opacity = 0;
        tapT0 = -1e9;
      }
    }
    $("#hcap").textContent = op[1] > 0.2 ? T[L][hm < 0.5 ? "cap1" : "cap2"] : "";
  }
  requestAnimationFrame(frame);
}
