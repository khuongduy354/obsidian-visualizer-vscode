- Currently: a single edit to file in vscode causing whole graph to be rebuilt 
- Goal: only update affected nodes


# Implementation  


File content update -> only affect forward links  
File rename/move -> affect backward link
File delete -> affect forward  and backward links (that node and its edges disappear)





