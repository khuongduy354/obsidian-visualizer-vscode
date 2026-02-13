/**
 * Self-built graph renderer for Neo4j format data.
 * Zero external dependencies - pure SVG + vanilla JS force simulation.
 */

export const CustomGraphRenderer = `
class GraphRenderer {
    constructor(selector, options) {
        this.containerEl = document.querySelector(selector);
        this.options = options || {};
        this.nodes = [];
        this.links = [];
        this.svg = null;
        this.gMain = null;

        // SVG element references
        this.linkEls = [];
        this.nodeEls = [];
        this.labelEls = [];

        // Viewport transform
        this.viewX = 0;
        this.viewY = 0;
        this.viewScale = 1;

        // Drag state
        this.dragNode = null;

        // Pan state
        this.isPanning = false;
        this.panStartX = 0;
        this.panStartY = 0;
        this.panStartViewX = 0;
        this.panStartViewY = 0;

        // Simulation state
        this.running = false;
        this.alpha = 1.0;
        this.alphaDecay = 0.02;

        // Visual params (from config)
        this.nodeSize = options.nodeSize || 20;
        this.fontSize = options.fontSize || 11;
        
        // Force params (from config)
        this.velocityDecay = options.velocityDecay || 0.4;
        this.repulsion = options.repulsionForce || 800;
        this.attractionStrength = options.linkStrength || 0.005;
        this.linkDistance = options.linkDistance || 120;
        this.centerStrength = options.centerForce || 0.01;
        this.collisionRadius = options.collisionRadius || 35;
    }

    // ── SVG Helpers ──────────────────────────────────────

    _svgEl(tag, attrs) {
        var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
        if (attrs) {
            var keys = Object.keys(attrs);
            for (var i = 0; i < keys.length; i++) {
                el.setAttribute(keys[i], attrs[keys[i]]);
            }
        }
        return el;
    }

    _filename(path) {
        if (!path) return '';
        var idx = path.lastIndexOf('/');
        var name = idx >= 0 ? path.substring(idx + 1) : path;
        return name.replace(/\\.md$/, '');
    }

    // ── Main entry point ─────────────────────────────────

    render(graphData) {
        var data = graphData.results[0].data[0].graph;
        console.log('Rendering: ' + data.nodes.length + ' nodes, ' + data.relationships.length + ' links');

        // Build node map
        var nodeMap = {};
        this.nodes = [];
        for (var i = 0; i < data.nodes.length; i++) {
            var n = data.nodes[i];
            var node = {
                id: n.id,
                label: this._filename(n.id),
                props: n.properties,
                isVirtual: !!(n.properties && n.properties.isFileVirtual),
                x: 0, y: 0, vx: 0, vy: 0, fx: null, fy: null
            };
            this.nodes.push(node);
            nodeMap[n.id] = node;
        }

        // Build links
        this.links = [];
        for (var i = 0; i < data.relationships.length; i++) {
            var r = data.relationships[i];
            var src = nodeMap[r.startNode];
            var tgt = nodeMap[r.endNode];
            if (src && tgt) {
                this.links.push({
                    source: src,
                    target: tgt,
                    category: (r.properties && r.properties.linkCategory) || 'forward',
                    id: r.id
                });
            }
        }

        // Random initial positions
        var w = this.containerEl.clientWidth || 800;
        var h = this.containerEl.clientHeight || 600;
        for (var i = 0; i < this.nodes.length; i++) {
            this.nodes[i].x = w / 2 + (Math.random() - 0.5) * w * 0.6;
            this.nodes[i].y = h / 2 + (Math.random() - 0.5) * h * 0.6;
        }

        this.viewX = 0;
        this.viewY = 0;
        this.viewScale = 1;

        this._buildSVG(w, h);
        this._bindEvents();
        this._startSimulation(w, h);
    }

    // ── SVG Construction ─────────────────────────────────

    _buildSVG(w, h) {
        this.containerEl.innerHTML = '';

        var svg = this._svgEl('svg', {
            width: w, height: h,
            style: 'display:block;width:100%;height:100%;'
        });
        this.svg = svg;

        // Arrow marker defs
        var defs = this._svgEl('defs');
        var markerCfg = [
            ['forward', '#4caf50'],
            ['backward', '#f44336'],
            ['bidirectional', '#9c27b0']
        ];
        var self = this;
        var arrowRefX = (self.nodeSize + 8).toString();
        for (var m = 0; m < markerCfg.length; m++) {
            var name = markerCfg[m][0];
            var color = markerCfg[m][1];
            var marker = this._svgEl('marker', {
                id: 'arrow-' + name,
                viewBox: '0 -5 10 10',
                refX: arrowRefX, refY: '0',
                markerWidth: '7', markerHeight: '7',
                orient: 'auto'
            });
            var arrow = this._svgEl('path', {
                d: 'M0,-4L10,0L0,4Z',
                fill: color
            });
            marker.appendChild(arrow);
            defs.appendChild(marker);
        }
        svg.appendChild(defs);

        // Main transform group
        this.gMain = this._svgEl('g');
        svg.appendChild(this.gMain);

        // Layer groups
        var gLinks = this._svgEl('g');
        var gNodes = this._svgEl('g');
        var gLabels = this._svgEl('g');
        this.gMain.appendChild(gLinks);
        this.gMain.appendChild(gNodes);
        this.gMain.appendChild(gLabels);

        // Create link lines
        var linkColors = { forward: '#4caf50', backward: '#f44336', bidirectional: '#9c27b0' };
        this.linkEls = [];
        for (var i = 0; i < this.links.length; i++) {
            var link = this.links[i];
            var line = this._svgEl('line', {
                stroke: linkColors[link.category] || '#a5abb6',
                'stroke-width': '2',
                'marker-end': 'url(#arrow-' + (link.category || 'forward') + ')',
                'class': 'graph-link'
            });
            line._data = link;
            gLinks.appendChild(line);
            this.linkEls.push(line);
        }

        // Create node circles
        this.nodeEls = [];
        for (var i = 0; i < this.nodes.length; i++) {
            var nd = this.nodes[i];
            var circle = this._svgEl('circle', {
                r: this.nodeSize.toString(),
                fill: nd.isVirtual ? '#666' : '#cccccc',
                stroke: '#454545',
                'stroke-width': '2',
                opacity: nd.isVirtual ? '0.35' : '1',
                cursor: 'pointer',
                'class': 'graph-node'
            });
            circle._data = nd;
            gNodes.appendChild(circle);
            this.nodeEls.push(circle);
        }

        // Create labels
        this.labelEls = [];
        for (var i = 0; i < this.nodes.length; i++) {
            var nd = this.nodes[i];
            var text = this._svgEl('text', {
                'text-anchor': 'middle',
                'font-size': this.fontSize + 'px',
                fill: '#cccccc',
                'pointer-events': 'none',
                dy: (this.nodeSize + 13).toString(),
                'class': 'graph-label'
            });
            text.textContent = nd.label;
            text._data = nd;
            gLabels.appendChild(text);
            this.labelEls.push(text);
        }

        this.containerEl.appendChild(svg);
    }

    // ── Event Binding ────────────────────────────────────

    _bindEvents() {
        var self = this;

        // Wheel zoom
        this.svg.addEventListener('wheel', function(e) {
            e.preventDefault();
            var rect = self.svg.getBoundingClientRect();
            var mx = e.clientX - rect.left;
            var my = e.clientY - rect.top;
            var oldScale = self.viewScale;
            var factor = e.deltaY < 0 ? 1.1 : 0.9;
            var newScale = Math.max(0.1, Math.min(5, oldScale * factor));
            self.viewX = mx - (mx - self.viewX) * (newScale / oldScale);
            self.viewY = my - (my - self.viewY) * (newScale / oldScale);
            self.viewScale = newScale;
            self._applyTransform();
        }, { passive: false });

        // Pan on background drag
        this.svg.addEventListener('mousedown', function(e) {
            if (e.target === self.svg || e.target === self.gMain) {
                self.isPanning = true;
                self.panStartX = e.clientX;
                self.panStartY = e.clientY;
                self.panStartViewX = self.viewX;
                self.panStartViewY = self.viewY;
                self.svg.style.cursor = 'grabbing';
            }
        });

        window.addEventListener('mousemove', function(e) {
            if (self.isPanning) {
                self.viewX = self.panStartViewX + (e.clientX - self.panStartX);
                self.viewY = self.panStartViewY + (e.clientY - self.panStartY);
                self._applyTransform();
            }
            if (self.dragNode) {
                var rect = self.svg.getBoundingClientRect();
                var mx = (e.clientX - rect.left - self.viewX) / self.viewScale;
                var my = (e.clientY - rect.top - self.viewY) / self.viewScale;
                self.dragNode.fx = mx;
                self.dragNode.fy = my;
                self.dragNode.x = mx;
                self.dragNode.y = my;
                if (self.alpha < 0.3) self.alpha = 0.3;
                if (!self.running) { self.running = true; self._tick(); }
            }
        });

        window.addEventListener('mouseup', function() {
            if (self.isPanning) {
                self.isPanning = false;
                self.svg.style.cursor = '';
            }
            if (self.dragNode) {
                self.dragNode.fx = null;
                self.dragNode.fy = null;
                self.dragNode = null;
            }
        });

        // Node drag / hover / dblclick
        for (var i = 0; i < self.nodeEls.length; i++) {
            (function(el) {
                el.addEventListener('mousedown', function(e) {
                    e.stopPropagation();
                    var node = el._data;
                    self.dragNode = node;
                    node.fx = node.x;
                    node.fy = node.y;
                });
                el.addEventListener('mouseenter', function() {
                    el.setAttribute('r', (self.nodeSize * 1.25).toString());
                    self._highlight(el._data);
                });
                el.addEventListener('mouseleave', function() {
                    el.setAttribute('r', self.nodeSize.toString());
                    self._clearHighlight();
                });
                el.addEventListener('dblclick', function(e) {
                    e.stopPropagation();
                    if (self.options.onNodeDoubleClick) {
                        self.options.onNodeDoubleClick(el._data.props);
                    }
                });
            })(self.nodeEls[i]);
        }
    }

    // ── Highlight ────────────────────────────────────────

    _highlight(node) {
        var connected = {};
        connected[node.id] = true;

        for (var i = 0; i < this.linkEls.length; i++) {
            var lEl = this.linkEls[i];
            var d = lEl._data;
            var isConn = d.source.id === node.id || d.target.id === node.id;
            lEl.setAttribute('opacity', isConn ? '1' : '0.15');
            lEl.setAttribute('stroke-width', isConn ? '3' : '2');
            if (isConn) {
                connected[d.source.id] = true;
                connected[d.target.id] = true;
            }
        }
        for (var i = 0; i < this.nodeEls.length; i++) {
            var nEl = this.nodeEls[i];
            var d = nEl._data;
            var isConn = !!connected[d.id];
            nEl.setAttribute('opacity', isConn ? (d.isVirtual ? '0.5' : '1') : '0.15');
            if (d.id === node.id) {
                nEl.setAttribute('stroke', '#007acc');
                nEl.setAttribute('stroke-width', '3');
            }
        }
        for (var i = 0; i < this.labelEls.length; i++) {
            var tEl = this.labelEls[i];
            tEl.setAttribute('opacity', connected[tEl._data.id] ? '1' : '0.15');
        }
    }

    _clearHighlight() {
        for (var i = 0; i < this.linkEls.length; i++) {
            this.linkEls[i].setAttribute('opacity', '1');
            this.linkEls[i].setAttribute('stroke-width', '2');
        }
        for (var i = 0; i < this.nodeEls.length; i++) {
            var d = this.nodeEls[i]._data;
            this.nodeEls[i].setAttribute('opacity', d.isVirtual ? '0.35' : '1');
            this.nodeEls[i].setAttribute('stroke', '#454545');
            this.nodeEls[i].setAttribute('stroke-width', '2');
        }
        for (var i = 0; i < this.labelEls.length; i++) {
            this.labelEls[i].setAttribute('opacity', '1');
        }
    }

    _applyTransform() {
        this.gMain.setAttribute('transform',
            'translate(' + this.viewX + ',' + this.viewY + ') scale(' + this.viewScale + ')');
    }

    // ── Force Simulation ─────────────────────────────────

    _startSimulation(w, h) {
        this.centerX = w / 2;
        this.centerY = h / 2;
        this.alpha = 1.0;
        this.running = true;
        this._tick();
    }

    _tick() {
        if (!this.running) return;
        var self = this;

        this._applyForces();
        this._updatePositions();

        this.alpha *= (1 - this.alphaDecay);
        if (this.alpha < 0.001) {
            this.running = false;
            return;
        }
        requestAnimationFrame(function() { self._tick(); });
    }

    _applyForces() {
        var nodes = this.nodes;
        var links = this.links;
        var alpha = this.alpha;
        var i, j, a, b, dx, dy, dist, force, fx, fy, push, nx, ny;

        // Repulsion (all pairs) + collision
        for (i = 0; i < nodes.length; i++) {
            for (j = i + 1; j < nodes.length; j++) {
                a = nodes[i];
                b = nodes[j];
                dx = b.x - a.x;
                dy = b.y - a.y;
                dist = Math.sqrt(dx * dx + dy * dy) || 1;

                // Collision
                if (dist < this.collisionRadius * 2) {
                    push = (this.collisionRadius * 2 - dist) * 0.5 * alpha;
                    nx = dx / dist;
                    ny = dy / dist;
                    if (a.fx === null) { a.vx -= nx * push; a.vy -= ny * push; }
                    if (b.fx === null) { b.vx += nx * push; b.vy += ny * push; }
                }

                // Coulomb repulsion
                force = this.repulsion * alpha / (dist * dist);
                fx = (dx / dist) * force;
                fy = (dy / dist) * force;
                if (a.fx === null) { a.vx -= fx; a.vy -= fy; }
                if (b.fx === null) { b.vx += fx; b.vy += fy; }
            }
        }

        // Attraction along links
        for (i = 0; i < links.length; i++) {
            a = links[i].source;
            b = links[i].target;
            dx = b.x - a.x;
            dy = b.y - a.y;
            dist = Math.sqrt(dx * dx + dy * dy) || 1;
            var displacement = dist - this.linkDistance;
            force = displacement * this.attractionStrength * alpha;
            fx = (dx / dist) * force;
            fy = (dy / dist) * force;
            if (a.fx === null) { a.vx += fx; a.vy += fy; }
            if (b.fx === null) { b.vx -= fx; b.vy -= fy; }
        }

        // Center gravity
        for (i = 0; i < nodes.length; i++) {
            a = nodes[i];
            if (a.fx !== null) continue;
            a.vx += (this.centerX - a.x) * this.centerStrength * alpha;
            a.vy += (this.centerY - a.y) * this.centerStrength * alpha;
        }

        // Velocity decay
        for (i = 0; i < nodes.length; i++) {
            nodes[i].vx *= (1 - this.velocityDecay);
            nodes[i].vy *= (1 - this.velocityDecay);
        }
    }

    _updatePositions() {
        var i, n, el, d;

        // Apply velocity to position
        for (i = 0; i < this.nodes.length; i++) {
            n = this.nodes[i];
            if (n.fx !== null) { n.x = n.fx; n.y = n.fy; }
            else { n.x += n.vx; n.y += n.vy; }
        }

        // Update link SVG
        for (i = 0; i < this.linkEls.length; i++) {
            el = this.linkEls[i];
            d = el._data;
            el.setAttribute('x1', d.source.x);
            el.setAttribute('y1', d.source.y);
            el.setAttribute('x2', d.target.x);
            el.setAttribute('y2', d.target.y);
        }

        // Update node SVG
        for (i = 0; i < this.nodeEls.length; i++) {
            el = this.nodeEls[i];
            d = el._data;
            el.setAttribute('cx', d.x);
            el.setAttribute('cy', d.y);
        }

        // Update label SVG
        for (i = 0; i < this.labelEls.length; i++) {
            el = this.labelEls[i];
            d = el._data;
            el.setAttribute('x', d.x);
            el.setAttribute('y', d.y);
        }
    }
}
`;
