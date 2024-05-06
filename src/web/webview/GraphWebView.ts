import * as vscode from "vscode";
export class GraphWebView {
  context: vscode.ExtensionContext;
  panel: vscode.WebviewPanel | undefined;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  initializeWebView(_graphData: any, panelName: string) {
    const panel = vscode.window.createWebviewPanel(
      "graphView",
      panelName,
      vscode.ViewColumn.One,
      { enableScripts: true }
    );

    const libs = this.loadLibs(panel);

    const graphData: string =
      typeof _graphData === "string" ? _graphData : JSON.stringify(_graphData);
    panel.webview.html = this.getGraphWebViewHtml(libs, graphData);

    this.panel = panel;
    return this;
  }

  loadLibs(panel: vscode.WebviewPanel) {
    const basePath = vscode.Uri.joinPath(
      this.context.extensionUri,
      "src",
      "web",
      "webview"
    );
    const neoPath = vscode.Uri.joinPath(basePath, "neo4jd3.min.js");
    const d3Path = vscode.Uri.joinPath(basePath, "d3.min.js");

    // const neo4jlib = panel.webview.asWebviewUri(neoPath);
    // const d3lib = panel.webview.asWebviewUri(d3Path);

    const neo4jlib = "";
    const d3lib = "https://cdnjs.cloudflare.com/ajax/libs/d3/4.0.0/d3.js";

    return { neo4jlib, d3lib };
  }

  setNodeListener(onNodeDoubleClick: Function) {
    if (this.panel === undefined) return;

    this.panel.webview.onDidReceiveMessage(
      (message) => {
        switch (message.command) {
          case "onNodeDoubleClick":
            onNodeDoubleClick(message);
            break;
        }
      },
      undefined,
      this.context.subscriptions
    );
  }

  getGraphWebViewHtml(
    libs: { neo4jlib: vscode.Uri | string; d3lib: vscode.Uri | string },
    data: string
  ) {
    return `
<html lang="en">
  <head>
    <title>Obsidian Visualizer</title>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" /> 
    <style> 
   .container{
      height: 100vh; 
    }     
    .neo4jd3 {
      height: 100%;
    }

    html, body {
      height: 100%; 
      width: 100%;
    } 
    .text{ 
      margin-top: 10px; 
      background-color: #000000;  
      fill:#808080
    }

    </style>
  </head>
  <body>
  <div class="container">
    <div class="graph"></div> 
  </div>

    <script>${neo4jlibRaw}</script>
    <script src="${libs.d3lib}"></script>
    <script>
      const vscode = acquireVsCodeApi();
      var neo4jd3 = new Neo4jd3(".graph", {
        highlight: [
          {
            class: "File", 
          },
        ],
        minCollision: 60,
        neo4jData: ${data},
        nodeRadius: 25, 
        icons:{
          "File":""
        },
        onNodeDoubleClick: function (node) {
            vscode.postMessage({
                command: "onNodeDoubleClick",
                node: node,
            });
        },
        infoPanel: false,
        zoomFit: false, 
      });
    </script>
  </body>
</html>
  `;
  }
}

const neo4jlibRaw = `!(function (e) {
        if ("object" == typeof exports && "undefined" != typeof module)
          module.exports = e();
        else if ("function" == typeof define && define.amd) define([], e);
        else {
          var t;
          (t =
            "undefined" != typeof window
              ? window
              : "undefined" != typeof global
              ? global
              : "undefined" != typeof self
              ? self
              : this),
            (t.Neo4jd3 = e());
        }
      })(function () {
        return (function e(t, r, o) {
          function f(n, i) {
            if (!r[n]) {
              if (!t[n]) {
                var c = "function" == typeof require && require;
                if (!i && c) return c(n, !0);
                if (a) return a(n, !0);
                var s = new Error("Cannot find module '" + n + "'");
                throw ((s.code = "MODULE_NOT_FOUND"), s);
              }
              var l = (r[n] = { exports: {} });
              t[n][0].call(
                l.exports,
                function (e) {
                  var r = t[n][1][e];
                  return f(r ? r : e);
                },
                l,
                l.exports,
                e,
                t,
                r,
                o
              );
            }
            return r[n].exports;
          }
          for (
            var a = "function" == typeof require && require, n = 0;
            n < o.length;
            n++
          )
            f(o[n]);
          return f;
        })(
          {
            1: [
              function (e, t, r) {
                "use strict";
                var o = e("./scripts/neo4jd3");
                t.exports = o;
              },
              { "./scripts/neo4jd3": 2 },
            ],
            2: [
              function (e, t, r) {
                "use strict";
                function o(e, t) {
                  function r(e) {
                    (ke = e
                      .append("svg")
                      .attr("width", "100%")
                      .attr("height", "100%")
                      .attr("class", "neo4jd3-graph")
                      .call(
                        d3.zoom().on("zoom", function () {
                          var e = d3.event.transform.k,
                            t = [d3.event.transform.x, d3.event.transform.y];
                          De && ((t[0] += De[0]), (t[1] += De[1])),
                            je && (e *= je),
                            ke.attr(
                              "transform",
                              "translate(" +
                                t[0] +
                                ", " +
                                t[1] +
                                ") scale(" +
                                e +
                                ")"
                            );
                        })
                      )
                      .on("dblclick.zoom", null)
                      .append("g")
                      .attr("width", "100%")
                      .attr("height", "100%")),
                      (Me = ke.append("g").attr("class", "relationships")),
                      (qe = ke.append("g").attr("class", "nodes"));
                  }
                  function o(e) {
                    return e
                      .append("image")
                      .attr("height", function (e) {
                        return E(e) ? "24px" : "30px";
                      })
                      .attr("x", function (e) {
                        return E(e) ? "5px" : "-15px";
                      })
                      .attr("xlink:href", function (e) {
                        return O(e);
                      })
                      .attr("y", function (e) {
                        return E(e) ? "5px" : "-16px";
                      })
                      .attr("width", function (e) {
                        return E(e) ? "24px" : "30px";
                      });
                  }
                  function f(e) {
                    return e.append("div").attr("class", "neo4jd3-info");
                  }
                  function a(e, t, r, o) {
                    var f = de.append("a");
                    f
                      .attr("href", "#")
                      .attr("class", e)
                      .html("<strong>" + r + "</strong>" + (o ? ": " + o : "")),
                      o ||
                        f
                          .style("background-color", function (e) {
                            return Re.nodeOutlineFillColor
                              ? Re.nodeOutlineFillColor
                              : t
                              ? v(r)
                              : j();
                          })
                          .style("border-color", function (e) {
                            return Re.nodeOutlineFillColor
                              ? w(Re.nodeOutlineFillColor)
                              : t
                              ? w(r)
                              : D();
                          })
                          .style("color", function (e) {
                            return Re.nodeOutlineFillColor
                              ? w(Re.nodeOutlineFillColor)
                              : "#fff";
                          });
                  }
                  function n(e, t) {
                    a(e, !0, t);
                  }
                  function i(e, t, r) {
                    a(e, !1, t, r);
                  }
                  function c(e, t) {
                    a(e, !1, t);
                  }
                  function s() {
                    return pe
                      .enter()
                      .append("g")
                      .attr("class", function (e) {
                        var t,
                          r,
                          o = "node";
                        e.labels[0];
                        if (
                          (E(e) && (o += " node-icon"),
                          O(e) && (o += " node-image"),
                          Re.highlight)
                        )
                          for (r = 0; r < Re.highlight.length; r++)
                            if (
                              ((t = Re.highlight[r]),
                              e.labels[0] === t.class &&
                                e.properties[t.property] === t.value)
                            ) {
                              o += " node-highlighted";
                              break;
                            }
                        return o;
                      })
                      .on("click", function (e) {
                        (e.fx = e.fy = null),
                          "function" == typeof Re.onNodeClick &&
                            Re.onNodeClick(e);
                      })
                      .on("dblclick", function (e) {
                        G(e),
                          "function" == typeof Re.onNodeDoubleClick &&
                            Re.onNodeDoubleClick(e);
                      })
                      .on("mouseenter", function (e) {
                        de && ae(e),
                          "function" == typeof Re.onNodeMouseEnter &&
                            Re.onNodeMouseEnter(e);
                      })
                      .on("mouseleave", function (e) {
                        de && k(e),
                          "function" == typeof Re.onNodeMouseLeave &&
                            Re.onNodeMouseLeave(e);
                      })
                      .call(
                        d3.drag().on("start", N).on("drag", z).on("end", C)
                      );
                  }
                  function l() {
                    var e = s();
                    return d(e), u(e), Re.icons && p(e), Re.images && o(e), e;
                  }
                  function u(e) {
                    return e
                      .append("circle")
                      .attr("class", "outline")
                      .attr("r", Re.nodeRadius)
                      .style("fill", function (e) {
                        return Re.nodeOutlineFillColor
                          ? Re.nodeOutlineFillColor
                          : v(e.labels[0]);
                      })
                      .style("stroke", function (e) {
                        return w(
                          Re.nodeOutlineFillColor
                            ? Re.nodeOutlineFillColor
                            : e.labels[0]
                        );
                      })
                      .append("title")
                      .text(function (e) {
                        return ee(e);
                      });
                  }
                  function d(e) {
                    return e
                      .append("circle")
                      .attr("class", "ring")
                      .attr("r", 1.16 * Re.nodeRadius)
                      .append("title")
                      .text(function (e) {
                        return ee(e);
                      });
                  }
                  function p(e) {
                    return e
                      .append("text")
                      .attr("class", function (e) {
                        return "text" + (E(e) ? " icon" : "");
                      })
                      .attr("fill", "#ffffff")
                      .attr("font-size", function (e) {
                        return E(e) ? Re.nodeRadius + "px" : "10px";
                      })
                      .attr("pointer-events", "none")
                      .attr("text-anchor", "middle")
                      .attr("y", function (e) {
                        return E(e)
                          ? parseInt(Math.round(0.32 * Re.nodeRadius)) + "px"
                          : "4px";
                      })
                      .html(function (e) {
                        var t = E(e);
                        return t ? "&#x" + t : e.id;
                      });
                  }
                  function h(e, t) {
                    var r = T(e, t);
                    fe(r);
                  }
                  function g() {
                    return ge
                      .enter()
                      .append("g")
                      .attr("class", "relationship")
                      .on("dblclick", function (e) {
                        "function" == typeof Re.onRelationshipDoubleClick &&
                          Re.onRelationshipDoubleClick(e);
                      })
                      .on("mouseenter", function (e) {
                        de && ae(e);
                      });
                  }
                  function b(e) {
                    return e
                      .append("path")
                      .attr("class", "outline")
                      .attr("fill", "#a5abb6")
                      .attr("stroke", "none");
                  }
                  function y(e) {
                    return e.append("path").attr("class", "overlay");
                  }
                  function m(e) {
                    return e
                      .append("text")
                      .attr("class", "text")
                      .attr("fill", "#000000")
                      .attr("font-size", "8px")
                      .attr("pointer-events", "none")
                      .attr("text-anchor", "middle")
                      .text(function (e) {
                        return e.type;
                      });
                  }
                  function x() {
                    var e = g(),
                      t = m(e),
                      r = b(e),
                      o = y(e);
                    return { outline: r, overlay: o, relationship: e, text: t };
                  }
                  function v(e) {
                    var t = Ce[e];
                    return (
                      t ||
                        ((t = Re.colors[Ne % Re.colors.length]),
                        (Ce[e] = t),
                        Ne++),
                      t
                    );
                  }
                  function w(e) {
                    return d3.rgb(v(e)).darker(1);
                  }
                  function k() {
                    de.html("");
                  }
                  function q() {
                    return [
                      "#68bdf6",
                      "#6dce9e",
                      "#faafc2",
                      "#f2baf6",
                      "#ff928c",
                      "#fcea7e",
                      "#ffc766",
                      "#405f9e",
                      "#a5abb6",
                      "#78cecb",
                      "#b88cbb",
                      "#ced2d9",
                      "#e84646",
                      "#fa5f86",
                      "#ffab1a",
                      "#fcda19",
                      "#797b80",
                      "#c9d96f",
                      "#47991f",
                      "#70edee",
                      "#ff75ea",
                    ];
                  }
                  function M(e, t) {
                    var r = e.filter(function (e) {
                      return e.id === t;
                    });
                    return r.length > 0;
                  }
                  function j() {
                    return Re.relationshipColor;
                  }
                  function D() {
                    return d3.rgb(Re.colors[Re.colors.length - 1]).darker(1);
                  }
                  function C(e) {
                    d3.event.active || we.alphaTarget(0),
                      "function" == typeof Re.onNodeDragEnd &&
                        Re.onNodeDragEnd(e);
                  }
                  function z(e) {
                    G(e);
                  }
                  function N(e) {
                    d3.event.active || we.alphaTarget(0.3).restart(),
                      (e.fx = e.x),
                      (e.fy = e.y),
                      "function" == typeof Re.onNodeDragStart &&
                        Re.onNodeDragStart(e);
                  }
                  function R() {
                    return {
                      glass: "f000",
                      music: "f001",
                      search: "f002",
                      "envelope-o": "f003",
                      heart: "f004",
                      star: "f005",
                      "star-o": "f006",
                      user: "f007",
                      film: "f008",
                      "th-large": "f009",
                      th: "f00a",
                      "th-list": "f00b",
                      check: "f00c",
                      "remove,close,times": "f00d",
                      "search-plus": "f00e",
                      "search-minus": "f010",
                      "power-off": "f011",
                      signal: "f012",
                      "gear,cog": "f013",
                      "trash-o": "f014",
                      home: "f015",
                      "file-o": "f016",
                      "clock-o": "f017",
                      road: "f018",
                      download: "f019",
                      "arrow-circle-o-down": "f01a",
                      "arrow-circle-o-up": "f01b",
                      inbox: "f01c",
                      "play-circle-o": "f01d",
                      "rotate-right,repeat": "f01e",
                      refresh: "f021",
                      "list-alt": "f022",
                      lock: "f023",
                      flag: "f024",
                      headphones: "f025",
                      "volume-off": "f026",
                      "volume-down": "f027",
                      "volume-up": "f028",
                      qrcode: "f029",
                      barcode: "f02a",
                      tag: "f02b",
                      tags: "f02c",
                      book: "f02d",
                      bookmark: "f02e",
                      print: "f02f",
                      camera: "f030",
                      font: "f031",
                      bold: "f032",
                      italic: "f033",
                      "text-height": "f034",
                      "text-width": "f035",
                      "align-left": "f036",
                      "align-center": "f037",
                      "align-right": "f038",
                      "align-justify": "f039",
                      list: "f03a",
                      "dedent,outdent": "f03b",
                      indent: "f03c",
                      "video-camera": "f03d",
                      "photo,image,picture-o": "f03e",
                      pencil: "f040",
                      "map-marker": "f041",
                      adjust: "f042",
                      tint: "f043",
                      "edit,pencil-square-o": "f044",
                      "share-square-o": "f045",
                      "check-square-o": "f046",
                      arrows: "f047",
                      "step-backward": "f048",
                      "fast-backward": "f049",
                      backward: "f04a",
                      play: "f04b",
                      pause: "f04c",
                      stop: "f04d",
                      forward: "f04e",
                      "fast-forward": "f050",
                      "step-forward": "f051",
                      eject: "f052",
                      "chevron-left": "f053",
                      "chevron-right": "f054",
                      "plus-circle": "f055",
                      "minus-circle": "f056",
                      "times-circle": "f057",
                      "check-circle": "f058",
                      "question-circle": "f059",
                      "info-circle": "f05a",
                      crosshairs: "f05b",
                      "times-circle-o": "f05c",
                      "check-circle-o": "f05d",
                      ban: "f05e",
                      "arrow-left": "f060",
                      "arrow-right": "f061",
                      "arrow-up": "f062",
                      "arrow-down": "f063",
                      "mail-forward,share": "f064",
                      expand: "f065",
                      compress: "f066",
                      plus: "f067",
                      minus: "f068",
                      asterisk: "f069",
                      "exclamation-circle": "f06a",
                      gift: "f06b",
                      leaf: "f06c",
                      fire: "f06d",
                      eye: "f06e",
                      "eye-slash": "f070",
                      "warning,exclamation-triangle": "f071",
                      plane: "f072",
                      calendar: "f073",
                      random: "f074",
                      comment: "f075",
                      magnet: "f076",
                      "chevron-up": "f077",
                      "chevron-down": "f078",
                      retweet: "f079",
                      "shopping-cart": "f07a",
                      folder: "f07b",
                      "folder-open": "f07c",
                      "arrows-v": "f07d",
                      "arrows-h": "f07e",
                      "bar-chart-o,bar-chart": "f080",
                      "twitter-square": "f081",
                      "facebook-square": "f082",
                      "camera-retro": "f083",
                      key: "f084",
                      "gears,cogs": "f085",
                      comments: "f086",
                      "thumbs-o-up": "f087",
                      "thumbs-o-down": "f088",
                      "star-half": "f089",
                      "heart-o": "f08a",
                      "sign-out": "f08b",
                      "linkedin-square": "f08c",
                      "thumb-tack": "f08d",
                      "external-link": "f08e",
                      "sign-in": "f090",
                      trophy: "f091",
                      "github-square": "f092",
                      upload: "f093",
                      "lemon-o": "f094",
                      phone: "f095",
                      "square-o": "f096",
                      "bookmark-o": "f097",
                      "phone-square": "f098",
                      twitter: "f099",
                      "facebook-f,facebook": "f09a",
                      github: "f09b",
                      unlock: "f09c",
                      "credit-card": "f09d",
                      "feed,rss": "f09e",
                      "hdd-o": "f0a0",
                      bullhorn: "f0a1",
                      bell: "f0f3",
                      certificate: "f0a3",
                      "hand-o-right": "f0a4",
                      "hand-o-left": "f0a5",
                      "hand-o-up": "f0a6",
                      "hand-o-down": "f0a7",
                      "arrow-circle-left": "f0a8",
                      "arrow-circle-right": "f0a9",
                      "arrow-circle-up": "f0aa",
                      "arrow-circle-down": "f0ab",
                      globe: "f0ac",
                      wrench: "f0ad",
                      tasks: "f0ae",
                      filter: "f0b0",
                      briefcase: "f0b1",
                      "arrows-alt": "f0b2",
                      "group,users": "f0c0",
                      "chain,link": "f0c1",
                      cloud: "f0c2",
                      flask: "f0c3",
                      "cut,scissors": "f0c4",
                      "copy,files-o": "f0c5",
                      paperclip: "f0c6",
                      "save,floppy-o": "f0c7",
                      square: "f0c8",
                      "navicon,reorder,bars": "f0c9",
                      "list-ul": "f0ca",
                      "list-ol": "f0cb",
                      strikethrough: "f0cc",
                      underline: "f0cd",
                      table: "f0ce",
                      magic: "f0d0",
                      truck: "f0d1",
                      pinterest: "f0d2",
                      "pinterest-square": "f0d3",
                      "google-plus-square": "f0d4",
                      "google-plus": "f0d5",
                      money: "f0d6",
                      "caret-down": "f0d7",
                      "caret-up": "f0d8",
                      "caret-left": "f0d9",
                      "caret-right": "f0da",
                      columns: "f0db",
                      "unsorted,sort": "f0dc",
                      "sort-down,sort-desc": "f0dd",
                      "sort-up,sort-asc": "f0de",
                      envelope: "f0e0",
                      linkedin: "f0e1",
                      "rotate-left,undo": "f0e2",
                      "legal,gavel": "f0e3",
                      "dashboard,tachometer": "f0e4",
                      "comment-o": "f0e5",
                      "comments-o": "f0e6",
                      "flash,bolt": "f0e7",
                      sitemap: "f0e8",
                      umbrella: "f0e9",
                      "paste,clipboard": "f0ea",
                      "lightbulb-o": "f0eb",
                      exchange: "f0ec",
                      "cloud-download": "f0ed",
                      "cloud-upload": "f0ee",
                      "user-md": "f0f0",
                      stethoscope: "f0f1",
                      suitcase: "f0f2",
                      "bell-o": "f0a2",
                      coffee: "f0f4",
                      cutlery: "f0f5",
                      "file-text-o": "f0f6",
                      "building-o": "f0f7",
                      "hospital-o": "f0f8",
                      ambulance: "f0f9",
                      medkit: "f0fa",
                      "fighter-jet": "f0fb",
                      beer: "f0fc",
                      "h-square": "f0fd",
                      "plus-square": "f0fe",
                      "angle-double-left": "f100",
                      "angle-double-right": "f101",
                      "angle-double-up": "f102",
                      "angle-double-down": "f103",
                      "angle-left": "f104",
                      "angle-right": "f105",
                      "angle-up": "f106",
                      "angle-down": "f107",
                      desktop: "f108",
                      laptop: "f109",
                      tablet: "f10a",
                      "mobile-phone,mobile": "f10b",
                      "circle-o": "f10c",
                      "quote-left": "f10d",
                      "quote-right": "f10e",
                      spinner: "f110",
                      circle: "f111",
                      "mail-reply,reply": "f112",
                      "github-alt": "f113",
                      "folder-o": "f114",
                      "folder-open-o": "f115",
                      "smile-o": "f118",
                      "frown-o": "f119",
                      "meh-o": "f11a",
                      gamepad: "f11b",
                      "keyboard-o": "f11c",
                      "flag-o": "f11d",
                      "flag-checkered": "f11e",
                      terminal: "f120",
                      code: "f121",
                      "mail-reply-all,reply-all": "f122",
                      "star-half-empty,star-half-full,star-half-o": "f123",
                      "location-arrow": "f124",
                      crop: "f125",
                      "code-fork": "f126",
                      "unlink,chain-broken": "f127",
                      question: "f128",
                      info: "f129",
                      exclamation: "f12a",
                      superscript: "f12b",
                      subscript: "f12c",
                      eraser: "f12d",
                      "puzzle-piece": "f12e",
                      microphone: "f130",
                      "microphone-slash": "f131",
                      shield: "f132",
                      "calendar-o": "f133",
                      "fire-extinguisher": "f134",
                      rocket: "f135",
                      maxcdn: "f136",
                      "chevron-circle-left": "f137",
                      "chevron-circle-right": "f138",
                      "chevron-circle-up": "f139",
                      "chevron-circle-down": "f13a",
                      html5: "f13b",
                      css3: "f13c",
                      anchor: "f13d",
                      "unlock-alt": "f13e",
                      bullseye: "f140",
                      "ellipsis-h": "f141",
                      "ellipsis-v": "f142",
                      "rss-square": "f143",
                      "play-circle": "f144",
                      ticket: "f145",
                      "minus-square": "f146",
                      "minus-square-o": "f147",
                      "level-up": "f148",
                      "level-down": "f149",
                      "check-square": "f14a",
                      "pencil-square": "f14b",
                      "external-link-square": "f14c",
                      "share-square": "f14d",
                      compass: "f14e",
                      "toggle-down,caret-square-o-down": "f150",
                      "toggle-up,caret-square-o-up": "f151",
                      "toggle-right,caret-square-o-right": "f152",
                      "euro,eur": "f153",
                      gbp: "f154",
                      "dollar,usd": "f155",
                      "rupee,inr": "f156",
                      "cny,rmb,yen,jpy": "f157",
                      "ruble,rouble,rub": "f158",
                      "won,krw": "f159",
                      "bitcoin,btc": "f15a",
                      file: "f15b",
                      "file-text": "f15c",
                      "sort-alpha-asc": "f15d",
                      "sort-alpha-desc": "f15e",
                      "sort-amount-asc": "f160",
                      "sort-amount-desc": "f161",
                      "sort-numeric-asc": "f162",
                      "sort-numeric-desc": "f163",
                      "thumbs-up": "f164",
                      "thumbs-down": "f165",
                      "youtube-square": "f166",
                      youtube: "f167",
                      xing: "f168",
                      "xing-square": "f169",
                      "youtube-play": "f16a",
                      dropbox: "f16b",
                      "stack-overflow": "f16c",
                      instagram: "f16d",
                      flickr: "f16e",
                      adn: "f170",
                      bitbucket: "f171",
                      "bitbucket-square": "f172",
                      tumblr: "f173",
                      "tumblr-square": "f174",
                      "long-arrow-down": "f175",
                      "long-arrow-up": "f176",
                      "long-arrow-left": "f177",
                      "long-arrow-right": "f178",
                      apple: "f179",
                      windows: "f17a",
                      android: "f17b",
                      linux: "f17c",
                      dribbble: "f17d",
                      skype: "f17e",
                      foursquare: "f180",
                      trello: "f181",
                      female: "f182",
                      male: "f183",
                      "gittip,gratipay": "f184",
                      "sun-o": "f185",
                      "moon-o": "f186",
                      archive: "f187",
                      bug: "f188",
                      vk: "f189",
                      weibo: "f18a",
                      renren: "f18b",
                      pagelines: "f18c",
                      "stack-exchange": "f18d",
                      "arrow-circle-o-right": "f18e",
                      "arrow-circle-o-left": "f190",
                      "toggle-left,caret-square-o-left": "f191",
                      "dot-circle-o": "f192",
                      wheelchair: "f193",
                      "vimeo-square": "f194",
                      "turkish-lira,try": "f195",
                      "plus-square-o": "f196",
                      "space-shuttle": "f197",
                      slack: "f198",
                      "envelope-square": "f199",
                      wordpress: "f19a",
                      openid: "f19b",
                      "institution,bank,university": "f19c",
                      "mortar-board,graduation-cap": "f19d",
                      yahoo: "f19e",
                      google: "f1a0",
                      reddit: "f1a1",
                      "reddit-square": "f1a2",
                      "stumbleupon-circle": "f1a3",
                      stumbleupon: "f1a4",
                      delicious: "f1a5",
                      digg: "f1a6",
                      "pied-piper-pp": "f1a7",
                      "pied-piper-alt": "f1a8",
                      drupal: "f1a9",
                      joomla: "f1aa",
                      language: "f1ab",
                      fax: "f1ac",
                      building: "f1ad",
                      child: "f1ae",
                      paw: "f1b0",
                      spoon: "f1b1",
                      cube: "f1b2",
                      cubes: "f1b3",
                      behance: "f1b4",
                      "behance-square": "f1b5",
                      steam: "f1b6",
                      "steam-square": "f1b7",
                      recycle: "f1b8",
                      "automobile,car": "f1b9",
                      "cab,taxi": "f1ba",
                      tree: "f1bb",
                      spotify: "f1bc",
                      deviantart: "f1bd",
                      soundcloud: "f1be",
                      database: "f1c0",
                      "file-pdf-o": "f1c1",
                      "file-word-o": "f1c2",
                      "file-excel-o": "f1c3",
                      "file-powerpoint-o": "f1c4",
                      "file-photo-o,file-picture-o,file-image-o": "f1c5",
                      "file-zip-o,file-archive-o": "f1c6",
                      "file-sound-o,file-audio-o": "f1c7",
                      "file-movie-o,file-video-o": "f1c8",
                      "file-code-o": "f1c9",
                      vine: "f1ca",
                      codepen: "f1cb",
                      jsfiddle: "f1cc",
                      "life-bouy,life-buoy,life-saver,support,life-ring":
                        "f1cd",
                      "circle-o-notch": "f1ce",
                      "ra,resistance,rebel": "f1d0",
                      "ge,empire": "f1d1",
                      "git-square": "f1d2",
                      git: "f1d3",
                      "y-combinator-square,yc-square,hacker-news": "f1d4",
                      "tencent-weibo": "f1d5",
                      qq: "f1d6",
                      "wechat,weixin": "f1d7",
                      "send,paper-plane": "f1d8",
                      "send-o,paper-plane-o": "f1d9",
                      history: "f1da",
                      "circle-thin": "f1db",
                      header: "f1dc",
                      paragraph: "f1dd",
                      sliders: "f1de",
                      "share-alt": "f1e0",
                      "share-alt-square": "f1e1",
                      bomb: "f1e2",
                      "soccer-ball-o,futbol-o": "f1e3",
                      tty: "f1e4",
                      binoculars: "f1e5",
                      plug: "f1e6",
                      slideshare: "f1e7",
                      twitch: "f1e8",
                      yelp: "f1e9",
                      "newspaper-o": "f1ea",
                      wifi: "f1eb",
                      calculator: "f1ec",
                      paypal: "f1ed",
                      "google-wallet": "f1ee",
                      "cc-visa": "f1f0",
                      "cc-mastercard": "f1f1",
                      "cc-discover": "f1f2",
                      "cc-amex": "f1f3",
                      "cc-paypal": "f1f4",
                      "cc-stripe": "f1f5",
                      "bell-slash": "f1f6",
                      "bell-slash-o": "f1f7",
                      trash: "f1f8",
                      copyright: "f1f9",
                      at: "f1fa",
                      eyedropper: "f1fb",
                      "paint-brush": "f1fc",
                      "birthday-cake": "f1fd",
                      "area-chart": "f1fe",
                      "pie-chart": "f200",
                      "line-chart": "f201",
                      lastfm: "f202",
                      "lastfm-square": "f203",
                      "toggle-off": "f204",
                      "toggle-on": "f205",
                      bicycle: "f206",
                      bus: "f207",
                      ioxhost: "f208",
                      angellist: "f209",
                      cc: "f20a",
                      "shekel,sheqel,ils": "f20b",
                      meanpath: "f20c",
                      buysellads: "f20d",
                      connectdevelop: "f20e",
                      dashcube: "f210",
                      forumbee: "f211",
                      leanpub: "f212",
                      sellsy: "f213",
                      shirtsinbulk: "f214",
                      simplybuilt: "f215",
                      skyatlas: "f216",
                      "cart-plus": "f217",
                      "cart-arrow-down": "f218",
                      diamond: "f219",
                      ship: "f21a",
                      "user-secret": "f21b",
                      motorcycle: "f21c",
                      "street-view": "f21d",
                      heartbeat: "f21e",
                      venus: "f221",
                      mars: "f222",
                      mercury: "f223",
                      "intersex,transgender": "f224",
                      "transgender-alt": "f225",
                      "venus-double": "f226",
                      "mars-double": "f227",
                      "venus-mars": "f228",
                      "mars-stroke": "f229",
                      "mars-stroke-v": "f22a",
                      "mars-stroke-h": "f22b",
                      neuter: "f22c",
                      genderless: "f22d",
                      "facebook-official": "f230",
                      "pinterest-p": "f231",
                      whatsapp: "f232",
                      server: "f233",
                      "user-plus": "f234",
                      "user-times": "f235",
                      "hotel,bed": "f236",
                      viacoin: "f237",
                      train: "f238",
                      subway: "f239",
                      medium: "f23a",
                      "yc,y-combinator": "f23b",
                      "optin-monster": "f23c",
                      opencart: "f23d",
                      expeditedssl: "f23e",
                      "battery-4,battery-full": "f240",
                      "battery-3,battery-three-quarters": "f241",
                      "battery-2,battery-half": "f242",
                      "battery-1,battery-quarter": "f243",
                      "battery-0,battery-empty": "f244",
                      "mouse-pointer": "f245",
                      "i-cursor": "f246",
                      "object-group": "f247",
                      "object-ungroup": "f248",
                      "sticky-note": "f249",
                      "sticky-note-o": "f24a",
                      "cc-jcb": "f24b",
                      "cc-diners-club": "f24c",
                      clone: "f24d",
                      "balance-scale": "f24e",
                      "hourglass-o": "f250",
                      "hourglass-1,hourglass-start": "f251",
                      "hourglass-2,hourglass-half": "f252",
                      "hourglass-3,hourglass-end": "f253",
                      hourglass: "f254",
                      "hand-grab-o,hand-rock-o": "f255",
                      "hand-stop-o,hand-paper-o": "f256",
                      "hand-scissors-o": "f257",
                      "hand-lizard-o": "f258",
                      "hand-spock-o": "f259",
                      "hand-pointer-o": "f25a",
                      "hand-peace-o": "f25b",
                      trademark: "f25c",
                      registered: "f25d",
                      "creative-commons": "f25e",
                      gg: "f260",
                      "gg-circle": "f261",
                      tripadvisor: "f262",
                      odnoklassniki: "f263",
                      "odnoklassniki-square": "f264",
                      "get-pocket": "f265",
                      "wikipedia-w": "f266",
                      safari: "f267",
                      chrome: "f268",
                      firefox: "f269",
                      opera: "f26a",
                      "internet-explorer": "f26b",
                      "tv,television": "f26c",
                      contao: "f26d",
                      "500px": "f26e",
                      amazon: "f270",
                      "calendar-plus-o": "f271",
                      "calendar-minus-o": "f272",
                      "calendar-times-o": "f273",
                      "calendar-check-o": "f274",
                      industry: "f275",
                      "map-pin": "f276",
                      "map-signs": "f277",
                      "map-o": "f278",
                      map: "f279",
                      commenting: "f27a",
                      "commenting-o": "f27b",
                      houzz: "f27c",
                      vimeo: "f27d",
                      "black-tie": "f27e",
                      fonticons: "f280",
                      "reddit-alien": "f281",
                      edge: "f282",
                      "credit-card-alt": "f283",
                      codiepie: "f284",
                      modx: "f285",
                      "fort-awesome": "f286",
                      usb: "f287",
                      "product-hunt": "f288",
                      mixcloud: "f289",
                      scribd: "f28a",
                      "pause-circle": "f28b",
                      "pause-circle-o": "f28c",
                      "stop-circle": "f28d",
                      "stop-circle-o": "f28e",
                      "shopping-bag": "f290",
                      "shopping-basket": "f291",
                      hashtag: "f292",
                      bluetooth: "f293",
                      "bluetooth-b": "f294",
                      percent: "f295",
                      gitlab: "f296",
                      wpbeginner: "f297",
                      wpforms: "f298",
                      envira: "f299",
                      "universal-access": "f29a",
                      "wheelchair-alt": "f29b",
                      "question-circle-o": "f29c",
                      blind: "f29d",
                      "audio-description": "f29e",
                      "volume-control-phone": "f2a0",
                      braille: "f2a1",
                      "assistive-listening-systems": "f2a2",
                      "asl-interpreting,american-sign-language-interpreting":
                        "f2a3",
                      "deafness,hard-of-hearing,deaf": "f2a4",
                      glide: "f2a5",
                      "glide-g": "f2a6",
                      "signing,sign-language": "f2a7",
                      "low-vision": "f2a8",
                      viadeo: "f2a9",
                      "viadeo-square": "f2aa",
                      snapchat: "f2ab",
                      "snapchat-ghost": "f2ac",
                      "snapchat-square": "f2ad",
                      "pied-piper": "f2ae",
                      "first-order": "f2b0",
                      yoast: "f2b1",
                      themeisle: "f2b2",
                      "google-plus-circle,google-plus-official": "f2b3",
                      "fa,font-awesome": "f2b4",
                    };
                  }
                  function E(e) {
                    var t;
                    return (
                      Re.iconMap &&
                        Re.showIcons &&
                        Re.icons &&
                        (Re.icons[e.labels[0]] &&
                        Re.iconMap[Re.icons[e.labels[0]]]
                          ? (t = Re.iconMap[Re.icons[e.labels[0]]])
                          : Re.iconMap[e.labels[0]]
                          ? (t = Re.iconMap[e.labels[0]])
                          : Re.icons[e.labels[0]] &&
                            (t = Re.icons[e.labels[0]])),
                      t
                    );
                  }
                  function O(e) {
                    var t, r, o, f, a, n, i, c;
                    if (Re.images && (r = Re.imageMap[e.labels[0]]))
                      for (f = 0, t = 0; t < r.length; t++) {
                        switch (((n = r[t].split("|")), n.length)) {
                          case 3:
                            c = n[2];
                          case 2:
                            i = n[1];
                          case 1:
                            a = n[0];
                        }
                        e.labels[0] !== a ||
                          (i && void 0 === e.properties[i]) ||
                          (c && e.properties[i] !== c) ||
                          (n.length > f &&
                            ((o = Re.images[r[t]]), (f = n.length)));
                      }
                    return o;
                  }
                  function L(e, t) {
                    F(),
                      I(Re, t),
                      Re.icons && (Re.showIcons = !0),
                      Re.minCollision || (Re.minCollision = 2 * Re.nodeRadius),
                      S(),
                      (ve = e),
                      (ue = d3.select(ve)),
                      ue.attr("class", "neo4jd3").html(""),
                      Re.infoPanel && (de = f(ue)),
                      r(ue),
                      (we = A()),
                      Re.neo4jData
                        ? B(Re.neo4jData)
                        : Re.neo4jDataUrl
                        ? U(Re.neo4jDataUrl)
                        : console.error(
                            "Error: both neo4jData and neo4jDataUrl are empty!"
                          );
                  }
                  function F() {
                    Object.keys(Re.iconMap).forEach(function (e, t) {
                      var r = e.split(","),
                        o = Re.iconMap[e];
                      r.forEach(function (e) {
                        Re.iconMap[e] = o;
                      });
                    });
                  }
                  function S() {
                    var e, t;
                    for (e in Re.images)
                      Re.images.hasOwnProperty(e) &&
                        ((t = e.split("|")),
                        Re.imageMap[t[0]]
                          ? Re.imageMap[t[0]].push(e)
                          : (Re.imageMap[t[0]] = [e]));
                  }
                  function A() {
                    var e = d3
                      .forceSimulation()
                      .force(
                        "collide",
                        d3
                          .forceCollide()
                          .radius(function (e) {
                            return Re.minCollision;
                          })
                          .iterations(2)
                      )
                      .force("charge", d3.forceManyBody())
                      .force(
                        "link",
                        d3.forceLink().id(function (e) {
                          return e.id;
                        })
                      )
                      .force(
                        "center",
                        d3.forceCenter(
                          ke.node().parentElement.parentElement.clientWidth / 2,
                          ke.node().parentElement.parentElement.clientHeight / 2
                        )
                      )
                      .on("tick", function () {
                        K();
                      })
                      .on("end", function () {
                        Re.zoomFit && !ze && ((ze = !0), le(2));
                      });
                    return e;
                  }
                  function B() {
                    (he = []), (xe = []), fe(Re.neo4jData);
                  }
                  function U(e) {
                    (he = []),
                      (xe = []),
                      d3.json(e, function (e, t) {
                        if (e) throw e;
                        fe(t);
                      });
                  }
                  function I(e, t) {
                    Object.keys(t).forEach(function (r) {
                      e[r] = t[r];
                    });
                  }
                  function P(e) {
                    var t = { nodes: [], relationships: [] };
                    return (
                      e.results.forEach(function (e) {
                        e.data.forEach(function (e) {
                          e.graph.nodes.forEach(function (e) {
                            M(t.nodes, e.id) || t.nodes.push(e);
                          }),
                            e.graph.relationships.forEach(function (e) {
                              (e.source = e.startNode),
                                (e.target = e.endNode),
                                t.relationships.push(e);
                            }),
                            e.graph.relationships.sort(function (e, t) {
                              return e.source > t.source
                                ? 1
                                : e.source < t.source
                                ? -1
                                : e.target > t.target
                                ? 1
                                : e.target < t.target
                                ? -1
                                : 0;
                            });
                          for (var r = 0; r < e.graph.relationships.length; r++)
                            0 !== r &&
                            e.graph.relationships[r].source ===
                              e.graph.relationships[r - 1].source &&
                            e.graph.relationships[r].target ===
                              e.graph.relationships[r - 1].target
                              ? (e.graph.relationships[r].linknum =
                                  e.graph.relationships[r - 1].linknum + 1)
                              : (e.graph.relationships[r].linknum = 1);
                        });
                      }),
                      t
                    );
                  }
                  function T(e, t) {
                    var r,
                      o,
                      f,
                      a,
                      n = { nodes: [], relationships: [] },
                      i = ((t * Math.random()) << 0) + 1,
                      c = _();
                    for (r = 0; r < i; r++)
                      (o = W()),
                        (f = {
                          id: c.nodes + 1 + r,
                          labels: [o],
                          properties: { random: o },
                          x: e.x,
                          y: e.y,
                        }),
                        (n.nodes[n.nodes.length] = f),
                        (a = {
                          id: c.relationships + 1 + r,
                          type: o.toUpperCase(),
                          startNode: e.id,
                          endNode: c.nodes + 1 + r,
                          properties: { from: Date.now() },
                          source: e.id,
                          target: c.nodes + 1 + r,
                          linknum: c.relationships + 1 + r,
                        }),
                        (n.relationships[n.relationships.length] = a);
                    return n;
                  }
                  function W() {
                    var e = Object.keys(Re.iconMap);
                    return e[(e.length * Math.random()) << 0];
                  }
                  function Z(e, t, r, o, f) {
                    var a = (Math.PI / 180) * f,
                      n = Math.cos(a),
                      i = Math.sin(a),
                      c = n * (r - e) + i * (o - t) + e,
                      s = n * (o - t) - i * (r - e) + t;
                    return { x: c, y: s };
                  }
                  function H(e, t, r) {
                    return Z(e.x, e.y, t.x, t.y, r);
                  }
                  function J(e, t) {
                    return (180 * Math.atan2(t.y - e.y, t.x - e.x)) / Math.PI;
                  }
                  function _() {
                    return { nodes: he.length, relationships: xe.length };
                  }
                  function G(e) {
                    (e.fx = d3.event.x), (e.fy = d3.event.y);
                  }
                  function K() {
                    Q(), V();
                  }
                  function Q() {
                    pe &&
                      pe.attr("transform", function (e) {
                        return "translate(" + e.x + ", " + e.y + ")";
                      });
                  }
                  function V() {
                    ge &&
                      (ge.attr("transform", function (e) {
                        var t = J(e.source, e.target);
                        return (
                          "translate(" +
                          e.source.x +
                          ", " +
                          e.source.y +
                          ") rotate(" +
                          t +
                          ")"
                        );
                      }),
                      $(),
                      X(),
                      Y());
                  }
                  function X() {
                    ge.each(function (e) {
                      var t = d3.select(this),
                        r = t.select(".outline"),
                        o = t.select(".text");
                      o.node().getBBox();
                      r.attr("d", function (e) {
                        var t = { x: 0, y: 0 },
                          r = J(e.source, e.target),
                          f = o.node().getBBox(),
                          a = 5,
                          n = re(e.source, e.target),
                          i = {
                            x:
                              0.5 *
                              (e.target.x - e.source.x - (f.width + a) * n.x),
                            y:
                              0.5 *
                              (e.target.y - e.source.y - (f.width + a) * n.y),
                          },
                          c = te(e.source, e.target),
                          s = H(
                            t,
                            {
                              x: 0 + (Re.nodeRadius + 1) * n.x - c.x,
                              y: 0 + (Re.nodeRadius + 1) * n.y - c.y,
                            },
                            r
                          ),
                          l = H(t, { x: i.x - c.x, y: i.y - c.y }, r),
                          u = H(t, { x: i.x, y: i.y }, r),
                          d = H(
                            t,
                            {
                              x: 0 + (Re.nodeRadius + 1) * n.x,
                              y: 0 + (Re.nodeRadius + 1) * n.y,
                            },
                            r
                          ),
                          p = H(
                            t,
                            {
                              x: e.target.x - e.source.x - i.x - c.x,
                              y: e.target.y - e.source.y - i.y - c.y,
                            },
                            r
                          ),
                          h = H(
                            t,
                            {
                              x:
                                e.target.x -
                                e.source.x -
                                (Re.nodeRadius + 1) * n.x -
                                c.x -
                                n.x * Re.arrowSize,
                              y:
                                e.target.y -
                                e.source.y -
                                (Re.nodeRadius + 1) * n.y -
                                c.y -
                                n.y * Re.arrowSize,
                            },
                            r
                          ),
                          g = H(
                            t,
                            {
                              x:
                                e.target.x -
                                e.source.x -
                                (Re.nodeRadius + 1) * n.x -
                                c.x +
                                (c.x - n.x) * Re.arrowSize,
                              y:
                                e.target.y -
                                e.source.y -
                                (Re.nodeRadius + 1) * n.y -
                                c.y +
                                (c.y - n.y) * Re.arrowSize,
                            },
                            r
                          ),
                          b = H(
                            t,
                            {
                              x:
                                e.target.x -
                                e.source.x -
                                (Re.nodeRadius + 1) * n.x,
                              y:
                                e.target.y -
                                e.source.y -
                                (Re.nodeRadius + 1) * n.y,
                            },
                            r
                          ),
                          y = H(
                            t,
                            {
                              x:
                                e.target.x -
                                e.source.x -
                                (Re.nodeRadius + 1) * n.x +
                                (-c.x - n.x) * Re.arrowSize,
                              y:
                                e.target.y -
                                e.source.y -
                                (Re.nodeRadius + 1) * n.y +
                                (-c.y - n.y) * Re.arrowSize,
                            },
                            r
                          ),
                          m = H(
                            t,
                            {
                              x:
                                e.target.x -
                                e.source.x -
                                (Re.nodeRadius + 1) * n.x -
                                n.x * Re.arrowSize,
                              y:
                                e.target.y -
                                e.source.y -
                                (Re.nodeRadius + 1) * n.y -
                                n.y * Re.arrowSize,
                            },
                            r
                          ),
                          x = H(
                            t,
                            {
                              x: e.target.x - e.source.x - i.x,
                              y: e.target.y - e.source.y - i.y,
                            },
                            r
                          );
                        return (
                          "M " +
                          s.x +
                          " " +
                          s.y +
                          " L " +
                          l.x +
                          " " +
                          l.y +
                          " L " +
                          u.x +
                          " " +
                          u.y +
                          " L " +
                          d.x +
                          " " +
                          d.y +
                          " Z M " +
                          p.x +
                          " " +
                          p.y +
                          " L " +
                          h.x +
                          " " +
                          h.y +
                          " L " +
                          g.x +
                          " " +
                          g.y +
                          " L " +
                          b.x +
                          " " +
                          b.y +
                          " L " +
                          y.x +
                          " " +
                          y.y +
                          " L " +
                          m.x +
                          " " +
                          m.y +
                          " L " +
                          x.x +
                          " " +
                          x.y +
                          " Z"
                        );
                      });
                    });
                  }
                  function Y() {
                    ye.attr("d", function (e) {
                      var t = { x: 0, y: 0 },
                        r = J(e.source, e.target),
                        o = te(e.source, e.target),
                        f = te(e.source, e.target, 50),
                        a = H(t, { x: 0 - f.x, y: 0 - f.y }, r),
                        n = H(
                          t,
                          {
                            x: e.target.x - e.source.x - f.x,
                            y: e.target.y - e.source.y - f.y,
                          },
                          r
                        ),
                        i = H(
                          t,
                          {
                            x: e.target.x - e.source.x + f.x - o.x,
                            y: e.target.y - e.source.y + f.y - o.y,
                          },
                          r
                        ),
                        c = H(t, { x: 0 + f.x - o.x, y: 0 + f.y - o.y }, r);
                      return (
                        "M " +
                        a.x +
                        " " +
                        a.y +
                        " L " +
                        n.x +
                        " " +
                        n.y +
                        " L " +
                        i.x +
                        " " +
                        i.y +
                        " L " +
                        c.x +
                        " " +
                        c.y +
                        " Z"
                      );
                    });
                  }
                  function $() {
                    me.attr("transform", function (e) {
                      var t = (J(e.source, e.target) + 360) % 360,
                        r = t > 90 && t < 270,
                        o = { x: 0, y: 0 },
                        f = te(e.source, e.target),
                        a = r ? 2 : -3,
                        n = {
                          x: 0.5 * (e.target.x - e.source.x) + f.x * a,
                          y: 0.5 * (e.target.y - e.source.y) + f.y * a,
                        },
                        i = H(o, n, t);
                      return (
                        "translate(" +
                        i.x +
                        ", " +
                        i.y +
                        ") rotate(" +
                        (r ? 180 : 0) +
                        ")"
                      );
                    });
                  }
                  function ee(e) {
                    var t = e.labels ? e.labels[0] : e.type;
                    return (
                      (t += " (<id>: " + e.id),
                      Object.keys(e.properties).forEach(function (r) {
                        t += ", " + r + ": " + JSON.stringify(e.properties[r]);
                      }),
                      (t += ")")
                    );
                  }
                  function te(e, t, r) {
                    var o = { x: 0, y: 0 },
                      f = re(e, t, r);
                    return H(o, f, 90);
                  }
                  function re(e, t, r) {
                    var o =
                      Math.sqrt(
                        Math.pow(t.x - e.x, 2) + Math.pow(t.y - e.y, 2)
                      ) / Math.sqrt(r || 1);
                    return { x: (t.x - e.x) / o, y: (t.y - e.y) / o };
                  }
                  function oe(e) {
                    ie(e.nodes, e.relationships);
                  }
                  function fe(e) {
                    var t = P(e);
                    oe(t);
                  }
                  function ae(e) {
                    k(),
                      e.labels ? n("class", e.labels[0]) : c("class", e.type),
                      i("property", "&lt;id&gt;", e.id),
                      Object.keys(e.properties).forEach(function (t) {
                        i("property", t, JSON.stringify(e.properties[t]));
                      });
                  }
                  function ne(e) {
                    Array.prototype.push.apply(he, e),
                      (pe = qe.selectAll(".node").data(he, function (e) {
                        return e.id;
                      }));
                    var t = l();
                    pe = t.merge(pe);
                  }
                  function ie(e, t) {
                    ce(t), ne(e), we.nodes(he), we.force("link").links(xe);
                  }
                  function ce(e) {
                    Array.prototype.push.apply(xe, e),
                      (ge = Me.selectAll(".relationship").data(
                        xe,
                        function (e) {
                          return e.id;
                        }
                      ));
                    var t = x();
                    (ge = t.relationship.merge(ge)),
                      (be = ke.selectAll(".relationship .outline")),
                      (be = t.outline.merge(be)),
                      (ye = ke.selectAll(".relationship .overlay")),
                      (ye = t.overlay.merge(ye)),
                      (me = ke.selectAll(".relationship .text")),
                      (me = t.text.merge(me));
                  }
                  function se() {
                    return Ee;
                  }
                  function le(e) {
                    var t = ke.node().getBBox(),
                      r = ke.node().parentElement.parentElement,
                      o = r.clientWidth,
                      f = r.clientHeight,
                      a = t.width,
                      n = t.height,
                      i = t.x + a / 2,
                      c = t.y + n / 2;
                    0 !== a &&
                      0 !== n &&
                      ((je = 0.85 / Math.max(a / o, n / f)),
                      (De = [o / 2 - je * i, f / 2 - je * c]),
                      ke.attr(
                        "transform",
                        "translate(" +
                          De[0] +
                          ", " +
                          De[1] +
                          ") scale(" +
                          je +
                          ")"
                      ));
                  }
                  var ue,
                    de,
                    pe,
                    he,
                    ge,
                    be,
                    ye,
                    me,
                    xe,
                    ve,
                    we,
                    ke,
                    qe,
                    Me,
                    je,
                    De,
                    Ce = {},
                    ze = !1,
                    Ne = 0,
                    Re = {
                      arrowSize: 4,
                      colors: q(),
                      highlight: void 0,
                      iconMap: R(),
                      icons: void 0,
                      imageMap: {},
                      images: void 0,
                      infoPanel: !0,
                      minCollision: void 0,
                      neo4jData: void 0,
                      neo4jDataUrl: void 0,
                      nodeOutlineFillColor: void 0,
                      nodeRadius: 25,
                      relationshipColor: "#a5abb6",
                      zoomFit: !1,
                    },
                    Ee = "0.0.1";
                  return (
                    L(e, t),
                    {
                      appendRandomDataToNode: h,
                      neo4jDataToD3Data: P,
                      randomD3Data: T,
                      size: _,
                      updateWithD3Data: oe,
                      updateWithNeo4jData: fe,
                      version: se,
                    }
                  );
                }
                t.exports = o;
              },
              {},
            ],
          },
          {},
          [1]
        )(1);
      });`;
