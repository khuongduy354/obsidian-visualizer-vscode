# dev   

Currently path reading issue, may resolve to old method 
Try new RelativePattern("/", "**/*") to see its output  
(why it works on desktop but not workspace)
 


## todo     
1. remove resources ![[resource link]]
2. Fix file reads: 
- work on desktop, not on web  
- desktop is relative to root of linux /home/...

3. redesign path resolving logics 

# Features needed 
- Attachments 
- Included, Excluded folders, Attachment folders




# Design   

Read workspace at start  
Graph parse on that workspace
Events: File changes -> Workspace read that file -> Graph reparse all  

Files -> Obsi -> Neo (graph json)
+ Link resolver component 
- given a filename -> resolve full path, null if not resolveable 

+ Obsi Data strucutre - representing obsidian file strucutre 
* use filename as idx
- filename -> fullpath  
- filename -> forward links  
- filename -> backward links  

<!-- + Parsing Obsi strategy (optimization)
- file changed: update forward links of that file O(1)
- file deleted: delete that file entry, from list of backlinks, remove file from there
- file moved: doesnt matter
- file renamed: if fullpath == file ? update : ignore  
- file added: add that file entry, if filename not overlap ? add : ignore  -->


+ Parsing Obsi strategy (events optimization)
- file changed: 
- file deleted:
- file moved: 
- file renamed: 
- file added:   
-> Update Obsi locally (only affected files)  -> Update Graph all (globally)

+ Parsing neo 


<!-- + When to parse / update above data structure  (performance issue) 
- cache tree to file (if possible on vscode) 
- parsing whole tree on startup, interval (while parsing, use previous cache tree), 
-> since relying on mostly events is risky -->








+ links and graphs 
-> absolute: try this first, if not possible, try relative 
-> relative: attach this, using datastrucutre above

+ cross-Platform 
to read files, different plats have different uris, so added a URihandler class to detect workspace uri, any later uri is based on that. 
graph class only works on filepath, independent of uri 




### Current obsi parsing logics 
- local graph: take current file, parse all forward links, attempt to resolve full path (if failed, omit) add these forward links to queue for next process, and set suitable backlinks, continue tills queue empty 
- global graph: exhaustive

