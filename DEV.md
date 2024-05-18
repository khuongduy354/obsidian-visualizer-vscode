# dev   

# REVIEW  (handle this first)

VSCode  


- Graph   

 

- Wrapped Workspace  
Read file by file as usual lol. 
Get resource (.md + images)  
Get forward links  
Resolve links -> target uri 
-> Create a relation from resource.uri -> target uri 
-> We can create backlinks at this step because exhaustively 

Another prob: when to update graph ?    

see boostrap function for workspace changes 
-> update all graphs 
 
=====>>>> Don't overthinking lol 



## todo     
0. remove resources ![[resource link]]
1. fix datastrucutre 
- use filename as idx for both Obsi & Neo 
- add as below
4. redesign path resolving logics



## graph: local and global 
- use neo4j graphdb, when activate, format first
- global scan every markdown names, add to nodes, for every connection add to relationships
<!-- - local first: for each markdown, find all connections and add to data chart  --> 
- local: scan in relationships only 
## backlinks  
- for every link, lookup that in map, 


# Design   

Files -> Obsi -> Neo (graph json)
+ Link resolver component 
- given a filename -> resolve full path, null if not resolveable 

+ Obsi Data strucutre - representing obsidian file strucutre 
* use filename as idx
- filename -> fullpath  
- filename -> forward links  
- filename -> backward links  

+ Parsing Obsi strategy (optimization)
- file changed: update forward links of that file O(1)
- file deleted: delete that file entry, from list of backlinks, remove file from there
- file moved: doesnt matter
- file renamed: if fullpath == file ? update : ignore  
- file added: add that file entry, if filename not overlap ? add : ignore 

+ Parsing neo 


+ When to parse / update above data structure  (performance issue) 
- cache tree to file (if possible on vscode) 
- parsing whole tree on startup, interval (while parsing, use previous cache tree), 
-> since relying on mostly events is risky








+ links and graphs 
-> absolute: try this first, if not possible, try relative 
-> relative: attach this, using datastrucutre above

+ cross-Platform 
to read files, different plats have different uris, so added a URihandler class to detect workspace uri, any later uri is based on that. 
graph class only works on filepath, independent of uri 




### Current obsi parsing logics 
- local graph: take current file, parse all forward links, attempt to resolve full path (if failed, omit) add these forward links to queue for next process, and set suitable backlinks, continue tills queue empty 
- global graph: exhaustive

