export type FullNeo4jFormat = {
  results: {
    columns: string[];
    data: {
      graph: SimplifiedNeo4jFormat;
    }[];
  }[];
};

type Neo4jNode = {
  id: string;
  labels: string[];
  properties: any;
};
type Neo4jRelationship = {
  id: string;
  type: string;
  startNode: string;
  endNode: string;
  properties: any;
};
export type SimplifiedNeo4jFormat = {
  nodes: Neo4jNode[];
  relationships: Neo4jRelationship[];
};
