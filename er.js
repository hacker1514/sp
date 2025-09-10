function showERDiagram() {
  if (document.getElementById("erdiagram-overlay")) return;
  const overlay = document.createElement("div");
  overlay.id = "erdiagram-overlay";
  overlay.style.position = "fixed";
  overlay.style.top = "0"; overlay.style.left = "0";
  overlay.style.width = "100vw"; overlay.style.height = "100vh";
  overlay.style.background = "rgba(14,19,34,0.97)";
  overlay.style.zIndex = "9999";
  overlay.style.display = "flex";
  overlay.style.flexDirection = "column";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.backdropFilter = "blur(2px)";
  document.body.appendChild(overlay);

  const title = document.createElement("div");
  title.innerText = "ER DIAGRAM FOR YOUR DATA BASE";
  title.style.fontSize = "2rem";
  title.style.fontFamily = "monospace";
  title.style.color = "#04fbe6";
  title.style.marginBottom = "10px";
  overlay.appendChild(title);

  const canvas = document.createElement("canvas");
  canvas.width = window.innerWidth * 0.9;
  canvas.height = window.innerHeight * 0.7;
  canvas.style.border = "2.2px solid cyan";
  canvas.style.background = "#10152b";
  canvas.style.borderRadius = "10px";
  canvas.tabIndex = 1000;
  overlay.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  const btnBar = document.createElement("div");
  btnBar.style.marginTop = "18px";
  overlay.appendChild(btnBar);

  function button(text, color, fn) {
    const btn = document.createElement("button");
    btn.innerText = text;
    btn.style.margin = "0 16px";
    btn.style.fontWeight = "bold";
    btn.style.fontSize = "1rem";
    btn.style.padding = "8px 15px";
    btn.style.background = color;
    btn.style.color = "#121";
    btn.style.border = "2px solid #0cf2";
    btn.style.borderRadius = "5px";
    btn.style.cursor = "pointer";
    btn.onclick = fn;
    return btn;
  }

  btnBar.appendChild(button("SAVE", "#0fa", () => saveCanvasAsPDF(canvas)));
  btnBar.appendChild(button("DISCARD", "#f44", () => overlay.remove()));
  btnBar.appendChild(button("ZOOM IN", "#3f8", () => zoomIn(1.23)));
  btnBar.appendChild(button("ZOOM OUT", "#3ac", () => zoomIn(1 / 1.23)));
  let lineModeActive = false;
  let selectedLine = null;
  btnBar.appendChild(button("LINE", "#0ff", () => { lineModeActive = !lineModeActive; selectedLine = null; if(lineModeActive){customLineStep=0;} draw(); }));

  let scale = 1, offsetX = 0, offsetY = 0;
  function zoomIn(f) { scale *= f; draw(); }
  canvas.addEventListener("wheel", e => {
    if (e.ctrlKey) { e.preventDefault(); scale *= (e.deltaY > 0 ? 0.85 : 1.18); draw(); }
  });
  let dragNode = null, dragOffset = { x: 0, y: 0 };
  let isPanning = false, panStart = { x: 0, y: 0 }, prevOffset = { x: 0, y: 0 };

  const tooltip = document.createElement("div");
  tooltip.style.position = "fixed";
  tooltip.style.visibility = "hidden";
  tooltip.style.pointerEvents = "none";
  tooltip.style.background = "rgba(20,40,70,0.95)";
  tooltip.style.color = "#fff";
  tooltip.style.padding = "8px 14px";
  tooltip.style.borderRadius = "5px";
  tooltip.style.border = "1.5px solid #0ff8";
  tooltip.style.fontSize = "1rem";
  tooltip.style.fontFamily = "monospace";
  tooltip.style.zIndex = "99999";
  overlay.appendChild(tooltip);

  let tables = [], relationships = [];
  try {
    let result = db.exec("SELECT name FROM sqlite_master WHERE type='table';");
    tables = result[0]?.values?.map(row => ({
      name: row[0],
      columns: db.exec(`PRAGMA table_info(${row[0]});`)[0].values.map(c => ({
        name: c[1],
        pk: c[5] === 1,
      })),
      x: 0,
      y: 0
    })) || [];
    relationships = [];
    tables.forEach((t, idx) => {
      const fkInfo = db.exec(`PRAGMA foreign_key_list(${t.name});`);
      fkInfo[0]?.values?.forEach(fk => {
        relationships.push({
          from: t.name,
          to: fk[2],
          fromCol: fk[3],
          toCol: fk[4],
        });
      });
    });
  } catch (e) {
    tables = [
      { name: "User", x: 100, y: 100, columns: [{ name: "id", pk: true }, { name: "email" }, { name: "role_id" }] },
      { name: "Role", x: 400, y: 120, columns: [{ name: "id", pk: true }, { name: "name" }] },
      { name: "Post", x: 240, y: 350, columns: [{ name: "id", pk: true }, { name: "title" }, { name: "user_id" }] },
    ];
    relationships = [
      { from: "User", to: "Role", fromCol: "role_id", toCol: "id" },
      { from: "Post", to: "User", fromCol: "user_id", toCol: "id" },
    ];
  }
  const customLines = [];
  let customLineStep = 0;
  let tempCustomLine = [];

  const gridSpacing = 260, rowSpacing = 170;
  tables.forEach((t, i) => { t.x = 90 + (i % 3) * gridSpacing; t.y = 80 + Math.floor(i / 3) * rowSpacing; });

  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);

    relationships.forEach(rel => {
      const from = tables.find(t => t.name === rel.from);
      const to = tables.find(t => t.name === rel.to);
      if (!from || !to) return;
      const fromIdx = from.columns.findIndex(c => c.name === rel.fromCol) || 0;
      const toIdx = to.columns.findIndex(c => c.name === rel.toCol) || 0;
      const fromX = from.x + 180;
      const fromY = from.y + 35 + 23 * fromIdx;
      const toX = to.x;
      const toY = to.y + 35 + 23 * toIdx;
      ctx.save();
      ctx.strokeStyle = "#0fd";
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      const mx = (fromX + toX) / 2;
      ctx.bezierCurveTo(mx, fromY, mx, toY, toX, toY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(toX, toY);
      ctx.lineTo(toX - 9, toY - 6);
      ctx.lineTo(toX - 9, toY + 6);
      ctx.closePath();
      ctx.fillStyle = "#0fd";
      ctx.fill();
      ctx.restore();
    });

    customLines.forEach((line, idx) => {
      const from = tables.find(t => t.name === line.from);
      const to = tables.find(t => t.name === line.to);
      if (from && to) {
        const fx = from.x + 100, fy = from.y + 5;
        const tx = to.x + 100, ty = to.y + 5;
        ctx.save();
        ctx.strokeStyle = idx === selectedLine ? "#f43" : "#0ff";
        ctx.lineWidth = idx === selectedLine ? 5 : 4;
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        ctx.restore();
      }
    });

    tables.forEach((t, i) => {
      const isDragging = dragNode === t;
      const boxW = 200, boxH = 30 + t.columns.length * 23;
      ctx.save();
      ctx.shadowColor = "#0ffb";
      ctx.shadowBlur = isDragging ? 18 : 8;
      ctx.lineWidth = isDragging ? 4 : 3;
      ctx.fillStyle = isDragging ? "#0e2a38" : "#181820";
      ctx.strokeStyle = isDragging ? "#f6f70f" : "#00ffee";
      ctx.beginPath();
      ctx.roundRect(t.x, t.y, boxW, boxH, 16);
      ctx.fill();
      ctx.stroke();
      ctx.font = "bold 18px monospace";
      ctx.fillStyle = "#0ff";
      ctx.fillText(t.name, t.x + 13, t.y + 26);
      ctx.font = "15px monospace";
      t.columns.forEach((col, j) => {
        ctx.fillStyle = col.pk
          ? "#faf06d"
          : relationships.some(r => r.from === t.name && r.fromCol === col.name)
          ? "#92ffca"
          : "#e2e2fa";
        ctx.fillText(
          (col.pk ? " " : "") + col.name,
          t.x + 13,
          t.y + 53 + j * 23
        );
      });
      ctx.restore();
    });

    if (lineModeActive && tempCustomLine.length === 1) {
      ctx.save();
      let e = tempCustomLine[0],
        mx = mousePos.x, my = mousePos.y;
      ctx.strokeStyle = "#0ff8";
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 5]);
      ctx.beginPath();
      ctx.moveTo(e.x + 100, e.y + 5);
      ctx.lineTo(mx, my);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  }
  draw();

  function canvasToDiagram(x, y) { return { x: (x - offsetX) / scale, y: (y - offsetY) / scale }; }
  let mousePos = { x: 0, y: 0 };
  canvas.addEventListener("mousedown", e => {
    const { x, y } = canvasToDiagram(e.offsetX, e.offsetY);
    if (lineModeActive) {
      let table = null;
      for (const t of tables) {
        if (
          x >= t.x && x <= t.x + 200 &&
          y >= t.y && y <= t.y + 30 + t.columns.length * 23
        ) { table = t; break; }
      }
      if (table) {
        tempCustomLine.push(table);
        if (tempCustomLine.length === 2) {
          if(tempCustomLine[0].name !== tempCustomLine[1].name){
            customLines.push({ from: tempCustomLine[0].name, to: tempCustomLine[1].name });
          }
          tempCustomLine = [];
          lineModeActive = false;
        }
        draw();
      }
      return;
    }
    let node = null;
    for (const t of tables) {
      if (
        x >= t.x && x <= t.x + 200 &&
        y >= t.y && y <= t.y + 30 + t.columns.length * 23
      ) { node = t; break; }
    }
    if (node) {
      dragNode = node;
      dragOffset.x = x - node.x;
      dragOffset.y = y - node.y;
    } else {
      isPanning = true;
      panStart.x = e.clientX;
      panStart.y = e.clientY;
      prevOffset.x = offsetX;
      prevOffset.y = offsetY;
    }
    mousePos = { x, y };
    selectedLine = null;
    for (let idx = 0; idx < customLines.length; idx++) {
      const line = customLines[idx];
      const from = tables.find(t => t.name === line.from);
      const to = tables.find(t => t.name === line.to);
      if (!from || !to) continue;
      const fx = from.x + 100, fy = from.y + 5;
      const tx = to.x + 100, ty = to.y + 5;
      const dist = pointLineDistance(x, y, fx, fy, tx, ty);
      if (dist < 8) {
        selectedLine = idx;
        break;
      }
    }
    draw();
  });

  function pointLineDistance(px, py, x1, y1, x2, y2) {
    let dx = x2 - x1, dy = y2 - y1;
    let length = Math.sqrt(dx * dx + dy * dy);
    let t = ((px - x1) * dx + (py - y1) * dy) / (length * length);
    t = Math.max(0, Math.min(1, t));
    let lx = x1 + t * dx, ly = y1 + t * dy;
    return Math.sqrt((lx - px) ** 2 + (ly - py) ** 2);
  }

  document.addEventListener("keydown", e => {
    if (e.key === "Delete" && selectedLine != null) {
      customLines.splice(selectedLine, 1);
      selectedLine = null;
      draw();
    }
  });

  canvas.addEventListener("mousemove", e => {
    const { x, y } = canvasToDiagram(e.offsetX, e.offsetY);
    mousePos = { x, y };
    if (dragNode) {
      dragNode.x = x - dragOffset.x;
      dragNode.y = y - dragOffset.y;
      draw();
    } else if (isPanning) {
      offsetX = prevOffset.x + (e.clientX - panStart.x);
      offsetY = prevOffset.y + (e.clientY - panStart.y);
      draw();
    } else {
      let hovered = null;
      for (const t of tables) {
        const inBox =
          x >= t.x && x <= t.x + 200 &&
          y >= t.y && y <= t.y + 30 + t.columns.length * 23;
        if (inBox) {
          hovered = { type: "table", data: t };
          break;
        }
      }
      if (hovered) {
        tooltip.innerText = hovered.data.name + "\n" + hovered.data.columns.map(c => (c.pk ? "[PK] " : "") + c.name).join("\n");
        tooltip.style.left = e.clientX + 18 + "px";
        tooltip.style.top = e.clientY + 16 + "px";
        tooltip.style.visibility = "visible";
      } else {
        tooltip.style.visibility = "hidden";
      }
    }
    if (lineModeActive) draw();
  });
  canvas.addEventListener("mouseup", () => { dragNode = null; isPanning = false; });
  canvas.addEventListener("mouseleave", () => { dragNode = null; isPanning = false; tooltip.style.visibility = "hidden"; });

  function saveCanvasAsPDF(canvas) {
    const offCanvas = document.createElement("canvas");
    offCanvas.width = canvas.width;
    offCanvas.height = canvas.height;
    const bgctx = offCanvas.getContext("2d");
    bgctx.fillStyle = "#000";
    bgctx.fillRect(0, 0, offCanvas.width, offCanvas.height);
    bgctx.drawImage(canvas, 0, 0);
    const imgData = offCanvas.toDataURL("image/png");
    const pdf = new window.jspdf.jsPDF({
      orientation: canvas.width > canvas.height ? "landscape" : "portrait",
      unit: "px",
      format: [canvas.width, canvas.height],
    });
    pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
    pdf.save("erdiagram.pdf");
  }
  (function loadJsPDF() {
    if (!window.jspdf) {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      document.head.appendChild(script);
    }
  })();
}
