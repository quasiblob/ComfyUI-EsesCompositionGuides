import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";


// Variables -----------------------

const PADDING = 10;
const HEADER_HEIGHT = 410; 


// Helper functions ----------------

/**
 * Parses a comma-separated RGB or RGBA string into a valid CSS rgba() color.
 * @param {string} colorString The input string, e.g., "255,0,0" or "255,0,0,128".
 * @returns {string} A CSS rgba() color string.
 */
function parseColorString(colorString) {
    const defaultColor = { r: 192, g: 192, b: 192, a: 1.0 };
    if (typeof colorString !== 'string') {
        return `rgba(${defaultColor.r}, ${defaultColor.g}, ${defaultColor.b}, ${defaultColor.a})`;
    }

    const parts = colorString.split(',').map(s => parseInt(s.trim(), 10));

    const r = !isNaN(parts[0]) ? parts[0] : defaultColor.r;
    const g = !isNaN(parts[1]) ? parts[1] : defaultColor.g;
    const b = !isNaN(parts[2]) ? parts[2] : defaultColor.b;
    const a = (parts.length > 3 && !isNaN(parts[3])) ? parts[3] / 255.0 : 1.0;

    return `rgba(${r}, ${g}, ${b}, ${a})`;
}



// Line drawing functions ----------

const GuideDrawer = {

    drawGrid(ctx, p) {
        for (let i = 1; i < p.xLines; i++) {
            const x = p.offsetX + (p.drawWidth / p.xLines) * i;
            ctx.moveTo(x, p.offsetY); ctx.lineTo(x, p.offsetY + p.drawHeight);
        }

        for (let i = 1; i < p.yLines; i++) {
            const y = p.offsetY + (p.drawHeight / p.yLines) * i;
            ctx.moveTo(p.offsetX, y); ctx.lineTo(p.offsetX + p.drawWidth, y);
        }
    },

    drawDiagonals(ctx, p) {
        ctx.moveTo(p.offsetX, p.offsetY); ctx.lineTo(p.offsetX + p.drawWidth, p.offsetY + p.drawHeight);
        ctx.moveTo(p.offsetX, p.offsetY + p.drawHeight); ctx.lineTo(p.offsetX + p.drawWidth, p.offsetY);
    },

    drawPhiGrid(ctx, p) {
        const PHI = 1.61803398875;
        const shortSegX = p.drawWidth / (PHI + 1); const longSegX = shortSegX * PHI;
        const shortSegY = p.drawHeight / (PHI + 1); const longSegY = shortSegY * PHI;

        ctx.moveTo(p.offsetX + shortSegX, p.offsetY); ctx.lineTo(p.offsetX + shortSegX, p.offsetY + p.drawHeight);
        ctx.moveTo(p.offsetX + longSegX, p.offsetY); ctx.lineTo(p.offsetX + longSegX, p.offsetY + p.drawHeight);
        ctx.moveTo(p.offsetX, p.offsetY + shortSegY); ctx.lineTo(p.offsetX + p.drawWidth, p.offsetY + shortSegY);
        ctx.moveTo(p.offsetX, p.offsetY + longSegY); ctx.lineTo(p.offsetX + p.drawWidth, p.offsetY + longSegY);
    },

    drawPyramid(ctx, p) {
        if (p.mode === "Up / Down" || p.mode === "Both") {
            ctx.moveTo(p.offsetX, p.offsetY + p.drawHeight); ctx.lineTo(p.offsetX + p.drawWidth / 2, p.offsetY); ctx.lineTo(p.offsetX + p.drawWidth, p.offsetY + p.drawHeight);
            ctx.moveTo(p.offsetX, p.offsetY); ctx.lineTo(p.offsetX + p.drawWidth / 2, p.offsetY + p.drawHeight); ctx.lineTo(p.offsetX + p.drawWidth, p.offsetY);
        }

        if (p.mode === "Left / Right" || p.mode === "Both") {
            ctx.moveTo(p.offsetX, p.offsetY); ctx.lineTo(p.offsetX + p.drawWidth, p.offsetY + p.drawHeight / 2); ctx.lineTo(p.offsetX, p.offsetY + p.drawHeight);
            ctx.moveTo(p.offsetX + p.drawWidth, p.offsetY); ctx.lineTo(p.offsetX, p.offsetY + p.drawHeight / 2); ctx.lineTo(p.offsetX + p.drawWidth, p.offsetY + p.drawHeight);
        }
    },

    drawGoldenTriangles(ctx, p) {
        const PHI = 1.61803398875;
        const w = p.drawWidth; const h = p.drawHeight;

        function getLineEndpoints(point, m) {
            let points = [];
            
            if (Math.abs(m) < 1e-9) { return [{x: 0, y: point.y}, {x: w, y: point.y}]; }
            if (Math.abs(m) > 1e9) { return [{x: point.x, y: 0}, {x: point.x, y: h}]; }
            let y_at_x0 = m * (0 - point.x) + point.y;
            if (y_at_x0 >= 0 && y_at_x0 <= h) points.push({ x: 0, y: y_at_x0 });
            let y_at_xw = m * (w - point.x) + point.y;
            if (y_at_xw >= 0 && y_at_xw <= h) points.push({ x: w, y: y_at_xw });
            let x_at_y0 = (0 - point.y) / m + p.x;
            if (x_at_y0 >= 0 && x_at_y0 <= w) points.push({ x: x_at_y0, y: 0 });
            let x_at_yh = (h - point.y) / m + point.x;
            if (x_at_yh >= 0 && x_at_yh <= w) points.push({ x: x_at_yh, y: h });

            return [...new Map(points.map(item => [`${item.x},${item.y}`, item])).values()];
        }

        if (p.mode.startsWith("Both") || p.mode.startsWith("Set 1")) {
            ctx.moveTo(p.offsetX, p.offsetY); ctx.lineTo(p.offsetX + w, p.offsetY + h);
            const m1 = h / w; const m1_perp = -w / h;
            const p1 = { x: w / (PHI + 1), y: m1 * (w / (PHI + 1)) };
            const p2 = { x: w * PHI / (PHI + 1), y: m1 * (w * PHI / (PHI + 1)) };

            for(const pt of [p1, p2]) {
                const endpoints = getLineEndpoints(pt, m1_perp);
                if (endpoints.length >= 2) { ctx.moveTo(p.offsetX + endpoints[0].x, p.offsetY + endpoints[0].y); ctx.lineTo(p.offsetX + endpoints[1].x, p.offsetY + endpoints[1].y); }
            }
        }

        if (p.mode.startsWith("Both") || p.mode.startsWith("Set 2")) {
            ctx.moveTo(p.offsetX + w, p.offsetY); ctx.lineTo(p.offsetX, p.offsetY + h);

            const m2 = -h / w; const m2_perp = w / h;
            const p1 = { x: w / (PHI + 1), y: m2 * (w / (PHI + 1) - w) };
            const p2 = { x: w * PHI / (PHI + 1), y: m2 * (w * PHI / (PHI + 1) - w) };

            for(const pt of [p1, p2]) {
                const endpoints = getLineEndpoints(pt, m2_perp);
                if (endpoints.length >= 2) { ctx.moveTo(p.offsetX + endpoints[0].x, p.offsetY + endpoints[0].y); ctx.lineTo(p.offsetX + endpoints[1].x, p.offsetY + endpoints[1].y); }
            }
        }
    },

    drawPerspective(ctx, p) {
        const centerX = p.offsetX + p.drawWidth * p.vanishingX;
        const centerY = p.offsetY + p.drawHeight * p.vanishingY;
        ctx.moveTo(centerX, p.offsetY); ctx.lineTo(centerX, p.offsetY + p.drawHeight);
        ctx.moveTo(p.offsetX, centerY); ctx.lineTo(p.offsetX + p.drawWidth, centerY);

        for(let i = 0; i <= p.numLines; i++) {
            const ratio = i / p.numLines;
            ctx.moveTo(p.offsetX + p.drawWidth * ratio, p.offsetY); ctx.lineTo(centerX, centerY);
            ctx.moveTo(p.offsetX + p.drawWidth * ratio, p.offsetY + p.drawHeight); ctx.lineTo(centerX, centerY);
            ctx.moveTo(p.offsetX, p.offsetY + p.drawHeight * ratio); ctx.lineTo(centerX, centerY);
            ctx.moveTo(p.offsetX + p.drawWidth, p.offsetY + p.drawHeight * ratio); ctx.lineTo(centerX, centerY);
        }
    }
};



// Node related code ---------------

app.registerExtension({
    name: "Eses.CompositionGuides", 
    
    nodeCreated(node) {

        if (node.comfyClass === "EsesCompositionGuides") {
            node.imagePreview = null;
            node.isManuallyResized = false;
            node.size = [320, 520];

            const getDrawArea = () => {
                const area = {
                    x: PADDING,
                    y: HEADER_HEIGHT,
                    width: node.size[0] - PADDING * 2,
                    height: node.size[1] - HEADER_HEIGHT - PADDING
                };

                return (area.width < 1 || area.height < 1) ? null : area;
            };

            node.onResize = function() {
                this.isManuallyResized = true;
            };

            node.onDrawForeground = function(ctx) {
                const drawArea = getDrawArea();

                if (!drawArea) return;

                if (this.imagePreview) {
                    const imageRatio = this.imagePreview.width / this.imagePreview.height;
                    const containerRatio = drawArea.width / drawArea.height;
                    let drawWidth = drawArea.width, drawHeight = drawArea.height;
                    
                    if (imageRatio > containerRatio) {
                        drawHeight = drawArea.width / imageRatio;
                    } 
                    else {
                        drawWidth = drawArea.height * imageRatio;
                    }

                    const offsetX = drawArea.x + (drawArea.width - drawWidth) / 2;
                    const offsetY = drawArea.y + (drawArea.height - drawHeight) / 2;
                    
                    ctx.drawImage(this.imagePreview, offsetX, offsetY, drawWidth, drawHeight);
                    
                    // --- Clipping and Guide Drawing ---
                    ctx.save();
                    
                    // Create a clipping region to prevent 
                    // guides from drawing outside the image
                    ctx.beginPath();
                    ctx.rect(offsetX, offsetY, drawWidth, drawHeight);
                    ctx.clip();
                    
                    
                    // Draw Guides -------------

                    const widgets = Object.fromEntries(node.widgets.map(w => [w.name, w.value]));
                    ctx.strokeStyle = parseColorString(widgets.grid_color_rgb);
                    ctx.lineWidth = widgets.line_thickness || 1;
                    ctx.globalCompositeOperation = widgets.blend_mode || "source-over";
                    
                    ctx.beginPath();
                    const baseParams = { offsetX, offsetY, drawWidth, drawHeight };
                    if (widgets.grid) GuideDrawer.drawGrid(ctx, { ...baseParams, xLines: widgets.grid_lines_x, yLines: widgets.grid_lines_y });
                    if (widgets.diagonals) GuideDrawer.drawDiagonals(ctx, baseParams);
                    if (widgets.phi_grid) GuideDrawer.drawPhiGrid(ctx, baseParams);
                    if (widgets.pyramid !== "Off") GuideDrawer.drawPyramid(ctx, { ...baseParams, mode: widgets.pyramid });
                    if (widgets.golden_triangles !== "Off") GuideDrawer.drawGoldenTriangles(ctx, { ...baseParams, mode: widgets.golden_triangles });
                    if (widgets.perspective) GuideDrawer.drawPerspective(ctx, { ...baseParams, vanishingX: widgets.perspective_x, vanishingY: widgets.perspective_y, numLines: widgets.perspective_lines });
                    ctx.stroke();
                    
                    // Restore the context to remove the clipping path
                    ctx.restore();


                    // --- Draw Frame ---
                    
                    // Draw a clean border on top of the clipped guides
                    ctx.strokeStyle = "rgba(40, 40, 40, 1)";
                    ctx.lineWidth = 1;
                    ctx.strokeRect(offsetX, offsetY, drawWidth, drawHeight);

                } 
                else { 
                    ctx.save();
                    ctx.font = "14px Arial";
                    ctx.fillStyle = "#CCCCCC";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText("Connect Image and run workflow", drawArea.x + drawArea.width / 2, drawArea.y + drawArea.height / 2);
                    ctx.restore();
                }
            };
            
            const widgetsToMonitor = [
                "preview_resolution_limit", "grid_color_rgb", "line_thickness", "blend_mode",
                "grid", "grid_lines_x", "grid_lines_y", "diagonals", 
                "phi_grid", "pyramid", "golden_triangles",
                "perspective", "perspective_lines", "perspective_x", "perspective_y"
            ];

            for (const w of node.widgets) {
                if (widgetsToMonitor.includes(w.name)) {
                    w.callback = () => node.setDirtyCanvas(true, true);
                }
            }
        }
    },
});



// Event listener -------------------

api.addEventListener("eses.composition_guides_preview", ({ detail }) => {
    const node = app.graph.getNodeById(detail.node_id);
    
    if (node) {
        const img = new Image();
        img.src = `data:image/png;base64,${detail.image_data}`;
        
        img.onload = () => {
            node.imagePreview = img;

            if (!node.isManuallyResized) {
                const aspectRatio = img.naturalWidth / img.naturalHeight;
                const baseWidth = node.size[0];
                const previewAreaHeight = (baseWidth - (PADDING * 2)) / aspectRatio;
                node.size[1] = HEADER_HEIGHT + previewAreaHeight + PADDING;
            }

            app.graph.setDirtyCanvas(true, true);
        };
    }
});
