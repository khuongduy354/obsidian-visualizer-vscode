import { GraphOption } from "./GraphOption";

export type WebviewEventHandlers = {
  onNodeDoubleClick?: (message: any) => void;
  onGraphOptionChanged?: (graphOption: GraphOption) => void;
  onSearchChanged?: (search: string) => void;
};
