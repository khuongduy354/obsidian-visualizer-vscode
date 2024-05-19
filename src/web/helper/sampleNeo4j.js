const sample = {
  nodes: [
    {
      id: "1",
      labels: ["User"],
      properties: {
        userId: "eisman",
      },
    },
    {
      id: "8",
      labels: ["Project"],
      properties: {
        name: "neo4jd3",
        title: "neo4jd3.js",
        description: "Neo4j graph visualization using D3.js.",
        url: "https://eisman.github.io/neo4jd3",
      },
    },
  ],
  relationships: [
    {
      id: "7",
      type: "DEVELOPES",
      startNode: "1",
      endNode: "8",
      properties: {
        from: 1470002400000,
      },
      source: "1",
      target: "8",
      linknum: 1,
    },
  ],
};
