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
  /* estudio de luz quente, como nas fotos do fornecedor (parede areia, sol lateral) */
  es.background = new THREE.Color(0x4a3a31);
  [
    [0, 7, 2, 8, 0.2, 5, 0xfff3e6, 14],
    [-7, 1, 3, 0.2, 6, 6, 0xffdcc4, 7],
    [7, 0, -3, 0.2, 6, 6, 0xf2d4b6, 6],
    [0, -5, 0, 8, 0.2, 8, 0xfbe6d2, 2.5],
  ].forEach((a) => {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(a[3], a[4], a[5]),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(a[6]).multiplyScalar(a[7]) }),
    );
    m.position.set(a[0], a[1], a[2]);
    es.add(m);
  });
  /* o aparelho e iluminado pelo mapa de ambiente; o corredor so pelo foco (luz direcional deixava a parede chapada) */
  S.environment = pm.fromScene(es).texture;
  /* Corredor de arcos (ideia do Oryzo + alcovas do Cartier): paredes com abertura em arco a cada D unidades em -Z,
     com contorno de luz rose. O corredor anda em Z conforme o capitulo (quadro-chave "ez"), entao a camera passa por
     um arco a cada capitulo. Tudo gerado aqui (sem arquivos). Fundo e nevoa usam a cor do capitulo (cur.bg). */
  S.background = new THREE.Color(0x17110e);
  S.fog = new THREE.Fog(0x17110e, 13, 46);
  S.add(new THREE.HemisphereLight(0xffd9c4, 0x0c0806, 0.1));
  /* foco quente logo a frente do arco atual: uma poca de luz na parede e no piso em volta do aparelho, bordas no escuro
     (a luz anda junto com o aparelho, nao com o corredor) */
  const key = new THREE.PointLight(0xffc09c, 2.2, 11, 2);
  key.position.set(0.4, 3.4, -0.6);
  S.add(key);
  /* D > distancia da camera (10) + 2,6: o arco do capitulo anterior ja fica atras da camera (senao a coluna dele
     cortava a tela quando o aparelho esta deslocado para o lado) */
  const D = 13,
    env = new THREE.Group(),
    corr = new THREE.Group(),
    aw = 2.3, // meia-largura da abertura
    ah = 3.2, // altura do trecho reto da abertura (a partir do piso)
    fy = -1.86, // piso, logo abaixo da base do aparelho
    /* luz calculada por pixel (Standard): com Lambert a parede tem triangulos enormes e o foco nao aparecia;
       o mapa de ambiente do aparelho entra fraco aqui, para a luz vir do foco */
    wallM = new THREE.MeshStandardMaterial({ color: 0x7a5646, roughness: 0.92, metalness: 0, envMapIntensity: 0.015 }),
    glowM = new THREE.MeshBasicMaterial({ color: 0xf0b49a }),
    floorM = new THREE.MeshStandardMaterial({ color: 0x3a2619, roughness: 0.55, metalness: 0, envMapIntensity: 0.02 });
  env.add(corr, key);
  S.add(env);
  const wall = new THREE.Shape();
  wall.moveTo(-40, fy).lineTo(40, fy).lineTo(40, 30).lineTo(-40, 30).lineTo(-40, fy);
  const hole = new THREE.Path();
  hole.moveTo(-aw, fy).lineTo(aw, fy).lineTo(aw, fy + ah).absarc(0, fy + ah, aw, 0, Math.PI, false).lineTo(-aw, fy);
  wall.holes.push(hole);
  const wallG = new THREE.ExtrudeGeometry(wall, { depth: 0.6, bevelEnabled: false, curveSegments: 40 }),
    edge = new THREE.CurvePath();
  edge.add(new THREE.LineCurve3(new THREE.Vector3(-aw, fy, 0), new THREE.Vector3(-aw, fy + ah, 0)));
  edge.add(
    new THREE.CatmullRomCurve3(
      Array.from({ length: 25 }, (_, i) => {
        const a = Math.PI - (i / 24) * Math.PI;
        return new THREE.Vector3(Math.cos(a) * aw, fy + ah + Math.sin(a) * aw, 0);
      }),
    ),
  );
  edge.add(new THREE.LineCurve3(new THREE.Vector3(aw, fy + ah, 0), new THREE.Vector3(aw, fy, 0)));
  const glowG = new THREE.TubeGeometry(edge, 120, 0.022, 6, false);
  for (let k = 0; k < 8; k++) {
    const g = new THREE.Group(),
      w = new THREE.Mesh(wallG, wallM),
      l = new THREE.Mesh(glowG, glowM);
    w.position.z = -0.6; // a face da parede fica em z = 0 do arco
    l.position.z = 0.02;
    g.add(w, l);
    g.position.z = -2.6 - k * D;
    corr.add(g);
  }
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 120), floorM);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, fy - 0.001, -50);
  env.add(floor);
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
  /* fundo/nevoa de cada capitulo: tons de noite quente (cafe, umbra, pau-rosa) */
  const NI = [23, 17, 14],
    UM = [30, 21, 17],
    RW = [38, 23, 21],
    UM2 = [33, 24, 18];
  /* layout de celular em pe (isMob e fitMob ficam em main.js); celular deitado (altura < 520) usa o layout largo */
  let mob = isMob(),
    K;
  /* no celular o aparelho sobe e encolhe nas secoes com texto, para o texto ficar na metade de baixo */
  const kf = (o) =>
    Object.assign({ x: 0, y: mob ? 0.45 : 0, s: mob ? 0.8 : 1, ry: -0.3, rx: 0, hm: 0, cz: 10, cy: 0.2, ty: 0, ez: 0, bg: NI }, o);
  /* secoes .sc: 0 hero, 1 cabeca foil, 2 troca, 3 pecas (EX), 4 cuidados, 5 compra. Cada uma fica num arco do
     corredor (ez = indice * D): entre uma secao e a seguinte a camera atravessa o arco. */
  function mkK() {
    mob = isMob();
    /* meia-largura visivel em z = 0: 10 * tan(15 graus) * aspecto = 2,679 * aspecto */
    const hw = 2.679 * (innerWidth / innerHeight),
      m = [0, 1, 2, 3, 4].map((i) => (mob ? fitMob(i) : {})),
      /* close da cabeca foil (capitulo 01). Centro da cabeca no mundo = y + 1,18 * s (cabecote de ~0,95 a 1,42).
         No celular um pouco mais longe: a cabeca cabe entre o menu e o texto */
      y1 = mob ? m[1].y : 0,
      s1 = mob ? m[1].s : 1,
      hy = y1 + 1.18 * s1,
      macro = (o) =>
        kf({ ...m[1], bg: UM, ry: 0.55, rx: 0.12, cz: (mob ? 3.2 : 2.7) * s1, cy: hy + 0.3 * s1, ty: hy, ez: D, ...o });
    K = [
      /* hero: aparelho no arco, a direita do texto no desktop */
      [kf({ ...m[0], x: mob ? 0 : 0.22 * hw, ry: -0.35 }), kf({ ...m[0], x: mob ? 0 : 0.22 * hw, ry: 0.1 })],
      [macro(), macro({ ry: 0.25, rx: 0.06 })],
      [kf({ ...m[2], bg: RW, ry: 0.5, ez: 2 * D }), kf({ ...m[2], bg: RW, ry: -0.4, hm: 1, ez: 2 * D })],
      [kf({ ...m[3], bg: NI, ry: -0.5, hm: 1, ez: 3 * D })],
      /* cuidados: de lado, mostrando a base (porta de carga) e o perfil */
      [kf({ ...m[4], bg: UM2, x: mob ? 0 : 0.24 * hw, ry: 1.0, rx: -0.12, hm: 0, ez: 4 * D })],
      /* compra: o aparelho fica no meio da metade esquerda */
      [kf({ bg: NI, x: mob ? 0 : -0.55 * hw, ry: -0.5, hm: 1, y: mob ? 1.03 : 0, s: mob ? 0.4 : 1, ez: 5 * D })],
    ].map((a) => (a.length > 1 ? a : [a[0], a[0]]));
  }
  const EX = 3;
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
  const cur = kf({ bg: NI.slice() }),
    tgt = kf({}),
    sm = (t) => t * t * (3 - 2 * t),
    KEYS = ["x", "y", "s", "ry", "rx", "hm", "cz", "cy", "ty", "ez"];
  function sample() {
    const y = scrollY + innerHeight * 0.5;
    let j = 0;
    while (j < AN.length - 2 && AN[j + 1].y <= y) j++;
    const a = AN[j],
      b = AN[j + 1],
      f = sm(c01((y - a.y) / Math.max(1, b.y - a.y)));
    for (const k of KEYS) tgt[k] = a.k[k] + (b.k[k] - a.k[k]) * f;
    tgt.bg = a.k.bg.map((v, i) => v + (b.k.bg[i] - v) * f);
    fadeText();
    /* area de compra mais alta que a tela (telas baixas): o menu ganha fundo para nao ficar sobre o texto que rola */
    const bz = buy.getBoundingClientRect();
    document.body.classList.toggle("navbg", bz.top < -2);
    $("#hsw").style.opacity = op[EX];
    $("#hsw").style.visibility = op[EX] > 0.02 ? "visible" : "hidden";
    /* ao sair da secao "Explore as pecas", solta selecao, hover e "segure" para o modelo voltar ao normal */
    if (op[EX] < 0.05 && (sel || hov || holding)) {
      sel = hov = null;
      hset(false);
      panel();
    }
    /* depois da area de compra o canvas some (as secoes comuns tem fundo proprio) e o loop pula o desenho */
    cvOff = bz.bottom < 0;
    $("#cv").style.visibility = cvOff ? "hidden" : "visible";
  }
  const buy = secs[secs.length - 1];
  function size() {
    const w = innerWidth,
      h = innerHeight;
    R.setSize(w, h, false);
    C.aspect = w / h;
    C.setViewOffset(w, h, 0, isMob() ? h * 0.13 : 0, w, h);
    C.updateProjectionMatrix();
    mkK();
    mkA();
  }
  size();
  addEventListener("resize", size);
  /* o texto muda de altura quando a fonte carrega e quando troca o idioma: recalcula so o enquadramento */
  window.relayout = () => {
    mkK();
    mkA();
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
  let first = true;
  const HS = {
    foil: { g: foil, l: [0, 1.05, 0.36], n: [0, 0, 1] },
    round: { g: round, l: [0, 1.15, 0.4], n: [0, 0, 1] },
    body: { g: body, l: [0, -0.3, 0.26], n: [0, 0, 1] },
    btn: { g: btn, l: [0, 0.034, 0.3], n: [0, 0, 1] },
    led: { g: led, l: [0, -1.19, 0.26], n: [0, 0, 1] },
    port: { g: port, l: [0, -1.8, 0], n: [0, -1, 0] },
  };
  /* zoom de cada peca: rotacao para ela ficar de frente (a porta de carga inclina para mostrar a base) */
  const FOC = {
      foil: { ry: 0.45, rx: 0.15 },
      round: { ry: 0.45, rx: 0.15 },
      body: { ry: 0.7, rx: 0 },
      /* botao: enquadra o botao e o visor juntos (ao ligar, o visor acende): mira entre os dois, um pouco mais longe */
      btn: { ry: 0.12, rx: 0, y: -0.55, z: 1.3 },
      led: { ry: -0.08, rx: 0 },
      port: { ry: 0.25, rx: -0.85 },
    },
    aim = {};
  const hbs = {};
  $$(".hs").forEach((b) => (hbs[b.dataset.k] = b));
  /* arrastar na area da secao (elemento #drag, touch-action: pan-y) gira o aparelho; toque sem arrastar solta o zoom */
  let uRy = 0,
    uT = 0,
    dX = null,
    dMoved = false;
  const dg = $("#drag");
  dg.addEventListener("pointerdown", (e) => {
    dX = e.clientX;
    dMoved = false;
    dg.setPointerCapture(e.pointerId);
    dg.classList.add("on");
  });
  dg.addEventListener("pointermove", (e) => {
    if (dX === null) return;
    const d = e.clientX - dX;
    if (Math.abs(d) > 2) dMoved = true;
    uT += d * 0.009;
    dX = e.clientX;
  });
  const dEnd = (e) => {
    if (dX !== null && !dMoved && e.type === "pointerup" && sel) {
      sel = null;
      panel();
    }
    dX = null;
    dg.classList.remove("on");
  };
  ["pointerup", "pointercancel"].forEach((n) => dg.addEventListener(n, dEnd));
  /* vetores reaproveitados a cada quadro (criar objetos no laco gera pausas do coletor de lixo) */
  const v = new THREE.Vector3(),
    n = new THREE.Vector3(),
    tc = new THREE.Vector3();
  let cvOff = false,
    last = performance.now(),
    t0 = last,
    ex = 0,
    th = 0, // 0 = rosa, 1 = azul
    thShown = -1,
    pwr = 0; // 0 = desligado, 1 = ligado (suavizado)
  function frame(now) {
    if (dead) return;
    requestAnimationFrame(frame);
    if (document.hidden) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    sample();
    if (cvOff) return;
    const k = RM ? 1 : 1 - Math.exp(-dt * 6);
    /* "Explore as pecas": com uma peca escolhida, a camera chega perto e mira a altura dela, e o aparelho gira para a
       peca ficar de frente (FOC). Altura da peca no mundo = y + s * (ly * cos(rx) - lz * sin(rx)). */
    let A = tgt;
    if (op[EX] > 0.5 && sel && !holding) {
      const f = FOC[sel],
        l = HS[sel].l,
        wy = tgt.y + tgt.s * ((f.y !== undefined ? f.y : l[1]) * Math.cos(f.rx) - l[2] * Math.sin(f.rx));
      A = Object.assign(aim, tgt, { ry: f.ry, rx: f.rx, cz: (mob ? 4.6 : 4.1) * (f.z || 1) * tgt.s, cy: wy + 0.25 * tgt.s, ty: wy });
    }
    /* o corredor anda um pouco mais devagar que o aparelho: passar pelo arco tem peso (inercia, como no Oryzo) */
    for (const q of KEYS) if (q !== "hm") cur[q] += (A[q] - cur[q]) * (q === "ez" && !RM ? 1 - Math.exp(-dt * 3.2) : k);
    /* arrastar gira o aparelho (so em "Explore as pecas"; ao sair, volta) */
    if (op[EX] < 0.05) uT = 0;
    uRy += (uT - uRy) * k;
    const hmT =
      op[EX] > 0.5 && (sel === "foil" || hov === "foil")
        ? 0
        : op[EX] > 0.5 && (sel === "round" || hov === "round")
          ? 1
          : tgt.hm;
    cur.hm += (hmT - cur.hm) * k;
    for (let i = 0; i < 3; i++) cur.bg[i] += (tgt.bg[i] - cur.bg[i]) * k;
    S.background.setRGB(cur.bg[0] / 255, cur.bg[1] / 255, cur.bg[2] / 255).convertSRGBToLinear();
    S.fog.color.copy(S.background);
    document.documentElement.style.setProperty("--bg", `rgb(${cur.bg.map(Math.round)})`);
    /* o corredor acompanha o aparelho em x, y e escala; anda em z conforme o capitulo */
    env.position.set(cur.x, cur.y, 0);
    env.scale.setScalar(cur.s);
    corr.position.z = cur.ez;
    ex += ((holding ? 1 : 0) - ex) * (RM ? 1 : Math.min(1, dt * 4));
    const it = RM ? 1 : 1 - Math.pow(1 - c01((now - t0) / 1900), 3);
    rx += (px - rx) * k;
    rY += (py - rY) * k;
    M.position.set(cur.x, cur.y - (1 - it) * 1.6, 0);
    M.scale.setScalar(cur.s * (1 + (1 - it) * 0.1));
    M.rotation.y = cur.ry + rx * 0.105 + uRy;
    M.rotation.x = cur.rx + rY * 0.105;
    /* ligar no zoom do botao (power, main.js): o visor acende (lk) e o aparelho vibra como um motor ligado;
       o botao afunda por ~0,3 s a cada toque. Com movimento reduzido: visor acende, sem tremer. */
    const pzm = sel === "btn" && op[EX] > 0.5;
    pwr += ((pzm && power ? 1 : 0) - pwr) * Math.min(1, dt * 7);
    const lk = pzm ? 0.12 + 0.88 * pwr : 1,
      bp = c01(1 - (now - pressT) / 300);
    btn.position.z = -0.028 * Math.sin(bp * Math.PI);
    M.rotation.z = 0;
    if (pwr > 0.01 && !RM) {
      const a = pwr * cur.s;
      M.position.x += Math.sin(now * 0.47) * 0.006 * a + Math.sin(now * 0.83) * 0.003 * a;
      M.position.y += Math.cos(now * 0.61) * 0.004 * a;
      M.rotation.z = Math.sin(now * 0.53) * 0.004 * pwr;
    }
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
      act = op[EX] > 0.3 ? sel || hov : null;
    /* peca escolhida: brilho proprio (emissive). As outras continuam opacas: esmaecer com transparencia deixava o corpo
       translucido, com faixas das pecas de dentro aparecendo (bug) */
    for (const key in parts) {
      const p = parts[key],
        o = (key === "foil" || key === "round" ? 1 : pres[key]) * it,
        e = act === key ? 0.16 : 0;
      p.g.visible = pres[key] * it > 0.01;
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
          if (key === "led") m.emissive.multiplyScalar(lk);
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
      document.body.classList.add("gl");
    }
    const w = innerWidth,
      h = innerHeight,
      vis = op[EX] > 0.2;
    for (const key in HS) {
      const d = HS[key],
        b = hbs[key];
      let show =
        vis && (key !== "foil" || pf > 0.5 || rex > 0.5) && (key !== "round" || pr > 0.5 || rex > 0.5);
      if (show) {
        d.g.updateWorldMatrix(true, false);
        v.set(...d.l).applyMatrix4(d.g.matrixWorld);
        n.set(...d.n).applyQuaternion(M.quaternion);
        show = n.dot(tc.copy(C.position).sub(v).normalize()) > 0.1;
        v.project(C);
        b.style.transform = `translate(${(v.x * 0.5 + 0.5) * w}px,${(-v.y * 0.5 + 0.5) * h}px)`;
      }
      b.classList.toggle("off", !show);
      b.classList.toggle("sel", key === sel);
      b.classList.toggle("pw", key === "btn" && pwr > 0.5);
    }
    $("#hcap").textContent = op[2] > 0.2 ? T[L][hm < 0.5 ? "cap1" : "cap2"] : "";
  }
  requestAnimationFrame(frame);
}
